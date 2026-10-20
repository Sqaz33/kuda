import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api, hasToken, loadToken, saveToken, subscribeUnauthorized } from './src/api';
import { acceptsRoom, roomScreen } from './src/room-state';
import { inviteFromUrl, shareInvite } from './src/links';
import { detectMiniApp } from './src/miniapps';
import { colors, fonts } from './src/theme';
import {
  AccountScreen,
  AuthScreen,
  CreateScreen,
  DeckScreen,
  DetailsScreen,
  HomeScreen,
  JoinCodeScreen,
  LobbyScreen,
  MatchesScreen,
  PreviewScreen,
  ResultScreen,
  RecoveryScreen,
  TransferScreen,
  UnavailableScreen,
  WaitingScreen,
} from './src/screens';

export default function App() {
  const [loaded] = useFonts({
    InterTight_400Regular: require('@expo-google-fonts/inter-tight/400Regular/InterTight_400Regular.ttf'),
    InterTight_500Medium: require('@expo-google-fonts/inter-tight/500Medium/InterTight_500Medium.ttf'),
    InterTight_600SemiBold: require('@expo-google-fonts/inter-tight/600SemiBold/InterTight_600SemiBold.ttf'),
    InterTight_700Bold: require('@expo-google-fonts/inter-tight/700Bold/InterTight_700Bold.ttf'),
    IBMPlexMono_600SemiBold: require('@expo-google-fonts/ibm-plex-mono/600SemiBold/IBMPlexMono_600SemiBold.ttf'),
    IBMPlexMono_700Bold: require('@expo-google-fonts/ibm-plex-mono/700Bold/IBMPlexMono_700Bold.ttf'),
    PlusJakartaSans_700Bold: require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'),
  });
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [mini, setMini] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomsStatus, setRoomsStatus] = useState('idle');
  const [roomsError, setRoomsError] = useState('');
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [transferOrigin, setTransferOrigin] = useState('auth');
  const [retryInviteToken, setRetryInviteToken] = useState(null);
  const [room, setRoom] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewOrigin, setPreviewOrigin] = useState('home');
  const [venue, setVenue] = useState(null);
  const [returnTo, setReturnTo] = useState('deck');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const roomRef = useRef(null);
  const busyRef = useRef(false);
  const roomsRequestRef = useRef(0);

  function showError(cause) {
    setError(
      (cause?.message || 'Что-то пошло не так. Попробуй ещё раз.') +
        (cause?.retryAfter ? ` Повторите через ${cause.retryAfter} сек.` : ''),
    );
  }
  async function run(action) {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      return await action();
    } catch (cause) {
      showError(cause);
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function applyRoom(next, keepDetails = false) {
    if (!acceptsRoom(roomRef.current, next)) return;
    roomRef.current = next;
    setRoom(next);
    if (!keepDetails) setScreen(roomScreen(next));
  }
  async function refreshRooms() {
    const requestId = ++roomsRequestRef.current;
    if (!hasToken()) {
      setRooms([]);
      setRoomsStatus('idle');
      setRoomsError('');
      return;
    }
    setRoomsStatus('loading');
    setRoomsError('');
    try {
      const next = await api.rooms();
      if (requestId !== roomsRequestRef.current) return;
      setRooms(next);
      setRoomsStatus('success');
    } catch (cause) {
      if (requestId !== roomsRequestRef.current || cause.code === 'SESSION_CHANGED') return;
      setRoomsStatus('error');
      setRoomsError(cause.message);
    }
  }
  async function openInvite(token) {
    if (!token) return;
    setRetryInviteToken(null);
    try {
      const next = await api.preview(token);
      setPreview(next);
      setPreviewOrigin('home');
      setScreen('preview');
      void api.track('invite_opened', { roomId: next.room.id }).catch(() => {});
    } catch (cause) {
      setError(cause.message);
      if (!cause.status || cause.status >= 500 || cause.status === 429 || cause.status === 401)
        setRetryInviteToken(token);
      setScreen('unavailable');
    }
  }
  async function ensureGuest(name) {
    if (user) return user;
    if (hasToken()) {
      const existing = await api.me();
      setUser(existing);
      return existing;
    }
    const auth = await api.guest(name);
    await saveToken(auth.token);
    setUser(auth.user);
    return auth.user;
  }

  useEffect(
    () =>
      subscribeUnauthorized(() => {
        roomRef.current = null;
        setRoom(null);
        roomsRequestRef.current++;
        setRooms([]);
        setUser(null);
        setOffline(false);
        setError(
          'Сессия закончилась. Войдите снова. Гостевой профиль с тем же именем будет новым пользователем.',
        );
        setScreen('auth');
      }),
    [],
  );

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        await loadToken();
        const detected = await detectMiniApp();
        if (!mounted) return;
        setMini(detected);
        let restored = false;
        if (hasToken()) {
          try {
            const me = await api.me();
            restored = true;
            if (mounted) setUser(me);
          } catch (cause) {
            if (cause.status !== 401) throw cause;
          }
        }
        if (!restored && detected?.provider === 'telegram') {
          try {
            const auth = await api.miniApp(detected.provider, detected.initData);
            await saveToken(auth.token);
            if (mounted) {
              setUser(auth.user);
              setError('');
            }
          } catch (cause) {
            if (mounted) showError(cause);
          }
        }
        const initial = await Linking.getInitialURL();
        const invite =
          inviteFromUrl(initial) ||
          (typeof window !== 'undefined' ? inviteFromUrl(window.location.href) : null) ||
          detected?.startParam;
        if (!mounted) return;
        if (invite) await openInvite(invite);
        else {
          setScreen('home');
          await refreshRooms();
        }
      } catch (cause) {
        if (mounted) {
          showError(cause);
          setScreen('recovery');
        }
      }
    }
    bootstrap();
    const listener = Linking.addEventListener('url', (event) => {
      const invite = inviteFromUrl(event.url);
      if (invite) openInvite(invite);
    });
    return () => {
      mounted = false;
      listener.remove();
    };
  }, [bootstrapAttempt]);

  useEffect(() => {
    if (!room?.id || !['lobby', 'deck', 'waiting', 'matches', 'result', 'details'].includes(screen))
      return;
    let active = true;
    let timer;
    async function poll() {
      try {
        const next = await api.room(room.id);
        if (active) {
          setOffline(false);
          applyRoom(
            next,
            screen === 'details' ||
              (screen === 'matches' && next.winner?.availability === 'withdrawn'),
          );
        }
      } catch (cause) {
        if (active) {
          if (cause.status === 403 || cause.status === 404) {
            setError('Вы больше не участник этой комнаты.');
            setScreen('unavailable');
          } else if (cause.status !== 401 && cause.code !== 'SESSION_CHANGED') setOffline(true);
        }
      } finally {
        if (active) timer = setTimeout(poll, 4000);
      }
    }
    timer = setTimeout(poll, 4000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [room?.id, screen]);
  useEffect(() => {
    if (room?.status === 'deciding' && room.matchMode !== 'unanimous') {
      void api
        .track('fallback_shown', {
          roomId: room.id,
        })
        .catch(() => {});
    }
  }, [room?.id, room?.status, room?.matchMode]);

  async function goHome() {
    roomRef.current = null;
    setRoom(null);
    setPreview(null);
    setRetryInviteToken(null);
    setError('');
    setScreen('home');
    await refreshRooms();
  }
  async function openRoom(id) {
    await run(async () => {
      applyRoom(await api.room(id));
    });
  }
  async function authenticateGuest(name) {
    await run(async () => {
      const auth = await api.guest(name);
      await saveToken(auth.token);
      setUser(auth.user);
      await goHome();
    });
  }
  async function authenticateMini(provider) {
    if (!mini || mini.provider !== provider) return;
    await run(async () => {
      const auth = await api.miniApp(provider, mini.initData);
      await saveToken(auth.token);
      setUser(auth.user);
      await goHome();
    });
  }
  async function logout() {
    try {
      await api.logout();
    } catch {
      /* Local sign-out still proceeds. */
    }
    await saveToken(null);
    roomsRequestRef.current++;
    roomRef.current = null;
    setUser(null);
    setRooms([]);
    setRoom(null);
    setScreen('home');
  }
  function openTransfer(origin) {
    setError('');
    setTransferOrigin(origin);
    setScreen('transfer');
  }
  async function exchangeProfile(code) {
    await run(async () => {
      const auth = await api.exchange(code);
      await saveToken(auth.token);
      roomsRequestRef.current++;
      setRooms([]);
      setUser(auth.user);
      await goHome();
    });
  }
  async function createRoom(constraints, name) {
    await run(async () => {
      await ensureGuest(name);
      const created = await api.createRoom(constraints);
      applyRoom(created);
    });
  }
  async function lookupCode(code, name) {
    await run(async () => {
      await ensureGuest(name);
      const found = await api.roomByCode(code);
      setPreview(found);
      setPreviewOrigin('join');
      setScreen('preview');
    });
  }
  async function joinRoom(name) {
    await run(async () => {
      await ensureGuest(name);
      const joined = await api.join(preview.token);
      applyRoom(joined);
    });
  }
  async function startRoom() {
    await run(async () => {
      applyRoom(await api.start(room.id));
    });
  }
  async function rotateInvite() {
    await run(async () => {
      applyRoom(await api.rotateInvite(room.id));
      setError('Новая ссылка готова. Старую уже нельзя использовать.');
    });
  }
  async function cancelRoom() {
    await run(async () => {
      applyRoom(await api.cancelRoom(room.id));
    });
  }
  async function leaveRoom() {
    await run(async () => {
      await api.leaveRoom(room.id);
      await goHome();
    });
  }
  async function removeMember(memberId) {
    await run(async () => {
      applyRoom(await api.removeMember(room.id, memberId));
    });
  }
  async function vote(venueId, value) {
    await run(async () => {
      applyRoom(await api.vote(room.id, venueId, value, user.id));
    });
  }
  async function finishEarly() {
    await run(async () => {
      applyRoom(await api.finish(room.id));
    });
  }
  async function closeVoting() {
    await run(async () => {
      const next = await api.closeVoting(room.id);
      applyRoom(next);
    });
  }
  async function choose(venueId) {
    await run(async () => {
      applyRoom(await api.choose(room.id, venueId));
    });
  }
  async function note(value) {
    await run(async () => {
      applyRoom(await api.bookingNote(room.id, value));
    });
  }
  async function extend() {
    await run(async () => {
      applyRoom(await api.extend(room.id));
    });
  }
  async function report(venueId, reason) {
    await run(async () => {
      await api.report(room.id, venueId, reason);
      setError('Спасибо, отправили карточку на проверку.');
    });
  }
  async function share() {
    return run(async () => {
      const result = await shareInvite(room.inviteToken);
      if (result === 'copied') setError('Ссылка скопирована.');
      void api.track('invite_shared', { roomId: room.id }).catch(() => {});
      return result;
    });
  }
  function openAction(kind, url) {
    void api
      .track('booking_action', {
        roomId: room.id,
        venueId: room.winner.id,
        action: kind === 'phone' ? 'call' : kind,
      })
      .catch(() => {});
    Linking.openURL(url).catch(showError);
  }
  function details(next) {
    setVenue(next);
    setReturnTo(screen);
    setScreen('details');
  }

  let content = null;
  if (screen === 'loading' || !loaded)
    content = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.red} size="large" />
      </View>
    );
  else if (screen === 'home')
    content = (
      <HomeScreen
        user={user}
        rooms={rooms}
        onCreate={() => setScreen('create')}
        onJoin={() => setScreen('join')}
        onAuth={() => setScreen(user ? 'account' : 'auth')}
        onOpen={openRoom}
        roomsStatus={roomsStatus}
        roomsError={roomsError}
        onRetryRooms={refreshRooms}
      />
    );
  else if (screen === 'auth')
    content = (
      <AuthScreen
        user={user}
        onBack={goHome}
        onGuest={authenticateGuest}
        onMini={authenticateMini}
        mini={mini}
        busy={busy}
        onTransfer={() => openTransfer('auth')}
      />
    );
  else if (screen === 'account')
    content = (
      <AccountScreen
        user={user}
        onBack={goHome}
        onLogout={logout}
        onCreateTransfer={() => run(() => api.transfer())}
        onTransfer={() => openTransfer('account')}
        busy={busy}
        error={error}
      />
    );
  else if (screen === 'transfer')
    content = (
      <TransferScreen
        user={user}
        onBack={() => {
          setError('');
          setScreen(transferOrigin);
        }}
        onExchange={exchangeProfile}
        busy={busy}
        error={error}
      />
    );
  else if (screen === 'recovery')
    content = (
      <RecoveryScreen
        reason={error}
        onRetry={() => {
          setError('');
          setScreen('loading');
          setBootstrapAttempt((attempt) => attempt + 1);
        }}
      />
    );
  else if (screen === 'create')
    content = <CreateScreen user={user} onBack={goHome} onCreate={createRoom} busy={busy} />;
  else if (screen === 'join')
    content = <JoinCodeScreen user={user} onBack={goHome} onLookup={lookupCode} busy={busy} />;
  else if (screen === 'preview' && preview)
    content = (
      <PreviewScreen
        preview={preview}
        user={user}
        onBack={previewOrigin === 'join' ? () => setScreen('join') : goHome}
        onJoin={joinRoom}
        busy={busy}
        fromCode={previewOrigin === 'join'}
      />
    );
  else if (screen === 'lobby' && room)
    content = (
      <LobbyScreen
        room={room}
        user={user}
        onBack={goHome}
        onStart={startRoom}
        onShare={share}
        onRotate={rotateInvite}
        onCancel={cancelRoom}
        onLeave={leaveRoom}
        onRemove={removeMember}
        busy={busy}
      />
    );
  else if (screen === 'deck' && room)
    content = (
      <DeckScreen
        room={room}
        user={user}
        onBack={goHome}
        onVote={vote}
        onFinish={closeVoting}
        onFinishEarly={finishEarly}
        onDetail={details}
        onCancel={cancelRoom}
        pending={busy}
      />
    );
  else if (screen === 'waiting' && room)
    content = (
      <WaitingScreen
        room={room}
        user={user}
        onBack={goHome}
        onFinish={closeVoting}
        onCancel={cancelRoom}
      />
    );
  else if (screen === 'matches' && room)
    content = (
      <MatchesScreen
        room={room}
        user={user}
        onChoose={choose}
        onBack={goHome}
        onExtend={extend}
        onCancel={cancelRoom}
        pending={busy}
      />
    );
  else if (screen === 'result' && room)
    content = (
      <ResultScreen
        room={room}
        user={user}
        onBack={goHome}
        onNote={note}
        onDetail={details}
        onAction={openAction}
        onReplace={() => setScreen('matches')}
        onCancel={cancelRoom}
        pending={busy}
      />
    );
  else if (screen === 'details' && venue)
    content = (
      <DetailsScreen
        venue={room?.candidates.find((item) => item.id === venue.id) || venue}
        room={room}
        onBack={() => setScreen(room ? roomScreen(room) : returnTo)}
        onVote={vote}
        onFinishEarly={finishEarly}
        onReport={report}
        pending={busy}
      />
    );
  else
    content = (
      <UnavailableScreen
        reason={
          error ||
          (room?.status === 'cancelled'
            ? 'Организатор закрыл эту комнату.'
            : room?.status === 'expired'
              ? 'Время встречи прошло.'
              : 'Комната закрыта или срок встречи прошёл.')
        }
        onHome={goHome}
        onRetry={retryInviteToken ? () => run(() => openInvite(retryInviteToken)) : null}
        onJoin={() => setScreen('join')}
        busy={busy}
      />
    );
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {content}
      {error && !['loading', 'unavailable', 'recovery', 'transfer', 'account'].includes(screen) ? (
        <View pointerEvents="box-none" style={styles.toastContainer}>
          <Pressable onPress={() => setError('')} style={styles.toast}>
            <Text style={styles.toastText}>{error} ×</Text>
          </Pressable>
        </View>
      ) : null}
      {offline ? (
        <View style={styles.offline}>
          <Text style={styles.offlineText}>Нет связи. Данные обновятся автоматически.</Text>
        </View>
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  toastContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toast: {
    width: '100%',
    maxWidth: 406,
    backgroundColor: colors.surface,
    borderColor: colors.red,
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
  },
  toastText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  offline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.red,
    alignItems: 'center',
    padding: 6,
  },
  offlineText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 11 },
});
