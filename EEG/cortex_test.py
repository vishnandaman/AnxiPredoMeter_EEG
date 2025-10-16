import websocket
import json
import time
import csv
import ssl
import traceback
import sys
import os

APP_CLIENT_ID = "FgVsoeJ5NktN4sxZPSaG0noURJmTH0CXug09aEHW"  # your Client ID
APP_CLIENT_SECRET = "pSAxu4ZKFuatiH244Ecxjv0AwcNHwibDIqUsGo55Z6kHsOn2dEoFIJlyHY543r5vwknL5Pi8fa6Oeu2QSCe5neUIrYCzvoDBAKspgsJmICaeWzfU5QnTDPwvTg8suR9f"
APP_ID = "com.aman6.eeg_capstone_disabled"
CSV_FILE = "eeg_live_data.csv"

DEBUG = True
TRUNCATE_LEN = 1000

def pretty(msg):
    try:
        return json.dumps(msg, indent=2)
    except Exception:
        return str(msg)

def log_raw(prefix, raw):
    if isinstance(raw, (bytes, bytearray)):
        try:
            raw = raw.decode('utf-8', errors='replace')
        except Exception:
            raw = str(raw)
    if DEBUG:
        print(f"{prefix} (len={len(raw)}): {raw[:TRUNCATE_LEN]}{'...' if len(raw)>TRUNCATE_LEN else ''}")

def send(ws, msg, debug=True):
    ws.send(json.dumps(msg))
    if debug:
        print("[->]", msg)
    # read responses until we get a valid JSON object (skip pings/empty)
    while True:
        try:
            raw = ws.recv()
            if not raw:
                continue
            log_raw("[<- raw]", raw)
            data = json.loads(raw)
            if debug:
                print("[<- parsed]", data)
            return data
        except ValueError:
            # non-json or partial message, continue reading
            if DEBUG:
                print("[<-] Partial/non-json message, continuing read")
            continue
        except Exception as e:
            print("recv error:", e)
            raise

