import React, { useState, useRef, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Animated } from "react-native";
import Svg, { Path } from "react-native-svg";
import StartButton from "../StartButton/StartButton";

const Button = ({ children, direction, isHeld, onHoldStart, onHoldEnd }) => {
  return (
    <TouchableOpacity
      style={[styles.button, isHeld && styles.buttonHeld]}
      onPressIn={() => onHoldStart(direction)}
      onPressOut={onHoldEnd}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

const AngularArrow = ({ direction, isHeld }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isHeld) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isHeld]);

  const paths = {
    up: "M12 4L4 12h5v8h6v-8h5L12 4z",
    down: "M12 20l8-8h-5V4h-6v8H4l8 8z",
    left: "M4 12l8-8v5h8v6h-8v5l-8-8z",
    right: "M20 12l-8-8v5H4v6h8v5l8-8z",
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        width: 48,
        height: 48,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
        <Path
          d={paths[direction]}
          fill="#4ade80"
          stroke="#4ade80"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
};

const ControllerButtons = ({
  onDirectionHold,
  onDirectionRelease,
  onStartPress,
}) => {
  const [heldButton, setHeldButton] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [clearIntervalFn, setClearIntervalFn] = useState(null);

  const handleHoldStart = (direction) => {
    setHeldButton(direction);
    const clearInterval = onDirectionHold(direction);
    setClearIntervalFn(() => clearInterval);
  };

  const handleHoldEnd = () => {
    setHeldButton(null);
    onDirectionRelease(clearIntervalFn);
    setClearIntervalFn(null);
  };

  const handleStartPress = () => {
    setIsActive(!isActive);
    onStartPress(!isActive);
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonGrid}>
        <View style={styles.topButton}>
          <Button
            direction="Up"
            isHeld={heldButton === "Up"}
            onHoldStart={handleHoldStart}
            onHoldEnd={handleHoldEnd}
          >
            <AngularArrow direction="up" isHeld={heldButton === "Up"} />
          </Button>
        </View>
        <View style={styles.middleButtons}>
          <Button
            direction="Left"
            isHeld={heldButton === "Left"}
            onHoldStart={handleHoldStart}
            onHoldEnd={handleHoldEnd}
          >
            <AngularArrow direction="left" isHeld={heldButton === "Left"} />
          </Button>
          <View style={styles.startButtonContainer}>
            <StartButton isActive={isActive} onPress={handleStartPress} />
          </View>
          <Button
            direction="Right"
            isHeld={heldButton === "Right"}
            onHoldStart={handleHoldStart}
            onHoldEnd={handleHoldEnd}
          >
            <AngularArrow direction="right" isHeld={heldButton === "Right"} />
          </Button>
        </View>
        <View style={styles.bottomButton}>
          <Button
            direction="Down"
            isHeld={heldButton === "Down"}
            onHoldStart={handleHoldStart}
            onHoldEnd={handleHoldEnd}
          >
            <AngularArrow direction="down" isHeld={heldButton === "Down"} />
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  buttonGrid: {
    width: 200,
    height: 200,
  },
  topButton: {
    alignItems: "center",
    marginBottom: 8,
  },
  middleButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bottomButton: {
    alignItems: "center",
  },
  startButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  buttonHeld: {
    borderColor: "#4ade80",
  },
});

export default ControllerButtons;
