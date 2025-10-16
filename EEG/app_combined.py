#!/usr/bin/env python3
"""
EEG Stream Demo (with Simulation Fallback)
------------------------------------------
1. Connects to Cortex API and authenticates your app (even without Pro license)
2. Attempts to subscribe to EEG + band-power
3. If access restricted → automatically switches to simulated EEG band-power
4. Prints data or saves to CSV (optional)
"""

import websocket, json, ssl, time, itertools, csv, os, sys, random
import numpy as np

# ---------- CONFIG ----------
CLIENT_ID = "FgVsoeJ5NktN4sxZPSaG0noURJmTH0CXug09aEHW"         # App with EEG DISABLED
CLIENT_SECRET = "pSAxu4ZKFuatiH244Ecxjv0AwcNHwibDIqUsGo55Z6kHsOn2dEoFIJlyHY543r5vwknL5Pi8fa6Oeu2QSCe5neUIrYCzvoDBAKspgsJmICaeWzfU5QnTDPwvTg8suR9f" # Get from Emotiv Developer dashboard
WS_URL = "wss://localhost:6868"
SAVE_DIR = "cortex_samples"
SAVE_RAW_CSV = True
SIMULATE_INTERVAL = 1.0  # seconds between simulated readings
# ----------------------------

id_counter = itertools.count(1)
notif_buffer = []

# ---------- Helper Functions ----------
def pretty(obj):
    try:
        return json.dumps(obj, indent=2)
    except:
        return str(obj)

def connect_ws():
    print("[*] Connecting to", WS_URL)
    ws = websocket.create_connection(WS_URL, sslopt={"cert_reqs": ssl.CERT_NONE})
    print("[+] WebSocket connected")
    return ws

def send_request(ws, method, params=None, timeout=5):
    req_id = next(id_counter)
    payload = {"jsonrpc": "2.0", "id": req_id, "method": method}
    if params:
        payload["params"] = params
    ws.send(json.dumps(payload))

    start = time.time()
    while True:
        if time.time() - start > timeout:
            raise TimeoutError(f"Timeout waiting for response to {method}")
        raw = ws.recv()
        try:
            msg = json.loads(raw)
        except Exception:
            continue
        if isinstance(msg, dict) and msg.get("id") == req_id:
            return msg
        notif_buffer.append(msg)

def handle_notification(msg, csv_writer=None):
    if not isinstance(msg, dict):
        return
    if "eeg" in msg:
        t = msg.get("time")
        eeg = msg.get("eeg")
        print(f"[EEG] t={t} len={len(eeg)} first3={eeg[:3]}")
        if csv_writer:
            csv_writer.writerow([time.time(), "eeg", t, json.dumps(eeg)])
    elif "pow" in msg:
        t = msg.get("time")
        powr = msg.get("pow")
        print(f"[POW] t={t} keys={list(powr.keys()) if isinstance(powr, dict) else 'unknown'}")
        if csv_writer:
            csv_writer.writerow([time.time(), "pow", t, json.dumps(powr)])

# ---------- Simulation ----------
def simulate_band_power():
    """Generate simulated alpha/beta/gamma/delta/theta values for each channel."""
    channels = ['AF3', 'AF4', 'T7', 'T8', 'Pz']
    bands = ['alpha', 'beta', 'gamma', 'delta', 'theta']
    simulated = {}
    for ch in channels:
        simulated[ch] = {band: round(np.random.uniform(0.1, 1.0), 3) for band in bands}
    return simulated

def run_simulation():
    """Fallback when real EEG is unavailable."""
    print("[!] EEG access restricted — switching to SIMULATION mode")
    print("[+] Generating pseudo band-power data for AF3, AF4, T7, T8, Pz")
    print("\n--- SIMULATION START (press Ctrl+C to stop) ---\n")
    try:
        while True:
            data = simulate_band_power()
            print("[SIMULATED]", data)

            # 👉 Here you can connect to your ML model:
            # anxiety_pred = model.predict(convert_to_vector(data))
            # print("[MODEL]", "Predicted Anxiety Level:", anxiety_pred)

            time.sleep(SIMULATE_INTERVAL)
    except KeyboardInterrupt:
        print("\n[!] Simulation stopped by user")

