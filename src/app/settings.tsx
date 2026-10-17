import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { FieldInput } from '../components/FieldInput';
import { Txt } from '../components/Txt';
import { maskKey } from '../lib/detail';
import { DEFAULT_MODEL, getApiKey, getModel, setApiKey, setModel } from '../lib/settings';
import { colors, radius, shadow, space } from '../theme/tokens';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const [model, setModelText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getApiKey().then(setSavedKey);
    getModel().then(setModelText);
  }, []);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const k = key.trim();
      if (k) await setApiKey(k);
      await setModel(model.trim() || DEFAULT_MODEL);
    } catch {
      setSaving(false);
      Alert.alert("Couldn't save settings", 'Please try again.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{
        gap: space.lg,
        padding: space.lg,
        paddingLeft: insets.left + space.lg,
        paddingRight: insets.right + space.lg,
        paddingBottom: insets.bottom + space.lg,
        width: '100%',
        maxWidth: 560,
        alignSelf: 'center',
      }}>
      <Txt variant="title" accessibilityRole="header" style={{ paddingTop: space.md }}>
        Settings
      </Txt>

      <View style={[{ gap: space.md, padding: space.lg, borderRadius: radius.lg - 4, borderCurve: 'continuous', backgroundColor: colors.white }, shadow.soft]}>
        <Txt variant="heading">Gemini API key</Txt>
        {savedKey ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Feather name="check-circle" size={16} color={colors.ink} />
            <Txt>{`Key saved ${maskKey(savedKey)}`}</Txt>
          </View>
        ) : (
          <Txt style={{ color: colors.muted }}>Needed to read cards. It stays on this phone.</Txt>
        )}
        <FieldInput
          label={savedKey ? 'Replace key' : 'API key'}
          value={key}
          onChangeText={setKey}
          placeholder={savedKey ? 'Paste new key to replace' : 'Paste your key'}
          secureTextEntry
          autoCorrect={false}
          autoCapitalize="none"
          autoComplete="off"
        />
        <Pressable
          onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}
          hitSlop={8}
          accessibilityRole="link"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Txt variant="caption" style={{ textDecorationLine: 'underline' }}>
            Get a key at aistudio.google.com/apikey
          </Txt>
          <Feather name="external-link" size={13} color={colors.accent} />
        </Pressable>
      </View>

      <View style={[{ gap: space.md, padding: space.lg, borderRadius: radius.lg - 4, borderCurve: 'continuous', backgroundColor: colors.white }, shadow.soft]}>
        <Txt variant="heading">Model</Txt>
        <FieldInput
          label="Gemini model"
          value={model}
          onChangeText={setModelText}
          placeholder={DEFAULT_MODEL}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <Button label={saving ? 'Saving…' : 'Save'} icon="check" onPress={save} disabled={saving || (!savedKey && !key.trim())} />
    </ScrollView>
  );
}
