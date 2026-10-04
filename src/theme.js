import { StyleSheet } from 'react-native';

// Values from the Penpot page “MVP · дизайн Stitch, телефон и ПК”.
export const colors = {
  bg: '#000000',
  surface: '#141518',
  surfaceRaised: '#1A1B1F',
  border: '#27292E',
  borderStrong: '#34383E',
  text: '#F5F6F8',
  secondary: '#8D9099',
  muted: '#5D6069',
  red: '#FF3838',
  green: '#30C18B',
  primary: '#F5F6F8',
  onPrimary: '#0E0F12',
};

export const fonts = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
  mono: 'IBMPlexMono_600SemiBold',
  monoBold: 'IBMPlexMono_700Bold',
  number: 'PlusJakartaSans_700Bold',
};

export const common = StyleSheet.create({
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -1.2,
  },
  heading: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  body: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  muted: {
    color: colors.secondary,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 19,
  },
  small: {
    color: colors.secondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 17,
  },
  label: {
    color: colors.secondary,
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
