import Feather from '@expo/vector-icons/Feather';
import { Pressable, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';
import type { ViewMode } from '../lib/settings';
import { colors, radius, shadow } from '../theme/tokens';

const W = 36;
const H = 30;
const PAD = 3;
const modes: [ViewMode, 'layers' | 'list', string][] = [
  ['stack', 'layers', 'Stack view'],
  ['list', 'list', 'List view'],
];

export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (m: ViewMode) => void }) {
  const reduced = useReducedMotion();
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: PAD,
        borderRadius: radius.md,
        borderCurve: 'continuous',
        backgroundColor: colors.track,
        boxShadow: `inset 0 2px 4px ${colors.ink}14`,
      }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: PAD,
            left: PAD,
            width: W,
            height: H,
            borderRadius: radius.sm + 1,
            borderCurve: 'continuous',
            backgroundColor: colors.white,
            transform: [{ translateX: value === 'list' ? W : 0 }],
            transitionProperty: 'transform',
            transitionDuration: reduced ? 0 : 180,
            transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
          },
          shadow.soft,
        ]}
      />
      {modes.map(([m, icon, label]) => (
        <Pressable
          key={m}
          onPress={() => onChange(m)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: value === m }}
          style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={16} color={value === m ? colors.ink : colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}
