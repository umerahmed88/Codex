// ============================================================================
// Lumi — the app mascot. Renders an animated, on-brand placeholder drawn with
// react-native-svg and animated with Reanimated (idle bob, wave, celebrate
// bounce, encourage nod). Honors reduce-motion.
//
// SWAP-READY: this is a stand-in for Lumi's real character art. When
// transparent PNG sprites land in assets/lumi (idle/wave/celebrate/…), flip
// USE_REAL_ART to true and drop them into SPRITES below — every call site
// (<Lumi state="wave" size={96} />) stays identical.
// ============================================================================
import { memo, useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse, Circle, Path, Polygon, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme';

export type LumiState = 'idle' | 'wave' | 'celebrate' | 'encourage' | 'sad';

interface Props {
  state?: LumiState;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

// --- Real-art hook (disabled until transparent PNGs are added) ---------------
const USE_REAL_ART = false;
// const SPRITES: Record<LumiState, number> = {
//   idle: require('../../assets/lumi/idle.png'),
//   wave: require('../../assets/lumi/wave.png'),
//   celebrate: require('../../assets/lumi/celebrate.png'),
//   encourage: require('../../assets/lumi/encourage.png'),
//   sad: require('../../assets/lumi/sad.png'),
// };

export function Lumi({ state = 'idle', size = 96, style }: Props) {
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);
  const sc = useSharedValue(1);
  const reduced = useReducedMotion();

  useEffect(() => {
    cancelAnimation(ty);
    cancelAnimation(rot);
    cancelAnimation(sc);
    if (reduced) {
      ty.value = 0;
      rot.value = 0;
      sc.value = 1;
      return;
    }
    const inout = Easing.inOut(Easing.quad);
    if (state === 'idle' || state === 'encourage') {
      ty.value = withRepeat(withTiming(-6, { duration: 1300, easing: inout }), -1, true);
      rot.value = state === 'encourage' ? withRepeat(withTiming(4, { duration: 1100, easing: inout }), -1, true) : 0;
      sc.value = 1;
    } else if (state === 'wave') {
      ty.value = withRepeat(withTiming(-5, { duration: 1200, easing: inout }), -1, true);
      rot.value = withRepeat(withTiming(8, { duration: 560, easing: inout }), -1, true);
      sc.value = 1;
    } else if (state === 'celebrate') {
      ty.value = withRepeat(
        withSequence(
          withTiming(-16, { duration: 280, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      );
      sc.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 280 }), withTiming(1, { duration: 320 })),
        -1,
        false
      );
      rot.value = 0;
    } else {
      ty.value = 0;
      rot.value = 0;
      sc.value = 0.97;
    }
    return () => {
      cancelAnimation(ty);
      cancelAnimation(rot);
      cancelAnimation(sc);
    };
  }, [state, reduced, ty, rot, sc]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }, { rotate: `${rot.value}deg` }, { scale: sc.value }],
  }));

  return (
    <Animated.View
      style={[{ width: size, height: size * 1.1 }, animStyle, style]}
      // Lumi is decorative — don't announce it to screen readers (it would read
      // an untranslated "Lumi" repeatedly beside real content).
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {USE_REAL_ART ? (
        // <Image source={SPRITES[state]} style={{ width: size, height: size * 1.1 }} resizeMode="contain" />
        <View />
      ) : (
        <LumiArt state={state} size={size} />
      )}
    </Animated.View>
  );
}

// Star points for the belly badge — the belly star is fixed, so compute once.
function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(1)},${(cy + rr * Math.sin(rad)).toFixed(1)}`);
  }
  return pts.join(' ');
}
const BELLY_STAR = starPoints(50, 84, 11);

// memo: the SVG only changes when state/size change, never per animation frame
// (the motion lives on the wrapper Animated.View).
const LumiArt = memo(function LumiArt({ state, size }: { state: LumiState; size: number }) {
  const happy = state === 'celebrate' || state === 'wave';
  const sad = state === 'sad';
  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 100 112">
      {/* feet */}
      <Ellipse cx={38} cy={104} rx={9} ry={5} fill={colors.gold} />
      <Ellipse cx={62} cy={104} rx={9} ry={5} fill={colors.gold} />
      {/* leaf tuft */}
      <Path d="M50 30 C42 14 34 14 33 26 C33 34 44 34 50 30 Z" fill={colors.mint} />
      <Path d="M50 30 C58 12 68 14 68 26 C68 35 56 35 50 30 Z" fill={colors.primary} />
      {/* body */}
      <Ellipse cx={50} cy={70} rx={35} ry={36} fill={colors.primary} />
      {/* belly */}
      <Ellipse cx={50} cy={78} rx={23} ry={26} fill="#F6ECC9" />
      {/* scarf */}
      <Path d="M28 60 Q50 72 72 60 L70 68 Q50 79 30 68 Z" fill={colors.secondary} />
      {/* eyes */}
      <Circle cx={38} cy={54} r={13} fill="#FFFFFF" />
      <Circle cx={62} cy={54} r={13} fill="#FFFFFF" />
      {sad ? (
        <>
          <Circle cx={38} cy={58} r={5.5} fill={colors.navy} />
          <Circle cx={62} cy={58} r={5.5} fill={colors.navy} />
        </>
      ) : happy ? (
        <>
          <Path d="M31 55 Q38 47 45 55" stroke={colors.navy} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d="M55 55 Q62 47 69 55" stroke={colors.navy} strokeWidth={4} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <Circle cx={39} cy={55} r={6} fill={colors.navy} />
          <Circle cx={61} cy={55} r={6} fill={colors.navy} />
          <Circle cx={41} cy={53} r={2} fill="#FFFFFF" />
          <Circle cx={63} cy={53} r={2} fill="#FFFFFF" />
        </>
      )}
      {/* beak */}
      <Polygon points="50,62 45,67 55,67" fill={colors.gold} />
      {/* wave arm (only meaningful in wave state, harmless otherwise) */}
      {state === 'wave' && <Ellipse cx={84} cy={62} rx={7} ry={11} fill={colors.primary} />}
      {/* belly star */}
      <G>
        <Polygon points={BELLY_STAR} fill={colors.gold} />
      </G>
    </Svg>
  );
});
