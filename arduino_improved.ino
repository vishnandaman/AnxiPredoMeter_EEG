#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <ArduinoJson.h>

//////////////////////
// WiFi Credentials //
//////////////////////
const char* ssid = "Galaxy A15 5G 7E1D";       // 🔹 Change this
const char* password = "Password"; // 🔹 Change this

//////////////////////////
// Flask Server Details //
//////////////////////////
// 🔹 IMPORTANT: Change this to your computer's IP address
// Your computer IP is: 192.168.12.1
String serverURL = "http://192.168.12.1:5000/predict_combined"; // 🔹 Updated IP

///////////////////////
// MAX30105 & GSR Pin //
///////////////////////
MAX30105 particleSensor;
int gsrPin = 34; // Keep original pin

const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;

/////////////////////////
// Data Storage Arrays //
/////////////////////////
#define SAMPLE_COUNT 30
float spo2Readings[SAMPLE_COUNT];
float gsrReadings[SAMPLE_COUNT];
int sampleIndex = 0;
bool dataCollected = false;

////////////////////
// Debug Settings //
////////////////////
#define DEBUG_MODE true
#define WIFI_RETRY_LIMIT 20
#define HTTP_TIMEOUT 10000 // 10 seconds

////////////////////
// WiFi Functions //
////////////////////
void connectToWiFi() {
  Serial.println("\n🔄 ===== WIFI CONNECTION ATTEMPT =====");
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(ssid);
  Serial.print("🔑 Password: ");
  Serial.println(password);

  WiFi.begin(ssid, password);
  int retryCount = 0;
  
  while (WiFi.status() != WL_CONNECTED && retryCount < WIFI_RETRY_LIMIT) {
    delay(500);
    Serial.print(".");
    retryCount++;
    
    if (retryCount % 10 == 0) {
      Serial.println();
      Serial.printf("⏱️ Attempt %d/%d\n", retryCount, WIFI_RETRY_LIMIT);
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected Successfully!");
    Serial.print("📡 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("📡 Subnet Mask: ");
    Serial.println(WiFi.subnetMask());
    Serial.print("📡 Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("📡 DNS: ");
    Serial.println(WiFi.dnsIP());
    Serial.print("📶 Signal Strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    Serial.printf("⏱️ Tried %d times\n", retryCount);
    Serial.println("🔧 Troubleshooting tips:");
    Serial.println("   1. Check if WiFi credentials are correct");
    Serial.println("   2. Ensure both devices are on same network");
    Serial.println("   3. Check if WiFi router is working");
    Serial.println("   4. Try restarting the ESP32");
  }
}

////////////////////////
// Network Test Functions //
////////////////////////
void testNetworkConnectivity() {
  Serial.println("\n🔍 ===== NETWORK CONNECTIVITY TEST =====");
  
  // Test WiFi status
  Serial.print("📡 WiFi Status: ");
  switch(WiFi.status()) {
    case WL_CONNECTED:
      Serial.println("CONNECTED ✅");
      break;
    case WL_NO_SSID_AVAIL:
      Serial.println("NO SSID AVAILABLE ❌");
      break;
    case WL_CONNECT_FAILED:
      Serial.println("CONNECTION FAILED ❌");
      break;
    case WL_WRONG_PASSWORD:
      Serial.println("WRONG PASSWORD ❌");
      break;
    case WL_IDLE_STATUS:
      Serial.println("IDLE ⏸️");
      break;
    case WL_DISCONNECTED:
      Serial.println("DISCONNECTED ❌");
      break;
    default:
      Serial.println("UNKNOWN STATUS ❓");
  }
  
  // Test server connectivity
  Serial.print("🌐 Testing server connectivity to: ");
  Serial.println(serverURL);
  
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT);
  
  // Test the test endpoint first
  String testURL = serverURL.substring(0, serverURL.lastIndexOf('/')) + "/test";
  Serial.print("🧪 Testing endpoint: ");
  Serial.println(testURL);
  
  http.begin(testURL);
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    Serial.printf("✅ Test endpoint response: %d\n", httpResponseCode);
    String response = http.getString();
    Serial.print("📥 Response: ");
    Serial.println(response);
  } else {
    Serial.printf("❌ Test endpoint failed: %d\n", httpResponseCode);
    Serial.printf("❌ Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}

////////////////////////
// Median Calculation //
////////////////////////
float calculateMedian(float arr[], int size) {
  float temp[size];
  memcpy(temp, arr, sizeof(temp));

  // Simple bubble sort
  for (int i = 0; i < size - 1; i++) {
    for (int j = 0; j < size - i - 1; j++) {
      if (temp[j] > temp[j + 1]) {
        float t = temp[j];
        temp[j] = temp[j + 1];
        temp[j + 1] = t;
      }
    }
  }

  if (size % 2 == 0) {
    return (temp[size / 2 - 1] + temp[size / 2]) / 2.0;
  } else {
    return temp[size / 2];
  }
}

/////////////////////////////
// Send Data to Flask API  //
/////////////////////////////
void sendDataToServer(float spo2Median, float gsrMedian) {
  Serial.println("\n📤 ===== SENDING DATA TO SERVER =====");
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Not connected to WiFi!");
    return;
  }

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT);
  
  Serial.print("🌐 Connecting to: ");
  Serial.println(serverURL);
  
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-Arduino/1.0");

  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["spo2"] = round(spo2Median * 100) / 100.0; // Round to 2 decimal places
  doc["gsr"] = round(gsrMedian * 10000) / 10000.0; // Round to 4 decimal places
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.print("📦 JSON Payload: ");
  Serial.println(jsonPayload);
  Serial.print("📏 Payload size: ");
  Serial.print(jsonPayload.length());
  Serial.println(" bytes");

  Serial.println("🚀 Sending POST request...");
  int httpResponseCode = http.POST(jsonPayload);

  Serial.printf("📥 HTTP Response Code: %d\n", httpResponseCode);
  
  if (httpResponseCode > 0) {
    Serial.println("✅ Request sent successfully!");
    String response = http.getString();
    Serial.print("📥 Server Response: ");
    Serial.println(response);
    
    // Try to parse JSON response
    StaticJsonDocument<1024> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error) {
      Serial.println("✅ JSON response parsed successfully");
      if (responseDoc.containsKey("primary_prediction")) {
        Serial.print("🧠 Primary Prediction: ");
        Serial.println(responseDoc["primary_prediction"].as<String>());
      }
    } else {
      Serial.print("⚠️ JSON parsing failed: ");
      Serial.println(error.c_str());
    }
  } else {
    Serial.print("❌ HTTP request failed: ");
    Serial.println(httpResponseCode);
    Serial.print("❌ Error: ");
    Serial.println(http.errorToString(httpResponseCode));
    
    // Detailed error analysis
    switch(httpResponseCode) {
      case -1:
        Serial.println("🔍 Error -1: Connection failed. Possible causes:");
        Serial.println("   - Server not running");
        Serial.println("   - Wrong IP address");
        Serial.println("   - Firewall blocking connection");
        Serial.println("   - Network connectivity issues");
        break;
      case -2:
        Serial.println("🔍 Error -2: Request timeout");
        break;
      case -3:
        Serial.println("🔍 Error -3: Invalid response");
        break;
      case -4:
        Serial.println("🔍 Error -4: Empty response");
        break;
      default:
        Serial.println("🔍 Unknown error code");
    }
  }

  http.end();
}

/////////////////
// Setup Code  //
/////////////////
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n🚀 ===== ESP32 BIOMETRIC SENSOR SETUP =====");
  Serial.println("📱 Device: ESP32 with MAX30105 + GSR");
  Serial.println("🎯 Target: Flask ML Server");
  Serial.printf("🌐 Server URL: %s\n", serverURL.c_str());
  
  // Connect to WiFi
  connectToWiFi();
  
  // Test network connectivity
  if (WiFi.status() == WL_CONNECTED) {
    testNetworkConnectivity();
  }

  // Initialize MAX30105
  Serial.println("\n🔧 ===== SENSOR INITIALIZATION =====");
  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("❌ MAX30105 not found. Check connections.");
    Serial.println("🔧 Troubleshooting:");
    Serial.println("   - Check I2C connections (SDA, SCL)");
    Serial.println("   - Verify power supply");
    Serial.println("   - Check if sensor is properly seated");
    while (1);
  }
  
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x2F);
  particleSensor.setPulseAmplitudeIR(0x2F);
  particleSensor.setPulseAmplitudeGreen(0);

  Serial.println("✅ MAX30105 Initialized Successfully");
  Serial.println("✅ GSR Sensor Ready (Pin 34)");
  
  Serial.println("\n📊 ===== READY TO COLLECT DATA =====");
  Serial.printf("📈 Will collect %d samples before sending\n", SAMPLE_COUNT);
}

