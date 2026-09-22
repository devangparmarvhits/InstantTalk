# InstantTalk

Real-time chat application with 1-on-1 messaging, group chats, voice/video calls (WebRTC), and live stream monitoring — built with React, Node.js, Express, MongoDB, and Socket.IO.

## Tech Stack

**Frontend**
- React 18 + Vite
- React Router, Axios
- Socket.IO Client
- WebRTC for voice/video calls

**Backend**
- Node.js + Express
- MongoDB (Mongoose) + Atlas
- Socket.IO (real-time messaging, presence, calls)
- JWT auth + Google OAuth (Passport)
- Nodemailer (email verification / OTP)
- Swagger UI (API docs)

## Features

- User authentication (register, login, email/OTP verification, Google OAuth, refresh tokens)
- 1-on-1 real-time chat (delivery/read receipts, typing indicators, edit/delete/forward/pin, reactions, mentions)
- Group chats (create, manage members/admins, permissions, mute, invite link, pinned messages)
- Voice & video calls (1-on-1 and group) via WebRTC with STUN/TURN support
- Call history & missed-call tracking
- Live stream monitoring
- Profile management (avatar upload, privacy/settings)
- Swagger API docs at `/api-docs`

## Project Structure

```
InstantTalk/
├── backend/                 # Express + Socket.IO API
│   └── src/
│       ├── config/          # env, db, passport, email, swagger
│       ├── controllers/     # request handlers
│       ├── middleware/      # auth, error handling
│       ├── models/          # Mongoose schemas
│       ├── routes/          # API routes
│       ├── services/        # business logic
│       ├── socket/          # Socket.IO handlers
│       └── utils/           # helpers, logger
├── frontend/                # React + Vite app
│   └── src/
│       ├── components/      # UI components
│       ├── context/         # global state (auth, chat, call, etc.)
│       ├── hooks/           # custom hooks
│       ├── pages/           # route pages
│       ├── services/        # API + socket clients
│       └── utils/           # helpers
└── package.json             # root scripts
```

## Setup (Local Development)

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas connection string)

### 1. Clone & install

```bash
git clone <repo-url>
cd InstantTalk
npm run install:all
```

### 2. Backend configuration

Copy `backend/.env` and set the values:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/instanttalk
# or your Atlas connection string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM=InstantTalk <no-reply@instanttalk.com>
```

### 3. Frontend configuration

Copy `frontend/.env`:

```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
# Optional WebRTC TURN credentials
# VITE_TURN_URL=turn:your-turn-server.com:3478
# VITE_TURN_USERNAME=your-turn-username
# VITE_TURN_CREDENTIAL=your-turn-credential
```

### 4. Run

```bash
npm run dev:backend   # starts backend on http://localhost:5000
npm run dev:frontend  # starts frontend on http://localhost:5173
```

Or from each directory:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

### Scripts

| Command | Description |
| --- | --- |
| `npm run install:all` | Install backend + frontend dependencies |
| `npm run dev:backend` | Start backend dev server |
| `npm run dev:frontend` | Start frontend dev server |
| `npm run build` (frontend) | Production build (outputs to `frontend/dist`) |

## API Docs

Swagger UI is available at `http://localhost:5000/api-docs` (or at the deployed backend URL).

## Deployment (Render)

### Backend (Web Service)
- **Root Directory**: `backend`
- **Build Command**: (none — dependencies installed automatically)
- **Start Command**: `npm start` or `node src/server.js`
- **Env vars**: `MONGO_URI` (Atlas), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL`, `SMTP_*`, `GOOGLE_*`
- Whitelist Render's outbound IPs (or `0.0.0.0/0`) in MongoDB Atlas → Network Access.

### Frontend (Static Site)
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Env vars (build-time)**: `VITE_API_URL=https://<your-backend>.onrender.com`, `VITE_SOCKET_URL=https://<your-backend>.onrender.com`
- Add a **Rewrite Rule** (`/*` → `/index.html`, Action: Rewrite) so client-side routes work on refresh/deep links.

## License

Private project.