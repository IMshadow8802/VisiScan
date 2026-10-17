import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardDeck } from '../components/CardDeck';
import { CARD_ASPECT } from '../components/BusinessCard';
import { ContactRow } from '../components/ContactRow';
import { RangeChips } from '../components/RangeChips';
import { ScanButton } from '../components/ScanButton';
import { SearchBar } from '../components/SearchBar';
import { Txt } from '../components/Txt';
import { ViewToggle } from '../components/ViewToggle';
import { useContacts } from '../hooks/useContacts';
import { filterContacts, type Range } from '../lib/search';
import { getViewMode, setViewMode, type ViewMode } from '../lib/settings';
import { colors, radius, space } from '../theme/tokens';

const SCAN_H = 58;
const TICK_GAP_MS = 60; // a hard flick passes many rows; cap the buzz rate

/** Light haptic each time a new row reaches the top while the user is scrolling. */
function useRowTicks() {
  const scrolling = useRef(false);
  const first = useRef<number | null>(null);
  const last = useRef(0);
  return useMemo(
    () => ({
      onScrollBeginDrag: () => (scrolling.current = true),
      onMomentumScrollBegin: () => (scrolling.current = true),
      onScrollEndDrag: () => (scrolling.current = false),
      onMomentumScrollEnd: () => (scrolling.current = false),
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
        const top = viewableItems[0]?.index ?? null;
        if (top === first.current) return;
        first.current = top;
        const now = Date.now();
        if (!scrolling.current || now - last.current < TICK_GAP_MS) return;
        last.current = now;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
    }),
    [],
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const rowTicks = useRowTicks();
  const { width } = useWindowDimensions();
  const { contacts, loaded } = useContacts();
  const [mode, setMode] = useState<ViewMode | null>(null);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<Range>('all');

  useEffect(() => {
    getViewMode().then(setMode);
  }, []);

  const filtered = useMemo(() => filterContacts(contacts, query, range, new Date()), [contacts, query, range]);
  const columns = width < 600 ? 1 : width < 1000 ? 2 : 3;
  const gutter = { paddingLeft: space.lg + insets.left, paddingRight: space.lg + insets.right };
  const bottomSpace = insets.bottom + space.lg + SCAN_H + space.lg;

  const changeMode = (m: ViewMode) => {
    setMode(m);
    setViewMode(m);
  };

  let body = null;
  if (loaded && mode) {
    if (!contacts.length) body = <EmptyCard />;
    else if (!filtered.length)
      body = (
        <View style={{ alignItems: 'center', paddingTop: space.xxl, gap: space.xs }}>
          <Txt variant="heading">No cards match</Txt>
          <Txt style={{ color: colors.muted }}>Try another name, company or number.</Txt>
        </View>
      );
    else if (mode === 'stack')
      body = (
        <View style={{ flex: 1, paddingBottom: bottomSpace }}>
          <CardDeck key={filtered.map((c) => c.id).join()} contacts={filtered} />
        </View>
      );
    else {
      const now = new Date();
      body = (
        <FlashList
          key={columns}
          data={filtered}
          numColumns={columns}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          {...rowTicks}
          contentContainerStyle={{
            paddingTop: space.md,
            paddingBottom: bottomSpace,
            paddingLeft: space.lg - space.xs + insets.left,
            paddingRight: space.lg - space.xs + insets.right,
          }}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: space.xs, paddingBottom: space.md - 2 }}>
              <ContactRow contact={item} now={now} />
            </View>
          )}
        />
      );
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top + space.lg }}>
      <View style={[gutter, { gap: space.md }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Txt variant="label" style={{ color: colors.muted }}>
              {!loaded ? ' ' : contacts.length === 1 ? '1 card' : `${contacts.length} cards`}
            </Txt>
            <Txt variant="display" accessibilityRole="header">
              Visi<Txt variant="display" style={{ color: colors.accent }}>Scan</Txt>
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <ViewToggle value={mode ?? 'stack'} onChange={changeMode} />
          </View>
        </View>
        <SearchBar value={query} onChange={setQuery} />
        <RangeChips value={range} onChange={setRange} />
      </View>

      <View style={[{ flex: 1 }, mode !== 'list' || !filtered.length ? gutter : null]}>{body}</View>

      <View
        pointerEvents="box-none"
        style={[gutter, { position: 'absolute', left: 0, right: 0, bottom: insets.bottom + space.lg }]}>
        <ScanButton />
      </View>
    </View>
  );
}

function EmptyCard() {
  return (
    <Pressable
      onPress={() => router.push('/scan')}
      accessibilityRole="button"
      style={({ pressed }) => ({
        marginTop: space.xl,
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
        aspectRatio: CARD_ASPECT,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.muted + '59',
        backgroundColor: colors.white + '99',
        alignItems: 'center',
        justifyContent: 'center',
        padding: space.xl,
        gap: space.xs,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Txt variant="heading">Scan your first card</Txt>
      <Txt style={{ color: colors.muted, textAlign: 'center' }}>Point the camera at a visiting card. The details fill in by themselves.</Txt>
    </Pressable>
  );
}
