import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Txt } from '../components/Txt';
import { signOut } from '../lib/auth';
import { getSession } from '../lib/settings';
import { getSyncState } from '../lib/sync';
import { colors, space } from '../theme/tokens';

/** Native form sheet (see _layout). Signing out swaps the whole stack for the sign-in screen. */
export default function SignOutSheet() {
  const insets = useSafeAreaInsets();
  const s = getSession();
  const { pending } = getSyncState();
  return (
    <View style={{ paddingTop: space.xl, paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.lg, gap: space.xl }}>
      <View style={{ gap: space.md }}>
        <Txt variant="title" accessibilityRole="header">
          Sign out?
        </Txt>
        <Txt style={{ color: colors.muted }}>
          You’re signed in as <Txt style={{ color: colors.ink }}>{s?.userName ?? 'unknown'}</Txt>
          {s?.companyName ? (
            <>
              {' '}at <Txt style={{ color: colors.ink }}>{s.companyName}</Txt>
            </>
          ) : null}
          .
        </Txt>
        {pending > 0 && (
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <Feather name="upload-cloud" size={16} color={colors.accent} style={{ marginTop: 3 }} />
            <Txt style={{ flex: 1, color: colors.ink }}>
              {pending === 1 ? "1 card hasn't" : `${pending} cards haven't`} uploaded yet. It stays on this phone and uploads after you sign in again.
            </Txt>
          </View>
        )}
      </View>
      <View style={{ gap: space.md }}>
        <Button label="Sign out" icon="power" onPress={signOut} />
        <Button label="Cancel" variant="plain" onPress={() => router.back()} />
      </View>
    </View>
  );
}
