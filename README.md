# SafeRoute Delhi 🛡️
> **A safety-first navigation and personal-safety mobile app & backend designed for Delhi, India.**  
> Built for women and commuters traveling alone at night, SafeRoute prioritizes lighting, verified safe havens, and community presence over mere speed.

---

## 📱 Executive Summary & Core Deliverables

SafeRoute is a complete, production-grade emergency navigation system consisting of:
1. **Mobile App (React Native + Expo SDK 52, TypeScript, Expo Router)**:
   - Development-build ready (`expo-dev-client`) supporting background location, shake detection, camera/audio capture, and notifications.
   - Calming, trustworthy design system adhering to strict color tokens (`#1b1f3b` ink, `#fbfaf7` paper, `#1f9d6b` safe, `#e0a21b` caution, `#d9453d` danger) with full dark mode and Hindi localization.
   - Draggable bottom sheet with route comparisons, 0–100 safety score rings, weakest-stretch warnings, and score breakdown bars.
   - Live Trip Mode with HUD, background location tracking, and an interactive Trip Simulator for testing anomalies.
   - Anomaly State Machine (`NORMAL` $\to$ `SUSPICIOUS` $\to$ `CHECK_IN` $\to$ `ALERT`) with a 30s countdown ring, standard PIN dismissal, and silent Duress PIN.
   - One-gesture SOS (2-second hold, triple-shake, voice keyword, hardware button).
2. **Backend (Python FastAPI + WebSockets + SQLite/PostGIS)**:
   - High-performance async REST API with live WebSockets for real-time tracking coordinates.
   - 50-meter resolution safety scoring engine using cached OpenStreetMap Delhi POIs and dynamic time-decayed incident reports.
   - Public live-tracking page (`/track/:token`) rendered with Leaflet and live WebSocket moving dot, 30-minute trail, battery status, and "Call 112" emergency button.
   - Dispatcher & Operations Admin Console (`/admin?passcode=SafeDelhi2026`).
   - Hardware SOS endpoint (`POST /api/sos/hardware`) with Arduino/ESP32 firmware.
3. **Zero-Credentials Demo Mode**:
   - Operates fully out-of-the-box without requiring API keys, paid Google Maps billing, or third-party SMS credentials.

---

## 🚀 Quickstart: Running in 1 Command

### Prerequisites
- **Node.js** 18+ and **Python** 3.10+
- `pip` and `npm`

### Option A: Using NPM (Windows / macOS / Linux)
```bash
# Clone and enter workspace
cd mainSafeRouteHackathon

# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Start backend server & mobile app together
npm run dev
```

### Option B: Using Makefile (macOS / Linux)
```bash
make setup
make dev
```