def main():
    try:
        print("[*] Connecting to Cortex service...")
        # ignore cert checks for local dev if Cortex uses self-signed cert
        ws = websocket.create_connection("wss://localhost:6868", sslopt={"cert_reqs": ssl.CERT_NONE})
        ws.settimeout(10)
        print("[+] Connected!")

        # Step 1: Get Cortex Info
        msg = {"id": 1, "jsonrpc": "2.0", "method": "getCortexInfo"}
        resp = send(ws, msg)
        print("getCortexInfo result keys:", list(resp.keys()))

        # Step 2: Request Access
        msg = {
            "id": 2,
            "jsonrpc": "2.0",
            "method": "requestAccess",
            "params": {"clientId": APP_CLIENT_ID, "clientSecret": APP_CLIENT_SECRET}
        }
        resp = send(ws, msg)
        print("requestAccess:", resp)

        # Step 3: Authorize
        msg = {
            "id": 3,
            "jsonrpc": "2.0",
            "method": "authorize",
            "params": {"clientId": APP_CLIENT_ID, "clientSecret": APP_CLIENT_SECRET}
        }
        resp = send(ws, msg)
        print("authorize:", resp)
        if "result" not in resp or "cortexToken" not in resp["result"]:
            print("Authorization failure (no cortexToken). Full resp:")
            print(pretty(resp))
            return
        cortex_token = resp["result"]["cortexToken"]
        print("[+] Authorized — token received (len):", len(cortex_token))

        # Step 4: Query Headset
        msg = {"id": 4, "jsonrpc": "2.0", "method": "queryHeadsets"}
        headsets = send(ws, msg)
        print("queryHeadsets:", pretty(headsets))
        if not headsets.get("result"):
            print("No headsets found:", headsets)
            return
        headset_list = headsets["result"]
        if len(headset_list) == 0:
            print("No headsets connected. Please pair/connect the headset.")
            return
        headset_id = headset_list[0]["id"]
        print(f"[+] Headset found: {headset_id}")

        # Step 5: Create Session
        msg = {
            "id": 5,
            "jsonrpc": "2.0",
            "method": "createSession",
            "params": {"cortexToken": cortex_token, "headset": headset_id, "status": "open"}
        }
        resp = send(ws, msg)
        print("createSession:", pretty(resp))
        if "result" not in resp:
            print("createSession failed:", resp)
            return
        session_id = resp["result"]["id"]
        print(f"[+] Session created: {session_id}")

        # Step 6: Subscribe to 'pow' (band power)
        msg = {
            "id": 6,
            "jsonrpc": "2.0",
            "method": "subscribe",
            "params": {"cortexToken": cortex_token, "session": session_id, "streams": ["pow"]}
        }
        resp = send(ws, msg)
        print("subscribe response:", pretty(resp))
        # Check common success indicators
        if resp.get("result") or (isinstance(resp.get("success"), bool) and resp["success"]):
            print("[+] Subscribe reported success (result present).")
        elif resp.get("error"):
            print("[!] Subscribe error:", pretty(resp["error"]))
        else:
            print("[!] Subscribe response ambiguous; watch incoming messages for confirmation.")

        print("[+] Subscribed to EEG Power Bands stream.")

        # Step 7: Prepare CSV
        with open(CSV_FILE, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Timestamp", "SID", "Channel", "Band", "Value"])
            f.flush()
            os.fsync(f.fileno())

            print("\n--- Live EEG Data Stream --- (Press Ctrl+C to stop)\n")
            incoming_count = 0
            pow_count = 0

            # ---- ADDED: channel/band mapping and accumulators ----
            # adjust if your headset uses a different channel or band order
            SELECTED_CHANNELS = ["AF3", "AF4", "T7", "T8", "Pz"]
            BAND_NAMES = ["delta", "theta", "alpha", "beta", "gamma"]  # assumed ordering in pow frames
            # accumulators: sums[channel][band] and frame counts per channel
            sums = {ch: {b: 0.0 for b in BAND_NAMES} for ch in SELECTED_CHANNELS}
            frame_counts = {ch: 0 for ch in SELECTED_CHANNELS}
            total_frames = 0
            # ------------------------------------------------------

            try:
                while True:
                    try:
                        raw = ws.recv()
                    except websocket.WebSocketTimeoutException:
                        # ping or keepalive; continue listening
                        if DEBUG:
                            print("[*] recv timeout (keepalive).")
                        continue
                    if not raw:
                        continue

                    incoming_count += 1
                    log_raw(f"[MSG #{incoming_count} raw]", raw)

                    # try parse JSON
                    try:
                        data = json.loads(raw)
                    except Exception:
                        if DEBUG:
                            print("[!] Could not parse JSON for message #", incoming_count)
                        continue

                    # Show basic routing info
                    if "id" in data:
                        print(f"[RPC id={data.get('id')}] keys={list(data.keys())}")
                    if "result" in data and not data.get("stream"):
                        print(f"[RPC result] keys={list(data['result'].keys()) if isinstance(data['result'], dict) else type(data['result'])}")

                    # Stream messages often have 'pow' key
                    if "pow" in data:
                        pow_count += 1
                        pow_data = data["pow"]

                        # Normalize different payload formats
                        if isinstance(pow_data, dict):
                            cols = pow_data.get("cols", [])
                            values = pow_data.get("values", [])
                        elif isinstance(pow_data, list) and len(pow_data) > 0 and isinstance(pow_data[0], dict):
                            cols = pow_data[0].get("cols", [])
                            values = pow_data[0].get("values", [])
                        elif isinstance(pow_data, list) and all(isinstance(x, (int, float)) for x in pow_data):
                            # flat numeric list (your current case)
                            cols = []  # no cols provided
                            values = [pow_data]
                        else:
                            cols, values = [], []

                        if not values:
                            if DEBUG:
                                print("[*] pow message had no values, skipping")
                            continue

                        timestamp = data.get("time", time.time())
                        sid = data.get("sid", None)
                        display_dict = {}

                        # VALUES: values[0] is the numeric list for this frame (length should be channels*bands)
                        frame = values[0]
                        n_vals = len(frame)
                        n_bands = len(BAND_NAMES)
                        # defensive check: expected 5 channels * 5 bands = 25
                        if n_vals % n_bands != 0:
                            if DEBUG:
                                print(f"[!] Unexpected pow length {n_vals}, not divisible by {n_bands}")
                        n_channels = n_vals // n_bands

                        for idx, val in enumerate(frame):
                            # determine channel/band by index
                            ch_idx = idx // n_bands
                            band_idx = idx % n_bands
                            channel = SELECTED_CHANNELS[ch_idx] if ch_idx < len(SELECTED_CHANNELS) else f"Ch{ch_idx}"
                            band = BAND_NAMES[band_idx] if band_idx < len(BAND_NAMES) else f"Band{band_idx}"

                            # write CSV row
                            writer.writerow([timestamp, sid if sid else "", channel, band, float(val)])

                            # update display & accumulators only for selected channels
                            if channel in sums:
                                sums[channel][band] += float(val)
                                # count frames once per channel per frame
                                # increment frame_counts[channel] the first time we encounter that channel in this frame
                                # (we detect that by when band_idx == 0)
                                if band_idx == 0:
                                    frame_counts[channel] += 1
                            if channel not in display_dict:
                                display_dict[channel] = {}
                            display_dict[channel][band] = float(val)

                        total_frames += 1

                        # ensure data is written to disk
                        f.flush()
                        os.fsync(f.fileno())

                        # print summary to terminal
                        print(f"\n--- Live EEG (pow #{pow_count}) ---")
                        for ch in display_dict:
                            bands = " | ".join(f"{b}:{display_dict[ch][b]:.3f}" for b in display_dict[ch])
                            print(f"{ch:4s}: {bands}")

                    else:
                        # show other messages for debugging
                        print(f"[MSG #{incoming_count}] non-pow message keys: {list(data.keys())}")

            except KeyboardInterrupt:
                print("\n[!] Stopped by user. Data saved to", CSV_FILE)
                print(f"[!] messages seen: total={incoming_count}, pow={pow_count}")
                # ---- ADDED: compute & print averages ----
                print("\n--- AVERAGE BAND POWERS (per channel) ---")
                for ch in SELECTED_CHANNELS:
                    c_frames = frame_counts.get(ch, 0)
                    if c_frames == 0:
                        print(f"{ch}: no frames")
                        continue
                    print(f"{ch}: (frames={c_frames})")
                    for b in BAND_NAMES:
                        avg = sums[ch][b] / c_frames
                        print(f"  {b:6s}: {avg:.4f}")
                # overall averages across selected channels
                print("\n--- AVERAGE BAND POWERS (across selected channels) ---")
                for b in BAND_NAMES:
                    total = sum(sums[ch][b] for ch in SELECTED_CHANNELS if frame_counts.get(ch,0)>0)
                    denom = sum(frame_counts[ch] for ch in SELECTED_CHANNELS if frame_counts.get(ch,0)>0)
                    overall_avg = total / denom if denom>0 else 0.0
                    print(f"  {b:6s}: {overall_avg:.4f}")
                # -------------------------------------------

        ws.close()

    except Exception:
        print("Exception in main:")
        traceback.print_exc()
        try:
            ws.close()
        except:
            pass

if __name__ == "__main__":
    main()