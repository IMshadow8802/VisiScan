import Feather from '@expo/vector-icons/Feather';
import { Pressable, type ViewStyle } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import { colors, radius, shadow, space } from '../theme/tokens';
import { typeScale } from '../theme/type';
import { Txt } from './Txt';

/** Ink = primary (like ScanButton), plain = white secondary. */
export function Button({
  label,
  onPress,
  icon,
  variant = 'ink',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'ink' | 'plain';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const ink = variant === 'ink';
  const fg = ink ? colors.white : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      pressRetentionOffset={16}
      style={[{ flexGrow: 1 }, style]}>
      {({ pressed }) => (
        <Animated.View
          style={[
            {
              minHeight: 54,
              paddingHorizontal: space.lg,
              borderRadius: radius.lg - 6,
              borderCurve: 'continuous',
              backgroundColor: ink ? colors.ink : colors.white,
              borderWidth: 1,
              borderColor: ink ? colors.white + '1A' : colors.ink + '0F',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.sm,
              opacity: disabled ? 0.4 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              transitionProperty: ['transform', 'opacity'],
              transitionDuration: 120,
              transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
            },
            ink && !disabled ? shadow.button : shadow.soft,
          ]}>
          {icon && <Feather name={icon} size={18} color={fg} />}
          <Txt numberOfLines={1} style={{ color: fg, fontFamily: typeScale.label.fontFamily }}>
            {label}
          </Txt>
        </Animated.View>
      )}
    </Pressable>
  );
}
