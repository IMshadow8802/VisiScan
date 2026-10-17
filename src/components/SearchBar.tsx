import Feather from '@expo/vector-icons/Feather';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import { colors, radius, shadow, space } from '../theme/tokens';
import { scaleFont, typeScale } from '../theme/type';

export function SearchBar({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const { width } = useWindowDimensions();
  return (
    <View
      style={[
        {
          height: 48,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          backgroundColor: colors.white,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingLeft: space.md + 2,
        },
        shadow.soft,
      ]}>
      <Feather name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search name, company, number…"
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        autoCorrect={false}
        maxFontSizeMultiplier={1.35}
        accessibilityLabel="Search cards"
        style={{
          flex: 1,
          height: '100%',
          color: colors.ink,
          fontFamily: typeScale.body.fontFamily,
          fontSize: scaleFont(14, width),
        }}
      />
      {!!value && (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={{ width: 40, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="x" size={18} color={colors.muted} />
        </Pressable>
      )}
      {!value && <View style={{ width: space.md }} />}
    </View>
  );
}
