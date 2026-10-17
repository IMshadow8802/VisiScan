import { Text, useWindowDimensions, type TextProps } from 'react-native';
import { colors } from '../theme/tokens';
import { scaleFont, typeScale, type Variant } from '../theme/type';

export function Txt({ variant = 'body', style, children, ...rest }: TextProps & { variant?: Variant }) {
  const { width } = useWindowDimensions();
  const { fontFamily, fontSize, lineHeight, letterSpacing, uppercase } = typeScale[variant];
  return (
    <Text
      maxFontSizeMultiplier={1.35}
      {...rest}
      style={[
        {
          color: colors.ink,
          fontFamily,
          fontSize: scaleFont(fontSize, width),
          lineHeight: scaleFont(lineHeight, width),
          letterSpacing,
          textTransform: uppercase ? 'uppercase' : undefined,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}
