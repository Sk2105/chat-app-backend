# Realtime Chat App Backend (Node + Express + Socket.IO + Mongodb)

## Features
- JWT auth (register/login)
- 1:1 direct messaging
- Group/room chat
- Typing indicators
- Delivered & seen receipts
- Message history via REST (pagination)

## Setup

```bash
cd chat-app-backend
npm install
```

Then Setup `.env`
```env
MONGO_URI=......
JWT_SECRET=.....
```


Then Run
```
npm run dev            # or npm start
```

Requires a running MongoDB instance (local or Atlas) — set `MONGO_URI` accordingly.

## REST API

| Method | Endpoint                  | Auth | Description                |
|--------|---------------------------|------|-----------------------------|
| POST   | /api/auth/register        | No   | Create account, returns JWT |
| POST   | /api/auth/login           | No   | Login, returns JWT          |
| GET     | /api/auth/me              | Yes | Get current User data       |
| GET    | /api/messages/:userId     | Yes  | 1:1 chat history            |
| GET    | /api/messages/room/:roomId | Yes | Group chat history          |
| POST   | /api/rooms                | Yes  | Create group room            |
| GET    | /api/rooms                | Yes  | List rooms you belong to     |

Send JWT as `Authorization: Bearer <token>`.

## Socket.IO events

**Emit (client → server)**
- `send_message` `{ receiverId, message }` → ack callback with saved message
- `room_message` `{ roomId, message }` → ack callback with saved message
- `join_room` `roomId`
- `leave_room` `roomId`
- `typing` / `stop_typing` `{ receiverId }` or `{ roomId }`
- `message_seen` `{ messageId, senderId }`

**Listen (server → client)**
- `receive_message` — new 1:1 message
- `room_message` — new group message
- `typing` / `stop_typing`
- `message_seen`
- `user_online` / `user_offline` `{ userId }`

## Scaling notes
- Run multiple Node instances behind a load balancer? Add `@socket.io/redis-adapter`
  so rooms/broadcasts work across instances, and move `onlineUsers` tracking into Redis.
- Consider rate-limiting the `send_message` event to prevent spam/flooding.
- Add message pagination cursors (createdAt-based) instead of skip/limit at scale.
