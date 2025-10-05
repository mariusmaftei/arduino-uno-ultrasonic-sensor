import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";

let port;
let parser;
let reconnectAttempted = false;
let portMonitorInterval;
let lastKnownPorts = [];

// Function to detect Arduino boards
async function findArduinoPort() {
  try {
    const ports = await SerialPort.list();
    console.log(
      "Available ports:",
      ports.map((p) => ({
        path: p.path,
        manufacturer: p.manufacturer,
        productId: p.productId,
        vendorId: p.vendorId,
      }))
    );

    // Look for Arduino boards by manufacturer or VID/PID
    const arduinoPort = ports.find((p) => {
      const manufacturer = p.manufacturer?.toLowerCase() || "";
      const productId = p.productId?.toLowerCase() || "";
      const vendorId = p.vendorId?.toLowerCase() || "";

      // Common Arduino identifiers
      return (
        manufacturer.includes("arduino") ||
        manufacturer.includes("arduino llc") ||
        manufacturer.includes("arduino srl") ||
        vendorId === "2341" ||
        vendorId === "2a03" || // Arduino VID
        productId.includes("arduino") ||
        p.path.includes("arduino")
      );
    });

    if (arduinoPort) {
      console.log(`Found Arduino board at: ${arduinoPort.path}`);
      return arduinoPort.path;
    }

    // If no Arduino found, try to find any COM port (Windows) or USB serial (Linux/Mac)
    const fallbackPort = ports.find((p) => {
      if (process.platform === "win32") {
        return p.path.startsWith("COM");
      } else {
        return p.path.includes("ttyUSB") || p.path.includes("ttyACM");
      }
    });

    if (fallbackPort) {
      console.log(`Using fallback port: ${fallbackPort.path}`);
      return fallbackPort.path;
    }

    return null;
  } catch (error) {
    console.error("Error scanning for ports:", error.message);
    return null;
  }
}

// Function to try connecting to a specific port
async function tryConnectToPort(portPath) {
  return new Promise((resolve, reject) => {
    const testPort = new SerialPort({
      path: portPath,
      baudRate: 115200,
      autoOpen: false,
    });

    testPort.open((err) => {
      if (err) {
        testPort.destroy();
        reject(err);
      } else {
        testPort.close(() => {
          testPort.destroy();
          resolve(portPath);
        });
      }
    });
  });
}

// Function to scan and connect to available ports
async function scanAndConnect() {
  const portPath = await findArduinoPort();

  if (!portPath) {
    throw new Error("No Arduino board or serial port found");
  }

  try {
    await tryConnectToPort(portPath);
    return portPath;
  } catch (error) {
    console.log(`Failed to connect to ${portPath}:`, error.message);
    throw error;
  }
}

// Function to monitor port changes
function startPortMonitoring() {
  if (portMonitorInterval) {
    clearInterval(portMonitorInterval);
  }

  portMonitorInterval = setInterval(async () => {
    try {
      const ports = await SerialPort.list();
      const currentPorts = ports.map((p) => p.path);

      // Check if ports have changed
      const portsChanged =
        JSON.stringify(currentPorts) !== JSON.stringify(lastKnownPorts);

      if (portsChanged) {
        console.log("Port configuration changed, checking for Arduino...");
        lastKnownPorts = currentPorts;

        // If current port is not open, try to reconnect
        if (!port || !port.isOpen) {
          console.log("Attempting to reconnect to Arduino...");
          await initializeSerialPort();
        }
      }
    } catch (error) {
      console.error("Error monitoring ports:", error.message);
    }
  }, 3000); // Check every 3 seconds
}

export async function initializeSerialPort() {
  if (port && port.isOpen) return; // Skip if port is already open

  try {
    console.log("Scanning for Arduino board...");
    const portPath = await scanAndConnect();

    console.log(`Connecting to Arduino at: ${portPath}`);

    port = new SerialPort({
      path: portPath,
      baudRate: 115200,
      autoOpen: false,
    });

    parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

    parser.on("data", (data) => {
      // Parse Arduino data format: "Angle: X Distance: Y"
      const angleMatch = data.match(/Angle:\s*(-?\d+)/);
      const distanceMatch = data.match(/Distance:\s*(\d+)/);

      if (angleMatch && distanceMatch) {
        const angle = parseInt(angleMatch[1], 10);
        const distance = parseInt(distanceMatch[1], 10);
        global.io.emit("scannedData", `Angle: ${angle} Distance: ${distance}`);
      }
    });

    port.on("error", (err) => {
      console.error("Serial port error:", err.message);
      // If port is disconnected, try to reconnect
      if (
        err.message.includes("disconnected") ||
        err.message.includes("not found")
      ) {
        console.log("Port disconnected, will attempt reconnection...");
        reconnectAttempted = false; // Reset flag to allow reconnection
      }
    });

    port.on("close", () => {
      console.log("Serial port closed");
      reconnectAttempted = false; // Reset flag when port closes
    });

    port.open((err) => {
      if (err) {
        console.error("Error opening serial port:", err.message);
        reconnectAttempted = false; // Reset flag on error
      } else {
        console.log(`Serial port opened successfully at ${portPath}!`);
        reconnectAttempted = false; // Reset flag on success
        startPortMonitoring(); // Start monitoring for port changes
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
    reconnectAttempted = false; // Reset flag to allow reconnection
    console.log("Attempting to reconnect...");
    await initializeSerialPort();
  } else if (action === "close" && port && port.isOpen) {
    if (portMonitorInterval) {
      clearInterval(portMonitorInterval);
      portMonitorInterval = null;
    }
    port.close(() => console.log("Serial port closed."));
  } else if (action === "scan") {
    // Manual scan for new ports
    console.log("Manually scanning for Arduino...");
    reconnectAttempted = false;
    await initializeSerialPort();
  }
}

export function getPortStatus() {
  const status = port && port.isOpen ? "connected" : "disconnected";
  const message =
    port && port.isOpen
      ? `Serial port is open at ${port.path}`
      : "Serial port is not open. Arduino may be disconnected.";

  return { status, message };
}

// Function to send commands to Arduino
export function sendArduinoCommand(command) {
  if (!port || !port.isOpen) {
    throw new Error("Arduino is not connected");
  }

  let arduinoCommand = "";
  switch (command) {
    case "start":
      arduinoCommand = "S\n";
      break;
    case "stop":
      arduinoCommand = "T\n";
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
    case "reset":
      arduinoCommand = "C\n"; // Center/Reset command
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }

  port.write(arduinoCommand, (err) => {
    if (err) {
      console.error(`Error sending ${command} command:`, err);
      throw err;
    }
    console.log(`Sent command to Arduino: ${arduinoCommand.trim()}`);
  });
}

// Export function to manually trigger port scan
export async function scanForArduino() {
  console.log("Manually scanning for Arduino board...");
  reconnectAttempted = false;
  await initializeSerialPort();
}
