// ============================================================================
// AnimatedCounter — a number that counts up when it changes (XP, streak). Uses
// the locale-aware formatter (Arabic-Indic digits in Arabic). Honors
// reduce-motion (snaps to the value instantly). Kept as a simple JS tween — a
// single label doesn't need the UI thread.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useFormatNumber } from '../hooks/useFormatNumber';

interface Props {
  value: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
}

export function AnimatedCounter({ value, style, duration = 700 }: Props) {
  const fmt = useFormatNumber();
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (reduced || from.current === value) {
      setDisplay(value);
      from.current = value;
      return;
    }
    const start = from.current;
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(start + (value - start) * eased));
      if (p >= 1) {
        clearInterval(id);
        from.current = value;
      }
    }, 16);
    return () => clearInterval(id);
  }, [value, duration, reduced]);

  return <Text style={style}>{fmt(display)}</Text>;
}
