import { Server as IOServer } from "socket.io";

const globalForIO = globalThis as unknown as { __sinai_io: IOServer | undefined };

export function setIO(io: IOServer) {
  globalForIO.__sinai_io = io;
}

export function getIO(): IOServer | undefined {
  return globalForIO.__sinai_io;
}

export function emitDashboardUpdate(type: string, data?: unknown) {
  globalForIO.__sinai_io?.to("dashboard").emit("dashboard:update", { type, data });
}