////////////////
// Loop Code  //
////////////////
void loop() {
  // --- Read MAX30105 ---
  long irValue = particleSensor.getIR();
  long redValue = particleSensor.getRed();

  float spo2 = 0;
  if (irValue >= 50000) {
    if (checkForBeat(irValue)) {
      long delta = millis() - lastBeat;
      lastBeat = millis();

      float beatsPerMinute = 60 / (delta / 1000.0);

      if (beatsPerMinute < 255 && beatsPerMinute > 20) {
        rates[rateSpot++] = (byte)beatsPerMinute;
        rateSpot %= RATE_SIZE;
      }
    }
    float ratio = (float)redValue / (float)irValue;
    spo2 = 110.0 - 25.0 * ratio;
  } else {
    spo2 = 0;
  }

  // --- Read GSR ---
  int rawGsr = analogRead(gsrPin);
  float gsrValue = rawGsr / 4095.0;

  // Store readings until 30 samples are collected
  if (sampleIndex < SAMPLE_COUNT) {
    spo2Readings[sampleIndex] = spo2;
    gsrReadings[sampleIndex] = gsrValue;
    sampleIndex++;
    
    if (DEBUG_MODE) {
      Serial.printf("📊 Sample %d/%d - SpO2: %.1f, GSR: %.4f, IR: %ld\n", 
                   sampleIndex, SAMPLE_COUNT, spo2, gsrValue, irValue);
    }
  }

  // Once 30 samples are collected, compute medians & send to server
  if (sampleIndex == SAMPLE_COUNT && !dataCollected) {
    Serial.println("\n📊 ===== PROCESSING COLLECTED DATA =====");
    
    float spo2Median = calculateMedian(spo2Readings, SAMPLE_COUNT);
    float gsrMedian = calculateMedian(gsrReadings, SAMPLE_COUNT);

    Serial.printf("📌 Median SpO2: %.2f | Median GSR: %.4f\n", spo2Median, gsrMedian);
    
    // Show data range for debugging
    float spo2Min = spo2Readings[0], spo2Max = spo2Readings[0];
    float gsrMin = gsrReadings[0], gsrMax = gsrReadings[0];
    
    for (int i = 1; i < SAMPLE_COUNT; i++) {
      if (spo2Readings[i] < spo2Min) spo2Min = spo2Readings[i];
      if (spo2Readings[i] > spo2Max) spo2Max = spo2Readings[i];
      if (gsrReadings[i] < gsrMin) gsrMin = gsrReadings[i];
      if (gsrReadings[i] > gsrMax) gsrMax = gsrReadings[i];
    }
    
    Serial.printf("📊 SpO2 Range: %.1f - %.1f\n", spo2Min, spo2Max);
    Serial.printf("📊 GSR Range: %.4f - %.4f\n", gsrMin, gsrMax);

    sendDataToServer(spo2Median, gsrMedian);
    dataCollected = true; // Prevent sending repeatedly
    
    Serial.println("\n✅ Data collection and transmission complete!");
    Serial.println("🔄 Reset the device to collect new data");
  }

  delay(200);
}
