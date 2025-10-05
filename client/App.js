import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Keyboard,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  const [detectionThreshold, setDetectionThreshold] = useState(100);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempThreshold, setTempThreshold] = useState("100");
  const [firstObjectFound, setFirstObjectFound] = useState(null);
  const [resetTrigger, setResetTrigger] = useState(0);

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

            // Handle distance = 0 as "clear dot" signal
            if (distance === 0) {
              setCurrentDistance(null);
              setFirstObjectFound(null);
            } else {
              setCurrentDistance(distance);

              // Track first object found within detection range
              if (distance <= detectionThreshold && distance > 0) {
                setFirstObjectFound((prev) => {
                  // If no object found yet, or if this is closer than the current first object
                  if (!prev || distance < prev.distance) {
                    return { angle, distance };
                  }
                  return prev; // Keep the existing first object if it's closer
                });
              }
            }
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
        // Clear first object when stopping
        if (!status.isScanning) {
          setFirstObjectFound(null);
        }
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

  const openSettingsModal = useCallback(() => {
    setTempThreshold(detectionThreshold.toString());
    setShowSettingsModal(true);
  }, [detectionThreshold]);

  const closeSettingsModal = useCallback(() => {
    setShowSettingsModal(false);
    Keyboard.dismiss();
  }, []);

  const saveSettings = useCallback(() => {
    const value = parseInt(tempThreshold, 10);
    if (!isNaN(value) && value > 0 && value <= 100) {
      setDetectionThreshold(value);
      closeSettingsModal();
    } else {
      Alert.alert(
        "Invalid Value",
        "Please enter a detection range between 1 and 100 cm",
        [{ text: "OK" }]
      );
    }
  }, [tempThreshold, closeSettingsModal]);

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

  const handleReset = useCallback(() => {
    if (isActive && isConnected) {
      // Reset radar to center position
      setCurrentAngle(90);
      setCurrentDistance(null); // This clears the green dot
      setFirstObjectFound(null); // Clear first object found
      setResetTrigger((prev) => prev + 1); // Trigger RadarDisplay reset

      // Send reset command to Arduino
      handleCommand("reset");

      // Play reset sound feedback
      playBeep();

      console.log("Radar reset: angle=90°, distance=null (green dot cleared)");
    }
  }, [isActive, isConnected, handleCommand, playBeep]);

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
            <RadarDisplay
              angle={currentAngle}
              distance={currentDistance}
              detectionThreshold={detectionThreshold}
              isScanning={isActive}
              resetTrigger={resetTrigger}
            />
            <Text style={styles.dataText}>Angle: {currentAngle}°</Text>
            <Text style={styles.dataText}>
              Distance: {currentDistance ? `${currentDistance} cm` : "N/A"}
            </Text>
            <Text style={styles.dataText}>
              Detection Range: {detectionThreshold} cm
            </Text>

            {/* First Object Found Display */}
            {firstObjectFound && (
              <View style={styles.firstObjectContainer}>
                <Text style={styles.firstObjectTitle}>First Object Found:</Text>
                <Text style={styles.firstObjectData}>
                  Distance: {firstObjectFound.distance} cm
                </Text>
                <Text style={styles.firstObjectData}>
                  Angle: {firstObjectFound.angle}°
                </Text>
              </View>
            )}

            {/* Settings Button */}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={openSettingsModal}
            >
              <MaterialIcons name="settings" size={20} color="#0f0" />
              <Text style={styles.settingsButtonText}>Settings</Text>
            </TouchableOpacity>

            {/* Reset Button - Under Settings */}
            <TouchableOpacity
              style={styles.resetButtonSmall}
              onPress={handleReset}
            >
              <MaterialIcons name="refresh" size={16} color="#0f0" />
            </TouchableOpacity>
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

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeSettingsModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Radar Settings</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeSettingsModal}
              >
                <MaterialIcons name="close" size={24} color="#0f0" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.settingLabel}>Detection Threshold</Text>
              <Text style={styles.settingDescription}>
                Set the distance threshold for showing objects on radar. Objects
                beyond this distance will not be marked with green dots (1-100
                cm)
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.modalInput}
                  value={tempThreshold}
                  onChangeText={setTempThreshold}
                  keyboardType="numeric"
                  maxLength={3}
                  placeholder="100"
                  returnKeyType="done"
                  onSubmitEditing={saveSettings}
                  autoFocus={true}
                />
                <Text style={styles.inputUnit}>cm</Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeSettingsModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveSettings}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 50, 0, 0.3)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 0, 0.3)",
  },
  settingsButtonText: {
    color: "#0f0",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    width: "100%",
    maxWidth: 350,
    maxHeight: "80%",
    borderWidth: 2,
    borderColor: "rgba(0, 255, 0, 0.3)",
    shadowColor: "#0f0",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 255, 0, 0.2)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f0",
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    padding: 20,
  },
  modalContentContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f0",
    marginBottom: 5,
  },
  settingDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  modalInput: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    color: "#0f0",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    width: 80,
    height: 50,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(0, 255, 0, 0.5)",
    paddingHorizontal: 10,
  },
  inputUnit: {
    color: "#0f0",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  saveButton: {
    backgroundColor: "rgba(0, 255, 0, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 0, 0.5)",
  },
  cancelButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButtonText: {
    color: "#0f0",
    fontSize: 16,
    fontWeight: "bold",
  },
  resetButton: {
    backgroundColor: "#FF9800", // Orange color for reset
  },
  resetButtonSmall: {
    backgroundColor: "rgba(0, 50, 0, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 0, 0.3)",
    alignSelf: "center",
  },
  firstObjectContainer: {
    backgroundColor: "rgba(0, 50, 0, 0.3)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    marginTop: 15,
    borderWidth: 2,
    borderColor: "rgba(0, 255, 0, 0.5)",
    alignItems: "center",
  },
  firstObjectTitle: {
    color: "#0f0",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  firstObjectData: {
    color: "#0f0",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
});

export default App;
