import Feather from '@expo/vector-icons/Feather';
import { Pressable } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { colors, radius, shadow } from '../theme/tokens';

/** Header refresh: the icon spins while `busy`. */
export function RefreshButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Refresh cards"
      accessibilityState={{ busy }}
      style={({ pressed }) => [
        {
          width: 40,
          height: 36,
          borderRadius: radius.sm + 2,
          borderCurve: 'continuous',
          backgroundColor: colors.white,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.94 : 1 }],
          transitionProperty: 'transform',
          transitionDuration: 120,
        },
        shadow.soft,
      ]}>
      <Animated.View
        style={
          busy && !reduced
            ? {
                animationName: { from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } },
                animationDuration: 800,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'linear',
              }
            : undefined
        }>
        <Feather name="refresh-cw" size={17} color={busy ? colors.muted : colors.ink} />
      </Animated.View>
    </Pressable>
  );
}
