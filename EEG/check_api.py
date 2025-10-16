#!/usr/bin/env python3
"""
Quick test script to verify Cortex API connection and basic functionality.
This script only tests the API connection without streaming data.
Replace CLIENT_ID and CLIENT_SECRET with your Cortex App credentials.
"""
import websocket, json, ssl, itertools

# ---------- CONFIG ----------
CLIENT_ID = "FgVsoeJ5NktN4sxZPSaG0noURJmTH0CXug09aEHW"  # your Client ID
CLIENT_SECRET = "pSAxu4ZKFuatiH244Ecxjv0AwcNHwibDIqUsGo55Z6kHsOn2dEoFIJlyHY543r5vwknL5Pi8fa6Oeu2QSCe5neUIrYCzvoDBAKspgsJmICaeWzfU5QnTDPwvTg8suR9f"
WS_URL = "wss://localhost:6868"
# ----------------------------

def req(ws, method, params=None):
    """Send a request and return the response"""
    req_id = 1
    msg = {"jsonrpc": "2.0", "id": req_id, "method": method}
    if params:
        msg["params"] = params
    
    ws.send(json.dumps(msg))
    response = ws.recv()
    return json.loads(response)

def main():
    print("[*] Connecting to", WS_URL)
    try:
        ws = websocket.create_connection(WS_URL, sslopt={"cert_reqs": ssl.CERT_NONE})
        print("[+] WebSocket connected")
        
        print("\n[*] Testing getCortexInfo...")
        response = req(ws, "getCortexInfo")
        print("Response:", json.dumps(response, indent=2))
        
        print("\n[*] Testing requestAccess...")
        response = req(ws, "requestAccess", {"clientId": CLIENT_ID, "clientSecret": CLIENT_SECRET})
        print("Response:", json.dumps(response, indent=2))
        
        print("\n[*] Testing authorize...")
        response = req(ws, "authorize", {"clientId": CLIENT_ID, "clientSecret": CLIENT_SECRET})
        print("Response:", json.dumps(response, indent=2))
        
        token = response.get("result", {}).get("cortexToken")
        if token:
            print("[+] Authorization successful - cortexToken obtained")
            
            print("\n[*] Testing queryHeadsets...")
            response = req(ws, "queryHeadsets", {"cortexToken": token})
            print("Response:", json.dumps(response, indent=2))
            
            headsets = response.get("result", [])
            if headsets:
                print(f"[+] Found {len(headsets)} headset(s)")
            else:
                print("[!] No headsets found - ensure your headset is connected to Emotiv App")
        else:
            print("[!] Authorization failed - no cortexToken received")
            
        ws.close()
        print("\n[+] API test completed")
        
    except Exception as e:
        print(f"[!] Error: {e}")
        print("\nTroubleshooting tips:")
        print("1. Make sure Emotiv App is running")
        print("2. Check that your headset is connected")
        print("3. Verify CLIENT_ID and CLIENT_SECRET are correct")
        print("4. Ensure you have the required permissions/licenses")

if __name__ == "__main__":
    main()