import Feather from '@expo/vector-icons/Feather';
import { Pressable } from 'react-native';
import { colors, radius, shadow } from '../theme/tokens';

export function IconButton({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          borderRadius: radius.sm + 2,
          borderCurve: 'continuous',
          backgroundColor: colors.white,
          alignItems: 'center',
          justifyContent: 'center',
        },
        shadow.soft,
        { opacity: pressed ? 0.7 : 1 },
      ]}>
      <Feather name={icon} size={20} color={colors.ink} />
    </Pressable>
  );
}
