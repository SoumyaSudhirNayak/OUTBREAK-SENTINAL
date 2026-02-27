# 🌍 Rural Health-Camp Logistics Admin Dashboard

A futuristic AI command-center admin portal with a real 3D interactive globe, live outbreak heatmaps, animated location pins, and cinematic camera transitions.

---

## 🚀 Quick Start

### 1. Backend (Port 3001)
```bash
cd backend
npm install
node index.js
```

### 2. Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173/** in your browser.

---

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React (Vite), Tailwind CSS v4, Framer Motion |
| 3D Globe | `react-globe.gl` (Three.js) |
| State | Zustand |
| Realtime | Socket.io |
| Backend | Node.js + Express |

---

## 🎮 Globe Interactions

| Action | Behavior |
|---|---|
| **Drag** | Rotate globe with inertia |
| **Scroll** | Zoom in / out |
| **Click pin** | Camera flies to location (1.8s) |
| **Click sidebar item** | Globe rotates to that outbreak |
| **Idle 3s** | Auto-rotation resumes |

---

## 📁 Project Structure

```
rural-health-admin/
├── backend/
│   └── index.js          # Express + Socket.io mock server
└── frontend/
    └── src/
        ├── App.jsx               # Main layout
        ├── components/
        │   ├── Globe3D.jsx       # Interactive 3D globe
        │   └── LocalMap3D.jsx    # Local region map view
        ├── hooks/
        │   └── useSocket.js      # Socket.io client hook
        └── store/
            └── outbreakStore.js  # Zustand global state
```

---

## 🔌 Connecting a Real Backend

1. Update `SOCKET_URL` in `frontend/src/hooks/useSocket.js`
2. Replace mock data in `backend/index.js` with your real API/DB calls
3. Ensure your `NEW_OUTBREAK` event emits the same shape:
```json
{
  "id": 1,
  "lat": 17.385,
  "lng": 78.486,
  "severity": 85,
  "disease": "Dengue",
  "affected": 120,
  "locationName": "Village A"
}
```
