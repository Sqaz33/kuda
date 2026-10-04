import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#12110F',
  raised: '#1C1A17',
  card: '#24211C',
  text: '#F4F0E6',
  secondary: '#A39B8E',
  muted: '#777065',
  border: '#363129',
  accent: '#F0A05A',
  accentPressed: '#D4843C',
  onAccent: '#1A1814',
  success: '#8FBF7A',
  danger: '#E05A4F',
};

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
};

export const common = StyleSheet.create({
  h1: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  h2: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 23,
    lineHeight: 29,
    letterSpacing: -0.4,
  },
  h3: { color: colors.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 25 },
  body: { color: colors.text, fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  small: { color: colors.secondary, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  eyebrow: {
    color: colors.accent,
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
