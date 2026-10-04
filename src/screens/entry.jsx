import React, { useState } from 'react';
import {
  ImageBackground,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Body, Button, Card, Eyebrow, Field, Notice, Screen, Separator } from '../ui';
import { colors, common, fonts } from '../theme';
import {
  areaSummary,
  AvatarStack,
  BackLink,
  categorySummary,
  Header,
  meeting,
  PageIntro,
  Topline,
  TwoButtons,
  VenueImage,
} from './shared';

function Step({ number, title }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepNumber}>{number}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );
}

export function HomeScreen({ user, rooms, onCreate, onJoin, onAuth, onOpen }) {
  return (
    <Screen
      footer={
        <>
          <TwoButtons
            left={
              <Button onPress={onCreate} style={styles.halfButton}>
                Создать комнату
              </Button>
            }
            right={
              <Button variant="secondary" onPress={onJoin} style={styles.halfButton}>
                Войти по коду
              </Button>
            }
          />
          <Text style={styles.footerHint}>ЕСТЬ ССЫЛКА? ОТКРОЙТЕ ЕЁ ИЗ СООБЩЕНИЯ</Text>
        </>
      }
    >
      <Header center="СЕГОДНЯ · 19:30" onAccount={onAuth} />
      <ImageBackground
        source={require('../../assets/hero.png')}
        style={styles.hero}
        imageStyle={styles.heroImage}
      >
        <Text style={styles.heroBadge}>ВЕЧЕР НАЧИНАЕТСЯ</Text>
      </ImageBackground>
      <Eyebrow style={styles.homeLabel}>01 / ГРУППОВОЙ ВЫБОР</Eyebrow>
      <Text style={[common.title, styles.homeTitle]}>Место, которое{`\n`}выберут все.</Text>
      <Body muted style={styles.homeDescription}>
        Укажите планы, позовите друзей и вместе выберите заведение для вечера.
      </Body>
      <View style={styles.steps}>
        <Step number="01" title="Создать комнату" />
        <Step number="02" title="Собрать голоса" />
        <Step number="03" title="Договориться о месте" />
      </View>
      {rooms?.length ? (
        <View style={styles.rooms}>
          <Eyebrow>ВАШИ КОМНАТЫ</Eyebrow>
          {rooms.map((room) => (
            <Pressable
              key={room.id}
              onPress={() => onOpen(room.id)}
              style={styles.roomRow}
              accessibilityRole="button"
            >
              <View>
                <Text style={common.body}>{meeting(room.constraints)}</Text>
                <Text style={common.small}>
                  КОД {room.code} · {room.members.length} УЧАСТНИКОВ
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {user ? <Text style={styles.signedIn}>ВЫ ВОШЛИ КАК {user.name.toUpperCase()}</Text> : null}
    </Screen>
  );
}

export function AuthScreen({ onBack, onEmail, onMini, mini, busy, user }) {
  const [mode, setMode] = useState(user && !user.email ? 'register' : 'login');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const valid =
    /.+@.+\..+/.test(email.trim()) &&
    password.length >= 8 &&
    (mode === 'login' || name.trim().length >= 2);

  return (
    <Screen
      footer={
        <Button
          disabled={!valid}
          loading={busy}
          onPress={() => onEmail(mode, email.trim().toLowerCase(), password, name.trim())}
        >
          {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </Button>
      }
    >
      <Header center="АККАУНТ" />
      <BackLink onPress={onBack} />
      <PageIntro
        label="01 / АККАУНТ"
        title={mode === 'login' ? 'С возвращением.' : 'Будем знакомы.'}
        description={
          mode === 'login'
            ? 'Войдите по почте, чтобы вернуться к своим комнатам.'
            : user && !user.email
              ? 'Привяжите почту — комнаты и голоса сохранятся.'
              : 'Вход по почте позволит вернуться к своим комнатам на другом устройстве.'
        }
      />
      <View style={styles.authFields}>
        {mode === 'register' ? (
          <Field
            label="Ваше имя"
            value={name}
            onChangeText={setName}
            placeholder="Имя"
            autoCapitalize="words"
          />
        ) : null}
        <Field
          label="Электронная почта"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          placeholder="Не меньше 8 символов"
          secureTextEntry
        />
        <Button variant="quiet" onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Создать аккаунт' : 'Уже есть аккаунт? Войти'}
        </Button>
      </View>
      <Separator />
      <Eyebrow>В МЕССЕНДЖЕРЕ</Eyebrow>
      <Body muted style={styles.miniHint}>
        Откройте Куда внутри Telegram или MAX для входа по данным мини-приложения.
      </Body>
      <Button
        variant="secondary"
        disabled={mini?.provider !== 'telegram'}
        onPress={() => onMini('telegram')}
      >
        Войти через Telegram
      </Button>
      <Button
        variant="secondary"
        disabled={mini?.provider !== 'max'}
        onPress={() => onMini('max')}
        style={styles.spacedButton}
      >
        Войти через MAX
      </Button>
    </Screen>
  );
}

export function AccountScreen({ user, onBack, onLogout, onAuth }) {
  return (
    <Screen
      footer={
        <Button variant="secondary" onPress={onLogout}>
          Выйти
        </Button>
      }
    >
      <Header center="АККАУНТ" />
      <BackLink onPress={onBack} />
      <PageIntro
        label="01 / ПРОФИЛЬ"
        title="Ваш профиль."
        description={
          user.method === 'guest'
            ? 'Гостевой профиль сохранён на этом устройстве. Привяжите почту, чтобы открывать комнаты на других устройствах.'
            : 'Комнаты и голоса доступны на устройствах, где вы вошли в аккаунт.'
        }
      />
      <Card style={styles.accountCard}>
        <Eyebrow>ИМЯ</Eyebrow>
        <Text style={[common.heading, { marginTop: 16 }]}>{user.name}</Text>
        <Body muted style={{ marginTop: 8 }}>
          {user.email || (user.method === 'guest' ? 'Гостевой профиль' : user.method.toUpperCase())}
        </Body>
      </Card>
      {!user.email ? (
        <Button onPress={onAuth} style={styles.spacedButton}>
          Привязать почту
        </Button>
      ) : null}
    </Screen>
  );
}

export function JoinCodeScreen({ onBack, onLookup, busy }) {
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  return (
    <Screen
      footer={
        <>
          <Button disabled={code.length !== 4} loading={busy} onPress={() => onLookup(code)}>
            Найти комнату
          </Button>
          <Text style={styles.footerHint}>ЕСТЬ ССЫЛКА? ОТКРОЙТЕ ЕЁ ИЗ СООБЩЕНИЯ</Text>
        </>
      }
    >
      <Header center="ВХОД В КОМНАТУ" />
      <BackLink onPress={onBack} />
      <PageIntro
        label="01 / ПРИСОЕДИНИТЬСЯ"
        title="Введите код комнаты."
        titleStyle={{ maxWidth: 270 }}
        descriptionStyle={{ marginTop: 42 }}
        description="Попросите четырёхзначный код у создателя комнаты."
      />
      <View style={styles.codeSection}>
        <Eyebrow>КОД КОМНАТЫ</Eyebrow>
        <View style={[styles.codeInput, focused && styles.codeInputFocused]}>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 4))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => code.length === 4 && !busy && onLookup(code)}
            keyboardType="number-pad"
            returnKeyType="done"
            style={styles.codeCapture}
            accessibilityLabel="Код комнаты"
          />
          <View pointerEvents="none" style={styles.codeDigits}>
            {Array.from({ length: 4 }, (_, index) => (
              <Text key={index} style={[styles.codeDigit, !code[index] && styles.codeDigitEmpty]}>
                {code[index] || '—'}
              </Text>
            ))}
          </View>
        </View>
        <Body muted style={{ marginTop: 24 }}>
          Нажмите на поле и введите четыре цифры.
        </Body>
      </View>
      <View style={styles.whatNext}>
        <Separator />
        <Eyebrow>ЧТО БУДЕТ ДАЛЬШЕ</Eyebrow>
        <Body muted style={{ marginTop: 18 }}>
          Покажем условия встречи и участников. Вы подтвердите вход в комнату.
        </Body>
      </View>
    </Screen>
  );
}

export function PreviewScreen({ preview, user, onBack, onJoin, busy, fromCode }) {
  const [name, setName] = useState(user?.name || '');
  const [askName, setAskName] = useState(false);
  const room = preview.room;
  const blocked = ['cancelled', 'expired', 'full', 'invalid', 'removed'].includes(preview.access);
  const selected = preview.access === 'selected';

  return (
    <Screen
      footer={
        blocked ? (
          <Button variant="secondary" onPress={onBack}>
            {fromCode ? 'Ввести другой код' : 'На главную'}
          </Button>
        ) : selected ? (
          <Button
            onPress={() =>
              Linking.openURL(
                room.winner?.mapUrl ||
                  `https://maps.google.com/?q=${encodeURIComponent(room.winner?.address || '')}`,
              )
            }
          >
            Маршрут
          </Button>
        ) : (
          <>
            <Button
              variant="quiet"
              loading={busy}
              onPress={() => (user ? onJoin(user.name) : setAskName(true))}
            >
              Присоединиться
            </Button>
            <Text style={styles.footerHint}>НИЧЕГО УСТАНАВЛИВАТЬ НЕ НУЖНО</Text>
          </>
        )
      }
    >
      <Header room={room} onHome={onBack} />
      <PageIntro
        label={`ПРИГЛАШЕНИЕ В КОМНАТУ #${room.code}`}
        titleStyle={{ maxWidth: 255 }}
        descriptionStyle={{ marginTop: 8 }}
        title={
          selected ? 'Место уже выбрано.' : blocked ? 'Войти не получится.' : 'Вас зовут выбирать.'
        }
        description={
          selected
            ? 'Компания уже определилась с местом встречи.'
            : blocked
              ? preview.reason
              : `${room.hostName} и компания выбирают место. Встреча — ${meeting(room.constraints)}.`
        }
      />
      <View style={styles.inviteCard}>
        <ImageBackground
          source={require('../../assets/hero.png')}
          style={styles.invitePhoto}
          imageStyle={styles.invitePhotoImage}
        />
        <View style={styles.inviteDetails}>
          <Eyebrow style={{ color: colors.green }}>{meeting(room.constraints)}</Eyebrow>
          <Text style={[common.heading, { marginTop: 18 }]}>
            {selected ? room.winner?.name : categorySummary(room.constraints.categories)}
          </Text>
          <Separator />
          <Eyebrow>{areaSummary(room.constraints).toUpperCase()}</Eyebrow>
          <Eyebrow style={{ marginTop: 12 }}>
            {room.members
              .map((member) => member.name)
              .join(' · ')
              .toUpperCase()}
          </Eyebrow>
        </View>
      </View>
      {selected ? (
        <Notice title="ВЕЧЕР РЕШЁН">{room.winner?.address || 'Адрес уточняется'}</Notice>
      ) : null}
      {blocked ? (
        <Notice title="ПРИГЛАШЕНИЕ НЕДОСТУПНО" tone="warning">
          {preview.reason}
        </Notice>
      ) : null}
      <Modal
        transparent
        visible={askName}
        animationType="fade"
        onRequestClose={() => setAskName(false)}
      >
        <View style={styles.guestModalShade}>
          <View style={styles.guestModal}>
            <Text style={common.heading}>Как вас зовут?</Text>
            <Body muted>Это имя увидят другие участники комнаты.</Body>
            <Field
              label="ВАШЕ ИМЯ"
              value={name}
              onChangeText={setName}
              placeholder="Имя для компании"
              autoFocus
            />
            <Button
              disabled={name.trim().length < 2}
              loading={busy}
              onPress={() => onJoin(name.trim())}
            >
              Войти в комнату
            </Button>
            <Button variant="quiet" onPress={() => setAskName(false)}>
              Отмена
            </Button>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 307, width: '100%', padding: 12, marginTop: -12 },
  heroImage: { borderRadius: 5 },
  heroBadge: {
    alignSelf: 'flex-start',
    color: colors.text,
    backgroundColor: '#0E0F12DD',
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 0.6,
    padding: 9,
  },
  homeLabel: { marginTop: 26 },
  homeTitle: { marginTop: 18 },
  homeDescription: { marginTop: 28, maxWidth: 385 },
  steps: { marginTop: 60 },
  step: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stepNumber: { color: colors.red, fontFamily: fonts.number, fontSize: 12, width: 44 },
  stepTitle: {
    color: colors.text,
    fontFamily: fonts.monoBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  halfButton: { flex: 1 },
  footerHint: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.6,
    textAlign: 'center',
    marginTop: 13,
  },
  rooms: { marginTop: 26, marginBottom: 12 },
  roomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 14,
  },
  chevron: { color: colors.secondary, fontSize: 22 },
  signedIn: { color: colors.muted, fontFamily: fonts.mono, fontSize: 9, marginTop: 22 },
  authFields: { marginTop: 48 },
  miniHint: { marginTop: 18, marginBottom: 18 },
  spacedButton: { marginTop: 10 },
  accountCard: { marginTop: 44 },
  codeSection: { marginTop: 76 },
  codeInput: {
    height: 112,
    marginTop: 18,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 5,
    justifyContent: 'center',
  },
  codeInputFocused: { borderColor: colors.borderStrong },
  codeCapture: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0,
    zIndex: 1,
  },
  codeDigits: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 16,
  },
  codeDigit: {
    width: 56,
    color: colors.text,
    fontFamily: fonts.monoBold,
    fontSize: 46,
    textAlign: 'center',
  },
  codeDigitEmpty: { color: colors.muted, transform: [{ translateY: 25 }] },
  whatNext: { marginTop: 54 },
  inviteCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 55,
  },
  invitePhoto: { height: 248 },
  invitePhotoImage: { resizeMode: 'cover' },
  inviteDetails: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 5 },
  guestModalShade: {
    flex: 1,
    backgroundColor: '#000A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  guestModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: 20,
    gap: 15,
  },
});
