import express from "express";
import http from "http";
import { Server } from "socket.io";
import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Be more specific in production
    methods: ["GET", "POST"],
  },
});

// Replace with the correct COM port for your system
const portPath = "COM1";

let arduinoPort;
let isScanning = false;

// Initialize SerialPort with better error handling
function initializeSerialPort() {
  arduinoPort = new SerialPort({
    path: portPath,
    baudRate: 115200,
    autoOpen: false, // Don't open automatically
  });

  // Create a parser for incoming data
  const parser = arduinoPort.pipe(new ReadlineParser({ delimiter: "\r\n" }));

  // Handle port opening
  arduinoPort.open((err) => {
    if (err) {
      console.error("Error opening serial port:", err.message);
      // Attempt to reconnect after 5 seconds
      setTimeout(initializeSerialPort, 5000);
      return;
    }
    console.log("Serial port opened successfully on", portPath);
  });

  // Handle incoming data
  parser.on("data", (data) => {
    console.log("Received from Arduino:", data);
    io.emit("scannedData", data); // Broadcast to all connected clients
  });

  // Handle errors
  arduinoPort.on("error", (err) => {
    console.error("Serial port error:", err.message);
  });

  // Handle port closing
  arduinoPort.on("close", () => {
    console.log("Serial port closed. Attempting to reconnect...");
    setTimeout(initializeSerialPort, 5000);
  });
}

// Initialize the serial port connection
initializeSerialPort();

// Handle Socket.IO connections
io.on("connection", (socket) => {
  console.log("Client connected");

  // Send initial status to the client
  socket.emit("status", {
    isConnected: arduinoPort?.isOpen || false,
    isScanning: isScanning,
  });

  socket.on("action", ({ command }) => {
    console.log("Received command:", command);

    if (!arduinoPort?.isOpen) {
      socket.emit("error", "Arduino is not connected");
      return;
    }

    let arduinoCommand = "";
    switch (command) {
      case "start":
        arduinoCommand = "S\n";
        isScanning = true;
        break;
      case "stop":
        arduinoCommand = "T\n";
        isScanning = false;
        break;
      case "left":
        arduinoCommand = "L\n";
        break;
      case "right":
        arduinoCommand = "R\n";
        break;
      case "stop_movement":
        arduinoCommand = "M\n";
        break;
      default:
        console.error("Unknown command:", command);
        return;
    }

    arduinoPort.write(arduinoCommand, (err) => {
      if (err) {
        console.error(`Error sending ${command} command:`, err);
        socket.emit("error", `Failed to send ${command} command`);
        return;
      }
      console.log(`Sent command to Arduino: ${arduinoCommand.trim()}`);
      socket.emit("status", { isScanning: isScanning });
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    arduino: arduinoPort?.isOpen ? "connected" : "disconnected",
    scanning: isScanning,
  });
});

// Start the Express server
server.listen(3020, () => {
  console.log("Server running on http://localhost:3020");
});
