import React, { useEffect, useState } from 'react';
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
import { previewAccess } from '../room-state';
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

export function HomeScreen({
  user,
  rooms,
  onCreate,
  onJoin,
  onAuth,
  onOpen,
  roomsStatus,
  roomsError,
  onRetryRooms,
}) {
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
      {user && roomsStatus === 'loading' ? (
        <Body muted style={styles.rooms} accessibilityLiveRegion="polite">
          Загружаем ваши комнаты…
        </Body>
      ) : null}
      {user && roomsStatus === 'error' ? (
        <View style={styles.rooms}>
          <Notice title="НЕ УДАЛОСЬ ОБНОВИТЬ КОМНАТЫ" tone="warning">
            {roomsError} Ранее загруженный список, если он есть, оставлен на экране.
          </Notice>
          <Button variant="secondary" onPress={onRetryRooms}>
            Повторить загрузку комнат
          </Button>
        </View>
      ) : null}
      {user && roomsStatus === 'success' && !rooms.length ? (
        <Notice title="ПОКА НЕТ КОМНАТ">Создайте встречу или присоединитесь по приглашению.</Notice>
      ) : null}
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
                  {room.code ? `КОД ${room.code}` : 'КОМНАТА'} · {room.members.length} УЧАСТНИКОВ
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

export function AuthScreen({ onBack, onGuest, onMini, mini, busy, user, onTransfer }) {
  const [name, setName] = useState(user?.name || '');
  const valid = name.trim().length >= 1 && name.trim().length <= 80;

  return (
    <Screen
      footer={
        <Button disabled={!valid} loading={busy} onPress={() => onGuest(name.trim())}>
          Продолжить как гость
        </Button>
      }
    >
      <Header center="АККАУНТ" />
      <BackLink onPress={onBack} />
      <PageIntro
        label="01 / АККАУНТ"
        title="Будем знакомы."
        description="Гостевой профиль сохраняется на этом устройстве. Повторный вход под тем же именем создаёт новый профиль."
      />
      <View style={styles.authFields}>
        <Field
          label="Ваше имя"
          value={name}
          onChangeText={setName}
          placeholder="Имя"
          autoCapitalize="words"
          maxLength={80}
        />
      </View>
      <Button variant="secondary" disabled={busy} onPress={onTransfer}>
        У меня есть код переноса
      </Button>
      <Separator />
      <Eyebrow>В МЕССЕНДЖЕРЕ</Eyebrow>
      <Body muted style={styles.miniHint}>
        Для входа через Telegram откройте Куда внутри Telegram Mini App. Вход по почте и MAX пока
        недоступен.
      </Body>
      {mini?.provider === 'telegram' ? (
        <Button
          variant="secondary"
          disabled={mini?.provider !== 'telegram'}
          onPress={() => onMini('telegram')}
        >
          Войти через Telegram
        </Button>
      ) : null}
    </Screen>
  );
}

export function AccountScreen({
  user,
  onBack,
  onLogout,
  onCreateTransfer,
  onTransfer,
  busy,
  error,
}) {
  const [ticket, setTicket] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [confirmLogout, setConfirmLogout] = useState(false);
  useEffect(() => {
    if (!ticket) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticket]);
  const seconds = ticket ? Math.max(0, Math.ceil((Date.parse(ticket.expiresAt) - now) / 1000)) : 0;
  async function createTransfer() {
    const next = await onCreateTransfer();
    if (next) {
      setNow(Date.now());
      setTicket(next);
    }
  }
  return (
    <Screen
      footer={
        <Button variant="secondary" disabled={busy} onPress={() => setConfirmLogout(true)}>
          Выйти из профиля
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
            ? 'Гостевой профиль сохранён на этом устройстве. Ссылка на комнату не переносит ваши голоса на другое устройство.'
            : 'Telegram узнаёт ваш профиль при следующем входе в мини-приложение.'
        }
      />
      <Card style={styles.accountCard}>
        <Eyebrow>ИМЯ</Eyebrow>
        <Text style={[common.heading, { marginTop: 16 }]}>{user.name}</Text>
        <Body muted style={{ marginTop: 8 }}>
          {user.email || (user.method === 'guest' ? 'Гостевой профиль' : user.method.toUpperCase())}
        </Body>
      </Card>
      <View style={styles.transferSection}>
        <Eyebrow>ПРОФИЛЬ НА ДРУГОМ УСТРОЙСТВЕ</Eyebrow>
        <Body muted>
          Код переносит доступ к этому же профилю, комнатам и голосам. Действует пять минут и
          используется один раз. Не отправляйте его другим людям.
        </Body>
        {error ? (
          <Notice title="НЕ УДАЛОСЬ ВЫПОЛНИТЬ ДЕЙСТВИЕ" tone="warning">
            {error}
          </Notice>
        ) : null}
        {ticket && seconds > 0 ? (
          <Card>
            <Eyebrow>ОДНОРАЗОВЫЙ КОД</Eyebrow>
            <Text selectable style={styles.transferCode}>
              {ticket.transferCode}
            </Text>
            <Body muted>Скопируйте на другом устройстве в «У меня есть код переноса».</Body>
            <Body muted>
              Истекает через {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
            </Body>
          </Card>
        ) : ticket ? (
          <Notice title="СРОК КОДА ИСТЁК" tone="warning">
            Получите новый код на этом устройстве.
          </Notice>
        ) : null}
        <Button variant="secondary" loading={busy} onPress={createTransfer}>
          {ticket ? 'Создать новый код переноса' : 'Создать код переноса'}
        </Button>
        <Button variant="quiet" disabled={busy} onPress={onTransfer}>
          Открыть другой профиль по коду
        </Button>
        {confirmLogout ? (
          <Notice title="ВЫЙТИ ИЗ ПРОФИЛЯ?" tone="warning">
            {user.method === 'guest'
              ? 'Повторное имя не восстановит этот профиль. Сначала перенесите его на другое устройство, иначе доступ к комнатам и голосам может быть потерян. Код из этой сессии перестаёт работать после выхода.'
              : 'Текущая сессия будет завершена.'}
          </Notice>
        ) : null}
        {confirmLogout ? (
          <>
            <Button variant="danger" loading={busy} onPress={onLogout}>
              Подтверждаю выход
            </Button>
            <Button variant="quiet" disabled={busy} onPress={() => setConfirmLogout(false)}>
              Остаться в профиле
            </Button>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

export function TransferScreen({ user, onBack, onExchange, busy, error }) {
  const [code, setCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const valid = code.trim().length > 0 && code.trim().length <= 100;
  return (
    <Screen
      footer={
        <Button
          loading={busy}
          disabled={!valid || Boolean(user && !confirmed)}
          onPress={() => onExchange(code.trim())}
        >
          Открыть профиль
        </Button>
      }
    >
      <Header center="ПЕРЕНОС ПРОФИЛЯ" />
      <BackLink onPress={onBack} />
      <PageIntro
        label="АККАУНТ / ДРУГОЕ УСТРОЙСТВО"
        title="Продолжить в своём профиле."
        description="На устройстве, где вы уже вошли, откройте профиль и создайте код переноса. Код одноразовый и действует пять минут."
      />
      <View style={styles.transferSection}>
        <Field
          label="Код переноса"
          value={code}
          onChangeText={setCode}
          maxLength={100}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          hint="Это не четырёхзначный код комнаты. Вставьте полный код из профиля."
        />
        {error ? (
          <Notice title="ПЕРЕНОС НЕ ВЫПОЛНЕН" tone="warning">
            {error}
          </Notice>
        ) : null}
        {error ? (
          <Body muted>
            Если связь пропала после отправки, код мог уже использоваться. Создайте новый на
            исходном устройстве. Текущий профиль здесь не изменится без успешного ответа.
          </Body>
        ) : null}
        {user ? (
          <>
            <Notice title="ПРОФИЛИ НЕ ОБЪЕДИНЯЮТСЯ" tone="warning">
              Сейчас вы вошли как {user.name}. Будет открыт профиль из кода; его комнаты и голоса
              заменят текущий список. Для возврата сохраните доступ к нынешнему профилю на другом
              устройстве.
            </Notice>
            <Button
              variant="secondary"
              disabled={busy || confirmed}
              onPress={() => setConfirmed(true)}
            >
              {confirmed ? 'Переключение подтверждено' : 'Понимаю, переключить профиль'}
            </Button>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

export function RecoveryScreen({ reason, onRetry }) {
  return (
    <Screen footer={<Button onPress={onRetry}>Попробовать снова</Button>}>
      <Header center="НЕТ СВЯЗИ С СЕРВЕРОМ" />
      <PageIntro
        label="ЗАГРУЗКА НЕ ЗАВЕРШЕНА"
        title="Не удалось открыть приложение."
        description={reason || 'Проверьте соединение и повторите попытку.'}
      />
      <Notice title="СОХРАНЁННЫЙ ПРОФИЛЬ НЕ УДАЛЁН">
        Временный сбой не создаёт нового гостя. Повторим загрузку с прежней сессией и исходным
        приглашением.
      </Notice>
    </Screen>
  );
}

export function JoinCodeScreen({ user, onBack, onLookup, busy }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const ready =
    code.length === 4 && (user || (name.trim().length >= 1 && name.trim().length <= 80));
  return (
    <Screen
      footer={
        <>
          <Button disabled={!ready} loading={busy} onPress={() => onLookup(code, name.trim())}>
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
        {!user ? (
          <Field
            label="Ваше имя"
            value={name}
            onChangeText={setName}
            maxLength={80}
            hint="Поиск по коду доступен после гостевого входа. Имя сохранится для комнаты."
          />
        ) : null}
        <Eyebrow>КОД КОМНАТЫ</Eyebrow>
        <View style={[styles.codeInput, focused && styles.codeInputFocused]}>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 4))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => ready && !busy && onLookup(code, name.trim())}
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
  const { blocked, selected, member } = previewAccess(preview, user);

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
              {member ? 'Вернуться в комнату' : 'Присоединиться'}
            </Button>
            <Text style={styles.footerHint}>НИЧЕГО УСТАНАВЛИВАТЬ НЕ НУЖНО</Text>
          </>
        )
      }
    >
      <Header room={room} onHome={onBack} />
      <PageIntro
        label={room.code ? `ПРИГЛАШЕНИЕ В КОМНАТУ #${room.code}` : 'ПРИГЛАШЕНИЕ В КОМНАТУ'}
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
              maxLength={80}
              autoFocus
            />
            <Button
              disabled={name.trim().length < 1 || name.trim().length > 80}
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
  hero: {
    height: 307,
    width: '100%',
    padding: 12,
    marginTop: -12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
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
  transferSection: { marginTop: 28, gap: 18, paddingBottom: 20 },
  transferCode: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 17,
    lineHeight: 25,
    marginVertical: 16,
  },
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
