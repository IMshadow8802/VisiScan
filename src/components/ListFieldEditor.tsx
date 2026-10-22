import Feather from '@expo/vector-icons/Feather';
import { Pressable, TextInput, useWindowDimensions, View, type TextInputProps } from 'react-native';
import { removeItem, setItem } from '../lib/form';
import { colors, radius, space } from '../theme/tokens';
import { typeScale } from '../theme/type';
import { Hint, inputStyle } from './FieldInput';
import { Txt } from './Txt';

export function ListFieldEditor({
  label,
  noun,
  values,
  onChange,
  multiline,
  hint,
  ...input
}: Omit<TextInputProps, 'value' | 'onChangeText' | 'onChange'> & {
  label: string;
  /** Singular, for "Add mobile" / "Remove mobile 2". */
  noun: string;
  values: string[];
  onChange: (v: string[]) => void;
  /** soft check per row, shown under it */
  hint?: (value: string) => string | null;
}) {
  const { width } = useWindowDimensions();
  return (
    <View style={{ gap: space.xs + 2 }}>
      <Txt variant="label" style={{ color: colors.muted }}>
        {label}
      </Txt>
      {values.map((v, i) => {
        const note = hint?.(v);
        return (
          // ponytail: index keys; rows only change by edit/append/remove, so focus loss on remove is acceptable
          <View key={i} style={{ gap: space.xs + 2 }}>
            <View style={{ flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', gap: space.sm }}>
              <TextInput
                value={v}
                onChangeText={(t) => onChange(setItem(values, i, t))}
                placeholderTextColor={colors.muted + 'AA'}
                maxFontSizeMultiplier={1.35}
                accessibilityLabel={`${noun} ${i + 1}`}
                multiline={multiline}
                autoFocus={!v && i === values.length - 1}
                {...input}
                style={[inputStyle(width, multiline), note ? { borderColor: colors.accent } : null]}
              />
              <Pressable
                onPress={() => onChange(removeItem(values, i))}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${noun} ${i + 1}`}
                style={({ pressed }) => ({
                  width: 44,
                  height: 48,
                  borderRadius: radius.md - 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? colors.track : 'transparent',
                })}>
                <Feather name="x" size={18} color={colors.muted} />
              </Pressable>
            </View>
            {note && <Hint text={note} />}
          </View>
        );
      })}
      <Pressable
        onPress={() => onChange([...values, ''])}
        accessibilityRole="button"
        accessibilityLabel={`Add ${noun}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: space.xs + 2,
          minHeight: 44,
          paddingHorizontal: space.md,
          borderRadius: radius.pill,
          backgroundColor: pressed ? colors.track : colors.track + '99',
        })}>
        <Feather name="plus" size={16} color={colors.ink} />
        <Txt variant="caption" style={{ fontFamily: typeScale.label.fontFamily }}>
          {`Add ${noun}`}
        </Txt>
      </Pressable>
    </View>
  );
}
