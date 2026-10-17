export type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

/** Scale a base size by screen width (390pt = 1x), clamped to 85%–130%. */
export function scaleFont(size: number, width: number): number {
  return Math.round(size * Math.min(1.3, Math.max(0.85, width / 390)));
}

export const typeScale: Record<
  Variant,
  { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number; uppercase?: boolean }
> = {
  display: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 34, lineHeight: 40 },
  title: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 20, lineHeight: 26 },
  body: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 15, lineHeight: 22 },
  label: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, lineHeight: 14, letterSpacing: 1, uppercase: true },
  caption: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, lineHeight: 16 },
};
