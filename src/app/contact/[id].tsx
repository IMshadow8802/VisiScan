import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BusinessCard, CARD_ASPECT } from '../../components/BusinessCard';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Txt } from '../../components/Txt';
import { deleteContact } from '../../lib/db';
import { getCard, photoSource, syncNow } from '../../lib/sync';
import { detailSections, faceSequence } from '../../lib/detail';
import { relativeDate } from '../../lib/format';
import { deletePhotos } from '../../lib/photos';
import type { Contact } from '../../lib/types';
import { colors, radius, shadow, space } from '../../theme/tokens';

const FLIP_MS = 450;
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

export default function ContactDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= 768 || width > height;
  // undefined = loading, null = not found
  const [contact, setContact] = useState<Contact | null | undefined>(undefined);
  const deleting = useRef(false);

  useFocusEffect(
    useCallback(() => {
      getCard(id).then(setContact, () => setContact(null));
    }, [id]),
  );

  const gutter = { paddingLeft: insets.left + space.lg, paddingRight: insets.right + space.lg };
  const backBar = (
    <View style={[styles.topBar, gutter, { top: insets.top + space.md }]} pointerEvents="box-none">
      <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
    </View>
  );

  if (contact === undefined) return <View style={styles.screen}>{backBar}</View>;

  if (!contact)
    return (
      <View style={[styles.screen, styles.center, gutter]}>
        <Txt variant="heading" accessibilityRole="alert">
          Card not found
        </Txt>
        <Txt style={{ color: colors.muted, textAlign: 'center' }}>It may have been deleted.</Txt>
        <Button label="Go back" icon="chevron-left" variant="plain" onPress={() => router.back()} style={{ flexGrow: 0, marginTop: space.md }} />
        {backBar}
      </View>
    );

  const c = contact;
  const confirmDelete = () =>
    Alert.alert('Delete this card?', 'The card and its photos will be removed from this phone and the server.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (deleting.current) return;
          deleting.current = true;
          try {
            await deleteContact(c.id);
          } catch {
            deleting.current = false;
            Alert.alert("Couldn't delete the card", 'Please try again.');
            return;
          }
          deletePhotos({ frontUri: c.frontUri, backUri: c.backUri });
          syncNow();
          router.back();
        },
      },
    ]);

  const hero = (
    <View style={{ gap: space.sm }}>
      <FlipCard contact={c} />
      <Txt variant="caption" style={{ color: colors.muted, textAlign: 'center' }}>
        Tap card to see photos
      </Txt>
    </View>
  );

  const sections = detailSections(c);
  const fields = (
    <View style={{ gap: space.lg }}>
      {sections.map((s) => (
        <View key={s.title} style={[styles.group, shadow.soft]}>
          <Txt variant="label" style={{ color: colors.muted }}>
            {s.title}
          </Txt>
          {s.rows.map((r, i) => (
            <View key={i} style={{ gap: 2 }}>
              {!!r.label && (
                <Txt variant="caption" style={{ color: colors.muted }}>
                  {r.label}
                </Txt>
              )}
              <Txt selectable>{r.value}</Txt>
            </View>
          ))}
        </View>
      ))}
      <Txt variant="caption" style={{ color: colors.muted, textAlign: 'center' }}>
        {`Added ${relativeDate(c.createdAt, new Date())}`}
      </Txt>
    </View>
  );

  const header = (
    <View style={{ gap: space.xs, paddingTop: space.xxl + space.sm }}>
      <Txt variant="label" style={{ color: colors.muted }}>
        Card
      </Txt>
      <Txt variant="title" accessibilityRole="header" selectable>
        {c.businessName || c.contactPerson || 'Untitled card'}
      </Txt>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        {wide && (
          <ScrollView
            style={{ flex: 2, maxWidth: 480 }}
            contentContainerStyle={{ paddingTop: insets.top + space.xxl * 2 + space.xl, paddingLeft: gutter.paddingLeft, paddingBottom: space.xl }}>
            {hero}
          </ScrollView>
        )}
        <ScrollView
          style={{ flex: 3 }}
          contentContainerStyle={[
            gutter,
            { paddingTop: insets.top, paddingBottom: space.xl, gap: space.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
          ]}>
          {header}
          {!wide && hero}
          {fields}
        </ScrollView>
      </View>

      <View style={[styles.footer, gutter, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={{ flexDirection: 'row', gap: space.md, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
          <Button label="Delete" icon="trash-2" variant="plain" onPress={confirmDelete} style={{ flexGrow: 1, flexBasis: 0 }} />
          <Button
            label="Edit card"
            icon="edit-3"
            onPress={() => router.push(`/review?id=${c.id}`)}
            style={{ flexGrow: 2, flexBasis: 0 }}
          />
        </View>
      </View>
      {backBar}
    </View>
  );
}

/**
 * Two stacked sides rotate 180° per tap; the hidden side is loaded with the next face first.
 * `turn` counts half-turns, so side A shows on even turns and side B on odd.
 */
function FlipCard({ contact }: { contact: Contact }) {
  const reduced = useReducedMotion();
  const faces = faceSequence(contact);
  const [state, setState] = useState({ n: 0, idx: 0, sides: ['card', 'card'] as [string, string] });
  const turn = useSharedValue(0);
  const lastTap = useRef(0);

  const flip = () => {
    // ponytail: ignore taps mid-flip so we never swap content on a side that is still visible
    if (Date.now() - lastTap.current < FLIP_MS) return;
    lastTap.current = Date.now();
    const n = state.n + 1;
    const idx = (state.idx + 1) % faces.length;
    const sides: [string, string] = [...state.sides];
    sides[n % 2] = faces[idx];
    setState({ n, idx, sides });
    turn.set(withTiming(n, { duration: reduced ? 250 : FLIP_MS, easing: EASE_IN_OUT }));
  };

  const current = state.sides[state.n % 2];
  const label = current === 'card' ? 'Card. Tap to see photos' : current === contact.frontUri ? 'Front photo' : 'Back photo';

  return (
    <Pressable onPress={flip} accessibilityRole="button" accessibilityLabel={label} accessibilityHint="Flips to the next side">
      <View style={{ width: '100%', aspectRatio: CARD_ASPECT }}>
        {state.sides.map((face, side) => (
          <Side key={side} side={side} turn={turn} reduced={reduced} visible={state.n % 2 === side}>
            {face === 'card' ? (
              <BusinessCard contact={contact} />
            ) : (
              <View style={[styles.photo, shadow.card]}>
                <Image source={photoSource(face)} contentFit="cover" transition={150} style={styles.photoImg} />
                <View style={styles.badge}>
                  <Txt variant="label" style={{ color: colors.white }}>
                    {face === contact.frontUri ? 'Front' : 'Back'}
                  </Txt>
                </View>
              </View>
            )}
          </Side>
        ))}
      </View>
    </Pressable>
  );
}

function Side({
  side,
  turn,
  reduced,
  visible,
  children,
}: {
  side: number;
  turn: SharedValue<number>;
  reduced: boolean;
  visible: boolean;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const t = turn.get();
    if (reduced) {
      // crossfade: distance from this side's resting parity
      const m = (((t - side) % 2) + 2) % 2;
      return { opacity: Math.abs(1 - m) };
    }
    return { transform: [{ perspective: 1200 }, { rotateY: `${(t + side) * 180}deg` }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!visible}
      style={[StyleSheet.absoluteFill, { backfaceVisibility: 'hidden' }, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  center: { justifyContent: 'center', alignItems: 'center', gap: space.xs },
  topBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row' },
  group: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg - 4,
    borderCurve: 'continuous',
    backgroundColor: colors.white,
  },
  photo: { flex: 1, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.white },
  photoImg: { flex: 1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.white },
  badge: {
    position: 'absolute',
    left: space.md,
    bottom: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.ink + 'B3',
  },
  footer: {
    paddingTop: space.md,
    backgroundColor: colors.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.ink + '14',
  },
});
