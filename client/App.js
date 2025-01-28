import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import io from "socket.io-client";
import RadarDisplay from "./components/UI/RadarDisplay/RadarDisplay";
import Icon from "react-native-vector-icons/MaterialIcons";

const App = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const [currentAngle, setCurrentAngle] = useState(90);
  const [currentDistance, setCurrentDistance] = useState(null);

  useEffect(() => {
    const socketConnection = io(`http://${process.env.EXPO_SERVER_URL}:3020`);

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

  const handleCommand = useCallback(
    (command) => {
      if (!isConnected) {
        setError("Not connected to server");
        return;
      }

      if (socket) {
        console.log("Sending command:", command);
        socket.emit("action", { command });
      }
    },
    [socket, isConnected]
  );

  const handleDirectionPress = useCallback(
    (direction) => {
      if (isActive && isConnected) {
        const reversedDirection = direction === "left" ? "right" : "left";
        handleCommand(reversedDirection);
      }
    },
    [isActive, isConnected, handleCommand]
  );

  const handleDirectionRelease = useCallback(() => {
    if (isActive && isConnected) {
      handleCommand("stop_movement");
    }
  }, [isActive, isConnected, handleCommand]);

  return (
    <SafeAreaView style={styles.container}>
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
                style={[styles.button, styles.directionButton]}
                onPressIn={() => handleDirectionPress("left")}
                onPressOut={handleDirectionRelease}
              >
                <Icon name="arrow-back" size={24} color="white" />
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
            <Icon
              name={isActive ? "stop" : "play-arrow"}
              size={24}
              color="white"
            />
          </TouchableOpacity>

          {isActive && (
            <>
              <View style={styles.buttonSpacing} />
              <TouchableOpacity
                style={[styles.button, styles.directionButton]}
                onPressIn={() => handleDirectionPress("right")}
                onPressOut={handleDirectionRelease}
              >
                <Icon name="arrow-forward" size={24} color="white" />
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
