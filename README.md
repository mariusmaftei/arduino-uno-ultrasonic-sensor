# Arduino Radar 🚗📡  

**Arduino Radar** is an app that lets you control and monitor a radar system with an Arduino Uno and ultrasonic sensor.

## Features  

- **Real-Time Data**: View distance and angle in real-time as detected by the ultrasonic sensor.  
- **Radar Control**: Control the radar’s movement (180-degree rotation).  
- **Socket.IO**: Real-time communication between the app, server, and Arduino.  

## Tech Stack  

- **Frontend**: React Native  
- **Backend**: Express, Socket.IO  
- **Hardware**: Arduino Uno, Ultrasonic Sensor (C++ Firmware)  

## How It Works  

1. Send commands from the app to control radar movement.  
2. The server sends data to the Arduino to adjust the radar.  
3. Ultrasonic sensor measures distance and sends data back to the app.  

## Future Enhancements  

- Automatic scanning modes  
- Multiple sensor integration  
- Map visualization
