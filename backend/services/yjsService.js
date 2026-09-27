import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils";
import { LeveldbPersistence } from "y-leveldb";
import fs from "fs";

export function setupYjsWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  let persistence = null;
  try {
    if (!fs.existsSync("./yjs-data")) {
      fs.mkdirSync("./yjs-data", { recursive: true });
    }
    persistence = new LeveldbPersistence("./yjs-data");
  } catch (err) {
    console.warn("LevelDB persistence disabled, running in-memory:", err.message);
  }

  server.on("upgrade", (req, socket, head) => {
    if (req.url && req.url.startsWith("/yjs")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  wss.on("connection", (conn, req) => {
    // Strip leading /yjs prefix so docName is cleanly the roomId
    if (req.url) {
      req.url = req.url.replace(/^\/yjs/, "") || "/";
    }

    conn.on("error", (err) => {
      console.error("Yjs WS error:", err.message);
    });

    try {
      const opts = persistence ? { persistence } : {};
      setupWSConnection(conn, req, opts);
    } catch (err) {
      console.error("Error in setupWSConnection:", err.message);
    }
  });

  return wss;
}
