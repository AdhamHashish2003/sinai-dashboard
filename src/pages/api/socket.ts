import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import { Server as IOServer } from "socket.io";
import { setIO } from "@/lib/socket-server";

interface SocketServer extends HTTPServer {
  io?: IOServer;
}

interface SocketWithServer extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithServer;
}

export default function socketHandler(_req: NextApiRequest, res: NextApiResponseWithSocket) {
  try {
    if (res.socket.server.io) {
      res.status(200).end();
      return;
    }

    const io = new IOServer(res.socket.server, {
      cors: { origin: "*" },
    });

    res.socket.server.io = io;
    setIO(io);

    io.on("connection", (socket) => {
      socket.on("join", (room: string) => {
        if (room === "dashboard") socket.join("dashboard");
      });
    });

    // Start the auto-refresh engine — lazy import to avoid crashing socket init if DB is down
    import("@/lib/refresh-engine")
      .then((mod) => mod.startRefreshEngine())
      .catch((err) => console.error("[socket] Failed to start refresh engine:", err));

    res.status(200).end();
  } catch (err) {
    console.error("[socket] Handler error:", err);
    res.status(500).json({ error: "Socket initialization failed" });
  }
}

export const config = {
  api: { bodyParser: false },
};
