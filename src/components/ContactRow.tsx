import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { mainNumber, relativeDate } from '../lib/format';
import type { Contact } from '../lib/types';
import { colors, radius, shadow, space } from '../theme/tokens';
import { typeScale } from '../theme/type';
import { Txt } from './Txt';

export function ContactRow({ contact, now }: { contact: Contact; now: Date }) {
  const name = contact.businessName || contact.contactPerson || 'Untitled card';
  const sub = [contact.businessName && contact.contactPerson, mainNumber(contact).main].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => router.push(`/contact/${contact.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          padding: space.md,
          borderRadius: radius.md + 2,
          borderCurve: 'continuous',
          backgroundColor: pressed ? colors.paper : colors.white,
        },
        shadow.soft,
      ]}>
      <View
        style={{
          width: 10,
          alignSelf: 'stretch',
          minHeight: 40,
          borderRadius: 6,
          backgroundColor: colors[contact.color],
          boxShadow: `inset 0 -2px 3px ${colors.ink}1F`,
        }}
      />
      <View style={{ flex: 1 }}>
        <Txt numberOfLines={1} style={{ fontFamily: typeScale.label.fontFamily }}>
          {name}
        </Txt>
        {!!sub && (
          <Txt variant="caption" numberOfLines={1} style={{ color: colors.muted }}>
            {sub}
          </Txt>
        )}
      </View>
      <Txt variant="caption" style={{ color: colors.muted }}>
        {relativeDate(contact.createdAt, now)}
      </Txt>
    </Pressable>
  );
}
