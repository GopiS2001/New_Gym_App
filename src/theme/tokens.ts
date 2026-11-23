/**
 * FitFlow design tokens — taken from the supplied design reference
 * (deep navy foundation, glassy outlined cards, one lime accent).
 */
export const colors = {
  bg: '#0B1520',
  bgDeep: '#070E16',
  surface: '#111D29',
  surface2: '#172636',
  surface3: '#1E3043',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#F3F6F8',
  textSecondary: '#B4BEC8',
  muted: '#7E8C9A',
  accent: '#C8F135',
  accentDim: 'rgba(200,241,53,0.14)',
  accentText: '#0B1520',
  danger: '#FF5D63',
  warning: '#FFB547',
  info: '#46C2FF',
  success: '#5EE38A',
  overlay: 'rgba(5,10,16,0.72)',
} as const;

export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
} as const;

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

export const space = (n: number) => n * 4;

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  h3: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.3 },
  number: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 26 },
} as const;

export type TypeVariant = keyof typeof type;
