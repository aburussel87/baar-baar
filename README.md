# Real-time Chat Application

A complete production-ready real-time chat application built with a modern stack.

## Tech Stack
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Prisma, Socket.IO, JWT
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, TanStack Query, Socket.IO Client

## Prerequisites
- Node.js (v18+ recommended)
- `pnpm` package manager (`npm install -g pnpm`)
- Docker & Docker Compose (for PostgreSQL database)

## Installation & Setup

1. **Start the Database**
   Ensure Docker is running, then start the PostgreSQL database:
   ```bash
   docker-compose up -d
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pnpm install
   
   # Copy the example env file and update it if necessary
   cp .env.example .env
   
   # Run Prisma migrations
   pnpm prisma migrate dev
   
   # Start the development server
   pnpm dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   pnpm install
   
   # Copy the example env file
   cp .env.example .env
   
   # Start the development server
   pnpm dev
   ```

## Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/chating_app?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
```

### Frontend (`frontend/.env`)
```
VITE_API_URL="http://localhost:5000"
VITE_SOCKET_URL="http://localhost:5000"
```

## Production Build

### Backend
```bash
cd backend
pnpm build
pnpm start
```

### Frontend
```bash
cd frontend
pnpm build
```

## Socket.IO Real-time Events
- `connection` / `disconnect`
- `user_online` / `user_offline`
- `send_message` / `receive_message`
- `message_read`
- `typing` / `stop_typing`
