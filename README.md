Arduino Radar 🚗📡
Arduino Radar is an innovative mobile app that allows you to control and monitor a radar system using an Arduino Uno, an ultrasonic sensor, and a React Native mobile client. The app lets you control the movement of the radar (from left to right up to 180 degrees) and displays the distance and angle information detected by the ultrasonic sensor in real-time.

Features
Real-Time Data: Using Socket.IO, the mobile client listens to the data from the Arduino sensor via the server, updating the distance and angle information as the sensor moves.
Radar Control: The app allows users to control the movement of the radar on the server side, enabling it to sweep left and right (180 degrees).
Ultrasonic Sensor Feedback: The data from the ultrasonic sensor is displayed in the app, showing the distance and angle where the sensor is pointing.
Mobile Interface: A responsive, user-friendly interface built with React Native, designed for easy control of the radar system and viewing sensor data.
Tech Stack
Frontend: React Native
Backend: Express, Socket.IO
Hardware: Arduino Uno with Ultrasonic Sensor (C++ Firmware)
Communication: USB connection between the Arduino and the server, with Socket.IO handling real-time communication between the server and mobile client.
How It Works
The React Native app sends commands to the server to control the radar’s movement.
The server communicates with the Arduino Uno via USB, controlling the servo motor that adjusts the radar’s angle.
The ultrasonic sensor detects distance, and the data is sent back to the client via the server in real-time.
The app displays the angle and distance values as the radar sweeps.
Future Enhancements
Implement automatic scanning modes for the radar.
Support multiple sensor data streams for expanded use cases.
Integrate map visualization for real-time radar positioning.
