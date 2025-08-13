// A simple backend for handling WebSocket connections with Socket.IO.
// This is a Next.js API route that initializes the Socket.IO server.

import { Server } from "socket.io";

export default function handler(req, res) {
  // Check if a Socket.IO server instance already exists on the socket.
  // This prevents multiple server instances from being created on hot-reloads.
  if (!res.socket.server.io) {
    console.log("Starting Socket.IO server...");
    
    // Create a new Socket.IO server instance.
    // The `path` option is crucial for Next.js API routes.
    const io = new Server(res.socket.server, {
      path: "/api/socketio",
    });

    // Handle incoming connections from clients.
    io.on("connection", (socket) => {
      console.log("A user connected:", socket.id);

      // Event listener for a client setting their username.
      // This is the first event a client sends after connecting.
      socket.on("set username", (username) => {
        // Attach the username to the socket object for later use.
        socket.username = username;
        // Emit a "user joined" event to all connected clients.
        io.emit("user joined", username);
      });

      // Event listener for a new chat message.
      socket.on("chat message", (msg) => {
        // Emit the message and the sender's username to all clients.
        io.emit("chat message", {
          username: socket.username || "Anonymous", // Use "Anonymous" if no username is set.
          text: msg,
        });
      });

      // Event listener for a user typing.
      socket.on("typing", () => {
        // Broadcast the "typing" event to all other clients, but not the sender.
        socket.broadcast.emit("typing", socket.username || "Anonymous");
      });

      // Event listener for a client disconnecting.
      socket.on("disconnect", () => {
        // If the disconnected socket had a username, emit a "user left" event.
        if (socket.username) {
          io.emit("user left", socket.username);
        }
        console.log("User disconnected:", socket.id);
      });
    });

    // Assign the new Socket.IO instance to the socket.
    res.socket.server.io = io;
  }
  
  // End the response.
  res.end();
}
