import { Server } from "socket.io";

let io;

function setupSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // or your frontend URL
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinShowRoom", (showId) => {
      socket.join(`show:${showId}`);
      console.log(`${socket.id} joined room show:${showId}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}

function getIO() {
  if (!io) throw new Error("Socket not initialized");
  return io;
}

export { setupSocket, getIO };
