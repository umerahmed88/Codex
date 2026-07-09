// ============================================================================
// Confetti — a one-shot burst of falling coloured pieces for celebrations.
// Plays on mount, then the pieces settle off-screen. Reduce-motion → renders
// nothing (celebrations stay legible without motion). Uses Reanimated so the
// fall runs on the UI thread.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme';

const PIECE_COLORS = [colors.gold, colors.coral, colors.secondary, colors.mint, colors.primary];

// Deterministic pseudo-random in [0,1) from a seed — pure (unlike Math.random),
// and stable across re-renders so pieces don't jump.
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function Confetti({ count = 26, duration = 2200 }: { count?: number; duration?: number }) {
  const reduced = useReducedMotion();
  // One dimensions subscription for the whole burst (not one per piece).
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);
  // Self-unmount after the pieces have settled so nothing lingers in the tree.
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDone(true), duration + 800);
    return () => clearTimeout(id);
  }, [duration]);

  if (reduced || done) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((i) => (
        <Piece key={i} index={i} count={count} duration={duration} width={width} height={height} />
      ))}
    </View>
  );
}

function Piece({
  index,
  count,
  duration,
  width,
  height,
}: {
  index: number;
  count: number;
  duration: number;
  width: number;
  height: number;
}) {
  const y = useSharedValue(-24);
  const rot = useSharedValue(0);

  const cfg = useMemo(() => {
    const spread = (index / Math.max(1, count - 1)) * width;
    return {
      left: spread + (rand(index) - 0.5) * (width / count),
      color: PIECE_COLORS[index % PIECE_COLORS.length],
      delay: rand(index + 1) * 500,
      spin: rand(index + 2) * 720 - 360,
      w: 7 + rand(index + 3) * 5,
      h: 10 + rand(index + 4) * 8,
    };
  }, [index, count, width]);

  useEffect(() => {
    y.value = withDelay(cfg.delay, withTiming(height + 40, { duration, easing: Easing.in(Easing.quad) }));
    rot.value = withDelay(cfg.delay, withTiming(cfg.spin, { duration }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: cfg.left,
          width: cfg.w,
          height: cfg.h,
          borderRadius: 2,
          backgroundColor: cfg.color,
        },
        style,
      ]}
    />
  );
}
