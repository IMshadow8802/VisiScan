import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { mainNumber } from '../lib/format';
import type { Contact } from '../lib/types';
import { cardGradient, colors, radius, shadow, space, type CardColor } from '../theme/tokens';
import { typeScale } from '../theme/type';
import { Txt } from './Txt';

export const CARD_ASPECT = 1.6;

export function BusinessCard({ contact, compact }: { contact: Contact; compact?: boolean }) {
  const { main, more } = mainNumber(contact);
  const name = contact.businessName || contact.contactPerson || 'Untitled card';
  const person = [contact.businessName && contact.contactPerson, contact.designation].filter(Boolean).join(' · ');

  return (
    <CardSurface color={contact.color} padding={compact ? space.lg : space.xl}>
      {!!contact.description && (
        <Txt variant="label" numberOfLines={1} style={styles.dim}>
          {contact.description}
        </Txt>
      )}
      <Txt variant={compact ? 'heading' : 'title'} numberOfLines={2} style={{ marginTop: space.xs }}>
        {name}
      </Txt>
      <View style={{ flex: 1 }} />
      {!!person && (
        <Txt numberOfLines={1} style={styles.sub}>
          {person}
        </Txt>
      )}
      {!!main && (
        <Txt numberOfLines={1} style={styles.sub}>
          {main}
          {more > 0 && <Txt style={styles.more}>{`  +${more}`}</Txt>}
        </Txt>
      )}
    </CardSurface>
  );
}

/** Pastel card face: gradient, corner blob, top-left sheen, inner highlight. */
export function CardSurface({
  color,
  padding = space.xl,
  children,
}: {
  color: CardColor;
  padding?: number;
  children: ReactNode;
}) {
  const [light, base] = cardGradient[color];
  return (
    <View style={[styles.shell, { backgroundColor: base }, shadow.card]}>
      <View style={[styles.face, { padding }]}>
        <LinearGradient colors={[light, base]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.blob} />
        <LinearGradient
          colors={[colors.white + '99', colors.white + '00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.55, y: 0.45 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { width: '100%', aspectRatio: CARD_ASPECT, borderRadius: radius.lg, borderCurve: 'continuous' },
  face: {
    flex: 1,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    // inner top highlight
    borderWidth: 1,
    borderColor: colors.white + '80',
  },
  blob: {
    position: 'absolute',
    right: '-8%',
    bottom: '-18%',
    width: '42%',
    aspectRatio: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.white + '59',
  },
  dim: { opacity: 0.6 },
  sub: { opacity: 0.78 },
  more: { fontFamily: typeScale.label.fontFamily },
});
