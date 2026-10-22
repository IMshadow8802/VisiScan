import Feather from '@expo/vector-icons/Feather';
import { TextInput, useWindowDimensions, View, type TextInputProps } from 'react-native';
import { colors, radius, space } from '../theme/tokens';
import { scaleFont, typeScale } from '../theme/type';
import { Txt } from './Txt';

export const inputStyle = (width: number, multiline?: boolean) => ({
  flex: 1,
  minHeight: 48,
  paddingHorizontal: space.md + 2,
  paddingTop: multiline ? space.md : 0,
  paddingBottom: multiline ? space.md : 0,
  borderRadius: radius.md - 2,
  borderCurve: 'continuous' as const,
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.ink + '12',
  color: colors.ink,
  fontFamily: typeScale.body.fontFamily,
  fontSize: scaleFont(15, width),
  textAlignVertical: multiline ? ('top' as const) : ('center' as const),
});

/** "Check it against the card" note under a field; never blocks saving. */
export function Hint({ text }: { text: string }) {
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: space.xs + 2, alignItems: 'flex-start' }}>
      <Feather name="alert-triangle" size={13} color={colors.accent} style={{ marginTop: 2 }} />
      <Txt variant="caption" style={{ flex: 1, color: colors.ink }}>
        {text}
      </Txt>
    </View>
  );
}

export function FieldInput({ label, multiline, hint, ...rest }: TextInputProps & { label: string; hint?: string | null }) {
  const { width } = useWindowDimensions();
  return (
    <View style={{ gap: space.xs + 2 }}>
      <Txt variant="label" style={{ color: colors.muted }}>
        {label}
      </Txt>
      <TextInput
        placeholderTextColor={colors.muted + 'AA'}
        maxFontSizeMultiplier={1.35}
        accessibilityLabel={label}
        multiline={multiline}
        {...rest}
        style={[inputStyle(width, multiline), hint ? { borderColor: colors.accent } : null]}
      />
      {hint && <Hint text={hint} />}
    </View>
  );
}
