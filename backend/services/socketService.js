import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import RoomData from "../models/RoomData.js";
import ConferenceData from "../models/ConferenceData.js";
import { getRouter } from "./mediasoupService.js";

const transports = new Map();
const producers = new Map();
const consumers = new Map();
const socketRooms = new Map();

const ANNOUNCED_IP = process.env.PUBLIC_IP || "192.168.1.39";

function getProducersInRoom(roomId, excludeSocketId) {
  const result = [];
  for (const [producerId, data] of producers.entries()) {
    if (data.roomId === roomId && data.socketId !== excludeSocketId) {
      result.push(producerId);
    }
  }
  return result;
}

function cleanupSocket(io, socket, roomId) {
  const sendT = transports.get(`${socket.id}-send`);
  const recvT = transports.get(`${socket.id}-recv`);
  if (sendT) sendT.close();
  if (recvT) recvT.close();
  transports.delete(`${socket.id}-send`);
  transports.delete(`${socket.id}-recv`);

  for (const [producerId, data] of producers.entries()) {
    if (data.socketId === socket.id) {
      data.producer.close();
      producers.delete(producerId);
      if (roomId) io.to(roomId).emit("producer-closed", { producerId });
    }
  }

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
    const router = getRouter();

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

    // ── Conference: Create ────────────────────────────────────────

    socket.on("create-conference", async ({ type, password }, callback) => {
      const roomId = uuidv4();
      socket.join(roomId);
      socketRooms.set(socket.id, roomId);
      const nconf = new ConferenceData({ conftype: type, confid: roomId, hostid: socket.user.userId, password });
      await nconf.save();
      console.log("conf created:", roomId);
      callback({ roomId });
    });

    // ── Conference: Join ──────────────────────────────────────────

    socket.on("join-conference", async ({ roomId, password }, callback) => {
      const conf = await ConferenceData.findOne({ confid: roomId, password });
      if (!conf) return callback({ error: "Wrong Room ID or password" });

      const oldSend = transports.get(`${socket.id}-send`);
      const oldRecv = transports.get(`${socket.id}-recv`);
      if (oldSend) { oldSend.close(); transports.delete(`${socket.id}-send`); }
      if (oldRecv) { oldRecv.close(); transports.delete(`${socket.id}-recv`); }

      socket.join(roomId);
      socketRooms.set(socket.id, roomId);
      callback({ type: conf.conftype });
    });

    // ── Mediasoup: Router capabilities ───────────────────────────

    socket.on("getRouterRtpCapabilities", (callback) => {
      callback(router.rtpCapabilities);
    });

    // ── Mediasoup: Send transport ─────────────────────────────────

    socket.on("createTransport", async (_, callback) => {
      const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: "0.0.0.0", announcedIp: ANNOUNCED_IP }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      transports.set(`${socket.id}-send`, transport);

      callback({
        id:             transport.id,
        iceParameters:  transport.iceParameters,
        iceCandidates:  transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    });

    socket.on("connectTransport", async ({ dtlsParameters }, callback) => {
      try {
        const transport = transports.get(`${socket.id}-send`);
        await transport.connect({ dtlsParameters });
      } catch (err) {
        if (!err.message.includes("already called")) throw err;
      }
      callback();
    });

    // ── Mediasoup: Recv transport ─────────────────────────────────

    socket.on("createRecvTransport", async (_, callback) => {
      const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: "0.0.0.0", announcedIp: ANNOUNCED_IP }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      transports.set(`${socket.id}-recv`, transport);

      callback({
        id:             transport.id,
        iceParameters:  transport.iceParameters,
        iceCandidates:  transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    });

    socket.on("connectRecvTransport", async ({ dtlsParameters }, callback) => {
      try {
        const transport = transports.get(`${socket.id}-recv`);
        await transport.connect({ dtlsParameters });
      } catch (err) {
        if (!err.message.includes("already called")) throw err;
      }
      callback();
    });

    // ── Mediasoup: Produce ────────────────────────────────────────

    socket.on("produce", async ({ kind, rtpParameters }, callback) => {
      try {
        const transport = transports.get(`${socket.id}-send`);
        const roomId = socketRooms.get(socket.id);

        if (!roomId) {
          console.warn("produce called but socket has no roomId:", socket.id);
          return callback({ error: "not in a room" });
        }

        const producer = await transport.produce({ kind, rtpParameters });
        producers.set(producer.id, { producer, socketId: socket.id, roomId });
        callback({ id: producer.id });
        socket.to(roomId).emit("new-producer", { producerId: producer.id });
      } catch (err) {
        if (err.message.includes("MID already exists")) {
          console.warn("Duplicate produce ignored for socket:", socket.id);
          return callback({ error: "duplicate" });
        }
        throw err;
      }
    });

    // ── Mediasoup: Get existing producers ────────────────────────

    socket.on("getProducers", (callback) => {
      const roomId = socketRooms.get(socket.id);
      const ids = getProducersInRoom(roomId, socket.id);
      callback(ids);
    });

    // ── Mediasoup: Consume ────────────────────────────────────────

    socket.on("consume", async ({ producerId, rtpCapabilities }, callback) => {
      if (!router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: "Cannot consume" });
      }

      const transport = transports.get(`${socket.id}-recv`);
      if (!transport) return callback({ error: "No recv transport" });

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true,
      });

      consumers.set(consumer.id, consumer);

      callback({
        id:            consumer.id,
        producerId,
        kind:          consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    });

    socket.on("consumer-resume", async ({ consumerId }) => {
      const consumer = consumers.get(consumerId);
      if (consumer) await consumer.resume();
    });

    // ── Conference: Leave ─────────────────────────────────────────

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
