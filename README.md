# 🚀 CodeRoom (Collabin) - Real-Time Collaborative Editor & AI Code Reviewer

An all-in-one real-time collaborative code editor platform powered by **Yjs CRDTs**, **Monaco Editor**, **Google Gemini AI**, **Judge0 Code Execution**, and **Mediasoup SFU WebRTC Audio/Video Conferencing**.

---

## ✨ Features

- **⚡ Real-Time Collaborative Editing**: Conflict-free collaborative text editing using **Yjs CRDTs** and **Y-Monaco**, featuring live multiplayer cursor presence and selection tracking.
- **🤖 AI-Powered Code Review**: Instant automated code review using **Google Gemini 3.5 & 2.5 Flash API**, providing actionable feedback on bugs, time/space complexity, readability, and missing edge cases.
- **▶ Multi-Language Code Execution**: Execute code directly inside the browser using **Judge0 API** supporting JavaScript, Python, Java, C++, and TypeScript with a bottom terminal drawer output.
- **📹 WebRTC Video & Audio Conferencing**: Integrated low-latency multi-party audio and video calling powered by **Mediasoup SFU** (Selective Forwarding Unit).
- **🔒 Google OAuth 2.0 Authentication**: One-click passwordless authentication using Google Sign-In alongside standard account creation.
- **💾 Persistent Editor Sessions**: Document states persist across server restarts via LevelDB (`y-leveldb`).
- **🎨 Glassmorphic Dark UI**: Modern dark theme UI built with responsive layout components.

---

## 🛠 Tech Stack

### **Frontend (`/collabeditor`)**
- **Framework**: React 19 + Vite
- **Editor**: `@monaco-editor/react` (Monaco Editor)
- **Collaboration**: `yjs`, `y-monaco`, `y-websocket`
- **Video/Audio**: `mediasoup-client`
- **Authentication**: `@react-oauth/google`
- **Styling**: CSS Modules & Glassmorphic UI

### **Backend (`/backend`)**
- **Runtime**: Node.js + Express (ES Modules)
- **Database**: MongoDB (via Mongoose)
- **WebSockets & Signaling**: Socket.IO & `y-websocket` server
- **Media Streaming**: `mediasoup` SFU worker & router
- **AI Integration**: `@google/genai` (Google Gemini API SDK)
- **Security & Auth**: JWT, bcrypt, `google-auth-library`

---

## 📂 Project Structure

```
CodeRoom/
├── backend/                  # Node.js + Express Server
│   ├── config/               # Database, Gemini AI, & env configurations
│   ├── models/               # Mongoose Schemas (User, RoomData, ConferenceData)
│   ├── routes/               # API Routes (authRoutes, aiRoutes)
│   ├── services/             # Core Services (mediasoupService, socketService, yjsService)
│   ├── server.js             # Express & HTTP Server Entry Point
│   └── package.json
│
└── collabeditor/             # React 19 + Vite Client Application
    ├── src/
    │   ├── assets/           # Logos & static media assets
    │   ├── components/       # Shared UI Components (Navbar, Sidebar)
    │   ├── pages/            # Application Page Views
    │   │   ├── Login/        # OAuth & Account Login / Signup
    │   │   ├── Dashboard/    # Room Creation & Joining Dashboard
    │   │   ├── Editor/       # Monaco Editor + Bottom Terminal + AI Review
    │   │   ├── Conference/   # Mediasoup Video & Audio Call Rooms
    │   │   └── History/      # User History & Session Logs
    │   ├── services/         # Socket.IO client singleton instance
    │   ├── App.jsx           # React Router route mapping
    │   └── main.jsx          # App root & GoogleOAuthProvider
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.x or v20.x installed
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or MongoDB Atlas URI
- **Google Cloud OAuth Client ID**: Obtained from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **Google Gemini API Key**: Obtained from [Google AI Studio](https://aistudio.google.com/)

---

### 1. Setup Backend

Navigate to the `backend` directory and create a `.env` file:

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=1234
DATABASE_URL=mongodb://localhost:27017/collabdb
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret_key_here
PUBLIC_IP=127.0.0.1
GEMINI_API_KEY=your_google_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
```

Start the backend server:

```bash
npm start
```

---

### 2. Setup Frontend

Open a new terminal window, navigate to `collabeditor`, and install dependencies:

```bash
cd collabeditor
npm install
```

Create a `.env` file inside `collabeditor/`:

```env
VITE_BACKEND_URL=http://localhost:1234
VITE_WS_URL=ws://localhost:1234
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Start the Vite development server:

```bash
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🌐 Deployment Guide

### Deploying Backend on Render

1. Create a **Web Service** on Render pointing to your backend repository.
2. Set **Root Directory** to `backend`.
3. Set **Build Command** to `npm install --jobs=1`.
4. Set **Start Command** to `node server.js`.
5. Add the following **Environment Variables** in Render:
   - `MEDIASOUP_BUILD_CONCURRENCY` = `1` *(Prevents memory errors during C++ compilation)*
   - `MAKEFLAGS` = `-j1`
   - `NODE_VERSION` = `20.18.0`
   - `DATABASE_URL` = `your_mongodb_atlas_connection_string`
   - `JWT_SECRET` = `your_secret`
   - `GOOGLE_CLIENT_ID` = `your_google_client_id`
   - `GEMINI_API_KEY` = `your_gemini_key`
   - `FRONTEND_URL` = `your_deployed_frontend_url`

### Deploying Frontend on Vercel

1. Create a **New Project** on Vercel pointing to the `collabeditor` directory.
2. Set Environment Variables:
   - `VITE_BACKEND_URL` = `https://your-backend-service.onrender.com`
   - `VITE_WS_URL` = `wss://your-backend-service.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID` = `your_google_client_id`
3. Click **Deploy**.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
