import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

const StartButton = ({ isActive, onPress }) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isActive ? styles.activeButton : styles.inactiveButton,
      ]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{isActive ? "Stop" : "Start"}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  activeButton: {
    backgroundColor: "black",
    borderColor: "#4ade80",
  },
  inactiveButton: {
    backgroundColor: "black",
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  buttonText: {
    color: "#4ade80",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default StartButton;
