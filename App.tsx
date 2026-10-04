import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Body, Brand, Button, Card, Eyebrow, Screen } from './src/ui';
import { colors, common } from './src/theme';

export default function App() {
  const [loaded] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });
  if (!loaded) return null;
  return <SafeAreaProvider><StatusBar style="light" /><Screen aside={<Card><Eyebrow>КАК ЭТО РАБОТАЕТ</Eyebrow><Body>Создай встречу, позови друзей и выбирайте из одной колоды мест.</Body></Card>}>
    <Brand />
    <ImageBackground source={require('./assets/hero.png')} style={styles.hero} imageStyle={styles.heroImage}>
      <Text style={styles.heroLabel}>ВЕЧЕР НАЧИНАЕТСЯ</Text>
    </ImageBackground>
    <View style={styles.intro}><Eyebrow>01 / ГРУППОВОЙ ВЫБОР</Eyebrow><Text style={common.h1}>Место, которое{`\n`}выберут все.</Text>
      <Body muted>Укажите планы, позовите друзей и вместе выберите заведение для вечера.</Body></View>
    <Button>Собрать компанию</Button><Button variant="secondary">Войти по коду</Button>
    <Text style={styles.hint}>Есть ссылка? Откройте её из сообщения.</Text>
  </Screen></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  hero: { height: 260, justifyContent: 'flex-start', padding: 14, marginBottom: 28 },
  heroImage: { borderRadius: 18 },
  heroLabel: { alignSelf: 'flex-start', backgroundColor: colors.bg, color: colors.text, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 7, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  intro: { gap: 16, marginBottom: 30 },
  hint: { ...common.small, textAlign: 'center', marginTop: 16 },
});
