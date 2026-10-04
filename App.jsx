import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api, hasToken, loadToken, saveToken } from './src/api';
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
  UnavailableScreen,
  WaitingScreen,
} from './src/screens';

function roomScreen(room) {
  if (room.status === 'waiting') return 'lobby';
  if (room.status === 'swiping')
    return room.selfFinished || room.candidates.every((venue) => room.ownVotes?.[venue.id])
      ? 'waiting'
      : 'deck';
  if (room.status === 'deciding') return 'matches';
  if (room.status === 'selected' || room.status === 'completed') return 'result';
  return 'unavailable';
}

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
  const [room, setRoom] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewOrigin, setPreviewOrigin] = useState('home');
  const [venue, setVenue] = useState(null);
  const [returnTo, setReturnTo] = useState('deck');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);

  function showError(cause) {
    setError(cause?.message || 'Что-то пошло не так. Попробуй ещё раз.');
  }
  async function run(action) {
    setBusy(true);
    setError('');
    try {
      return await action();
    } catch (cause) {
      showError(cause);
      return null;
    } finally {
      setBusy(false);
    }
  }
  function applyRoom(next, keepDetails = false) {
    setRoom(next);
    if (!keepDetails) setScreen(roomScreen(next));
  }
  async function refreshRooms() {
    if (!hasToken()) {
      setRooms([]);
      return;
    }
    try {
      setRooms(await api.rooms());
    } catch {
      /* Home can still be used offline. */
    }
  }
  async function openInvite(token) {
    if (!token) return;
    try {
      const next = await api.preview(token);
      setPreview(next);
      setPreviewOrigin('home');
      setScreen('preview');
      void api.track('invite_opened', { roomId: next.room.id }).catch(() => {});
    } catch (cause) {
      setError(cause.message);
      setScreen('unavailable');
    }
  }
  async function ensureGuest(name) {
    if (user) return user;
    const auth = await api.guest(name);
    await saveToken(auth.token);
    setUser(auth.user);
    return auth.user;
  }

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        await loadToken();
        const detected = await detectMiniApp();
        if (!mounted) return;
        setMini(detected);
        if (detected) {
          try {
            const auth = await api.miniApp(detected.provider, detected.initData);
            await saveToken(auth.token);
            if (mounted) setUser(auth.user);
          } catch (cause) {
            if (mounted) showError(cause);
          }
        } else if (hasToken()) {
          try {
            const me = await api.me();
            if (mounted) setUser(me);
          } catch {
            await saveToken(null);
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
          setScreen('home');
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
  }, []);

  useEffect(() => {
    if (!room?.id || !['lobby', 'deck', 'waiting', 'matches', 'result', 'details'].includes(screen))
      return;
    let active = true;
    const id = setInterval(async () => {
      try {
        const next = await api.room(room.id);
        if (active) {
          setOffline(false);
          applyRoom(next, screen === 'details');
        }
      } catch {
        if (active) setOffline(true);
      }
    }, 4000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [room?.id, screen]);
  useEffect(() => {
    if (room?.status === 'deciding' && room.matchMode !== 'unanimous') {
      void api
        .track('fallback_shown', {
          roomId: room.id,
          mode: room.matchMode,
          incomplete: room.incomplete,
        })
        .catch(() => {});
    }
  }, [room?.id, room?.status, room?.matchMode]);

  async function goHome() {
    setRoom(null);
    setPreview(null);
    setError('');
    setScreen('home');
    await refreshRooms();
  }
  async function openRoom(id) {
    await run(async () => {
      applyRoom(await api.room(id));
    });
  }
  async function authenticateEmail(mode, email, password, name) {
    await run(async () => {
      const auth = await api.email(mode, email, password, name);
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
    setUser(null);
    setRooms([]);
    setRoom(null);
    setScreen('home');
  }
  async function createRoom(constraints, name) {
    await run(async () => {
      await ensureGuest(name);
      const created = await api.createRoom(constraints);
      applyRoom(created);
      void api.track('room_created', { roomId: created.id }).catch(() => {});
    });
  }
  async function lookupCode(code) {
    await run(async () => {
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
      void api.track('member_joined', { roomId: joined.id }).catch(() => {});
    });
  }
  async function startRoom() {
    await run(async () => {
      applyRoom(await api.start(room.id));
      void api.track('voting_started', { roomId: room.id }).catch(() => {});
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
      void api.track('voting_finished', { roomId: room.id, mode: next.matchMode }).catch(() => {});
    });
  }
  async function choose(venueId) {
    await run(async () => {
      applyRoom(await api.choose(room.id, venueId));
      void api.track('winner_selected', { roomId: room.id, venueId }).catch(() => {});
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
    await run(async () => {
      const result = await shareInvite(room.inviteToken);
      if (result === 'copied') setError('Ссылка скопирована.');
      void api.track('invite_shared', { roomId: room.id }).catch(() => {});
    });
  }
  function openAction(kind, url) {
    void api
      .track('booking_action', { roomId: room.id, venueId: room.winner.id, kind })
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
        onAuth={() => setScreen(user && user.method !== 'guest' ? 'account' : 'auth')}
        onOpen={openRoom}
      />
    );
  else if (screen === 'auth')
    content = (
      <AuthScreen
        user={user}
        onBack={goHome}
        onEmail={authenticateEmail}
        onMini={authenticateMini}
        mini={mini}
        busy={busy}
      />
    );
  else if (screen === 'account')
    content = (
      <AccountScreen
        user={user}
        onBack={goHome}
        onLogout={logout}
        onAuth={() => setScreen('auth')}
      />
    );
  else if (screen === 'create')
    content = <CreateScreen user={user} onBack={goHome} onCreate={createRoom} busy={busy} />;
  else if (screen === 'join')
    content = <JoinCodeScreen onBack={goHome} onLookup={lookupCode} busy={busy} />;
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
        onRefresh={() => openRoom(room.id)}
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
        pending={busy}
      />
    );
  else if (screen === 'details' && venue)
    content = (
      <DetailsScreen
        venue={venue}
        onBack={() => setScreen(room ? roomScreen(room) : returnTo)}
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
      />
    );
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {content}
      {screen !== 'loading' && error && screen !== 'unavailable' ? (
        <Pressable onPress={() => setError('')} style={styles.toast}>
          <Text style={styles.toastText}>{error} ×</Text>
        </Pressable>
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
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 22,
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
