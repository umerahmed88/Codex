/* eslint-disable react-hooks/immutability --
   Reanimated shared values are mutated through `.value` by design (their
   documented API); the react-compiler immutability rule can't model them. */
// ============================================================================
// PressableScale — a Pressable that springs down on touch and pops back, with
// a light haptic tap. The building block for every button in the redesign so
// the whole app feels tactile. Honors reduce-motion (no scale when reduced).
// ============================================================================
import { type ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { fxTap } from '../lib/fx';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  children: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: boolean;
  scaleTo?: number;
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  testID?: string;
}

export function PressableScale({
  children,
  onPress,
  style,
  disabled = false,
  haptic = true,
  scaleTo = 0.94,
  accessibilityRole = 'button',
  accessibilityLabel,
  testID,
}: Props) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      testID={testID}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[style, animStyle]}
      onPressIn={() => {
        if (!reduced) scale.value = withSpring(scaleTo, { damping: 15, stiffness: 420 });
      }}
      onPressOut={() => {
        if (!reduced) scale.value = withSpring(1, { damping: 11, stiffness: 340 });
      }}
      onPress={(e) => {
        if (disabled) return;
        if (haptic) fxTap();
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
