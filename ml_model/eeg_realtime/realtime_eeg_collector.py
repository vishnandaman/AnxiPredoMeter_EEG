"""
Real-Time EEG Data Collector
Automatically connects to EEG device, collects readings, filters noise, and computes averages.
No manual intervention required - just call collect_eeg_data().
"""

import websocket
import json
import time
import ssl
import traceback
import numpy as np
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

# Cortex API credentials (same as cortex_test.py)
APP_CLIENT_ID = "FgVsoeJ5NktN4sxZPSaG0noURJmTH0CXug09aEHW"
APP_CLIENT_SECRET = "pSAxu4ZKFuatiH244Ecxjv0AwcNHwibDIqUsGo55Z6kHsOn2dEoFIJlyHY543r5vwknL5Pi8fa6Oeu2QSCe5neUIrYCzvoDBAKspgsJmICaeWzfU5QnTDPwvTg8suR9f"
APP_ID = "com.aman6.eeg_capstone_disabled"

# Configuration
SELECTED_CHANNELS = ["AF3", "AF4", "T7", "T8", "Pz"]
BAND_NAMES = ["delta", "theta", "alpha", "beta", "gamma"]
COLLECTION_DURATION = 30  # seconds
MIN_SAMPLES_REQUIRED = 50  # minimum readings for valid data
NOISE_THRESHOLD_MULTIPLIER = 3.0  # for outlier detection (3 standard deviations)


def send_ws_message(ws, msg: dict, timeout: float = 10.0) -> dict:
    """Send WebSocket message and wait for response"""
    ws.send(json.dumps(msg))
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            raw = ws.recv()
            if not raw:
                continue
            try:
                data = json.loads(raw)
                return data
            except ValueError:
                continue
        except websocket.WebSocketTimeoutException:
            continue
    raise TimeoutError("No response received from Cortex")


def filter_noise(values: list, threshold_multiplier: float = NOISE_THRESHOLD_MULTIPLIER) -> list:
    """
    Remove outliers using statistical filtering (values beyond threshold_multiplier * std_dev)
    """
    if len(values) < 3:
        return values
    
    values_array = np.array(values)
    mean = np.mean(values_array)
    std_dev = np.std(values_array)
    
    if std_dev == 0:
        return values
    
    threshold = threshold_multiplier * std_dev
    filtered = [v for v in values if abs(v - mean) <= threshold]
    
    # If too many outliers removed, return original (might be valid variation)
    if len(filtered) < len(values) * 0.5:
        logger.warning(f"Too many outliers detected ({len(values) - len(filtered)}/{len(values)}), keeping original data")
        return values
    
    return filtered


def compute_averages(accumulated_data: Dict[str, Dict[str, list]]) -> Dict[str, float]:
    """
    Compute average band powers across all channels after noise filtering
    """
    band_totals = {band: [] for band in BAND_NAMES}
    
    # Collect all values for each band across all channels
    for channel in SELECTED_CHANNELS:
        if channel in accumulated_data:
            for band in BAND_NAMES:
                if band in accumulated_data[channel]:
                    values = accumulated_data[channel][band]
                    if values:
                        # Filter noise
                        filtered_values = filter_noise(values)
                        band_totals[band].extend(filtered_values)
    
    # Compute overall averages for each band
    averages = {}
    for band in BAND_NAMES:
        if band_totals[band]:
            averages[band] = float(np.mean(band_totals[band]))
        else:
            averages[band] = 0.0
    
    return averages


