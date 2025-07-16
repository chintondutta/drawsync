# DrawSync

A high-performance backend for a real-time collaborative drawing and chat application. Features JWT auth, multi-room management, and real-time collaboration using WebSocket and Redis pub/sub/queues. Built for scalability and developer experience.


## Tech Stack

- **Language:** TypeScript
- **Backend:** Express.js
- **Database:** PostgreSQL (via Prisma)
- **Realtime:** WebSocket (`ws`)
- **Cache/Queue:** Redis (`ioredis`)
- **Auth:** Passport.js + JWT
- **Validation:** Zod
- **Monorepo:** TurboRepo (`apps/`, `packages/`)


## Features

- User authentication (JWT)
- Room creation, join, leave, delete
- WebSocket-powered real-time sync:
  - Canvas diff updates
  - Chat
  - Cursor tracking
  - Presence awareness
- Redis queues for canvas
- Redis pub/sub for real-time events
- Modular and production-ready structure


## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/chintondutta/drawsync.git
cd drawsync
pnpm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

```env
packages/db/.env : DATABASE_URL=your_postgreSQL_url_here
packages/cache/.env : REDIS_URL=your_redis_url_here
packages/auth/.env : JWT_SECRET=your_jwt_secret
```

### 3. Start Dev Servers

```bash
turbo run dev
```

- REST API → `http://localhost:3000`
- WebSocket → `ws://localhost:8080`


## Testing Guide 


### REST API Endpoints

BASE_URL = localhost:3000

1. POST /signup
    ```json
    {
    "email": "test@example.com",
    "password": "test123"
    }
    ```

2. POST /signin
    ```json
    {
    "email": "test@example.com",
    "password": "test123"
    }
    ```
    Response:
    ```json
    {
    "token": "<JWT_TOKEN>"
    }
    ```
    Use in all protected routes:

Authorization: Bearer <JWT_TOKEN>

3. POST /room
    ```json
    {
    "slug": "team-room"
    }
    ```

4. POST /room/slug/join

5. POST /room/slug/leave

6. DELETE /room/:roomId


### WebSocket API

BASE_URL = localhost:8080?token=<JWT_TOKEN>

1. Canvas

    **Add Element** 
    ```json
    {
    "type": "canvas-diff",
    "roomId": "ROOM_ID",
    "diff": {
        "action": "add",
        "id": "rect-001",
        "data": {
        "id": "rect-001",
        "type": "rectangle",
        "x": 100,
        "y": 150,
        "width": 200,
        "height": 100,
        "color": "#2196F3",
        "version": 1,
        "versionNonce": 1234,
        "updatedAt": 1720901000
        }
    }
    }
    ```

    **Update Element**
    ```json
    {
    "type": "canvas-diff",
    "roomId": "ROOM_ID",
    "diff": {
        "action": "update",
        "id": "rect-001",
        "data": {
        "x": 300,
        "y": 200,
        "color": "#4CAF50",
        "version": 2,
        "versionNonce": 5678,
        "updatedAt": 1720902000
        }
    }
    }
    ```

    **Delete Element**
    ```json
    {
    "type": "canvas-diff",
    "roomId": "ROOM_ID",
    "diff": {
        "action": "delete",
        "id": "rect-001",
        "data": {
        "version": 3,
        "versionNonce": 7890,
        "updatedAt": 1720903000
        }
    }
    }
    ```

**Versioning & Conflict Resolution**

Each canvas element carries:

version: increments on every change
versionNonce: random number to break ties if versions are equal
updatedAt: server time

The backend merges incoming updates only if: The version is higher than the current or version is equal but versionNonce is higher. This avoids overwrite conflicts in concurrent edits.

2. Chat
    ```json
    {
    "type": "message",
    "roomId": "ROOM_ID",
    "message": "Hello team!"
    }
    ```

3. Cursor
    ```json
    {
    "type": "cursor-update",
    "roomId": "ROOM_ID",
    "x": 520,
    "y": 340
    }
    ```
