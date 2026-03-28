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
  if (res.socket.server.io) {
    res.end();
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

  res.end();
}

export const config = {
  api: { bodyParser: false },
};
