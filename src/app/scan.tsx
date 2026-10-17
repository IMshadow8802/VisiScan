import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardSurface } from '../components/BusinessCard';
import { Button } from '../components/Button';
import { Txt } from '../components/Txt';
import { scanSide } from '../lib/scan';
import { getApiKey } from '../lib/settings';
import { colors, radius, shadow, space, type CardColor } from '../theme/tokens';

type Step = 'front' | 'back' | 'key';

export default function Scan() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [step, setStep] = useState<Step>('front');
  const [busy, setBusy] = useState(false);
  const sides = useRef<{ front: string; back: string | null }>({ front: '', back: null });
  const started = useRef(false);

  const goReview = useCallback(() => {
    const { front, back } = sides.current;
    router.replace({ pathname: '/review', params: back ? { front, back } : { front } });
  }, []);

  const scanFront = async () => {
    setBusy(true);
    const uri = await scanSide().catch(() => null);
    setBusy(false);
    if (!uri) return router.back();
    sides.current.front = uri;
    setStep('back');
  };

  const finish = async (back: string | null) => {
    sides.current.back = back;
    if (await getApiKey()) return goReview();
    setStep('key');
    router.push('/settings');
  };

  const scanBack = async () => {
    setBusy(true);
    const uri = await scanSide().catch(() => null);
    setBusy(false);
    // cancelled back scan stays on this step
    if (uri) await finish(uri);
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    scanFront();
  }, []);

  // back from /settings: continue once a key exists
  useFocusEffect(
    useCallback(() => {
      if (step !== 'key') return;
      getApiKey().then((k) => k && goReview());
    }, [step, goReview]),
  );

  const content = {
    front: {
      color: 'peach' as CardColor,
      label: 'Step 1 of 2',
      title: 'Front side',
      body: 'Hold the card flat in good light. Edges are found for you.',
    },
    back: {
      color: 'mint' as CardColor,
      label: 'Step 2 of 2',
      title: 'Back side',
      body: 'Many cards carry more numbers or an address on the back.',
    },
    key: {
      color: 'lilac' as CardColor,
      label: 'One more thing',
      title: 'Add your Gemini key',
      body: 'The card is read by Gemini. Add your API key in Settings to continue.',
    },
  }[step];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + space.xl,
          paddingBottom: insets.bottom + space.xl,
          paddingLeft: insets.left + space.lg,
          paddingRight: insets.right + space.lg,
          gap: space.xl,
        }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancel scan"
          style={({ pressed }) => [
            styles.close,
            { top: insets.top + space.md, left: insets.left + space.lg },
            shadow.soft,
            { opacity: pressed ? 0.7 : 1 },
          ]}>
          <Feather name="x" size={20} color={colors.ink} />
        </Pressable>

        <Animated.View key={step} entering={reduced ? undefined : FadeIn.duration(200)} style={styles.column}>
          <StepCard color={content.color} label={content.label} title={content.title} body={content.body} />
        </Animated.View>

        <View style={[styles.column, { gap: space.md }]}>
          {step === 'front' && (
            <Button label={busy ? 'Opening camera…' : 'Scan front'} icon="camera" onPress={scanFront} disabled={busy} />
          )}
          {step === 'back' && (
            <>
              <Button label={busy ? 'Opening camera…' : 'Scan back'} icon="camera" onPress={scanBack} disabled={busy} />
              <Button label="Back is blank — skip" variant="plain" onPress={() => finish(null)} disabled={busy} />
            </>
          )}
          {step === 'key' && <Button label="Open settings" icon="key" onPress={() => router.push('/settings')} />}
        </View>
      </ScrollView>
    </View>
  );
}

function StepCard({ color, label, title, body }: { color: CardColor; label: string; title: string; body: string }) {
  return (
    <CardSurface color={color}>
      <Txt variant="label" style={{ opacity: 0.6 }}>
        {label}
      </Txt>
      <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.xs }}>
        {title}
      </Txt>
      <View style={{ flex: 1 }} />
      <Txt style={{ opacity: 0.78 }}>{body}</Txt>
    </CardSurface>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  close: {
    position: 'absolute',
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    borderCurve: 'continuous',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
