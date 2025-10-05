# Mini Radar - Arduino Uno Ultrasonic Sensor

This is an Expo React Native app that connects to an Arduino Uno with an ultrasonic sensor to display radar-like data.

## Setup Instructions

### 1. Update Server Configuration

Before running the app, you need to update the server IP address in the configuration file:

1. Open `client/config.js`
2. Replace `192.168.1.100` with your actual server IP address
3. Make sure the server is running on port 3020

### 2. Install Dependencies

```bash
cd client
npm install
```

### 3. Start the App

```bash
npm start
```

## Recent Updates (Expo SDK 54)

The project has been updated to work with Expo SDK 54. Here are the key changes made:

- **Removed deprecated dependencies**: Removed `react-native-vector-icons`, `react-native-device-info`, `react-native-dotenv`, `react-native-network-info`, and `lucide-react`
- **Updated to Expo Vector Icons**: Replaced `react-native-vector-icons` with `@expo/vector-icons`
- **Fixed environment variables**: Replaced deprecated `process.env` usage with a configuration file
- **Updated React Native SVG**: Updated to version 15.8.0 for compatibility
- **Disabled New Architecture**: Set `newArchEnabled: false` in app.json for stability
- **Added Status Bar**: Added proper Expo Status Bar component

## Dependencies

- Expo SDK 54
- React Native 0.76.5
- React 18.3.1
- Socket.io Client 4.8.1
- React Native SVG 15.8.0
- Expo Vector Icons 14.0.4

## Features

- Real-time radar display
- Socket.io connection to Arduino server
- Touch controls for servo movement
- Start/Stop functionality
- Distance and angle display

## Troubleshooting

If you encounter any issues:

1. Make sure your server IP is correctly configured in `config.js`
2. Ensure the Arduino server is running on port 3020
3. Check that your device and server are on the same network
4. Try clearing the Expo cache: `npx expo start --clear`




