import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import Svg, {
  Circle,
  Line,
  Text as SvgText,
  Defs,
  RadialGradient,
  Stop,
  G,
  Mask,
  Rect,
} from "react-native-svg";

const size = 300; // Fixed size for the radar
const maxDistance = 100; // Maximum distance in cm

const RadarDisplay = ({ angle, distance }) => {
  const sweepAnim = useRef(new Animated.Value(90)).current;
  const prevAngle = useRef(angle);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    let currentAngle = sweepAnim.__getValue();
    let targetAngle = angle;

    // Normalize angles to be between 0 and 360
    currentAngle = ((currentAngle % 360) + 360) % 360;
    targetAngle = ((targetAngle % 360) + 360) % 360;

    // Check if we're crossing the 0/359 boundary
    const isCrossingBoundary =
      (currentAngle > 270 && targetAngle < 90) ||
      (currentAngle < 90 && targetAngle > 270);

    if (isCrossingBoundary) {
      setIsTransitioning(true);

      // Determine the direction of rotation
      const clockwise =
        (targetAngle > currentAngle && targetAngle - currentAngle < 180) ||
        (currentAngle > targetAngle && currentAngle - targetAngle > 180);

      // Set up a two-step animation
      const midPoint = clockwise ? 360 : -1;

      Animated.sequence([
        Animated.timing(sweepAnim, {
          toValue: midPoint,
          duration: 50,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(sweepAnim, {
          toValue: targetAngle,
          duration: 50,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsTransitioning(false);
        sweepAnim.setValue(targetAngle);
      });
    } else {
      // Normal rotation
      Animated.timing(sweepAnim, {
        toValue: targetAngle,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    }

    prevAngle.current = angle;
  }, [angle]);

  const rotate = sweepAnim.interpolate({
    inputRange: [-360, 0, 360, 720],
    outputRange: ["-360deg", "0deg", "360deg", "720deg"],
  });

  const renderCardinalPoints = () => {
    const points = [
      { label: "N", angle: 0 },
      { label: "E", angle: 90 },
      { label: "S", angle: 180 },
      { label: "W", angle: 270 },
    ];

    return points.map(({ label, angle }) => (
      <SvgText
        key={label}
        x={size / 2 + Math.sin((angle * Math.PI) / 180) * (size / 2 - 15)}
        y={size / 2 - Math.cos((angle * Math.PI) / 180) * (size / 2 - 15)}
        fontSize="12"
        fill="rgba(0, 255, 0, 0.7)"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {label}
      </SvgText>
    ));
  };

  const renderDistanceCircles = () => {
    const circles = [25, 50, 75, 100];
    return circles.map((circleDistance, index) => {
      const radius = (size / 2 / 4) * (index + 1);
      return (
        <Circle
          key={circleDistance}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0, 255, 0, 0.3)"
          strokeWidth="1"
        />
      );
    });
  };

  const renderDegreeGraduations = () => {
    const degrees = [30, 60, 120, 150, 210, 240, 300, 330];
    const mainDegrees = [0, 90, 180, 270];

    const regularGraduations = degrees.map((deg) => {
      const angle = (deg * Math.PI) / 180;
      const x1 = size / 2 + (size / 2 - 10) * Math.sin(angle);
      const y1 = size / 2 - (size / 2 - 10) * Math.cos(angle);
      const x2 = size / 2 + (size / 2 - 20) * Math.sin(angle);
      const y2 = size / 2 - (size / 2 - 20) * Math.cos(angle);
      const textX = size / 2 + (size / 2 - 30) * Math.sin(angle);
      const textY = size / 2 - (size / 2 - 30) * Math.cos(angle);

      return (
        <G key={deg}>
          <Line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(0, 255, 0, 0.7)"
            strokeWidth="1"
          />
          <SvgText
            x={textX}
            y={textY}
            fontSize="8"
            fill="rgba(0, 255, 0, 0.7)"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {`${deg}°`}
          </SvgText>
        </G>
      );
    });

    const mainGraduations = mainDegrees.map((deg) => {
      const angle = (deg * Math.PI) / 180;
      const x1 = size / 2 + (size / 2 - 10) * Math.sin(angle);
      const y1 = size / 2 - (size / 2 - 10) * Math.cos(angle);
      const x2 = size / 2 + (size / 2 - 25) * Math.sin(angle);
      const y2 = size / 2 - (size / 2 - 25) * Math.cos(angle);
      const textX = size / 2 + (size / 2 - 40) * Math.sin(angle);
      const textY = size / 2 - (size / 2 - 40) * Math.cos(angle);

      return (
        <G key={deg}>
          <Line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(0, 255, 0, 0.7)"
            strokeWidth="2"
          />
          <SvgText
            x={textX}
            y={textY}
            fontSize="12"
            fontWeight="bold"
            fill="rgba(0, 255, 0, 0.7)"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {deg === 0 ? "0°/360°" : `${deg}°`}
          </SvgText>
        </G>
      );
    });

    return [...regularGraduations, ...mainGraduations];
  };

  const renderRadarHand = () => {
    const graduations = [];
    for (let i = 1; i <= 10; i++) {
      const y = -(((size / 2) * i) / 10);
      graduations.push(
        <G key={i}>
          <Line
            x1={-5}
            y1={y}
            x2={5}
            y2={y}
            stroke="rgba(0, 255, 0, 0.7)"
            strokeWidth="1"
          />
          <SvgText
            x={8}
            y={y}
            fontSize="8"
            fill="rgba(0, 255, 0, 0.7)"
            textAnchor="start"
            alignmentBaseline="middle"
          >
            {i * 10}cm
          </SvgText>
        </G>
      );
    }

    return (
      <G>
        <Line
          x1={0}
          y1={0}
          x2={0}
          y2={-size / 2}
          stroke="rgba(0, 255, 0, 0.7)"
          strokeWidth="2"
        />
        {graduations}
      </G>
    );
  };

  // Calculate target position to align with the radar hand
  const targetDistance = distance ? (distance / maxDistance) * (size / 2) : 0;

  return (
    <View style={styles.container}>
      <Svg height={size} width={size} style={styles.radar}>
        <Defs>
          <RadialGradient id="grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="rgba(0, 50, 0, 1)" stopOpacity="1" />
            <Stop offset="100%" stopColor="rgba(0, 10, 0, 1)" stopOpacity="1" />
          </RadialGradient>
          <Mask id="mask">
            <Rect x="0" y="0" width={size} height={size} fill="white" />
            <Rect
              x="0"
              y={size / 2}
              width={size}
              height={size / 2}
              fill="black"
            />
          </Mask>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 1}
          fill="url(#grad)"
          stroke="#0f0"
          strokeWidth="2"
        />
        {renderDistanceCircles()}
        {renderDegreeGraduations()}
        <Line
          x1={size / 2}
          y1={0}
          x2={size / 2}
          y2={size}
          stroke="rgba(0, 255, 0, 0.5)"
          strokeWidth="1"
        />
        <Line
          x1={0}
          y1={size / 2}
          x2={size}
          y2={size / 2}
          stroke="rgba(0, 255, 0, 0.5)"
          strokeWidth="1"
        />
        {renderCardinalPoints()}
        <Animated.View
          style={[
            styles.sweep,
            {
              transform: [{ rotate }],
              opacity: isTransitioning ? 0 : 1,
            },
          ]}
        >
          <Svg height={size} width={size}>
            <G x={size / 2} y={size / 2} mask="url(#mask)">
              {renderRadarHand()}
              {distance && (
                <Circle cx={0} cy={-targetDistance} r="3" fill="red" />
              )}
            </G>
          </Svg>
        </Animated.View>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  radar: {
    backgroundColor: "transparent",
  },
  sweep: {
    position: "absolute",
    width: size,
    height: size,
    top: 0,
    left: 0,
  },
});

export default RadarDisplay;
