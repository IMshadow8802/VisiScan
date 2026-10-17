import { Platform, type ViewStyle } from 'react-native';

export const colors = {
  peach: '#FFB59A',
  lilac: '#C3B1FF',
  mint: '#9EE6C4',
  sky: '#A9C8FF',
  butter: '#FFE08A',
  rose: '#FFB3C7',
  ink: '#231C2E',
  paper: '#FBF7F2',
  muted: '#7D7389',
  white: '#FFFFFF',
  /** "Scan" in the wordmark. */
  accent: '#F08A6C',
  /** Inset toggle track. */
  track: '#EFE8F5',
} as const;

export type CardColor = 'peach' | 'lilac' | 'mint' | 'sky' | 'butter' | 'rose';

export const cardColors: readonly CardColor[] = ['peach', 'lilac', 'mint', 'sky', 'butter', 'rose'];

/** [light, base] — gradient runs light to base. */
export const cardGradient: Record<CardColor, [string, string]> = {
  peach: ['#FFD1BF', colors.peach],
  mint: ['#C2F0DA', colors.mint],
  sky: ['#C9DBFF', colors.sky],
  lilac: ['#DCD1FF', colors.lilac],
  butter: ['#FFEDB8', colors.butter],
  rose: ['#FFD3DF', colors.rose],
};

const layer = (offsetY: number, radius: number, opacity: number, elevation: number): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation },
    default: {
      shadowColor: colors.ink,
      shadowOffset: { width: 0, height: offsetY },
      shadowRadius: radius,
      shadowOpacity: opacity,
    },
  })!;

export const shadow = {
  card: layer(10, 20, 0.18, 8),
  soft: layer(4, 10, 0.1, 3),
  button: layer(6, 12, 0.22, 5),
};

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
