import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutRectangle } from 'react-native';
import Animated, {
  cubicBezier,
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

// Rest pose per depth (0 = front, newest). Older cards peek above it, so you pull DOWN to
// bring them forward, the way the stack looks.
const DEPTH = [0, 1, 2, 3];
const PEEK = [0, 0.45, 0.82, 1];
const SCALE = [1, 0.97, 0.94, 0.91];
const ROTATE = [0, 2, -3, 0];
const MAX_W = 520;
const STEP = 0.55; // scroll distance per card, as a fraction of card height

/**
 * Scrollable deck: pull down to deal the front card away and bring the next (older) one
 * forward, with a haptic per card. A transparent, vertically flipped ScrollView (the same
 * trick FlatList `inverted` uses) drives the pose, so momentum and snapping are native and
 * nothing re-renders per frame. Only the cards around the front are mounted.
 */
export function CardDeck({ contacts }: { contacts: Contact[] }) {
  const reduced = useReducedMotion();
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const [front, setFront] = useState(0);
  const [moved, setMoved] = useState(false);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFront(i);
    setMoved(true);
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
    // one invisible card either side, so mounting never happens on screen mid-scroll
    .filter(({ i }) => i >= front - 2 && i <= front + 4);

  return (
    // no overflow clipping: it cut the card shadows into a visible lane
    <View style={{ flex: 1 }} onLayout={(e) => setBox(e.nativeEvent.layout)}>
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
          style={[StyleSheet.absoluteFill, { transform: [{ scaleY: -1 }] }]}
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
            accessibilityHint="Opens the card. Scroll down for older cards."
          />
        </Animated.ScrollView>
      )}

      {n > 1 && (
        <View style={styles.footer} pointerEvents="none">
          <ScrollHint atEnd={front === n - 1} moved={moved} reduced={reduced} />
          <Txt variant="caption" style={styles.counter}>
            {`${front + 1} / ${n}`}
          </Txt>
        </View>
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
    // d < 0: dealt away (down and out); d >= 0: depth in the deck
    const d = index - scrollY.get() / step;
    if (d < 0) {
      return {
        opacity: interpolate(d, [-0.8, -0.3, 0], [0, 1, 1], Extrapolation.CLAMP),
        transform: [
          { translateY: -d * height * 0.9 },
          { rotate: `${reduced ? 0 : d * 4}deg` },
          { scale: interpolate(d, [-1, 0], [1.04, 1], Extrapolation.CLAMP) },
        ],
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
      // cache the shadowed card as a bitmap; only its transform changes while scrolling
      shouldRasterizeIOS
      renderToHardwareTextureAndroid
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[{ position: 'absolute', left, top, width, height, zIndex: count - index }, pose]}>
      <BusinessCard contact={contact} />
    </Animated.View>
  );
}

/** Which way to drag. Bounces until the first card change, then stays quiet. */
function ScrollHint({ atEnd, moved, reduced }: { atEnd: boolean; moved: boolean; reduced: boolean }) {
  const bounce = !moved && !reduced;
  return (
    <View style={styles.hint}>
      <Animated.View
        style={
          bounce && {
            animationName: { '0%': { transform: [{ translateY: 0 }] }, '50%': { transform: [{ translateY: 4 }] }, '100%': { transform: [{ translateY: 0 }] } },
            animationDuration: 1200,
            animationIterationCount: 'infinite',
            animationTimingFunction: cubicBezier(0.77, 0, 0.175, 1),
          }
        }>
        <Feather name={atEnd ? 'chevrons-up' : 'chevrons-down'} size={16} color={colors.muted} />
      </Animated.View>
      <Txt variant="caption" style={{ color: colors.muted }}>
        {atEnd ? 'Push up for newer cards' : 'Pull down for older cards'}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  counter: { position: 'absolute', right: space.xs, color: colors.muted },
});
