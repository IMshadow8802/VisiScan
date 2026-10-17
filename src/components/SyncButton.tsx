import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { getSyncState, subscribeSync, syncNow } from '../lib/sync';
import { colors, radius, shadow } from '../theme/tokens';
import { Txt } from './Txt';

/** Cloud button: badge = cards not on the server yet, spinner while uploading, tap to sync now. */
export function SyncButton() {
  const { pending, busy } = useSyncExternalStore(subscribeSync, getSyncState);

  const sync = async () => {
    if (busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const left = await syncNow();
    if (!left) return void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert("Couldn't sync", `${left} ${left === 1 ? 'card is' : 'cards are'} still on this phone only. They'll upload automatically when the server is reachable.`);
  };

  return (
    <Pressable
      onPress={sync}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={busy ? 'Syncing' : pending ? `Sync ${pending} cards` : 'All cards synced'}
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
        <Feather name={pending ? 'upload-cloud' : 'cloud'} size={18} color={pending ? colors.ink : colors.muted} />
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
