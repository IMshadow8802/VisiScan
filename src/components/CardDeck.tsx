import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { Contact } from '../lib/types';
import { colors, space } from '../theme/tokens';
import { BusinessCard, CARD_ASPECT } from './BusinessCard';
import { Txt } from './Txt';

// Rest pose per depth (0 = front), matching the mockup: back cards peek above the front one.
const DEPTH = [0, 1, 2, 3];
const PEEK = [0, 0.45, 0.82, 1];
const SCALE = [1, 0.97, 0.94, 0.91];
const ROTATE = [0, 2, -3, 0];
const MAX_W = 520;
const STEP = 0.55; // scroll distance per card, as a fraction of card height

/**
 * Scrollable deck: scroll up to deal the front card away and bring the next one forward,
 * with a haptic tick per card. A transparent ScrollView drives the pose so momentum and
 * snapping are native; only the cards around the front are mounted.
 */
export function CardDeck({ contacts }: { contacts: Contact[] }) {
  const reduced = useReducedMotion();
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const [front, setFront] = useState(0);
  const scrollY = useSharedValue(0);
  const n = contacts.length;

  // fit width, height (landscape) and the tablet cap
  const cardW = box ? Math.max(0, Math.min(MAX_W, box.width, ((box.height - space.xl * 2) / (1 + PEEK[2])) * CARD_ASPECT)) : 0;
  const cardH = cardW / CARD_ASPECT;
  const step = Math.max(1, cardH * STEP);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  const tick = useCallback((i: number) => {
    setFront(i);
    Haptics.selectionAsync();
  }, []);

  useAnimatedReaction(
    () => Math.min(n - 1, Math.max(0, Math.round(scrollY.get() / step))),
    (cur, prev) => {
      if (prev !== null && cur !== prev) scheduleOnRN(tick, cur);
    },
  );

  const current = contacts[front];
  const open = () => current && router.push(`/contact/${current.id}`);
  const mounted = contacts
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => i >= front - 1 && i <= front + 3);

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => setBox(e.nativeEvent.layout)}>
      {box &&
        mounted.map(({ c, i }) => (
          <DeckCard
            key={c.id}
            contact={c}
            index={i}
            count={n}
            scrollY={scrollY}
            step={step}
            width={cardW}
            height={cardH}
            left={(box.width - cardW) / 2}
            top={space.xl + cardH * PEEK[2]}
            reduced={reduced}
          />
        ))}

      {box && (
        <Animated.ScrollView
          style={StyleSheet.absoluteFill}
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToInterval={step}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ height: box.height + step * (n - 1) }}>
          <Pressable
            onPress={open}
            style={{ height: box.height + step * (n - 1) }}
            accessibilityRole="button"
            accessibilityLabel={current?.businessName || current?.contactPerson || 'Untitled card'}
            accessibilityHint="Opens the card. Scroll for the next card."
          />
        </Animated.ScrollView>
      )}

      {n > 1 && (
        <Txt variant="caption" style={styles.counter} pointerEvents="none">
          {`${front + 1} / ${n}`}
        </Txt>
      )}
    </View>
  );
}

function DeckCard({
  contact,
  index,
  count,
  scrollY,
  step,
  width,
  height,
  left,
  top,
  reduced,
}: {
  contact: Contact;
  index: number;
  count: number;
  scrollY: SharedValue<number>;
  step: number;
  width: number;
  height: number;
  left: number;
  top: number;
  reduced: boolean;
}) {
  const pose = useAnimatedStyle(() => {
    // d < 0: dealt away (up and out); d >= 0: depth in the deck
    const d = index - scrollY.get() / step;
    if (d < 0) {
      return {
        opacity: interpolate(d, [-1, -0.4, 0], [0, 1, 1], Extrapolation.CLAMP),
        transform: [{ translateY: d * height * 1.3 }, { rotate: `${reduced ? 0 : d * -6}deg` }],
      };
    }
    return {
      opacity: interpolate(d, [2, 3], [1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: -height * interpolate(d, DEPTH, PEEK, Extrapolation.CLAMP) },
        { rotate: `${reduced ? 0 : interpolate(d, DEPTH, ROTATE, Extrapolation.CLAMP)}deg` },
        { scale: interpolate(d, DEPTH, SCALE, Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[{ position: 'absolute', left, top, width, height, zIndex: count - index }, pose]}>
      <BusinessCard contact={contact} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  counter: { position: 'absolute', right: space.xs, bottom: space.xs, color: colors.muted },
});
