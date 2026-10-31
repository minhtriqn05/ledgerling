import { Server } from "socket.io";
import { allowedOrigins } from "../config/origins.js";
import { authenticateToken } from "../middlewares/requireAuth.js";

// Real-time events with Socket.IO, on the same HTTP server as Express.
// Every signed-in device opens one socket, which joins the room of its user. An event goes to one room only, so a user
// never receives anything about another user. The events hold no data, just what changed: the client then asks the
// normal, protected API again.
// Until attachSocket has run (the Supertest tests, the seed script) every function below simply does nothing.

let io = null;

const roomOf = (userId) => `user:${userId}`;

export function attachSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins() },
  });

  // Runs for every connection, also after a reconnect. The checks are those of a normal request (see requireAuth).
  // The error code is the message: the client logs out on TOKEN_INVALID and keeps trying on anything else.
  io.use(async (socket, next) => {
    try {
      const { token } = socket.handshake.auth;
      if (!token) return next(new Error("TOKEN_MISSING"));
      socket.data.user = await authenticateToken(token);
      next();
    } catch (err) {
      next(new Error(err.code || "INTERNAL_ERROR"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(roomOf(socket.data.user.id));
  });

  return io;
}

export async function closeSocket() {
  await io?.close();
  io = null;
}

// Something of this resource changed: the devices of the user load it again.
// `except` is the socket of the device that made the change; it has already updated itself.
export function emitDataChanged(userId, resource, { except } = {}) {
  if (!io) return;
  const target = io.to(roomOf(userId));
  (except ? target.except(except) : target).emit("data:changed", { resource });
}

// A new notification: the bell adds one at once. The text is read from the API, like everything else.
export function emitNotification(userId, notification) {
  if (!io) return;
  io.to(roomOf(userId)).emit("notification:new", { id: String(notification._id), type: notification.type });
  emitDataChanged(userId, "notifications");
}

// The tokens of this user stopped working (log out of all devices, new password, disabled or deleted account):
// close the open sockets too, they would keep receiving events otherwise.
export function disconnectUser(userId) {
  io?.in(roomOf(userId)).disconnectSockets(true);
}
