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
const initialMaxDistance = 100; // Initial maximum distance in cm
const scaledMaxDistance = 50; // Scaled maximum distance when object found

const RadarDisplay = ({
  angle,
  distance,
  detectionThreshold = 100, // Distance threshold for showing green dot
  isScanning = false, // Whether radar is actively scanning
  resetTrigger = 0, // Increment this to trigger a reset of first object
}) => {
  const sweepAnim = useRef(new Animated.Value(90)).current;
  const prevAngle = useRef(angle);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevDistance = useRef(null);

  // Wave effect animations
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const waveAnim3 = useRef(new Animated.Value(0)).current;

  // First object tracking and pulsing dot
  const [firstObject, setFirstObject] = useState(null);
  const [maxDistance, setMaxDistance] = useState(detectionThreshold);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Update maxDistance when prop changes
  useEffect(() => {
    setMaxDistance(detectionThreshold);
  }, [detectionThreshold]);

  // Track distance changes for visual updates only (no automatic sound)
  useEffect(() => {
    prevDistance.current = distance;
  }, [distance]);

  // Track first object found within dynamic maxDistance range (only when scanning)
  useEffect(() => {
    if (isScanning && distance && distance <= maxDistance && !firstObject) {
      // Convert angle to radar coordinates
      const radarAngle = (angle * Math.PI) / 180;
      const radarDistance = (distance / maxDistance) * (size / 2);

      const x = size / 2 + radarDistance * Math.sin(radarAngle);
      const y = size / 2 - radarDistance * Math.cos(radarAngle);

      setFirstObject({ x, y, angle, distance });
    }

    // Clear first object when not scanning
    if (!isScanning) {
      setFirstObject(null);
    }
  }, [distance, angle, firstObject, maxDistance, isScanning]);

  // Clear first object when resetTrigger changes
  useEffect(() => {
    if (resetTrigger > 0) {
      setFirstObject(null);
    }
  }, [resetTrigger]);

  // Initialize pulsing animation for first object
  useEffect(() => {
    if (firstObject) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    }
  }, [firstObject, pulseAnim]);

  // Initialize wave animations
  useEffect(() => {
    const createWaveAnimation = (animValue, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Start wave animations with staggered delays
    const wave1 = createWaveAnimation(waveAnim1, 0);
    const wave2 = createWaveAnimation(waveAnim2, 700);
    const wave3 = createWaveAnimation(waveAnim3, 1400);

    wave1.start();
    wave2.start();
    wave3.start();

    return () => {
      wave1.stop();
      wave2.stop();
      wave3.stop();
    };
  }, []);

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
    // Always show full 100cm range circles
    const circles = [25, 50, 75, 100];
    return circles.map((circleDistance, index) => {
      const radius = (size / 2 / 4) * (index + 1);
      return (
        <Circle
          key={`circle-${circleDistance}`}
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
        </G>
      );
    }

    // Calculate position for dynamic graduation mark based on current distance
    // Always use 100cm as maximum for radar display
    const targetDistance = distance ? (distance / 100) * (size / 2) : 0;
    const dynamicGraduationY = -targetDistance;

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

        {/* Dynamic graduation mark showing current distance position - only show if within detection threshold */}
        {/* Dynamic distance graduation - only show when object is actually detected */}
        {distance && distance > 0 && distance <= detectionThreshold && (
          <G>
            {/* Main graduation line - longer and brighter */}
            <Line
              x1={-8}
              y1={dynamicGraduationY}
              x2={8}
              y2={dynamicGraduationY}
              stroke="rgba(0, 255, 0, 1)"
              strokeWidth="3"
            />
            {/* Small indicator line pointing to the needle */}
            <Line
              x1={0}
              y1={dynamicGraduationY - 3}
              x2={0}
              y2={dynamicGraduationY + 3}
              stroke="rgba(0, 255, 0, 1)"
              strokeWidth="2"
            />
            {/* Distance text label */}
            <SvgText
              x={12}
              y={dynamicGraduationY}
              fontSize="8"
              fill="rgba(0, 255, 0, 1)"
              textAnchor="start"
              alignmentBaseline="middle"
            >
              {distance}cm
            </SvgText>
          </G>
        )}
      </G>
    );
  };

  const renderWaveEffect = () => {
    const wave1Scale = waveAnim1.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const wave2Scale = waveAnim2.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const wave3Scale = waveAnim3.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const wave1Opacity = waveAnim1.interpolate({
      inputRange: [0, 0.1, 0.9, 1],
      outputRange: [0, 0.8, 0.8, 0],
    });

    const wave2Opacity = waveAnim2.interpolate({
      inputRange: [0, 0.1, 0.9, 1],
      outputRange: [0, 0.6, 0.6, 0],
    });

    const wave3Opacity = waveAnim3.interpolate({
      inputRange: [0, 0.1, 0.9, 1],
      outputRange: [0, 0.4, 0.4, 0],
    });

    return (
      <G>
        <Animated.View
          style={{
            position: "absolute",
            width: size,
            height: size,
            justifyContent: "center",
            alignItems: "center",
            transform: [{ scale: wave1Scale }],
            opacity: wave1Opacity,
          }}
        >
          <Svg height={size} width={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2}
              fill="none"
              stroke="rgba(0, 255, 0, 0.6)"
              strokeWidth="2"
            />
          </Svg>
        </Animated.View>
        <Animated.View
          style={{
            position: "absolute",
            width: size,
            height: size,
            justifyContent: "center",
            alignItems: "center",
            transform: [{ scale: wave2Scale }],
            opacity: wave2Opacity,
          }}
        >
          <Svg height={size} width={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2}
              fill="none"
              stroke="rgba(0, 255, 0, 0.4)"
              strokeWidth="2"
            />
          </Svg>
        </Animated.View>
        <Animated.View
          style={{
            position: "absolute",
            width: size,
            height: size,
            justifyContent: "center",
            alignItems: "center",
            transform: [{ scale: wave3Scale }],
            opacity: wave3Opacity,
          }}
        >
          <Svg height={size} width={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2}
              fill="none"
              stroke="rgba(0, 255, 0, 0.2)"
              strokeWidth="2"
            />
          </Svg>
        </Animated.View>
      </G>
    );
  };

  // Calculate target position to align with the radar hand
  const targetDistance = distance ? (distance / maxDistance) * (size / 2) : 0;

  // Render pulsing green dot for first detected object
  const renderPulsingDot = () => {
    if (!firstObject) return null;

    const pulseOpacity = pulseAnim.interpolate({
      inputRange: [0.3, 1],
      outputRange: [0.3, 1],
    });

    const pulseScale = pulseAnim.interpolate({
      inputRange: [0.3, 1],
      outputRange: [0.8, 1.2],
    });

    return (
      <Animated.View
        style={{
          position: "absolute",
          left: firstObject.x - 6,
          top: firstObject.y - 6,
          opacity: pulseOpacity,
          transform: [{ scale: pulseScale }],
        }}
      >
        <Svg width={12} height={12}>
          <Circle
            cx={6}
            cy={6}
            r={6}
            fill="rgba(0, 255, 0, 0.9)"
            stroke="rgba(0, 255, 0, 1)"
            strokeWidth="1"
          />
        </Svg>
      </Animated.View>
    );
  };

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
        {renderWaveEffect()}
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
              {isScanning &&
                distance &&
                distance > 0 &&
                distance <= detectionThreshold && (
                  <Circle
                    cx={0}
                    cy={-targetDistance}
                    r="3"
                    fill={
                      distance === detectionThreshold
                        ? "rgba(0, 255, 0, 1)"
                        : "rgba(255, 0, 0, 0.8)"
                    }
                    stroke={
                      distance === detectionThreshold
                        ? "rgba(0, 255, 0, 1)"
                        : "none"
                    }
                    strokeWidth={distance === detectionThreshold ? "2" : "0"}
                  />
                )}
            </G>
          </Svg>
        </Animated.View>
      </Svg>
      {renderPulsingDot()}
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
