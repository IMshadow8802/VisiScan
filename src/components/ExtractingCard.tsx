import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import { colors, radius, space, type CardColor } from '../theme/tokens';
import { CardSurface } from './BusinessCard';
import { Txt } from './Txt';

const SWEEP = {
  from: { transform: [{ translateX: '-120%' }, { rotate: '14deg' }] },
  to: { transform: [{ translateX: '320%' }, { rotate: '14deg' }] },
} as const;

/** Pastel card silhouette with a light sweep while Gemini reads the card. */
export function ExtractingCard({ color = 'lilac' }: { color?: CardColor }) {
  const reduced = useReducedMotion();
  return (
    <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', gap: space.lg }} accessibilityLiveRegion="polite">
      <CardSurface color={color}>
        <View style={[styles.bar, { width: '30%', height: 10 }]} />
        <View style={[styles.bar, { width: '62%', height: 22, marginTop: space.md }]} />
        <View style={{ flex: 1 }} />
        <View style={[styles.bar, { width: '44%' }]} />
        <View style={[styles.bar, { width: '36%', marginTop: space.sm }]} />
        {!reduced && (
          <Animated.View
            style={[
              styles.sweep,
              {
                animationName: SWEEP,
                animationDuration: 1600,
                animationIterationCount: 'infinite',
                animationTimingFunction: cubicBezier(0.77, 0, 0.175, 1),
              },
            ]}>
            <LinearGradient
              colors={[colors.white + '00', colors.white + '8C', colors.white + '00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
      </CardSurface>
      <Txt variant="heading" style={{ textAlign: 'center' }}>
        Reading card…
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 12, borderRadius: radius.pill, backgroundColor: colors.ink + '14' },
  sweep: { position: 'absolute', top: '-20%', bottom: '-20%', left: 0, width: '35%' },
});
