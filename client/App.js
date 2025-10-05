import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import io from "socket.io-client";
import RadarDisplay from "./components/UI/RadarDisplay/RadarDisplay";
import { MaterialIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import CONFIG from "./config";

const App = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const [currentAngle, setCurrentAngle] = useState(90);
  const [currentDistance, setCurrentDistance] = useState(null);
  const [sound, setSound] = useState(null);
  const [isMovingLeft, setIsMovingLeft] = useState(false);
  const [isMovingRight, setIsMovingRight] = useState(false);
  const [beepInterval, setBeepInterval] = useState(null);

  // Initialize sound for feedback
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("./assets/sounds/radar-beeping.mp3")
        );
        setSound(sound);
      } catch (error) {
        console.log("Sound not available, using test mode without sound");
      }
    };
    loadSound();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (beepInterval) {
        clearInterval(beepInterval);
      }
    };
  }, []);

  useEffect(() => {
    const socketConnection = io(CONFIG.SOCKET_URL);

    socketConnection.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      setError(null);
    });

    socketConnection.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setIsConnected(false);
      setError("Failed to connect to server");
    });

    socketConnection.on("scannedData", (data) => {
      console.log("Data received:", data);
      try {
        if (typeof data === "string") {
          const regex = /Angle:\s*(-?\d+)\s*Distance:\s*(\d+)/;
          const match = data.match(regex);
          if (match) {
            const angle = parseInt(match[1], 10);
            const distance = parseInt(match[2], 10);
            setCurrentAngle(angle);
            setCurrentDistance(distance);
          }
        }
      } catch (err) {
        console.error("Error parsing data:", err);
      }
    });

    socketConnection.on("status", (status) => {
      console.log("Status update:", status);
      if (typeof status === "object" && status.hasOwnProperty("isScanning")) {
        setIsActive(status.isScanning);
      }
    });

    socketConnection.on("error", (errorMessage) => {
      console.error("Server error:", errorMessage);
      setError(errorMessage);
    });

    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  const playBeep = useCallback(async () => {
    if (sound) {
      try {
        // Stop any currently playing sound before starting a new one
        await sound.stopAsync();
        await sound.replayAsync();

        // Add 2-second delay before allowing next replay
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.log("Could not play sound:", error);
      }
    }
  }, [sound]);

  // Calculate beep frequency based on radar position
  const getBeepFrequency = useCallback(() => {
    // Map angle (0-180) to frequency (200ms-800ms)
    // Center (90°) = slower beeps, edges = faster beeps
    const normalizedAngle = Math.abs(currentAngle - 90) / 90; // 0 to 1
    const minInterval = 200; // Fastest beep (200ms)
    const maxInterval = 800; // Slowest beep (800ms)
    return maxInterval - normalizedAngle * (maxInterval - minInterval);
  }, [currentAngle]);

  // Start continuous beeping while holding
  const startContinuousBeeping = useCallback(() => {
    if (beepInterval) {
      clearInterval(beepInterval);
    }

    const beep = () => {
      playBeep();
    };

    // Initial beep
    beep();

    // Set up continuous beeps while holding - accounting for 2-second delay + 500ms gap
    const interval = setInterval(beep, 2500); // 2000ms delay + 500ms gap = 2500ms total
    setBeepInterval(interval);
  }, [beepInterval, playBeep]);

  // Stop continuous beeping
  const stopContinuousBeeping = useCallback(() => {
    if (beepInterval) {
      clearInterval(beepInterval);
      setBeepInterval(null);
    }
  }, [beepInterval]);

  const handleCommand = useCallback(
    (command) => {
      if (!isConnected) {
        setError("Not connected to server");
        return;
      }

      if (socket) {
        console.log("Sending command:", command);
        socket.emit("action", { command });
        // No automatic beep - only beep while holding direction buttons
      }
    },
    [socket, isConnected]
  );

  const handleDirectionPress = useCallback(
    (direction) => {
      if (isActive && isConnected) {
        const reversedDirection = direction === "left" ? "right" : "left";
        handleCommand(reversedDirection);

        // Start continuous beeping while holding
        if (direction === "left") {
          setIsMovingLeft(true);
        } else {
          setIsMovingRight(true);
        }
        startContinuousBeeping();
      }
    },
    [isActive, isConnected, handleCommand, startContinuousBeeping]
  );

  const handleDirectionRelease = useCallback(() => {
    if (isActive && isConnected) {
      handleCommand("stop_movement");

      // Stop continuous beeping and reset movement states
      stopContinuousBeeping();
      setIsMovingLeft(false);
      setIsMovingRight(false);
    }
  }, [isActive, isConnected, handleCommand, stopContinuousBeeping]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        {!isActive ? (
          <View style={styles.startScreen}>
            <Text style={styles.startText}>Arduino Uno</Text>
            <Text style={styles.startTextUltrasonic}>Ultrasonic Sensor</Text>
            <Text style={styles.startTextWhite}>Press Start Button</Text>
          </View>
        ) : (
          <View style={styles.radarScreen}>
            <RadarDisplay angle={currentAngle} distance={currentDistance} />
            <Text style={styles.dataText}>Angle: {currentAngle}°</Text>
            <Text style={styles.dataText}>
              Distance: {currentDistance ? `${currentDistance} cm` : "N/A"}
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {isActive && (
            <>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.directionButton,
                  isMovingLeft && styles.buttonActive,
                ]}
                onPressIn={() => handleDirectionPress("left")}
                onPressOut={handleDirectionRelease}
              >
                <MaterialIcons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.buttonSpacing} />
            </>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              isActive ? styles.stopButton : styles.startButton,
            ]}
            onPress={() => handleCommand(isActive ? "stop" : "start")}
          >
            <MaterialIcons
              name={isActive ? "stop" : "play-arrow"}
              size={24}
              color="white"
            />
          </TouchableOpacity>

          {isActive && (
            <>
              <View style={styles.buttonSpacing} />
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.directionButton,
                  isMovingRight && styles.buttonActive,
                ]}
                onPressIn={() => handleDirectionPress("right")}
                onPressOut={handleDirectionRelease}
              >
                <MaterialIcons name="arrow-forward" size={24} color="white" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  startScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  startText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f0",
    marginBottom: 10,
  },
  startTextUltrasonic: {
    fontSize: 27,
    fontWeight: "bold",
    color: "#0f0",
    marginBottom: 10,
  },
  startTextWhite: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: 20,
  },
  button: {
    padding: 10,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4CAF50",
  },
  startButton: {
    backgroundColor: "#4CAF50",
  },
  stopButton: {
    backgroundColor: "#f44336",
  },
  directionButton: {
    backgroundColor: "#4CAF50", // Green color
  },
  buttonActive: {
    backgroundColor: "#2E7D32", // Darker green when active/pressed
    transform: [{ scale: 0.95 }], // Slight scale down effect
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    marginTop: 10,
    textAlign: "center",
  },
  radarScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingTop: 20,
  },
  dataText: {
    fontSize: 18,
    marginTop: 10,
    color: "#0f0",
  },
  buttonSpacing: {
    width: 20,
  },
});

export default App;