### Option C: Manual Multi-Terminal Startup
**Terminal 1 (Backend Server):**
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Admin Console: [http://127.0.0.1:8000/admin?passcode=SafeDelhi2026](http://127.0.0.1:8000/admin?passcode=SafeDelhi2026)
- Health Check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

**Terminal 2 (Mobile App):**
```bash
cd app
npx expo start
```
- Press `w` to open in web browser.
- Press `a` to open in Android Emulator / device.
- Scan QR code with the Expo Go or Expo Development Client app.

---

## 📦 Building & Installing the Android APK

SafeRoute is configured for Android APK builds using **EAS Build** (cloud build, no local Android SDK required) and local Gradle.

### 1. EAS Cloud Build (Recommended - Zero Local SDK Setup)
`eas.json` is configured with the `preview` profile set to generate a direct `.apk` file:
```bash
# Install EAS CLI globally or run via npx
npx eas-cli login

# Run the preview build for Android
npx eas-cli build -p android --profile preview
```
- When the build finishes (typically ~5-8 minutes), EAS outputs a direct download URL for the standalone `SafeRoute.apk`.

### 2. Local Gradle Build (If Android SDK + JDK 17 are installed)
```bash
cd app
# Generate native android project files
npx expo prebuild --platform android

# Compile release APK
cd android
./gradlew assembleRelease
# On Windows PowerShell:
# .\gradlew.bat assembleRelease
```
The compiled APK will be generated at:
`app/android/app/build/outputs/apk/release/app-release.apk`

### 3. Steps to Install the APK on an Android Phone
#### Method A: Direct Phone Download (Easiest)
1. Open the EAS build link or download the APK directly onto your Android phone via Chrome / Drive.
2. Tap the downloaded `.apk` file.
3. If prompted with *"For your security, your phone is not allowed to install unknown apps from this source"*, tap **Settings** $\to$ toggle **Allow from this source**.
4. Tap **Install**, then tap **Open**.

#### Method B: Via USB Debugging (ADB)
1. Connect your Android phone to your computer with a USB cable.
2. Enable **Developer Options** and **USB Debugging** on the phone.
3. Run:
   ```bash
   adb devices
   adb install -r app-release.apk
   ```

---

## 🏛️ System Architecture

```
mainSafeRouteHackathon/
├── app/                           # React Native + Expo Mobile Application
│   ├── src/
│   │   ├── app/                   # Expo Router screens ((tabs), onboarding, tracking, etc.)
│   │   ├── components/ui/         # UI components (ScoreRing, RouteCard, SOSButton, etc.)
│   │   ├── hooks/                 # Native hardware hooks (useShakeDetection)
│   │   ├── i18n/                  # English & Hindi translation dictionaries
│   │   ├── services/              # API client & geocoding integration
│   │   ├── store/                 # Zustand state stores (trips, safety, simulator)
│   │   └── theme/                 # SafeRoute Design Tokens (light + dark mode)
│   ├── app.json                   # Android permissions, package name, plugins
│   └── eas.json                   # EAS APK build configuration
├── backend/                       # Python FastAPI Backend
│   ├── app/
│   │   ├── models/                # SQLAlchemy models (User, Trip, SOS, Report, Message)
│   │   ├── routes/                # Endpoints (auth, routing, tracking, sos, community, admin)
│   │   ├── schemas/               # Pydantic v2 validation schemas
│   │   ├── services/              # Scoring engine, OSM cache, Anomaly state machine, Notifications
│   │   ├── config.py              # Environment settings & thresholds
│   │   ├── db.py                  # Async SQLite connection pool
│   │   └── main.py                # FastAPI lifecycle & WebSocket dispatch
│   └── tests/                     # 15 Pytest unit & integration tests
├── data/                          # Delhi Geodata & Seed Scripts
│   ├── delhi_osm.json             # Cached OSM POIs (street lights, police, hospitals, shops)
│   ├── fetch_osm.py               # Overpass API extraction script for Delhi NCR
│   └── seed.py                    # Mock seed data (41 incidents, 15 volunteers, 3 demo users)
├── hardware/                      # Physical IoT Emergency Device
│   └── esp32_sos/
│       └── esp32_sos.ino          # ESP32 WiFi SOS button firmware
├── supabase/migrations/           # Optional Supabase PostGIS migration
│   └── 001_initial_schema.sql
├── Makefile                       # Unix build automation
└── package.json                   # Root orchestrator scripts
```

---

## 🧮 Safety Scoring Engine & Algorithms

The scoring engine evaluates routes sampled every **50 meters** across Delhi NCR:

$$\text{Segment Score} = \left(0.30 \times L + 0.25 \times A + 0.20 \times H - 0.25 \times I\right) \times N$$

Where:
- **$L$ (Lighting Score, 0–100):** Density of lit highways and tagged street lamps within 40m.
- **$A$ (Activity Score, 0–100):** Proximity to open commercial venues, restaurants, and convenience stores within 100m.
- **$H$ (Help Density, 0–100):** Proximity to 24/7 safe havens, police stations, hospitals, and metro stations within 500m.
- **$I$ (Incident Penalty, 0–100):** Time-decayed severity of community-reported hazards within 200m ($e^{-\Delta t / 30\text{ days}}$).
- **$N$ (Night Multiplier):** $0.70\times$ penalty during night hours (20:00 to 06:00).
- **Route Score:** $\mu - 0.5 \times \sigma$ (penalizes routes with volatile safety dips, ensuring consistent peace of mind).

### Segment Color Coding
- 🟢 **Safe ($\ge 75$):** Well-lit arterial thoroughfares with active establishments and safe havens.
- 🟡 **Caution ($50 - 74$):** Moderate lighting or transitional residential roads.
- 🔴 **Danger ($< 50$):** Dim, isolated, or hazard-flagged stretches. Includes weakest-stretch callout.

---

## 🚨 Anomaly Detection State Machine

The trip monitoring engine transitions deterministically across four states:

```
[ NORMAL ]
    │
    ▼ (Trigger: Deviation > 150m, Speed Spike, or IsolationForest Outlier)
[ SUSPICIOUS ]
    │
    ▼ (Trigger: Unusual Stop > 3 mins away from destination / Fall Spike > 24 m/s²)
[ CHECK_IN ] ──(PIN Dismissed)──> [ NORMAL ]
    │
    ├──(Duress PIN Entered)──────> [ SILENT ALERT ]
    │
    ▼ (30s Countdown Expired / "I Need Help" Pressed)
[ ALERT (SOS ACTIVE) ]
```

### Verified Anomaly Triggers
1. **Route Deviation:** Commuter drifts $> 150\text{ m}$ off the selected planned path.
2. **Unusual Stop:** Zero velocity for $> 180\text{ seconds}$ when $> 100\text{ m}$ from the final destination.
3. **Speed Jump:** Sudden transition from walking speed ($< 6\text{ km/h}$) to vehicular speed ($> 30\text{ km/h}$).
4. **Impact / Fall:** Accelerometer spike $> 24\text{ m/s}^2$ ($> 2.5\text{ g}$).
5. **Missed ETA:** Travel duration exceeds estimated arrival by $> 10\text{ minutes}$.
6. **Machine Learning:** `scikit-learn` IsolationForest acts as a secondary probabilistic signal.

---

## 🔒 Duress PIN & Anti-Coercion Protection

- **Normal PIN (`1234`):** Dismisses the check-in modal and resets state to `NORMAL`.
- **Duress PIN (`9999`):** Designed for situations where a commuter is coerced by an assailant to silence their phone. 
  - To an onlooker, the screen looks identical to a normal dismissal: it says *"Trip Resumed"* and hides the modal.
  - In the background, the app **silently triggers an SOS Event**: it logs emergency coordinates, dispatches tracking links to trusted contacts, notifies nearby volunteers, and flags the dispatcher console.

---

## 🛰️ Public Live-Tracking Web Dashboard

Whenever an SOS is triggered (or when starting an active trip with link-sharing enabled), a cryptographically signed URL is generated:
`http://localhost:8000/track/<token>`

**Features:**
- **Zero Login Required:** Anyone with the link (family, contacts, police) can view it on mobile or desktop.
- **Real-Time Moving Dot:** Connected via WebSockets (`ws://localhost:8000/ws/track/<token>`) with automatic HTTP polling fallback.
- **30-Minute Historical Breadcrumb Trail:** Displays path traveled.
- **Status Badges:** `TRAVELING`, `CHECK_IN_PENDING`, `SOS_ACTIVE`, or `ARRIVED_SAFELY`.
- **Hardware Telemetry:** Live battery percentage and timestamp of last signal.
- **Evidence Panel:** Displays captured audio recordings and photos when SOS is active.
- **One-Tap Emergency Dialing:** Direct button to dial **112** (Delhi Police Emergency Helpline).

---

## 🔌 Hardware SOS Button (ESP32 Firmware)

The repository includes ready-to-flash Arduino firmware for an ESP32 IoT safety pendant:
`hardware/esp32_sos/esp32_sos.ino`

### Wiring & Schematic
| Component | ESP32 GPIO Pin | Description |
| :--- | :--- | :--- |
| **Push Button** | `GPIO 4` | Active-LOW with internal pull-up (`INPUT_PULLUP`). |
| **Piezo Buzzer** | `GPIO 18` | Haptic/audible confirmation on SOS trigger. |
| **Status LED** | `GPIO 2` | Built-in LED indicates WiFi connection & dispatch state. |

### Configuration
1. Open `hardware/esp32_sos/esp32_sos.ino` in Arduino IDE.
2. Enter your WiFi SSID, Password, and Backend URL:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* server_url = "http://YOUR_SERVER_IP:8000/api/sos/hardware";
   const char* hardware_key = "saferoute-delhi-hw-secret-key-2025";
   ```
3. Flash the board. Pressing the button for $> 1.5\text{ seconds}$ fires a `POST /api/sos/hardware` request to initiate emergency dispatch.

---

## 📋 Decisions Recorded (Resolutions of Ambiguities)

1. **Map Engine Selection:** Picked OpenStreetMap Leaflet via WebView with seamless fallback to `react-native-maps`. This guarantees 100% functionality without requiring paid Google Maps Cloud billing or exposing private API keys in the APK.
2. **Background Tracking Screen-Lock Survival:** Implemented with `expo-location` and `expo-task-manager` registered to an Android Foreground Service with an ongoing persistent notification (`SafeRoute Active Protection`). Android OS will not kill the process during screen lock.
3. **Simulated Delhi Seed Data:** All 41 incident reports in `data/seed.py` are realistic mock clusters around key Delhi junctions (Connaught Place, Karol Bagh, Chandni Chowk, Hauz Khas) to illustrate scoring contrasts. They are explicitly marked as simulated demo data.
4. **Mock Communications:** Twilio and Expo Push operate in zero-credential mock mode by default. All outgoing SMS, WhatsApp, and Push dispatches are persisted to SQLite and displayed in the in-app *"Sent Messages"* screen and the `/admin` console.

---

## ⏱️ 3-Minute Guided Demo Script (For Judges & Evaluators)

| Time | Action | What to Observe |
| :--- | :--- | :--- |
| **0:00 – 0:30** | **Map & Route Planning**<br>Open the app. Search *"Hauz Khas Village"*. Toggle between *Walking* and *Driving*, or flip the *Night Mode* switch. | Three distinct route cards appear: **Safest** (score ~82), **Fastest** (score ~12), and **Balanced** (score ~47). Notice colored road segments and the weakest-stretch warning marker. |
| **0:30 – 1:00** | **Trip Mode & HUD**<br>Tap *Start Safest Route*. The Trip HUD appears with ETA, distance, live battery level, and large red SOS button. Open the Simulator Bar. | Commuter dot starts walking along the planned path in South Delhi. |
| **1:00 – 1:40** | **Anomaly & Check-in**<br>In the Simulator Bar, tap **Deviate** or **Stop 3 Mins**. | Within 10 seconds, the app triggers a high-priority haptic alert and displays the **"Are you okay?"** check-in modal with a 30-second countdown ring. |
| **1:40 – 2:10** | **Duress PIN vs Escalation**<br>Enter Duress PIN `9999` (or let the 30s timer expire). | Modal disappears with "Trip Resumed", but silently triggers emergency SOS! The Calm SOS modal activates with *"Help is on the way. Contacts & volunteers alerted."* |
| **2:10 – 2:40** | **Public Live Tracking View**<br>Open the tracking link in any desktop or phone browser: `http://localhost:8000/track/<token>`. | See the live moving dot on the Delhi map via WebSocket, battery indicator, SOS Active badge, and "Call 112" button. |
| **2:40 – 3:00** | **Dispatcher Admin View**<br>Open `http://localhost:8000/admin?passcode=SafeDelhi2026`. | View real-time active SOS events, trip statuses, and mock SMS/WhatsApp delivery logs. |

---

## 🧪 Automated Test Suite

Run backend unit and integration tests:
```bash
python -m pytest backend/tests/ -v
```
**Test Coverage Includes:**
- `test_scoring.py`: 50m spatial sampling, lighting weights, safe haven proximity, night multiplier.
- `test_anomaly.py`: State machine transitions, route deviation, stop triggers, fall spike, speed spike.
- `test_geo.py`: Haversine distance computations, bounding box validation, OSM POI indexing.
- `test_routes.py`: Health endpoint, geocoding autocomplete, route planning API, hardware SOS.

TypeScript Typecheck:
```bash
cd app
npx tsc --noEmit
```

---

## 📄 License
MIT License. Built for the SafeRoute Delhi Hackathon. Protect your community.
