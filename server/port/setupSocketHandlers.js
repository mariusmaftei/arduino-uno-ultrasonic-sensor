export function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("setAngle", (angle) => {
      if (typeof angle !== "number" || angle < 0 || angle > 180) {
        socket.emit("error", {
          message: "Invalid angle. Must be a number between 0 and 180.",
          code: 400,
        });
        return;
      }
      if (global.port?.isOpen) {
        global.port.write(`ANGLE:${angle}\n`, (err) => {
          if (err) {
            socket.emit("error", {
              message: `Error writing to port: ${err.message}`,
              code: 500,
            });
          } else {
            socket.emit("success", {
              message: `Angle set to ${angle}`,
              code: 200,
            });
          }
        });
      } else {
        socket.emit("error", { message: "Serial port not open.", code: 503 });
      }
    });

    socket.on("startScan", () => {
      if (global.port?.isOpen) {
        global.port.write("START\n", (err) => {
          if (err) {
            socket.emit("error", {
              message: `Error starting scan: ${err.message}`,
              code: 500,
            });
          } else {
            socket.emit("success", { message: "Scan started.", code: 200 });
          }
        });
      } else {
        socket.emit("error", { message: "Serial port not open.", code: 503 });
      }
    });

    socket.on("stopScan", () => {
      if (global.port?.isOpen) {
        global.port.write("STOP\n", (err) => {
          if (err) {
            socket.emit("error", {
              message: `Error stopping scan: ${err.message}`,
              code: 500,
            });
          } else {
            socket.emit("success", { message: "Scan stopped.", code: 200 });
          }
        });
      } else {
        socket.emit("error", { message: "Serial port not open.", code: 503 });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });
}
