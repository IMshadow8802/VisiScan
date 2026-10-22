import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ComponentRef, type Ref } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLastCompany, lookupCompany, setLastCompany, signIn, type Company } from '../lib/auth';
import { colors, radius, shadow, space } from '../theme/tokens';
import { scaleFont, typeScale } from '../theme/type';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Txt } from './Txt';

/** true while the keyboard is up (iOS reports it early, Android once it's shown) */
function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const ios = process.env.EXPO_OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setShown(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

/**
 * Two full-screen steps: company code, then username + password.
 * The root layout swaps to the app as soon as signIn stores a session.
 */
export function SignIn() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const keyboard = useKeyboardShown();
  const [company, setCompany] = useState<Company | null>(getLastCompany);
  const [code, setCode] = useState(company?.code ?? '');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const fail = (e: any) => {
    setError(String(e?.message ?? e));
    setBusy(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const findCompany = async () => {
    setBusy(true);
    setError(null);
    try {
      const c = await lookupCompany(code);
      setCompany(c);
      setLastCompany(c);
      setBusy(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      fail(e);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(company!.code, user, password);
    } catch (e) {
      fail(e);
    }
  };

  const changeCompany = () => {
    setCompany(null);
    setError(null);
  };

  const step = company ? 'login' : 'company';

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + space.lg,
          // room so the last field's border and shadow never touch the button bar
          paddingBottom: space.xl,
          paddingLeft: insets.left + space.xl,
          paddingRight: insets.right + space.xl,
        }}>
        <View style={{ height: 44, justifyContent: 'center' }}>
          {step === 'login' ? (
            <IconButton icon="chevron-left" label="Change company" onPress={changeCompany} />
          ) : (
            <Txt variant="heading">
              Visi<Txt variant="heading" style={{ color: colors.accent }}>Scan</Txt>
            </Txt>
          )}
        </View>

        <Animated.View key={step} entering={reduced ? undefined : FadeIn.duration(200)} style={{ gap: space.xl, marginTop: space.xxl }}>
          {step === 'company' ? (
            <>
              <View style={{ gap: space.sm }}>
                <Txt variant="title" accessibilityRole="header">
                  Your company
                </Txt>
                <Txt style={{ color: colors.muted }}>Enter the company code from your CRM admin.</Txt>
              </View>
              <Field
                icon="briefcase"
                label="Company code"
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={findCompany}
                big
              />
            </>
          ) : (
            <>
              <View style={{ gap: space.sm }}>
                <Txt variant="label" style={{ color: colors.accent }}>
                  {company!.name ?? company!.code}
                </Txt>
                <Txt variant="title" accessibilityRole="header">
                  Sign in
                </Txt>
                <Txt style={{ color: colors.muted }}>Use your CRM username and password.</Txt>
              </View>
              <View style={{ gap: space.md }}>
                <Field
                  icon="user"
                  label="Username"
                  value={user}
                  onChangeText={setUser}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  submitBehavior="submit"
                />
                <Field
                  ref={passwordRef}
                  icon="lock"
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secure
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                />
              </View>
            </>
          )}

          {error && (
            <Animated.View
              entering={reduced ? undefined : FadeIn.duration(150)}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
              <Feather name="alert-circle" size={16} color={colors.accent} style={{ marginTop: 3 }} />
              <Txt style={{ flex: 1, color: colors.ink }}>{error}</Txt>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>

      {/* pinned above the keyboard, thumb's reach; the home-indicator inset only applies with the keyboard down */}
      <View
        style={{
          gap: space.md,
          paddingTop: space.sm,
          paddingBottom: keyboard ? space.md : insets.bottom + space.lg,
          paddingLeft: insets.left + space.xl,
          paddingRight: insets.right + space.xl,
        }}>
        {step === 'company' ? (
          <Button label="Continue" icon="arrow-right" loading={busy} disabled={!code.trim()} onPress={findCompany} />
        ) : (
          <Button label="Sign in" icon="log-in" loading={busy} disabled={!user.trim() || !password} onPress={submit} />
        )}
        {!keyboard && (
          <Txt variant="caption" style={{ color: colors.muted, textAlign: 'center' }}>
            by PRD Infotech Pvt. Ltd.
          </Txt>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

type FieldProps = TextInputProps & {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  big?: boolean;
  secure?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

/** Search-bar style input: white, soft shadow, leading icon. `secure` adds a show/hide eye. */
function Field({ icon, label, big, secure, ref, ...rest }: FieldProps) {
  const { width } = useWindowDimensions();
  const [hidden, setHidden] = useState(true);
  return (
    <View
      style={[
        {
          height: 56,
          borderRadius: radius.md,
          borderCurve: 'continuous',
          backgroundColor: colors.white,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.md,
          paddingLeft: space.lg,
          paddingRight: secure ? space.xs : space.lg,
        },
        shadow.soft,
      ]}>
      <Feather name={icon} size={18} color={colors.muted} />
      <TextInput
        ref={ref}
        placeholder={label}
        placeholderTextColor={colors.muted + 'AA'}
        accessibilityLabel={label}
        maxFontSizeMultiplier={1.35}
        secureTextEntry={secure && hidden}
        {...rest}
        style={{
          flex: 1,
          alignSelf: 'stretch',
          paddingVertical: 0,
          includeFontPadding: false,
          color: colors.ink,
          fontFamily: big ? typeScale.label.fontFamily : typeScale.body.fontFamily,
          fontSize: scaleFont(big ? 18 : 16, width),
          letterSpacing: big ? 1 : 0,
        }}
      />
      {secure && (
        <Pressable
          onPress={() => setHidden((h) => !h)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}
