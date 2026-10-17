import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import { colors, radius, shadow, space } from '../theme/tokens';
import { typeScale } from '../theme/type';
import { Txt } from './Txt';

export function ScanButton() {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/scan');
      }}
      accessibilityRole="button"
      accessibilityLabel="Scan a card"
      pressRetentionOffset={16}
      style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
      {({ pressed }) => (
        <Animated.View
          style={[
            {
              height: 58,
              borderRadius: radius.lg - 4,
              borderCurve: 'continuous',
              backgroundColor: colors.ink,
              borderWidth: 1,
              borderColor: colors.white + '1A',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.md - 2,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              transitionProperty: 'transform',
              transitionDuration: 120,
              transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
            },
            shadow.button,
          ]}>
          <LinearGradient
            colors={[colors.peach, colors.rose]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 22, height: 22, borderRadius: radius.sm - 2, boxShadow: `inset 0 -2px 3px ${colors.ink}26` }}
          />
          <Txt style={{ color: colors.white, fontFamily: typeScale.label.fontFamily }}>Scan a card</Txt>
        </Animated.View>
      )}
    </Pressable>
  );
}
