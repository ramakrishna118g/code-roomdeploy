import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils";
import { LeveldbPersistence } from "y-leveldb";

export function setupYjsWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });
  const persistence = new LeveldbPersistence("./yjs-data");

  server.on("upgrade", (req, socket, head) => {
    if (req.url.startsWith("/yjs")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  wss.on("connection", (conn, req) => {
    conn.on("error", (err) => {
      console.error("Yjs WS error:", err.message);
    });
    setupWSConnection(conn, req, { persistence });
  });

  return wss;
}
