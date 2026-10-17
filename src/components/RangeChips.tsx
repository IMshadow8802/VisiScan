import { Pressable, View } from 'react-native';
import type { Range } from '../lib/search';
import { colors, radius, shadow, space } from '../theme/tokens';
import { Txt } from './Txt';

const options: [Range, string][] = [
  ['all', 'All'],
  ['today', 'Today'],
  ['week', 'This week'],
];

export function RangeChips({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {options.map(([r, label]) => {
        const on = r === value;
        return (
          <Pressable
            key={r}
            onPress={() => onChange(r)}
            hitSlop={{ top: 10, bottom: 10, left: 2, right: 2 }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              {
                paddingVertical: space.sm - 1,
                paddingHorizontal: space.md,
                borderRadius: radius.sm,
                borderCurve: 'continuous',
                backgroundColor: on ? colors.ink : colors.white,
              },
              shadow.soft,
            ]}>
            <Txt variant="caption" style={{ color: on ? colors.white : colors.ink }}>
              {label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
