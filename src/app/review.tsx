import Feather from '@expo/vector-icons/Feather';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ExtractingCard } from '../components/ExtractingCard';
import { FieldInput } from '../components/FieldInput';
import { IconButton } from '../components/IconButton';
import { ListFieldEditor } from '../components/ListFieldEditor';
import { PhotoPair } from '../components/PhotoPair';
import { Txt } from '../components/Txt';
import { getContact, listContacts, saveContact } from '../lib/db';
import { canSave, cleanFields, errorMessage, formChanged } from '../lib/form';
import { extractCard, ExtractError } from '../lib/gemini';
import { nextColor } from '../lib/palette';
import { deletePhotos, persistPhotos, prepareImage } from '../lib/photos';
import { getApiKey, getModel } from '../lib/settings';
import { emptyFields, type CardFields, type Contact } from '../lib/types';
import { colors, radius, shadow, space } from '../theme/tokens';

type Form = CardFields & { notes: string };
type Photos = { front: string; back: string | null };
type Phase = 'loading' | 'error' | 'form';

const ERROR_ICON: Partial<Record<ExtractError['kind'], keyof typeof Feather.glyphMap>> = {
  key: 'key',
  network: 'wifi-off',
  timeout: 'wifi-off',
};

export default function Review() {
  const params = useLocalSearchParams<{ id?: string; front?: string; back?: string }>();
  const isNew = !params.id;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const wide = width >= 768 || width > height;

  const [phase, setPhase] = useState<Phase>('loading');
  const [errKind, setErrKind] = useState<ExtractError['kind']>('server');
  const [form, setForm] = useState<Form>({ ...emptyFields, notes: '' });
  // new: raw scanner files until prepared, then the resized copies; edit: the contact's stored photos
  const [photos, setPhotos] = useState<Photos | null>(
    params.front ? { front: params.front, back: params.back ?? null } : null,
  );
  const [existing, setExisting] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [guard, setGuard] = useState(isNew);
  const busy = useRef(false);
  const prepared = useRef<{ uri: string; base64: string }[] | null>(null);

  const deleteTemp = () => {
    if (!params.front) return;
    deletePhotos({ frontUri: params.front, backUri: params.back ?? null });
    const [f, b] = prepared.current ?? [];
    if (f) deletePhotos({ frontUri: f.uri, backUri: b?.uri ?? null });
  };

  // caller sets phase 'loading' (initial state on first run)
  const extract = async () => {
    try {
      if (!prepared.current) {
        const raw = [params.front!, ...(params.back ? [params.back] : [])];
        prepared.current = await Promise.all(raw.map(prepareImage));
        const [f, b] = prepared.current;
        setPhotos({ front: f.uri, back: b?.uri ?? null });
      }
      const key = await getApiKey();
      if (!key) throw new ExtractError('key');
      const fields = await extractCard(prepared.current, key, await getModel());
      setForm({ ...fields, notes: '' });
      setPhase('form');
    } catch (e) {
      setErrKind(e instanceof ExtractError ? e.kind : 'server');
      setPhase('error');
    }
  };

  useEffect(() => {
    if (isNew) {
      extract();
      return;
    }
    getContact(params.id!)
      .then((c) => {
        if (!c) return router.back();
        const { id, color, frontUri, backUri, createdAt, updatedAt, ...fields } = c;
        setExisting(c);
        setForm(fields);
        setPhotos({ front: frontUri, back: backUri });
        setPhase('form');
      })
      .catch(() => router.back());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hardware back, swipe back and the Discard button all land here on a new scan, or an edit with changes
  const disablePrevention = usePreventRemove(guard && (isNew || (!!existing && formChanged(form, existing))), ({ repeat }) => {
    if (busy.current) return;
    Alert.alert(
      isNew ? 'Discard this card?' : 'Discard changes?',
      isNew ? 'The scan and anything you typed will be lost.' : 'Your edits to this card will be lost.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setGuard(false);
            deleteTemp();
            repeat();
          },
        },
      ],
    );
  });

  const save = async () => {
    if (!photos || busy.current) return;
    busy.current = true;
    setSaving(true);
    const fields = cleanFields(form);
    const now = new Date().toISOString();
    let stored: Photos | null = null;
    try {
      let c: Contact;
      if (existing) c = { ...existing, ...fields, updatedAt: now };
      else {
        const id = Crypto.randomUUID();
        const p = await persistPhotos(id, photos.front, photos.back);
        stored = { front: p.frontUri, back: p.backUri };
        c = {
          ...fields,
          id,
          color: nextColor(await listContacts()),
          frontUri: p.frontUri,
          backUri: p.backUri,
          createdAt: now,
          updatedAt: now,
        };
      }
      await saveContact(c);
    } catch {
      if (stored) deletePhotos({ frontUri: stored.front, backUri: stored.back });
      busy.current = false;
      setSaving(false);
      Alert.alert("Couldn't save the card", 'Nothing was lost. Please try again.');
      return;
    }
    if (!existing) deleteTemp();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGuard(false);
    disablePrevention();
    if (existing) router.back();
    else router.dismissTo('/');
  };

  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const gutter = { paddingLeft: insets.left + space.lg, paddingRight: insets.right + space.lg };

  if (phase !== 'form')
    return (
      <View style={[styles.center, gutter, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {phase === 'loading' ? (
          isNew ? <ExtractingCard /> : <ActivityIndicator color={colors.ink} />
        ) : (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(200)} style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Feather name={ERROR_ICON[errKind] ?? 'alert-circle'} size={22} color={colors.ink} />
            </View>
            <Txt variant="heading" accessibilityRole="alert" style={{ textAlign: 'center' }}>
              {errorMessage(errKind)}
            </Txt>
            <Txt style={{ color: colors.muted, textAlign: 'center' }}>Your photos are kept. Try again, or type the details in.</Txt>
            <View style={{ alignSelf: 'stretch', gap: space.md, marginTop: space.sm }}>
              {errKind === 'key' && <Button label="Open settings" icon="key" onPress={() => router.push('/settings')} />}
              <Button
                label="Retry"
                icon="refresh-cw"
                variant={errKind === 'key' ? 'plain' : 'ink'}
                onPress={() => {
                  setPhase('loading');
                  extract();
                }}
              />
              <Button label="Fill manually" icon="edit-3" variant="plain" onPress={() => setPhase('form')} />
            </View>
          </Animated.View>
        )}
        <View style={[styles.topBar, gutter, { top: insets.top + space.md }]} pointerEvents="box-none">
          <IconButton icon="x" label="Discard" onPress={() => router.back()} />
        </View>
      </View>
    );

  const photoBlock = photos && <PhotoPair front={photos.front} back={photos.back} column={wide} />;

  const fields = (
    <View style={{ gap: space.lg }}>
      <Group title="Company">
        <FieldInput label="Business name" value={form.businessName} onChangeText={set('businessName')} />
        <FieldInput label="Tagline / what they do" value={form.description} onChangeText={set('description')} multiline />
      </Group>
      <Group title="Person">
        <FieldInput label="Contact person" value={form.contactPerson} onChangeText={set('contactPerson')} autoComplete="name" />
        <FieldInput label="Designation" value={form.designation} onChangeText={set('designation')} />
      </Group>
      <Group title="Reach">
        <ListFieldEditor label="Mobiles" noun="mobile" values={form.mobiles} onChange={set('mobiles')} keyboardType="phone-pad" />
        <ListFieldEditor label="Landlines" noun="landline" values={form.landlines} onChange={set('landlines')} keyboardType="phone-pad" />
        <ListFieldEditor
          label="Emails"
          noun="email"
          values={form.emails}
          onChange={set('emails')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <FieldInput
          label="Website"
          value={form.website}
          onChangeText={set('website')}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Group>
      <Group title="Address">
        <ListFieldEditor label="Addresses" noun="address" values={form.addresses} onChange={set('addresses')} multiline />
      </Group>
      <Group title="More">
        <FieldInput label="GSTIN" value={form.gstin} onChangeText={set('gstin')} autoCapitalize="characters" autoCorrect={false} />
        <FieldInput label="Other details" value={form.other} onChangeText={set('other')} multiline />
        <FieldInput label="Notes" value={form.notes} onChangeText={set('notes')} placeholder="Where you met, what they need…" multiline />
      </Group>
    </View>
  );

  const header = (
    <View style={{ gap: space.xs, paddingTop: space.xxl + space.sm }}>
      <Txt variant="label" style={{ color: colors.muted }}>
        {isNew ? 'Check the details' : 'Edit card'}
      </Txt>
      <Txt variant="title" accessibilityRole="header">
        {isNew ? 'Review card' : form.businessName || form.contactPerson || 'Untitled card'}
      </Txt>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        {wide && (
          <ScrollView
            style={{ flex: 2, maxWidth: 420 }}
            contentContainerStyle={{ paddingTop: insets.top + space.xxl * 2 + space.xl, paddingLeft: gutter.paddingLeft, paddingBottom: space.xl }}>
            {photoBlock}
          </ScrollView>
        )}
        <ScrollView
          style={{ flex: 3 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={[
            gutter,
            { paddingTop: insets.top, paddingBottom: space.xl, gap: space.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
          ]}>
          {header}
          {!wide && photoBlock}
          {fields}
        </ScrollView>
      </View>

      <View style={[styles.footer, gutter, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={{ flexDirection: 'row', gap: space.md, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
          <Button label="Discard" variant="plain" onPress={() => router.back()} disabled={saving} style={{ flexGrow: 1, flexBasis: 0 }} />
          <Button
            label={saving ? 'Saving…' : 'Save card'}
            icon="check"
            onPress={save}
            disabled={!canSave(form) || saving}
            style={{ flexGrow: 2, flexBasis: 0 }}
          />
        </View>
      </View>

      <View style={[styles.topBar, gutter, { top: insets.top + space.md }]} pointerEvents="box-none">
        <IconButton icon={isNew ? 'x' : 'chevron-left'} label={isNew ? 'Discard' : 'Back'} onPress={() => router.back()} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={[styles.group, shadow.soft]}>
      <Txt variant="heading">{title}</Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center' },
  topBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row' },
  group: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg - 4,
    borderCurve: 'continuous',
    backgroundColor: colors.white,
  },
  errorCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.white,
    ...shadow.card,
  },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.butter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
    boxShadow: `inset 0 -2px 3px ${colors.ink}1F`,
  },
  footer: {
    paddingTop: space.md,
    backgroundColor: colors.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.ink + '14',
  },
});
