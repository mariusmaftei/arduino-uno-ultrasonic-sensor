import express from "express";
import http from "http";
import { Server } from "socket.io";
import {
  initializeSerialPort,
  getPortStatus,
  sendArduinoCommand,
} from "./port/serialPortManager.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Be more specific in production
    methods: ["GET", "POST"],
  },
});

// Make io globally available for serialPortManager
global.io = io;

let isScanning = false;

// Initialize the serial port connection using the port manager
initializeSerialPort();

// Handle Socket.IO connections
io.on("connection", (socket) => {
  console.log("Client connected");

  // Send initial status to the client
  const portStatus = getPortStatus();
  socket.emit("status", {
    isConnected: portStatus.status === "connected",
    isScanning: isScanning,
    message: portStatus.message,
  });

  socket.on("action", ({ command }) => {
    console.log("Received command:", command);

    const portStatus = getPortStatus();
    if (portStatus.status !== "connected") {
      socket.emit("error", "Arduino is not connected");
      return;
    }

    try {
      // Send command to Arduino
      sendArduinoCommand(command);

      // Update scanning state for start/stop commands
      if (command === "start") {
        isScanning = true;
      } else if (command === "stop") {
        isScanning = false;
      }

      console.log(`Successfully sent command: ${command}`);
      socket.emit("status", {
        isScanning: isScanning,
        isConnected: portStatus.status === "connected",
        message: portStatus.message,
      });
    } catch (error) {
      console.error(`Error sending ${command} command:`, error.message);
      socket.emit(
        "error",
        `Failed to send ${command} command: ${error.message}`
      );
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Basic health check endpoint
app.get("/health", (req, res) => {
  const portStatus = getPortStatus();
  res.json({
    status: "ok",
    arduino: portStatus.status,
    scanning: isScanning,
    message: portStatus.message,
  });
});

// Start the Express server
server.listen(3020, () => {
  console.log("Server running on http://localhost:3020");
});
