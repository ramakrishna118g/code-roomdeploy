import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import RoomData from "../models/RoomData.js";
import ConferenceData from "../models/ConferenceData.js";

const socketRooms = new Map();

function cleanupSocket(io, socket, roomId) {
  socketRooms.delete(socket.id);
}

export function setupSocketIO(server) {
  const io = new Server(server, { cors: { origin: "*" } });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token provided"));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("client connected:", socket.id);

    // ── CodeRoom ──────────────────────────────────────────────────

    socket.on("create-room", async (data) => {
      const roomId = uuidv4();
      socket.join(roomId);
      const newroom = new RoomData({
        roomid: roomId,
        password: data.password,
        hostid: socket.id,
        roomtype: data.type,
      });
      await newroom.save();
      socket.emit("room-created", roomId);
    });

    socket.on("join-room", async (data) => {
      const dbroom = await RoomData.findOne({ roomid: data.roomId, password: data.pass });
      if (!dbroom) return socket.emit("error", "Invalid Room ID or password");
      socket.join(data.roomId);
      socket.to(data.roomId).emit("user-joined", socket.id);
      socket.emit("joined-success", data.roomId);
    });

    socket.on("message", ({ roomId, data }) => {
      socket.to(roomId).emit("message", { from: socket.id, data });
    });

    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      socket.to(roomId).emit("user-left", socket.id);
    });

    // ── Conference: Create & Join (No-Mediasoup fallback) ─────────

    socket.on("create-conference", async ({ type, password }, callback) => {
      const roomId = uuidv4();
      socket.join(roomId);
      socketRooms.set(socket.id, roomId);
      const nconf = new ConferenceData({ conftype: type, confid: roomId, hostid: socket.user.userId, password });
      await nconf.save();
      console.log("conf created:", roomId);
      callback({ roomId });
    });

    socket.on("join-conference", async ({ roomId, password }, callback) => {
      const conf = await ConferenceData.findOne({ confid: roomId, password });
      if (!conf) return callback({ error: "Wrong Room ID or password" });

      socket.join(roomId);
      socketRooms.set(socket.id, roomId);
      callback({ type: conf.conftype });
    });

    socket.on("leave-conference", ({ roomId }) => {
      cleanupSocket(io, socket, roomId);
      socket.leave(roomId);
    });

    // ── Disconnect ────────────────────────────────────────────────

    socket.on("disconnect", () => {
      const roomId = socketRooms.get(socket.id);
      cleanupSocket(io, socket, roomId);
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
}
