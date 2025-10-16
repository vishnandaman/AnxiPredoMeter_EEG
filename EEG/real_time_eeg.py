#!/usr/bin/env python3
"""
Demo: connect to Cortex API, authorize, create session, subscribe to eeg+pow,
print and save a few samples. Meant ONLY to validate streaming — no ML integration.
Replace CLIENT_ID and CLIENT_SECRET with your Cortex App credentials.
"""
import websocket, json, ssl, time, itertools, csv, os, sys

# ---------- CONFIG ----------
CLIENT_ID = "YOUR_CLIENT_ID_HERE"
CLIENT_SECRET = "YOUR_CLIENT_SECRET_HERE"
WS_URL = "wss://localhost:6868"
SAVE_DIR = "cortex_samples"
SAVE_RAW_CSV = True
# ----------------------------

id_counter = itertools.count(1)
notif_buffer = []  # simple buffer for notifications you might want to inspect

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
    payload = {"jsonrpc":"2.0", "id": req_id, "method": method}
    if params:
        payload["params"] = params
    ws.send(json.dumps(payload))
    # wait for response matching id; also collect notifications while waiting
    start = time.time()
    while True:
        if time.time() - start > timeout:
            raise TimeoutError(f"Timeout waiting for response to {method}")
        raw = ws.recv()
        try:
            msg = json.loads(raw)
        except Exception:
            continue
        # If this is a response to our request:
        if isinstance(msg, dict) and msg.get("id") == req_id:
            return msg
        # else it's a notification / streaming data — preserve for main loop
        notif_buffer.append(msg)

def handle_notification(msg, csv_writer=None):
    # Print only EEG/POW to avoid flooding
    if not isinstance(msg, dict):
        return
    # Example formats:
    #   {'sid': '...', 'time': 123.4, 'eeg': [ ... ]}
    #   {'sid': '...', 'time': 123.4, 'pow': {...}}
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
    else:
        # Other notifications (session updates, sys messages) — optional print
        # print("[NOTIF]", pretty(msg))
        pass

def main():
    if CLIENT_ID.startswith("YOUR_"):
        print("ERROR: Replace CLIENT_ID and CLIENT_SECRET in the script before running.")
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
            print("ERROR: authorize failed (no cortexToken). Response:", pretty(auth_resp))
            return
        print("[+] Authorized, cortexToken obtained")

        # query headsets (may be empty if not connected)
        print("[*] queryHeadsets")
        head_resp = send_request(ws, "queryHeadsets", {"cortexToken": token})
        print(pretty(head_resp))
        headsets = head_resp.get("result", [])
        if not headsets:
            print("ERROR: No headsets found. Ensure headset is connected and recognized by Emotiv App.")
            return
        headset_id = headsets[0].get("id")
        print("[+] Using headset:", headset_id)

        # create session
        print("[*] createSession (open)")
        sess_resp = send_request(ws, "createSession", {"cortexToken": token, "headset": headset_id, "status": "open"})
        print(pretty(sess_resp))
        session_id = sess_resp.get("result", {}).get("id")
        if not session_id:
            print("ERROR: createSession didn't return session id.")
            return
        print("[+] Session open:", session_id)

        # subscribe to streams
        print("[*] subscribe to eeg and pow")
        sub_resp = send_request(ws, "subscribe", {"cortexToken": token, "session": session_id, "streams": ["eeg", "pow"]})
        print(pretty(sub_resp))
        print("[+] Subscribed — streaming will begin, printing EEG/POW lines")

        # handle the notification buffer first (responses that arrived while waiting)
        while notif_buffer:
            n = notif_buffer.pop(0)
            handle_notification(n, csv_writer)

        # streaming loop — receives notifications indefinitely
        print("\n--- STREAMING START (press Ctrl+C to stop) ---\n")
        try:
            while True:
                raw = ws.recv()
                try:
                    msg = json.loads(raw)
                except Exception:
                    continue
                # direct notifications will arrive here
                handle_notification(msg, csv_writer)
        except KeyboardInterrupt:
            print("\n[!] KeyboardInterrupt — cleaning up...")
        finally:
            # unsubscribe & close session
            try:
                print("[*] unsubscribe")
                print(pretty(send_request(ws, "unsubscribe", {"cortexToken": token, "session": session_id, "streams": ["eeg", "pow"]})))
            except Exception as e:
                print("Warning: unsubscribe failed:", e)
            try:
                print("[*] updateSession close")
                print(pretty(send_request(ws, "updateSession", {"cortexToken": token, "session": session_id, "status":"close"})))
            except Exception as e:
                print("Warning: close session failed:", e)
    finally:
        try:
            ws.close()
        except:
            pass
        if csv_file:
            csv_file.close()
        print("[+] Done. Files (if any) saved in", SAVE_DIR)

if __name__ == "__main__":
    main()
