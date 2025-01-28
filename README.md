# Arduino Radar 📱📡  

**Arduino Radar** is an app that lets you control and monitor a radar system powered by an Arduino Uno and ultrasonic sensor.

## Features  

- **Real-Time Data**: View distance and angle in real-time, as detected by the ultrasonic sensor.  
- **Radar Control**: Control the radar’s movement with a 180-degree rotation.  
- **Socket.IO**: Real-time communication between the app, server, and Arduino.  
- **Data Transmission**: The radar system sends scanned data (distance and angle) back to the server, which then relays it to the app for display.  

## Tech Stack  

- **Frontend**: React Native  
- **Backend**: Express, Socket.IO  
- **Hardware**: Arduino Uno, Ultrasonic Sensor (C++ Firmware)  

## How It Works  

1. Send commands from the mobile app to control the radar’s movement.  
2. The server communicates with the Arduino to adjust the radar’s position.  
3. The ultrasonic sensor scans the environment and measures distance.  
4. The scanned data (distance and angle) is sent from the hardware back to the server.  
5. The server forwards the scanned data to the app, where it is displayed in real-time.  

## Future Enhancements  

- Automatic scanning modes  
- Multiple sensor integration  
- Map visualization
