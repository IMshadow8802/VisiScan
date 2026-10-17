import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, space } from '../theme/tokens';
import { CARD_ASPECT } from './BusinessCard';
import { Txt } from './Txt';

/** Front/back thumbnails side by side (row) or stacked (column). Tap opens a full view. */
export function PhotoPair({ front, back, column }: { front: string; back: string | null; column?: boolean }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<string | null>(null);
  const sides = [
    { uri: front, label: 'Front' },
    ...(back ? [{ uri: back, label: 'Back' }] : []),
  ];

  return (
    <View style={{ flexDirection: column ? 'column' : 'row', gap: space.md }}>
      {sides.map((s) => (
        <Pressable
          key={s.label}
          onPress={() => setOpen(s.uri)}
          accessibilityRole="imagebutton"
          accessibilityLabel={`${s.label} of card, open full view`}
          style={({ pressed }) => [
            {
              flex: column ? undefined : 1,
              maxWidth: column || sides.length > 1 ? undefined : '50%',
              aspectRatio: CARD_ASPECT,
              borderRadius: radius.md,
              borderCurve: 'continuous',
              backgroundColor: colors.white,
            },
            shadow.soft,
            { opacity: pressed ? 0.7 : 1 },
          ]}>
          <Image
            source={s.uri}
            contentFit="cover"
            style={{ flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.white }}
          />
          <View
            style={{
              position: 'absolute',
              left: space.sm,
              bottom: space.sm,
              paddingHorizontal: space.sm,
              paddingVertical: 2,
              borderRadius: radius.pill,
              backgroundColor: colors.ink + 'B3',
            }}>
            <Txt variant="label" style={{ color: colors.white }}>
              {s.label}
            </Txt>
          </View>
        </Pressable>
      ))}

      <Modal visible={!!open} animationType="fade" onRequestClose={() => setOpen(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: colors.ink }}>
          {open && <Image source={open} contentFit="contain" style={{ flex: 1 }} />}
          <Pressable
            onPress={() => setOpen(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            style={({ pressed }) => ({
              position: 'absolute',
              top: insets.top + space.md,
              right: insets.right + space.lg,
              width: 44,
              height: 44,
              borderRadius: radius.pill,
              backgroundColor: colors.white + (pressed ? '4D' : '26'),
              alignItems: 'center',
              justifyContent: 'center',
            })}>
            <Feather name="x" size={22} color={colors.white} />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
