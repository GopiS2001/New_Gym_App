import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/**
 * Shared motion settings. Every animation in the app goes through these so the
 * system "Reduce motion" setting turns all decorative motion off at once.
 */
let reduced = false;
const listeners = new Set<() => void>();

AccessibilityInfo.isReduceMotionEnabled?.()
  .then((v) => {
    reduced = !!v;
    listeners.forEach((l) => l());
  })
  .catch(() => {});

AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => {
  reduced = !!v;
  listeners.forEach((l) => l());
});

export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => reduced,
    () => reduced
  );
}

export const motion = {
  fast: 180,
  base: 320,
  slow: 600,
  easeOut: Easing.out(Easing.cubic),
  /** Delay for the n-th item of a list cascade (capped so long lists stay quick). */
  stagger: (index = 0) => Math.min(index, 8) * 45,
};

/**
 * Animates a number from 0 to `target` (count-up). Returns the current value.
 * Instant when reduce-motion is on.
 */
export function useCountUp(target: number, duration = 700) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduce || !Number.isFinite(target)) {
      setValue(target);
      return undefined;
    }
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => setValue(v * target));
    Animated.timing(anim, { toValue: 1, duration, easing: motion.easeOut, useNativeDriver: false }).start(() => setValue(target));
    return () => anim.removeListener(id);
  }, [target, duration, reduce, anim]);

  return value;
}

/** 0 → 1 progress over `duration` once on mount (for rings, bars, charts). */
export function useGrow(duration = motion.slow, delay = 0, deps: unknown[] = []) {
  const reduce = useReducedMotion();
  const [anim] = useState(() => new Animated.Value(reduce ? 1 : 0));
  useEffect(() => {
    if (reduce) {
      anim.setValue(1);
      return;
    }
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration, delay, easing: motion.easeOut, useNativeDriver: false }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, ...deps]);
  return anim;
}
