import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

let port;
let parser;
let reconnectAttempted = false;

export async function initializeSerialPort() {
  if (port && port.isOpen) return; // Skip if port is already open

  try {
    const ports = await SerialPort.list();
    const portPath =
      process.platform === "win32"
        ? ports.find((p) => p.path.startsWith("COM"))?.path || "COM3"
        : process.env.SERIAL_PORT || "/dev/ttyUSB0";

    console.log(`Trying to connect to: ${portPath}`);

    port = new SerialPort({
      path: portPath,
      baudRate: 115200,
      autoOpen: false,
    });

    parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

    parser.on("data", (data) => {
      if (data.startsWith("DATA:")) {
        const [angle, distance] = data.substring(5).split(",").map(Number);
        global.io.emit("radarData", { angle, distance });
      }
    });

    port.on("error", (err) => console.error("Serial port error:", err.message));

    port.open((err) => {
      if (err) {
        console.error("Error opening serial port:", err.message);
      } else {
        console.log("Serial port opened successfully!");
      }
    });
  } catch (err) {
    console.error("Failed to initialize serial port:", err.message);
    if (!reconnectAttempted) {
      reconnectAttempted = true;
      console.log("Retrying in 5 seconds...");
      setTimeout(() => initializeSerialPort(), 5000); // Retry after 5 seconds
    }
  }
}

export async function handlePortReconnect(action = "reconnect") {
  if (action === "reconnect" && (!port || !port.isOpen)) {
    reconnectAttempted = true;
    console.log("Attempting to reconnect...");
    await initializeSerialPort();
    reconnectAttempted = false;
  } else if (action === "close" && port && port.isOpen) {
    port.close(() => console.log("Serial port closed."));
  }
}

export function getPortStatus() {
  return port && port.isOpen
    ? { status: "connected", message: "Serial port is open." }
    : { status: "disconnected", message: "Serial port is not open." };
}
