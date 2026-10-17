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

export function FieldInput({ label, multiline, ...rest }: TextInputProps & { label: string }) {
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
        style={inputStyle(width, multiline)}
      />
    </View>
  );
}
