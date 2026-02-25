# FlowMeet

FlowMeet is a full-stack video conferencing app built with React, Node.js, Socket.IO, WebRTC, and MongoDB.
It supports authentication, meeting history, real-time video calls, chat, pinning participants, and participant management UI.

## Core Features

- User authentication: register, login, logout (token-based)
- Protected pages for authenticated users
- Create/join meeting by meeting code
- Meeting history tracking per user
- Multi-user real-time video calling (WebRTC + Socket signaling)
- In-call text chat with unread badge
- Pin participant view:
- One participant in large stage view
- Others in side strip (top-to-bottom)
- Remote user names shown from lobby-entered username
- Draggable local video preview
- Participants panel with host tag and local `(You)` indicator
- Local speaker mute toggle (mute incoming remote audio on your device only)
- Camera, mic, and screen-share controls

## Tech Stack

- Frontend: React (Vite), React Router, Material UI, Axios, Socket.IO Client
- Backend: Node.js, Express, Socket.IO, Mongoose, bcrypt, dotenv
- Database: MongoDB
- Realtime Media: WebRTC

## Project Structure

```text
video conferincing app/
  Frontend/
    src/
      pages/           # Landing, Auth, Home, History, VideoMeet
      contexts/        # Auth context and API calls
      components/      # Navbar
      utils/           # withAuth wrapper
  Backend/
    src/
      app.js
      routes/
      controllers/
      models/
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB database (local or cloud URI)

## Environment Variables

### Backend (`Backend/.env`)

```env
DB_URL=your_mongodb_connection_string
PORT=3000
```

### Frontend (`Frontend/.env`) optional

```env
VITE_SERVER_URL=http://localhost:3000
```

Notes:
- Auth API base URL is currently hardcoded in `Frontend/src/contexts/AuthContexts.jsx` as `http://localhost:3000/api/v1/users`.
- `VITE_SERVER_URL` is used by the meeting socket connection in `Frontend/src/pages/videomeet.jsx`.

## Setup and Run

### 1. Backend

```bash
cd Backend
npm install
node src/app.js
```

Optional dev mode:

```bash
npx nodemon src/app.js
```

### 2. Frontend

```bash
cd Frontend
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`

## Frontend Routes

- `/` landing page
- `/auth` login/register
- `/home` join meeting page (protected)
- `/history` meeting history page (protected)
- `/:url` active meeting room

## REST API Summary

Base URL: `http://localhost:3000/api/v1/users`

- `POST /register`
- body: `{ name, username, password }`
- `POST /login`
- body: `{ username, password }`
- returns token + user
- `POST /logout`
- body: `{ token }`
- `POST /addactivity`
- body: `{ token, meetingCode }`
- `GET /getactivity`
- query: `?token=...`

## Socket Events (Core)

- `join_call(path, username)` join meeting room
- `user_joined(id, clients, participants)` notify room users
- `signal(toId, message)` WebRTC SDP/ICE signaling
- `chat_message(data, sender)` chat broadcast
- `user_disconnected(id)` participant leave event

## Current Behavior Notes

- Host tag is assigned to the first participant in room order.
- Meeting history uses `meeting_code` with unique constraint in DB.
- If the same meeting code is saved again, backend may return conflict (409).

## Scripts

### Frontend

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

### Backend

- No run script is defined in `package.json` currently; use `node src/app.js` or `npx nodemon src/app.js`.
