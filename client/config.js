// Configuration file for the Mini Radar app
// Replace the server IP with your actual server IP address

// For Android Studio Emulator, use: "10.0.2.2"
// For Expo Go (physical device), use your computer's local network IP (e.g., "192.168.1.100")
// To find your IP: Run 'ipconfig' on Windows or 'ifconfig' on Mac/Linux

const SERVER_HOST = "192.168.1.2"; // Your computer's local network IP
const SERVER_PORT = 3020;

export const CONFIG = {
  // Server configuration
  SERVER_URL: SERVER_HOST,
  SERVER_PORT: SERVER_PORT,

  // Socket configuration
  SOCKET_URL: `http://${SERVER_HOST}:${SERVER_PORT}`,
};

export default CONFIG;
