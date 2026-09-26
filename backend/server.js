import express from "express";
import { createServer } from "http";
import cors from "cors";
import * as dotenv from "dotenv";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { setupYjsWebSocket } from "./services/yjsService.js";
import { setupSocketIO } from "./services/socketService.js";

dotenv.config();

const app = express();
const server = createServer(app);

// ── Database ─────────────────────────────────────────────────────────────────
connectDB();

// ── Middlewares ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("API working 🚀"));
app.use("/", authRoutes);
app.use("/", aiRoutes);

// ── Initialize Services ──────────────────────────────────────────────────────
setupYjsWebSocket(server);
setupSocketIO(server);

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 1234;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Express API  → http://localhost:${PORT}`);
  console.log(`Socket.io    → http://localhost:${PORT}`);
  console.log(`Yjs WS       → ws://localhost:${PORT}/yjs`);
});