# ---------- Main ----------
def main():
    if CLIENT_ID.startswith("YOUR_"):
        print("ERROR: Replace CLIENT_ID and CLIENT_SECRET before running.")
        sys.exit(1)

    os.makedirs(SAVE_DIR, exist_ok=True)
    csv_file = None
    csv_writer = None
    if SAVE_RAW_CSV:
        csv_file = open(os.path.join(SAVE_DIR, "stream_samples.csv"), "a", newline="")
        csv_writer = csv.writer(csv_file)
        csv_writer.writerow(["recv_time_unix", "stream", "stream_time", "payload_json"])

    ws = connect_ws()

    try:
        print("[*] getCortexInfo")
        print(pretty(send_request(ws, "getCortexInfo")))

        print("[*] requestAccess")
        print(pretty(send_request(ws, "requestAccess", {"clientId": CLIENT_ID, "clientSecret": CLIENT_SECRET})))

        print("[*] authorize (getting cortexToken)")
        auth_resp = send_request(ws, "authorize", {"clientId": CLIENT_ID, "clientSecret": CLIENT_SECRET})
        token = auth_resp.get("result", {}).get("cortexToken")
        if not token:
            print("ERROR: authorize failed — switching to simulation mode")
            run_simulation()
            return
        print("[+] Authorized, cortexToken obtained")

        print("[*] queryHeadsets")
        head_resp = send_request(ws, "queryHeadsets", {"cortexToken": token})
        print(pretty(head_resp))
        headsets = head_resp.get("result", [])
        if not headsets:
            print("ERROR: No headsets detected — switching to simulation mode")
            run_simulation()
            return
        headset_id = headsets[0].get("id")
        print("[+] Using headset:", headset_id)

        print("[*] createSession (open)")
        sess_resp = send_request(ws, "createSession", {"cortexToken": token, "headset": headset_id, "status": "open"})
        print(pretty(sess_resp))
        session_id = sess_resp.get("result", {}).get("id")
        if not session_id:
            print("ERROR: No session id — switching to simulation mode")
            run_simulation()
            return
        print("[+] Session open:", session_id)

        # ---- Try subscribing to EEG/POW ----
        print("[*] subscribe to eeg and pow")
        sub_resp = send_request(ws, "subscribe", {"cortexToken": token, "session": session_id, "streams": ["eeg", "pow"]})
        print(pretty(sub_resp))

        # If error → fallback
        if "error" in sub_resp or "EEG" in json.dumps(sub_resp):
            run_simulation()
            return

        print("[+] Subscribed — streaming EEG/POW...")

        # Process notifications
        while notif_buffer:
            n = notif_buffer.pop(0)
            handle_notification(n, csv_writer)

        print("\n--- STREAMING START (press Ctrl+C to stop) ---\n")
        try:
            while True:
                raw = ws.recv()
                try:
                    msg = json.loads(raw)
                except Exception:
                    continue
                handle_notification(msg, csv_writer)
        except KeyboardInterrupt:
            print("\n[!] Interrupted by user")
        finally:
            print("[*] unsubscribe")
            print(pretty(send_request(ws, "unsubscribe", {"cortexToken": token, "session": session_id, "streams": ["eeg", "pow"]})))
            print("[*] close session")
            print(pretty(send_request(ws, "updateSession", {"cortexToken": token, "session": session_id, "status": "close"})))

    finally:
        try: ws.close()
        except: pass
        if csv_file: csv_file.close()
        print("[+] Done. Files saved in", SAVE_DIR)

if __name__ == "__main__":
    main()
