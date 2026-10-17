import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, useWindowDimensions, type LayoutRectangle } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cubicBezier,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { Contact } from '../lib/types';
import { space } from '../theme/tokens';
import { BusinessCard, CARD_ASPECT } from './BusinessCard';

// Rest pose per depth (0 = front), matching the mockup: back cards peek above the front one.
const PEEK = [0, 0.45, 0.82];
const SCALE = [1, 0.97, 0.94];
const ROTATE = [0, 2, -3];
const MAX_W = 520;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Top 3 of `contacts`; swipe the front card to send it to the back. Key it by the list so order resets. */
export function CardDeck({ contacts }: { contacts: Contact[] }) {
  const [top, setTop] = useState(0);
  const [box, setBox] = useState<LayoutRectangle | null>(null);
  const n = contacts.length;
  const visible = [0, 1, 2].slice(0, n).map((d) => contacts[(top + d) % n]);

  // fit width, height (landscape) and the tablet cap
  const cardW = box ? Math.max(0, Math.min(MAX_W, box.width, ((box.height - space.lg) / (1 + PEEK[2])) * CARD_ASPECT)) : 0;
  const cardH = cardW / CARD_ASPECT;

  return (
    <View style={{ flex: 1 }} onLayout={(e) => setBox(e.nativeEvent.layout)}>
      {box &&
        visible
          .map((c, d) => (
            <DeckCard
              key={c.id}
              contact={c}
              depth={d}
              width={cardW}
              height={cardH}
              left={(box.width - cardW) / 2}
              top={space.lg + cardH * PEEK[2]}
              canSwipe={n > 1}
              onSwiped={() => setTop((t) => (t + 1) % n)}
            />
          ))
          .reverse()}
    </View>
  );
}

function DeckCard({
  contact,
  depth,
  width,
  height,
  left,
  top,
  canSwipe,
  onSwiped,
}: {
  contact: Contact;
  depth: number;
  width: number;
  height: number;
  left: number;
  top: number;
  canSwipe: boolean;
  onSwiped: () => void;
}) {
  const reduced = useReducedMotion();
  const { width: screenW } = useWindowDimensions();
  const tx = useSharedValue(0);
  const opacity = useSharedValue(1);
  const front = depth === 0;
  const open = () => router.push(`/contact/${contact.id}`);

  // card went to the back: bring it home from wherever the fling left it
  useEffect(() => {
    if (depth === 0) return;
    tx.set(reduced ? 0 : withSpring(0, { duration: 400, dampingRatio: 1 }));
    opacity.set(withTiming(1, { duration: 200 }));
  }, [depth, reduced, tx, opacity]);

  const pan = usePanGesture({
    enabled: front,
    activeOffsetX: [-12, 12],
    failOffsetY: [-20, 20],
    onUpdate: (e) => {
      'worklet';
      tx.set(e.translationX);
    },
    onDeactivate: (e) => {
      'worklet';
      const away = Math.abs(e.translationX) > width * 0.3 || Math.abs(e.velocityX) > 800;
      if (!away || !canSwipe) {
        tx.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: e.velocityX }));
        return;
      }
      scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(onSwiped);
      };
      if (reduced) opacity.set(withTiming(0, { duration: 150 }, done));
      else tx.set(withTiming(Math.sign(e.translationX || e.velocityX) * screenW * 1.2, { duration: 220, easing: EASE_OUT }, done));
    },
  });
  const tap = useTapGesture({ enabled: front, runOnJS: true, onActivate: open });
  const gesture = useCompetingGestures(pan, tap);

  const drag = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateX: tx.get() }, { rotate: `${reduced ? 0 : (tx.get() / width) * 12}deg` }],
  }));

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        zIndex: 3 - depth,
        transform: [
          { translateY: -height * PEEK[depth] },
          { rotate: `${reduced ? 0 : ROTATE[depth]}deg` },
          { scale: SCALE[depth] },
        ],
        transitionProperty: 'transform',
        transitionDuration: reduced ? 0 : 320,
        transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
        animationName: { from: { opacity: 0 } },
        animationDuration: 250,
      }}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={drag}
          accessible={front}
          accessibilityRole="button"
          accessibilityLabel={contact.businessName || contact.contactPerson || 'Untitled card'}
          accessibilityHint="Opens the card. Swipe sideways for the next card."
          accessibilityActions={[{ name: 'activate' }, { name: 'next', label: 'Next card' }]}
          onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'next' ? onSwiped() : open())}>
          <BusinessCard contact={contact} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
