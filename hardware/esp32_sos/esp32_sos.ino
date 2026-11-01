/*
  SafeRoute Delhi - ESP32 Physical Emergency SOS Button Firmware
  
  Features:
  - Connects to WiFi
  - Pushbutton with software debounce (Pin GPIO 4, active LOW with internal pullup)
  - Emergency SOS Trigger: 2-second sustained press
  - Buzzer feedback (GPIO 18): single chirp on boot, rapid warning beeps during hold, solid tone on trigger
  - Cancel SOS Trigger: 5-second long hold when active
  - Sends HTTP POST to SafeRoute Backend endpoint: /api/sos/hardware
  
  Wiring Diagram:
  - Pushbutton Pin A -> GPIO 4
  - Pushbutton Pin B -> GND
  - Piezo Buzzer Positive (+) -> GPIO 18
  - Piezo Buzzer Negative (-) -> GND
  - Status LED (optional)    -> GPIO 2 (or built-in LED)
*/

#include <WiFi.h>
#include <HTTPClient.h>

// WiFi Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// SafeRoute Backend Configuration
const char* SERVER_URL = "http://192.168.1.100:8000/api/sos/hardware";
const char* DEVICE_ID = "ESP32-DELHI-SAFE-01";
const char* API_KEY   = "SafeRouteHardwareSecret2026";

// Pin Definitions
const int BUTTON_PIN = 4;
const int BUZZER_PIN = 18;
const int LED_PIN    = 2;

// Press Durations (ms)
const unsigned long DEBOUNCE_DELAY_MS = 50;
const unsigned long TRIGGER_HOLD_MS   = 2000; // 2 seconds hold to trigger
const unsigned long CANCEL_HOLD_MS    = 5000; // 5 seconds hold to cancel

bool isEmergencyActive = false;
unsigned long buttonDownTime = 0;
bool isButtonPressed = false;

void playTone(int freq, int durationMs) {
  tone(BUZZER_PIN, freq, durationMs);
  delay(durationMs);
  noTone(BUZZER_PIN);
}

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  digitalWrite(LED_PIN, LOW);
  noTone(BUZZER_PIN);

  // Boot chirp
  playTone(2000, 150);
  delay(100);
  playTone(2500, 150);

  Serial.println("\n[SafeRoute] Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[SafeRoute] WiFi connected successfully!");
    Serial.print("[SafeRoute] IP Address: ");
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH);
    playTone(3000, 300);
  } else {
    Serial.println("\n[SafeRoute] WiFi connection timed out. Ready in offline standby.");
  }
}

void triggerEmergencySOS() {
  Serial.println("\n[SafeRoute ALERT] Triggering SOS via HTTP API...");
  
  // Rapid alert buzzer sequence
  for (int i = 0; i < 4; i++) {
    playTone(3200, 80);
    delay(60);
  }

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", API_KEY);

    // Payload: Device ID + GPS coordinates (Delhi Default / GPS module)
    String payload = "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"lat\":28.6139,\"lng\":77.2090,\"battery_level\":95}";
    int httpResponseCode = http.POST(payload);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("[SafeRoute] Response code: ");
      Serial.println(httpResponseCode);
      Serial.println(response);
      isEmergencyActive = true;
      digitalWrite(LED_PIN, HIGH);
    } else {
      Serial.print("[SafeRoute ERROR] HTTP POST failed: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("[SafeRoute ERROR] Cannot dispatch SOS: WiFi disconnected!");
  }
}

void cancelEmergencySOS() {
  Serial.println("\n[SafeRoute] Emergency SOS Cancelled by user.");
  isEmergencyActive = false;
  // Descending tones for safe cancellation
  playTone(2000, 200);
  delay(100);
  playTone(1200, 400);
  digitalWrite(LED_PIN, LOW);
}

void loop() {
  int buttonReading = digitalRead(BUTTON_PIN);

  // Active LOW button press (pulled up to 3.3V)
  if (buttonReading == LOW) {
    if (!isButtonPressed) {
      isButtonPressed = true;
      buttonDownTime = millis();
    } else {
      unsigned long holdDuration = millis() - buttonDownTime;

      // Provide audio feedback during hold
      if (!isEmergencyActive && holdDuration > 500 && holdDuration < TRIGGER_HOLD_MS) {
        if ((millis() / 250) % 2 == 0) {
          tone(BUZZER_PIN, 1800, 30);
        }
      }

      // Check for Trigger threshold (2s)
      if (!isEmergencyActive && holdDuration >= TRIGGER_HOLD_MS) {
        triggerEmergencySOS();
      }

      // Check for Cancel threshold (5s hold when already active)
      if (isEmergencyActive && holdDuration >= CANCEL_HOLD_MS) {
        cancelEmergencySOS();
        buttonDownTime = millis(); // reset
      }
    }
  } else {
    // Button released
    if (isButtonPressed) {
      isButtonPressed = false;
      noTone(BUZZER_PIN);
    }
  }

  delay(20);
}
