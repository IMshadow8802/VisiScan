import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { getSyncState, subscribeSync, syncNow } from '../lib/sync';
import { colors, radius, shadow } from '../theme/tokens';
import { Txt } from './Txt';

/** Shown only while cards are waiting for the server: badge = count, spinner while uploading, tap to retry. */
export function SyncButton() {
  const { pending, busy } = useSyncExternalStore(subscribeSync, getSyncState);
  if (!pending && !busy) return null;

  const sync = async () => {
    if (busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const left = await syncNow();
    if (!left) return void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const why = getSyncState().error;
    Alert.alert("Couldn't sync", `${left} ${left === 1 ? 'card is' : 'cards are'} still on this phone only.${why ? `\n\n${why}` : ''}`);
  };

  return (
    <Pressable
      onPress={sync}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={busy ? 'Syncing' : `Sync ${pending} cards`}
      accessibilityState={{ busy }}
      style={({ pressed }) => [
        {
          width: 40,
          height: 36,
          borderRadius: radius.sm + 2,
          borderCurve: 'continuous',
          backgroundColor: colors.white,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.94 : 1 }],
          transitionProperty: 'transform',
          transitionDuration: 120,
        },
        shadow.soft,
      ]}>
      {busy ? (
        <ActivityIndicator size="small" color={colors.ink} />
      ) : (
        <Feather name="upload-cloud" size={18} color={colors.ink} />
      )}
      {!busy && pending > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 20,
            height: 20,
            paddingHorizontal: 5,
            borderRadius: 10,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.paper,
          }}>
          <Txt variant="caption" style={{ color: colors.white, fontSize: 10, lineHeight: 12 }} maxFontSizeMultiplier={1}>
            {pending > 99 ? '99+' : pending}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}
