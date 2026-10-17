import { Image, type ImageContentFit } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { localPhoto } from '../lib/sync';
import { colors } from '../theme/tokens';
import { Txt } from './Txt';

/** A card photo from this phone or the server (fetched on first show). */
export function CardPhoto({ uri, contentFit, style }: { uri: string; contentFit: ImageContentFit; style: StyleProp<ViewStyle> }) {
  // keyed by uri, so a new uri shows the spinner without a reset inside the effect
  const [got, setGot] = useState<{ uri: string; src: string | false } | null>(null);
  const src = got?.uri === uri ? got.src : null;
  useEffect(() => {
    let live = true;
    localPhoto(uri).then(
      (u) => live && setGot({ uri, src: u }),
      () => live && setGot({ uri, src: false }),
    );
    return () => {
      live = false;
    };
  }, [uri]);

  if (src) return <Image source={src} contentFit={contentFit} style={style as any} />;
  return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
      {src === false ? <Txt variant="caption" style={{ color: colors.muted }}>Photo unavailable offline</Txt> : <ActivityIndicator color={colors.muted} />}
    </View>
  );
}
