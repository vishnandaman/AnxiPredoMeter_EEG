# filepath: d:\RIT_Hackathon\EEG\check_ws.py
import websocket, ssl, sys
try:
    ws = websocket.create_connection("wss://localhost:6868", sslopt={"cert_reqs": ssl.CERT_NONE}, timeout=5)
    print("WebSocket connected")
    ws.close()
except Exception as e:
    print("Connect failed:", e)
    sys.exit(1)