def collect_eeg_data(duration: int = COLLECTION_DURATION) -> Tuple[bool, Optional[Dict[str, float]], str]:
    """
    Automatically collect EEG data from connected device.
    
    Args:
        duration: Collection duration in seconds (default: 30)
    
    Returns:
        Tuple of (success: bool, data: Dict[str, float] or None, message: str)
    """
    ws = None
    try:
        logger.info(f"[EEG Realtime] Starting automatic EEG collection for {duration} seconds...")
        
        # Step 1: Connect to Cortex
        logger.info("[EEG Realtime] Connecting to Cortex service...")
        ws = websocket.create_connection(
            "wss://localhost:6868",
            sslopt={"cert_reqs": ssl.CERT_NONE},
            timeout=10
        )
        ws.settimeout(10)
        logger.info("[EEG Realtime] Connected to Cortex!")
        
        # Step 2: Get Cortex Info
        msg = {"id": 1, "jsonrpc": "2.0", "method": "getCortexInfo"}
        resp = send_ws_message(ws, msg)
        logger.debug(f"[EEG Realtime] Cortex info: {resp}")
        
        # Step 3: Request Access
        msg = {
            "id": 2,
            "jsonrpc": "2.0",
            "method": "requestAccess",
            "params": {"clientId": APP_CLIENT_ID, "clientSecret": APP_CLIENT_SECRET}
        }
        resp = send_ws_message(ws, msg)
        logger.debug(f"[EEG Realtime] Access request: {resp}")
        
        # Step 4: Authorize
        msg = {
            "id": 3,
            "jsonrpc": "2.0",
            "method": "authorize",
            "params": {"clientId": APP_CLIENT_ID, "clientSecret": APP_CLIENT_SECRET}
        }
        resp = send_ws_message(ws, msg)
        
        if "result" not in resp or "cortexToken" not in resp["result"]:
            error_msg = f"Authorization failed: {resp}"
            logger.error(f"[EEG Realtime] {error_msg}")
            return False, None, error_msg
        
        cortex_token = resp["result"]["cortexToken"]
        logger.info("[EEG Realtime] Authorized successfully")
        
        # Step 5: Query Headset
        msg = {"id": 4, "jsonrpc": "2.0", "method": "queryHeadsets"}
        resp = send_ws_message(ws, msg)
        
        if not resp.get("result") or len(resp["result"]) == 0:
            error_msg = "No EEG headset found. Please connect the headset."
            logger.error(f"[EEG Realtime] {error_msg}")
            return False, None, error_msg
        
        headset_id = resp["result"][0]["id"]
        logger.info(f"[EEG Realtime] Headset found: {headset_id}")
        
        # Step 6: Create Session
        msg = {
            "id": 5,
            "jsonrpc": "2.0",
            "method": "createSession",
            "params": {"cortexToken": cortex_token, "headset": headset_id, "status": "open"}
        }
        resp = send_ws_message(ws, msg)
        
        if "result" not in resp:
            error_msg = f"Session creation failed: {resp}"
            logger.error(f"[EEG Realtime] {error_msg}")
            return False, None, error_msg
        
        session_id = resp["result"]["id"]
        logger.info(f"[EEG Realtime] Session created: {session_id}")
        
        # Step 7: Subscribe to Power Bands
        msg = {
            "id": 6,
            "jsonrpc": "2.0",
            "method": "subscribe",
            "params": {"cortexToken": cortex_token, "session": session_id, "streams": ["pow"]}
        }
        resp = send_ws_message(ws, msg)
        logger.info("[EEG Realtime] Subscribed to EEG Power Bands stream")
        
        # Step 8: Collect data for specified duration
        logger.info(f"[EEG Realtime] Collecting EEG data for {duration} seconds...")
        
        accumulated_data = {ch: {b: [] for b in BAND_NAMES} for ch in SELECTED_CHANNELS}
        start_time = time.time()
        sample_count = 0
        
        while time.time() - start_time < duration:
            try:
                raw = ws.recv()
                if not raw:
                    continue
                
                try:
                    data = json.loads(raw)
                except ValueError:
                    continue
                
                # Process power band data
                if "pow" in data:
                    pow_data = data["pow"]
                    sample_count += 1
                    
                    # Normalize different payload formats
                    if isinstance(pow_data, dict):
                        values = pow_data.get("values", [])
                    elif isinstance(pow_data, list) and len(pow_data) > 0:
                        if isinstance(pow_data[0], dict):
                            values = pow_data[0].get("values", [])
                        elif all(isinstance(x, (int, float)) for x in pow_data):
                            values = [pow_data]
                        else:
                            values = []
                    else:
                        values = []
                    
                    if values and len(values) > 0:
                        frame = values[0]
                        n_vals = len(frame)
                        n_bands = len(BAND_NAMES)
                        
                        if n_vals % n_bands == 0:
                            n_channels = n_vals // n_bands
                            
                            for idx, val in enumerate(frame):
                                ch_idx = idx // n_bands
                                band_idx = idx % n_bands
                                
                                if ch_idx < len(SELECTED_CHANNELS):
                                    channel = SELECTED_CHANNELS[ch_idx]
                                    band = BAND_NAMES[band_idx]
                                    accumulated_data[channel][band].append(float(val))
                
            except websocket.WebSocketTimeoutException:
                continue
            except Exception as e:
                logger.warning(f"[EEG Realtime] Error processing sample: {e}")
                continue
        
        # Step 9: Compute averages
        logger.info(f"[EEG Realtime] Collected {sample_count} samples. Computing averages...")
        
        if sample_count < MIN_SAMPLES_REQUIRED:
            error_msg = f"Insufficient samples collected ({sample_count} < {MIN_SAMPLES_REQUIRED}). Please ensure headset is properly connected."
            logger.warning(f"[EEG Realtime] {error_msg}")
            return False, None, error_msg
        
        averages = compute_averages(accumulated_data)
        
        # Validate averages
        if all(v == 0.0 for v in averages.values()):
            error_msg = "All band averages are zero. Check headset connection."
            logger.error(f"[EEG Realtime] {error_msg}")
            return False, None, error_msg
        
        logger.info(f"[EEG Realtime] Successfully collected and processed EEG data: {averages}")
        return True, averages, f"Successfully collected {sample_count} samples"
        
    except websocket.WebSocketException as e:
        error_msg = f"WebSocket connection error: {str(e)}"
        logger.error(f"[EEG Realtime] {error_msg}")
        return False, None, error_msg
    except TimeoutError as e:
        error_msg = f"Connection timeout: {str(e)}"
        logger.error(f"[EEG Realtime] {error_msg}")
        return False, None, error_msg
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(f"[EEG Realtime] {error_msg}")
        logger.error(traceback.format_exc())
        return False, None, error_msg
    finally:
        if ws:
            try:
                ws.close()
                logger.info("[EEG Realtime] WebSocket connection closed")
            except:
                pass

