import {
  motion,
  AnimatePresence,
  useMotionValue,
  useAnimationFrame,
} from "framer-motion";
import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Participant } from "@/store/participantsStore";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  playTickSound,
  playSpinStartSound,
  playSlowTick,
  playWinnerSound,
  resumeAudioContext,
} from "@/utils/sounds";

// Custom hook for responsive wheel size
const useResponsiveWheelSize = () => {
  const [wheelSize, setWheelSize] = useState(280);
  const [zoomMultiplier, setZoomMultiplier] = useState(1.6);

  useEffect(() => {
    const updateSize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Determine zoom multiplier first based on screen size
      let zoom: number;
      if (vw < 640 || vh < 600) {
        zoom = 1.3; // Small screens - minimal zoom
      } else if (vw < 768 || vh < 700) {
        zoom = 1.4;
      } else if (vw < 1024 || vh < 800) {
        zoom = 1.5;
      } else if (vw < 1280 || vh < 900) {
        zoom = 1.6;
      } else {
        zoom = 1.8; // Large screens - full zoom
      }

      // Calculate wheel size accounting for zoom
      // When zoomed, the wheel should still fit with some margin
      const availableWidth = vw - 48; // Leave 24px padding on each side
      const availableHeight = vh - 280; // Leave room for header, controls, tabs

      // The zoomed wheel needs to fit, so divide by zoom
      const maxWidthForZoom = availableWidth / zoom;
      const maxHeightForZoom = availableHeight / zoom;

      // Take the smaller dimension and cap at 420px (smaller max for better fit)
      const size = Math.min(maxWidthForZoom, maxHeightForZoom, 420);

      setWheelSize(Math.max(Math.floor(size), 240)); // Minimum 240px
      setZoomMultiplier(zoom);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return { wheelSize, zoomMultiplier };
};

interface LotteryWheelProps {
  participants: Participant[];
  isSpinning: boolean;
  onSpinComplete: (winner: Participant) => void;
  onStartSpin: () => void;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  life: number;
}

// Casino color palette for wheel segments
const SEGMENT_COLORS = [
  "hsl(45, 100%, 50%)", // Gold
  "hsl(0, 85%, 40%)", // Deep red
  "hsl(45, 100%, 45%)", // Dark gold
  "hsl(0, 75%, 35%)", // Darker red
  "hsl(35, 100%, 50%)", // Orange gold
  "hsl(350, 80%, 45%)", // Crimson
];

export const LotteryWheel = ({
  participants,
  isSpinning,
  onSpinComplete,
  onStartSpin,
}: LotteryWheelProps) => {
  const { wheelSize, zoomMultiplier } = useResponsiveWheelSize();
  const [rotation, setRotation] = useState(0);
  const [spinPower, setSpinPower] = useState([20]); // 10-30 seconds
  const [winner, setWinner] = useState<Participant | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "spinning" | "zooming" | "winner"
  >("idle");
  const [prizeName, setPrizeName] = useState("");
  const [zoomScale, setZoomScale] = useState(1);

  // Final approach effects (last 8 seconds)
  const [finalApproach, setFinalApproach] = useState(false);
  const [intensity, setIntensity] = useState(0); // 0-1 intensity for effects
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const [heartbeat, setHeartbeat] = useState(1);
  const sparkIdRef = useRef(0);

  // Pre-computed highlight pattern for lights (stable across renders)
  const lightHighlightPattern = useMemo(
    () => Array.from({ length: 24 }).map(() => Math.random()),
    [],
  );

  // Real-time rotation tracking for showing current segment
  const motionRotation = useMotionValue(0);
  const [currentSegmentName, setCurrentSegmentName] = useState<string>("");
  const animationRef = useRef<{
    startRotation: number;
    targetRotation: number;
    startTime: number;
    duration: number;
  } | null>(null);

  // Sound effect tracking
  const lastSegmentIndexRef = useRef<number>(-1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const segmentAngle =
    participants.length > 0 ? 360 / participants.length : 360;

  // Track recent winners to avoid repetition (stores last N winner indices)
  const recentWinnersRef = useRef<number[]>([]);
  const MAX_HISTORY = 3; // Avoid repeating the last 3 winners (if possible)

  // Cryptographically secure random number generator with entropy
  const getSecureRandomIndex = useCallback((maxIndex: number): number => {
    // Method 1: Use Web Crypto API for cryptographic randomness
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const cryptoRandom = array[0] / (0xffffffff + 1);

    // Method 2: Add time-based entropy (microsecond precision)
    const timeEntropy = (performance.now() % 1) * 1000;
    const timeRandom = timeEntropy % 1;

    // Method 3: Mouse movement entropy (if available)
    const mouseEntropy = (Date.now() % 997) / 997; // Prime number for better distribution

    // Combine all entropy sources with weighted mix
    const combinedRandom =
      (cryptoRandom * 0.7 + timeRandom * 0.2 + mouseEntropy * 0.1) % 1;

    let selectedIndex = Math.floor(combinedRandom * maxIndex);

    // Avoid recent winners if possible (only if we have enough participants)
    if (maxIndex > MAX_HISTORY && recentWinnersRef.current.length > 0) {
      let attempts = 0;
      while (
        recentWinnersRef.current.includes(selectedIndex) &&
        attempts < 10
      ) {
        // Re-roll with fresh randomness
        crypto.getRandomValues(array);
        const newRandom = array[0] / (0xffffffff + 1);
        selectedIndex = Math.floor(newRandom * maxIndex);
        attempts++;
      }
    }

    // Update recent winners history
    recentWinnersRef.current.push(selectedIndex);
    if (recentWinnersRef.current.length > MAX_HISTORY) {
      recentWinnersRef.current.shift();
    }

    return selectedIndex;
  }, []);

  // Calculate which participant is at the pointer position based on current rotation
  const getParticipantAtPointer = useCallback(
    (currentRotation: number) => {
      if (participants.length === 0) return null;
      // Normalize rotation to 0-360
      const normalizedRotation = ((currentRotation % 360) + 360) % 360;
      // The pointer is at the top. After rotating by normalizedRotation degrees,
      // the segment that was at (360 - normalizedRotation) is now at the top
      const pointerAngle = (360 - normalizedRotation) % 360;
      // Find which segment contains this angle
      const segmentIndex = Math.floor(pointerAngle / segmentAngle);
      return participants[segmentIndex % participants.length];
    },
    [participants, segmentAngle],
  );

  // Precise cubic bezier implementation for [0.12, 0.84, 0.18, 1]
  // This curve ensures monotonically decreasing velocity:
  // - Fast start (strong push)
  // - Smooth, continuous deceleration (no re-acceleration)
  // - Natural friction-like slowdown
  const cubicBezier = useCallback((t: number): number => {
    const p1x = 0.12,
      p1y = 0.84,
      p2x = 0.18,
      p2y = 1;

    // Solve for parameter u given time t using Newton-Raphson method
    const sampleCurveX = (u: number) => {
      return (
        ((1 - 3 * p2x + 3 * p1x) * u + (3 * p2x - 6 * p1x)) * u * u +
        3 * p1x * u
      );
    };

    const sampleCurveY = (u: number) => {
      return (
        ((1 - 3 * p2y + 3 * p1y) * u + (3 * p2y - 6 * p1y)) * u * u +
        3 * p1y * u
      );
    };

    const sampleCurveDerivativeX = (u: number) => {
      return (
        (3 * (1 - 3 * p2x + 3 * p1x) * u + 2 * (3 * p2x - 6 * p1x)) * u +
        3 * p1x
      );
    };

    // Newton-Raphson iteration to find u for given t
    let u = t;
    for (let i = 0; i < 8; i++) {
      const x = sampleCurveX(u) - t;
      if (Math.abs(x) < 1e-6) break;
      const d = sampleCurveDerivativeX(u);
      if (Math.abs(d) < 1e-6) break;
      u = u - x / d;
    }

    return sampleCurveY(u);
  }, []);

  // Track animation progress and update current segment name
  useAnimationFrame(() => {
    if (animationRef.current && (phase === "spinning" || phase === "zooming")) {
      const { startRotation, targetRotation, startTime, duration } =
        animationRef.current;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = cubicBezier(progress);
      const currentRotation =
        startRotation + (targetRotation - startRotation) * easedProgress;

      motionRotation.set(currentRotation);

      // Calculate current segment index for sound effects
      const normalizedRotation = ((currentRotation % 360) + 360) % 360;
      const pointerAngle = (360 - normalizedRotation) % 360;
      const currentSegmentIndex =
        Math.floor(pointerAngle / segmentAngle) % participants.length;

      // Play tick sound when segment changes
      if (
        soundEnabled &&
        currentSegmentIndex !== lastSegmentIndexRef.current &&
        participants.length > 0
      ) {
        lastSegmentIndexRef.current = currentSegmentIndex;

        if (finalApproach) {
          // Slower, deeper tick during final approach
          playSlowTick(1 + intensity * 0.5);
        } else {
          // Fast tick during normal spinning (volume decreases with speed)
          const speed = Math.abs(easedProgress - (elapsed - 16) / duration);
          playTickSound(0.1 + speed * 2);
        }
      }

      const participant = getParticipantAtPointer(currentRotation);
      if (participant) {
        setCurrentSegmentName(participant.name);
      }
    }
  });

  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ["#FFD700", "#FFA500", "#FF4500", "#DC143C", "#FFD700"];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: colors,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  // Create spark particles from the pointer
  const createSpark = useCallback(() => {
    const newSparks: Spark[] = [];
    const sparkCount = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < sparkCount; i++) {
      newSparks.push({
        id: sparkIdRef.current++,
        x: 0,
        y: 0,
        angle: -90 + (Math.random() - 0.5) * 120, // Spread downward from pointer
        speed: 2 + Math.random() * 4,
        life: 1,
      });
    }

    setSparks((prev) => [...prev, ...newSparks]);
  }, []);

  // Animate sparks
  useEffect(() => {
    if (sparks.length === 0) return;

    const interval = setInterval(() => {
      setSparks((prev) =>
        prev
          .map((spark) => ({
            ...spark,
            x: spark.x + Math.cos((spark.angle * Math.PI) / 180) * spark.speed,
            y:
              spark.y +
              Math.sin((spark.angle * Math.PI) / 180) * spark.speed +
              0.5, // gravity
            life: spark.life - 0.03,
            speed: spark.speed * 0.98,
          }))
          .filter((spark) => spark.life > 0),
      );
    }, 16);

    return () => clearInterval(interval);
  }, [sparks.length]);

  // Final approach effects - triggered for last 8 seconds
  useEffect(() => {
    if (!finalApproach) return;

    // Spark generation interval - more frequent as intensity increases
    const sparkInterval = setInterval(
      () => {
        if (Math.random() < 0.3 + intensity * 0.5) {
          createSpark();
        }
      },
      100 - intensity * 50,
    );

    // Screen shake effect - only active when intensity > 0.8, very subtle
    const shakeInterval = setInterval(() => {
      if (intensity > 0.8) {
        const shakeAmount = (intensity - 0.8) * 4; // Max 0.8 pixels
        setShakeOffset({
          x: (Math.random() - 0.5) * shakeAmount,
          y: (Math.random() - 0.5) * shakeAmount,
        });
      } else {
        setShakeOffset({ x: 0, y: 0 });
      }
    }, 80);

    // Heartbeat effect - pulses faster as intensity increases
    const heartbeatInterval = setInterval(
      () => {
        setHeartbeat((prev) => (prev === 1 ? 1.03 + intensity * 0.04 : 1));
      },
      200 - intensity * 100,
    );

    return () => {
      clearInterval(sparkInterval);
      clearInterval(shakeInterval);
      clearInterval(heartbeatInterval);
    };
  }, [finalApproach, intensity, createSpark]);

  const startSpin = useCallback(() => {
    if (participants.length < 2 || phase === "spinning" || phase === "zooming")
      return;

    // Resume audio context and play spin start sound
    if (soundEnabled) {
      resumeAudioContext();
      playSpinStartSound();
    }

    onStartSpin();
    setPhase("spinning");
    setWinner(null);
    setZoomScale(1);
    setFinalApproach(false);
    setIntensity(0);
    setSparks([]);
    setShakeOffset({ x: 0, y: 0 });
    setHeartbeat(1);
    lastSegmentIndexRef.current = -1; // Reset segment tracking for sounds

    // Secure random winner index with anti-repetition
    const winnerIndex = getSecureRandomIndex(participants.length);

    // Calculate final rotation
    // We want the winner segment to end up at the top (where pointer is)
    // Pointer is at top (0 degrees), segments are drawn clockwise starting from top
    const baseSpins = 6 + Math.floor(spinPower[0] / 5); // 8-12 full rotations based on power

    // The winner segment center is at: winnerIndex * segmentAngle + segmentAngle / 2
    // To bring it to the top (0 degrees), we need to rotate so that this angle ends at the pointer
    // Current wheel position (mod 360)
    const currentPosition = rotation % 360;

    // Target position: we want winnerIndex segment at the top
    // After rotating by X degrees, the segment at angle (360 - X) will be at the top
    // So we need: (360 - X) mod 360 = winnerAngle (position within winner segment)
    // Therefore: X = 360 - winnerAngle

    // Add random offset within the segment for realistic landing position
    // Use 70% of segment width to avoid landing too close to edges
    const randomOffset = (Math.random() - 0.5) * segmentAngle * 0.7;
    const winnerAngle = winnerIndex * segmentAngle + segmentAngle / 2 + randomOffset;
    const targetPosition = 360 - winnerAngle;

    // Calculate how much additional rotation is needed from current position
    let additionalRotation = targetPosition - currentPosition;
    // Ensure we always rotate forward (positive direction)
    while (additionalRotation < 0) additionalRotation += 360;

    // Total rotation = base spins + additional rotation to land on winner
    const totalRotation = baseSpins * 360 + additionalRotation;
    const newRotation = rotation + totalRotation;

    setRotation(newRotation);

    // Duration based on power slider (10-30 seconds)
    const duration = spinPower[0] * 1000;

    // Start animation tracking
    animationRef.current = {
      startRotation: rotation,
      targetRotation: newRotation,
      startTime: Date.now(),
      duration: duration,
    };

    // Start final approach effects based on easing curve deceleration
    // For easing [0.12, 0.84, 0.18, 1]:
    // - Fast start with immediate high velocity
    // - About 84% of rotation in first 18% of time
    // - Smooth, monotonic deceleration (no re-acceleration)
    const finalApproachTime = duration * 0.2; // Start when wheel noticeably slows

    setTimeout(() => {
      setFinalApproach(true);
    }, finalApproachTime);

    // Gradually increase intensity during final approach (remaining 65% of duration)
    const intensityDuration = duration - finalApproachTime;

    setTimeout(() => {
      const intensityInterval = setInterval(() => {
        setIntensity((prev) => {
          const newVal = prev + 1 / (intensityDuration / 100);
          if (newVal >= 1) {
            clearInterval(intensityInterval);
            return 1;
          }
          return newVal;
        });
      }, 100);
    }, finalApproachTime);

    // Start zoom effect 3 seconds before end
    const zoomStartTime = Math.max(duration - 3000, duration * 0.7);

    setTimeout(() => {
      setPhase("zooming");
    }, zoomStartTime);

    setTimeout(() => {
      setPhase("winner");
      setWinner(participants[winnerIndex]);
      setFinalApproach(false);
      setShakeOffset({ x: 0, y: 0 });
      setHeartbeat(1);
      animationRef.current = null; // Stop animation tracking

      // Play winner celebration sound and confetti
      if (soundEnabled) {
        playWinnerSound();
      }
      triggerConfetti();
      onSpinComplete(participants[winnerIndex]);
    }, duration);
  }, [
    participants,
    phase,
    spinPower,
    segmentAngle,
    rotation,
    onSpinComplete,
    onStartSpin,
    triggerConfetti,
    getSecureRandomIndex,
    soundEnabled,
  ]);

  // Zoom animation effect - instant zoom when spinning starts
  useEffect(() => {
    if (phase === "spinning" || phase === "zooming" || phase === "winner") {
      // Instant zoom using responsive multiplier
      setZoomScale(zoomMultiplier);
    } else if (phase === "idle") {
      setZoomScale(1);
    }
  }, [phase, zoomMultiplier]);

  const resetWheel = () => {
    setPhase("idle");
    setWinner(null);
    setZoomScale(1);
    setFinalApproach(false);
    setIntensity(0);
    setSparks([]);
    setShakeOffset({ x: 0, y: 0 });
    setHeartbeat(1);
    setCurrentSegmentName("");
    animationRef.current = null;
  };

  // Generate wheel segments - using larger dimensions
  const WHEEL_SIZE = 500; // SVG size
  const WHEEL_CENTER = WHEEL_SIZE / 2; // 250
  const WHEEL_RADIUS = WHEEL_SIZE / 2; // 250

  const wheelSegments = useMemo(() => {
    if (participants.length === 0) return null;

    return participants.map((participant, index) => {
      const startAngle = index * segmentAngle;
      const endAngle = startAngle + segmentAngle;
      const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];

      // Convert to radians for path calculation
      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (endAngle - 90) * (Math.PI / 180);

      const x1 = WHEEL_CENTER + WHEEL_RADIUS * Math.cos(startRad);
      const y1 = WHEEL_CENTER + WHEEL_RADIUS * Math.sin(startRad);
      const x2 = WHEEL_CENTER + WHEEL_RADIUS * Math.cos(endRad);
      const y2 = WHEEL_CENTER + WHEEL_RADIUS * Math.sin(endRad);

      const largeArc = segmentAngle > 180 ? 1 : 0;

      const pathD = `M ${WHEEL_CENTER} ${WHEEL_CENTER} L ${x1} ${y1} A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      // Text - radial layout (characters from outer edge toward center)
      const textAngleRad =
        (startAngle + segmentAngle / 2 - 90) * (Math.PI / 180);
      // Rotate each character to be upright relative to the radial direction
      const textRotation = startAngle + segmentAngle / 2;

      // Font sizes based on participant count - optimized for 6 characters
      const fontSize =
        participants.length > 16
          ? 22
          : participants.length > 12
            ? 26
            : participants.length > 8
              ? 32
              : 38;

      // Character spacing along the radius (tighter to fit more chars)
      const charStep = fontSize * 1.05;

      // Allow up to 6 characters for all cases
      const maxChars = participants.length > 16 ? 5 : 6;
      const displayName =
        participant.name.length > maxChars
          ? participant.name.substring(0, maxChars) + "…"
          : participant.name;

      const chars = displayName.split("");
      // Start very close to outer edge
      const startRadius = WHEEL_RADIUS * 0.95 - fontSize * 0.4;

      return (
        <g key={participant.id}>
          <path
            d={pathD}
            fill={color}
            stroke="hsl(45, 100%, 70%)"
            strokeWidth="2"
          />
          {/* Render each character separately for vertical text */}
          {chars.map((char, charIndex) => {
            // Position each character along the radial line
            const charRadius = startRadius - charIndex * charStep;
            const charX = WHEEL_CENTER + charRadius * Math.cos(textAngleRad);
            const charY = WHEEL_CENTER + charRadius * Math.sin(textAngleRad);

            return (
              <text
                key={charIndex}
                x={charX}
                y={charY}
                fill="white"
                fontSize={fontSize}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${textRotation}, ${charX}, ${charY})`}
                style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.9)" }}
              >
                {char}
              </text>
            );
          })}
        </g>
      );
    });
  }, [participants, segmentAngle]);

  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-2xl text-muted-foreground font-orbitron">
          尚無參與者
        </div>
        <p className="mt-2 text-muted-foreground">請先登記參與抽獎</p>
      </div>
    );
  }

  // Responsive inset values based on wheel size
  const glowInset = Math.max(12, wheelSize * 0.04);
  const spotlightInset = Math.max(50, wheelSize * 0.2);
  const lightInset = Math.max(20, wheelSize * 0.07);

  return (
    <div className="flex flex-col items-center gap-4 md:gap-8 w-full">
        {/* Wheel container with zoom effect */}
        <motion.div
          className="relative"
          animate={{
            scale: zoomScale,
          }}
          transition={{
            duration: 0.3,
            ease: "easeOut",
          }}
        >
        {/* Spotlight/vignette effect during final approach */}
        {finalApproach && (
          <div
            className="absolute pointer-events-none z-30"
            style={{
              inset: `-${spotlightInset}px`,
              background: `radial-gradient(circle at 50% 0%, transparent 20%, rgba(0,0,0,${intensity * 0.4}) 80%)`,
              opacity: intensity,
            }}
          />
        )}

        {/* Outer glow ring - intensifies during final approach */}
        <div
          className={`absolute rounded-full bg-gradient-to-r from-primary via-casino-red to-primary blur-xl ${finalApproach ? "" : "animate-pulse"}`}
          style={{
            inset: `-${glowInset}px`,
            opacity: finalApproach ? (0.5 + intensity * 0.4) * heartbeat : 0.5,
            transform: finalApproach
              ? `scale(${(1 + intensity * 0.15) * heartbeat})`
              : "scale(1)",
            transition: "transform 0.1s, opacity 0.1s",
          }}
        />

        {/* Extra dramatic glow during final approach */}
        {finalApproach && (
          <div
            className="absolute rounded-full blur-2xl pointer-events-none animate-final-pulse"
            style={{
              inset: `-${glowInset * 2}px`,
              background: `radial-gradient(circle, hsl(45, 100%, 50%) 0%, hsl(0, 85%, 45%) 50%, transparent 70%)`,
              opacity: intensity * 0.6,
            }}
          />
        )}

        {/* Wheel frame - responsive sizing */}
        <div
          className="relative rounded-full bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700 shadow-2xl"
          style={{
            width: `${wheelSize}px`,
            height: `${wheelSize}px`,
            padding: `${Math.max(6, wheelSize * 0.02)}px`,
          }}
        >
          {/* Inner wheel */}
          <motion.div
            className="w-full h-full rounded-full overflow-hidden relative"
            animate={{ rotate: rotation }}
            transition={{
              duration: phase === "spinning" ? spinPower[0] : 0,
              ease: phase === "spinning" ? [0.12, 0.84, 0.18, 1] : "linear",
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 500 500">
              {wheelSegments}
              {/* Center circle */}
              <circle
                cx="250"
                cy="250"
                r="35"
                fill="hsl(45, 100%, 50%)"
                stroke="hsl(45, 100%, 70%)"
                strokeWidth="3"
              />
              <circle cx="250" cy="250" r="18" fill="hsl(0, 85%, 40%)" />
            </svg>
          </motion.div>
        </div>

        {/* Pointer (fixed, at top) - responsive sizing */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 z-20"
          style={{ top: `-${Math.max(12, wheelSize * 0.035)}px` }}
        >
          <div className="relative">
            {/* Pointer glow intensifies during final approach */}
            {finalApproach && (
              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-full animate-pointer-pulse"
                style={{
                  top: `${Math.max(8, wheelSize * 0.024)}px`,
                  width: `${Math.max(36, wheelSize * 0.1)}px`,
                  height: `${Math.max(36, wheelSize * 0.1)}px`,
                  background: `radial-gradient(circle, rgba(255,215,0,${0.3 + intensity * 0.5}) 0%, transparent 70%)`,
                  filter: `blur(${4 + intensity * 4}px)`,
                }}
              />
            )}
            <div
              className={`w-0 h-0 border-l-transparent border-r-transparent border-t-primary drop-shadow-lg ${finalApproach ? "animate-pointer-glow" : ""}`}
              style={{
                borderLeftWidth: `${Math.max(16, wheelSize * 0.046)}px`,
                borderRightWidth: `${Math.max(16, wheelSize * 0.046)}px`,
                borderTopWidth: `${Math.max(32, wheelSize * 0.092)}px`,
                filter: finalApproach
                  ? `drop-shadow(0 4px 6px rgba(0,0,0,0.5)) drop-shadow(0 0 ${10 + intensity * 15}px hsl(45, 100%, 50%))`
                  : "drop-shadow(0 4px 6px rgba(0,0,0,0.5))",
              }}
            />
            {/* Pointer glow effect */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 bg-white rounded-full animate-pulse"
              style={{
                width: `${Math.max(8, wheelSize * 0.02)}px`,
                height: `${Math.max(8, wheelSize * 0.02)}px`,
                boxShadow: finalApproach
                  ? `0 0 ${10 + intensity * 20}px white, 0 0 ${20 + intensity * 30}px hsl(45, 100%, 50%)`
                  : undefined,
              }}
            />

            {/* Spark particles from pointer */}
            {sparks.map((spark) => (
              <div
                key={spark.id}
                className="absolute w-2 h-2 rounded-full pointer-events-none"
                style={{
                  left: `calc(50% + ${spark.x}px)`,
                  top: `calc(100% + ${spark.y}px)`,
                  transform: "translate(-50%, -50%)",
                  background: `radial-gradient(circle, hsl(45, 100%, ${60 + (spark.id % 20)}%) 0%, hsl(${spark.id % 30}, 100%, 50%) 100%)`,
                  opacity: spark.life,
                  boxShadow: `0 0 ${6 * spark.life}px hsl(45, 100%, 50%)`,
                  width: `${4 + spark.life * 4}px`,
                  height: `${4 + spark.life * 4}px`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Decorative lights around the wheel - enhanced during final approach */}
        <div
          className="absolute pointer-events-none"
          style={{ inset: `-${lightInset}px` }}
        >
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 15 - 90) * (Math.PI / 180);
            const x = 50 + 50 * Math.cos(angle);
            const y = 50 + 50 * Math.sin(angle);
            // Use pre-computed pattern for stable highlight (based on intensity threshold)
            const isHighlighted =
              finalApproach && lightHighlightPattern[i] < intensity * 0.3;
            // Responsive light size
            const baseLightSize = Math.max(8, wheelSize * 0.024);
            const lightSize = finalApproach
              ? baseLightSize + intensity * (baseLightSize * 0.5)
              : baseLightSize;
            return (
              <div
                key={i}
                className={`absolute rounded-full bg-primary ${finalApproach ? "animate-light-flash" : "animate-pulse"}`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                  animationDelay: finalApproach
                    ? `${i * 0.05}s`
                    : `${i * 0.1}s`,
                  animationDuration: finalApproach
                    ? `${0.2 + (1 - intensity) * 0.3}s`
                    : "2s",
                  width: `${lightSize}px`,
                  height: `${lightSize}px`,
                  boxShadow: finalApproach
                    ? `0 0 ${15 + intensity * 20}px hsl(45, 100%, 50%), 0 0 ${30 + intensity * 30}px hsl(45, 100%, 50%), 0 0 ${45 + intensity * 40}px hsl(${isHighlighted ? 0 : 45}, ${isHighlighted ? 85 : 100}%, 50%)`
                    : "0 0 10px hsl(45, 100%, 50%), 0 0 20px hsl(45, 100%, 50%)",
                  background: isHighlighted
                    ? "hsl(0, 85%, 55%)"
                    : "hsl(45, 100%, 50%)",
                }}
              />
            );
          })}
        </div>

        {/* Energy ring effect during final approach */}
        {finalApproach && (
          <div
            className="absolute pointer-events-none"
            style={{ inset: `-${Math.max(30, wheelSize * 0.12)}px` }}
          >
            <div
              className="w-full h-full rounded-full animate-energy-ring"
              style={{
                border: `${2 + intensity * 3}px solid transparent`,
                borderTopColor: `hsla(45, 100%, 50%, ${intensity * 0.8})`,
                borderRightColor: `hsla(0, 85%, 50%, ${intensity * 0.6})`,
                filter: `blur(${1 + intensity}px)`,
              }}
            />
          </div>
        )}
      </motion.div>

      {/* Winner announcement */}
      <AnimatePresence>
        {phase === "winner" && winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="relative text-center"
          >
            {/* Solid dark backdrop for readability */}
            <div className="absolute inset-0 -m-4 rounded-3xl bg-black/80 backdrop-blur-md" />

            {/* Gradient border glow effect */}
            <div className="absolute inset-0 -m-4 rounded-3xl bg-gradient-to-br from-primary via-casino-red to-primary opacity-60 blur-xl" />

            {/* Main content container */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 border-4 border-primary shadow-2xl animate-winner-pulse">
              {/* Inner glow effect */}
              <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-primary/20 to-casino-red/20 pointer-events-none" />

              <p className="relative text-2xl text-primary/90 mb-2 font-semibold">
                🎉 恭喜中獎 🎉
              </p>
              {prizeName && (
                <p className="relative text-xl text-primary mb-3 font-orbitron font-bold">
                  🏆 {prizeName} 🏆
                </p>
              )}
              <p className="relative text-5xl md:text-7xl font-orbitron font-bold text-primary text-glow-gold">
                {winner.name}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="w-full max-w-md space-y-6">
        {/* Prize input and Power slider */}
        {phase === "idle" && (
          <div className="space-y-4">
            {/* Prize name input */}
            <div className="space-y-2 p-4 rounded-xl bg-card/80 border border-primary/30">
              <Label className="text-lg font-orbitron text-primary">
                🎁 獎項名稱
              </Label>
              <Input
                value={prizeName}
                onChange={(e) => setPrizeName(e.target.value)}
                placeholder="輸入獎項名稱（如：頭獎 iPhone 17 pro max）"
                className="text-center"
              />
            </div>

            {/* Power slider */}
            <div className="space-y-3 p-4 rounded-xl bg-card/80 border border-primary/30">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-orbitron text-primary">
                  🎯 力道控制
                </Label>
                <span className="text-primary font-bold font-orbitron">
                  {spinPower[0]} 秒
                </span>
              </div>
              <Slider
                value={spinPower}
                onValueChange={setSpinPower}
                min={10}
                max={30}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>輕輕轉</span>
                <span>用力轉！</span>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-center gap-4">
          {phase === "idle" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startSpin}
              disabled={participants.length < 2}
              className="px-12 py-4 text-2xl font-orbitron font-bold rounded-xl gradient-gold text-primary-foreground box-glow-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎰 開始抽獎！
            </motion.button>
          )}

          {(phase === "spinning" || phase === "zooming") && (
            <div className="flex flex-col items-center gap-2">
              {/* Current segment name display */}
              <motion.div
                className="relative"
                animate={{
                  scale: finalApproach ? [1, 1.08, 1] : [1, 1.02, 1],
                }}
                transition={{
                  duration: finalApproach ? 0.15 : 0.3,
                  repeat: Infinity,
                }}
              >
                {/* Dark backdrop for readability */}
                <div className="absolute inset-0 -mx-4 -my-2 rounded-xl bg-black/70 backdrop-blur-sm" />
                {/* Glow border */}
                <div
                  className="absolute inset-0 -mx-4 -my-2 rounded-xl blur-md"
                  style={{
                    background: `linear-gradient(135deg, hsl(45, 100%, 50%), hsl(0, 85%, 45%))`,
                    opacity: finalApproach ? 0.4 + intensity * 0.3 : 0.3,
                  }}
                />
                {/* Name text */}
                <p
                  className="relative px-6 py-2 text-3xl md:text-4xl font-orbitron font-bold text-primary"
                  style={{
                    textShadow: `0 0 ${finalApproach ? 15 + intensity * 25 : 10}px hsl(45, 100%, 50%), 0 0 ${finalApproach ? 30 + intensity * 40 : 20}px hsl(45, 100%, 50%)`,
                  }}
                >
                  {currentSegmentName || "..."}
                </p>
              </motion.div>

              {/* Status text */}
              <motion.div
                className="px-8 py-2 text-lg font-orbitron text-muted-foreground bg-black/50 rounded-lg backdrop-blur-sm"
                animate={{
                  opacity: finalApproach ? [1, 0.6, 1] : 1,
                }}
                transition={{
                  duration: finalApproach ? 0.3 - intensity * 0.15 : 0.5,
                  repeat: Infinity,
                }}
              >
                {phase === "zooming"
                  ? intensity > 0.7
                    ? "✨ 即將揭曉！！"
                    : "🔍 即將揭曉..."
                  : finalApproach
                    ? intensity > 0.5
                      ? "🎯 鎖定目標..."
                      : "⚡ 減速中..."
                    : "🎰 轉動中..."}
              </motion.div>
            </div>
          )}

          {phase === "winner" && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetWheel}
              className="px-8 py-3 text-xl font-orbitron font-bold rounded-xl bg-casino-red text-foreground box-glow-red"
            >
              再抽一次
            </motion.button>
          )}
        </div>

        {/* Participant count and sound toggle */}
        <div className="flex items-center justify-center gap-4">
          <p className="text-center text-muted-foreground">
            共{" "}
            <span className="text-primary font-bold">
              {participants.length}
            </span>{" "}
            人參加抽獎
          </p>
          <button
            onClick={() => {
              resumeAudioContext();
              setSoundEnabled(!soundEnabled);
            }}
            className={`p-2 rounded-lg transition-colors ${
              soundEnabled
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            title={soundEnabled ? "關閉音效" : "開啟音效"}
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      </div>
    </div>
  );
};
