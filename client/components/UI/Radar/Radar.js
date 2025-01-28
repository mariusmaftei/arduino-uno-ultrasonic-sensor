import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";

const Radar = ({ manualRotation = 0 }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: manualRotation,
      duration: 100,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [manualRotation]);

  const rotate = rotateAnim.interpolate({
    inputRange: [-180, 0, 180],
    outputRange: ["-180deg", "0deg", "180deg"],
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.board}>
        <View style={[styles.round, styles.roundSm]} />
        <View style={[styles.round, styles.roundMd]} />
        <View style={[styles.round, styles.roundLg]} />
        <View style={[styles.line, styles.lineX]} />
        <View style={[styles.line, styles.lineY]} />
      </View>
      <Animated.View
        style={[
          styles.radar,
          {
            transform: [{ rotate }],
            borderRightWidth: 90,
            borderTopWidth: 90,
            borderColor: "rgba(28, 255, 203, 0.5)",
          },
        ]}
      />
      <Animated.View
        style={[
          styles.mask,
          {
            transform: [{ rotate }],
            borderLeftWidth: 90,
            borderBottomWidth: 90,
            borderColor: "black",
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    width: 180,
    height: 180,
    borderRadius: 90,
    shadowColor: "#1cffcb",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  board: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 90,
  },
  round: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 90,
  },
  roundSm: {
    width: "25%",
    height: "25%",
    top: "37.5%",
    left: "37.5%",
  },
  roundMd: {
    width: "50%",
    height: "50%",
    top: "25%",
    left: "25%",
  },
  roundLg: {
    width: "75%",
    height: "75%",
    top: "12.5%",
    left: "12.5%",
  },
  line: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  lineX: {
    width: "100%",
    height: 1,
    top: "50%",
  },
  lineY: {
    width: 1,
    height: "100%",
    left: "50%",
  },
  radar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 90,
  },
  mask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 90,
    backgroundColor: "transparent",
  },
});

export default Radar;
