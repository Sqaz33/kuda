import React, { useState } from 'react';
import { ImageBackground, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from './api';
import { inviteLink } from './links';
import { Body, Brand, Button, Card, Chips, Eyebrow, Field, Notice, Screen, Separator } from './ui';
import { colors, common, fonts } from './theme';

const categories = [{ value: 'bar', label: 'Бар' }, { value: 'cafe', label: 'Кафе' }, { value: 'restaurant', label: 'Ресторан' }];
const districts = [{ value: 'Центральный', label: 'Центральный' }, { value: 'Ворошиловский', label: 'Ворошиловский' }, { value: 'Дзержинский', label: 'Дзержинский' }, { value: 'Весь город', label: 'Весь город' }];
const money = (amount) => amount ? `до ${Number(amount).toLocaleString('ru-RU')} ₽/чел.` : 'бюджет не указан';
const meeting = (constraints) => `${constraints.date} в ${constraints.time}`;
const isHost = (room, user) => room?.hostId === user?.id;

function PageHead({ title, caption, onBack, room }) {
  return <><Brand subtitle={room ? `Комната #${room.code}` : 'Выбираем место вместе'} right={room ? <Text style={styles.roomCode}>КОД {room.code}</Text> : null} />
    {onBack ? <Button variant="quiet" onPress={onBack} style={styles.back}>← Назад</Button> : null}
    {caption ? <Eyebrow style={styles.caption}>{caption}</Eyebrow> : null}
    <Text style={[common.h1, styles.title]}>{title}</Text></>;
}

function Step({ number, text }) { return <View style={styles.step}><Text style={styles.stepNumber}>{number}</Text><Text style={styles.stepText}>{text}</Text></View>; }

export function HomeScreen({ user, rooms, onCreate, onJoin, onAuth, onOpen }) {
  return <Screen aside={<Card><Eyebrow>ОДНА КОМНАТА · ОДНО РЕШЕНИЕ</Eyebrow><Text style={[common.h2, { marginTop: 18 }]}>Вечер легче, когда выбор общий.</Text><Body muted style={{ marginTop: 16 }}>Все участники видят один набор заведений. Итог появляется у каждого, даже если вы открыли ссылку на разных устройствах.</Body></Card>}>
    <Brand right={<Pressable onPress={onAuth} accessibilityRole="button"><Text style={styles.headerLink}>{user ? user.name : 'Войти'}</Text></Pressable>} />
    <ImageBackground source={require('../assets/hero.png')} style={styles.hero} imageStyle={styles.heroImage}>
      <Text style={styles.heroLabel}>ВЕЧЕР НАЧИНАЕТСЯ</Text>
    </ImageBackground>
    <Eyebrow>01 / ГРУППОВОЙ ВЫБОР</Eyebrow>
    <Text style={[common.h1, { marginTop: 16 }]}>Место, которое{`\n`}выберут все.</Text>
    <Body muted style={{ marginTop: 20 }}>Задай планы, позови друзей и вместе выберите заведение для вечера.</Body>
    <View style={{ marginTop: 28 }}><Step number="01" text="Создать комнату" /><Step number="02" text="Собрать голоса" /><Step number="03" text="Договориться о месте" /></View>
    <Button onPress={onCreate}>Собрать компанию</Button><Button variant="secondary" onPress={onJoin}>Войти по коду</Button>
    <Text style={[common.small, styles.center, { marginTop: 18 }]}>Есть ссылка? Открой её из сообщения.</Text>
    {rooms?.length ? <><Separator /><Text style={common.h3}>Твои комнаты</Text>{rooms.map((room) => <Pressable key={room.id} onPress={() => onOpen(room.id)} style={styles.listItem}><View><Text style={common.body}>{room.constraints.date} · {room.constraints.time}</Text><Text style={common.small}>{room.members.length} участников · {room.code}</Text></View><Text style={styles.arrow}>→</Text></Pressable>)}</> : null}
  </Screen>;
}

export function AuthScreen({ onBack, onEmail, onMini, mini, busy, user }) {
  const [mode, setMode] = useState(user && !user.email ? 'register' : 'login');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const valid = /.+@.+\..+/.test(email.trim()) && password.length >= 8 && (mode === 'login' || name.trim().length >= 2);
  return <Screen><PageHead title={mode === 'login' ? 'С возвращением.' : 'Будем знакомы.'} caption="ВХОД В КУДА" onBack={onBack} />
    <Body muted style={{ marginBottom: 26 }}>{user && !user.email ? 'Привяжи почту к этому профилю — комнаты и голоса сохранятся.' : 'Почта и пароль нужны, чтобы находить свои комнаты на других устройствах.'}</Body>
    {mode === 'register' ? <Field label="Как тебя зовут" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Имя" /> : null}
    <Field label="Почта" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
    <Field label="Пароль" value={password} onChangeText={setPassword} secureTextEntry placeholder="Не меньше 8 символов" />
    <Button disabled={!valid} loading={busy} onPress={() => onEmail(mode, email.trim().toLowerCase(), password, name.trim())}>{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</Button>
    <Button variant="quiet" onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}</Button>
    <Separator />
    <Text style={common.h3}>В мессенджере</Text>
    <Body muted style={{ marginTop: 8 }}>Открой Куда внутри Telegram или MAX — вход подтвердится данными приложения.</Body>
    <Button variant="secondary" disabled={mini?.provider !== 'telegram'} onPress={() => onMini('telegram')}>Войти через Telegram</Button>
    <Button variant="secondary" disabled={mini?.provider !== 'max'} onPress={() => onMini('max')}>Войти через MAX</Button>
    {!mini ? <Text style={[common.small, { marginTop: 10 }]}>Кнопки станут доступны внутри соответствующего мини-приложения.</Text> : null}
  </Screen>;
}

export function AccountScreen({ user, onBack, onLogout, onAuth }) {
  return <Screen><PageHead title="Твой профиль." caption="АККАУНТ" onBack={onBack} />
    <Card><Eyebrow>ИМЯ</Eyebrow><Text style={[common.h2, { marginTop: 12 }]}>{user.name}</Text><Body muted style={{ marginTop: 8 }}>{user.email || (user.method === 'telegram' ? 'Telegram' : user.method === 'max' ? 'MAX' : 'Гостевой профиль')}</Body></Card>
    <Notice>Комнаты и голоса сохраняются в аккаунте. Открой приглашение на другом устройстве после входа.</Notice>
    {!user.email ? <Button onPress={onAuth}>Привязать почту</Button> : null}
    <Button variant="secondary" onPress={onLogout}>Выйти</Button>
  </Screen>;
}

function volgogradParts(date) { return Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Volgograd', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(({ type, value }) => [type, value])); }
function localDate(offsetDays = 0) { const parts = volgogradParts(new Date(Date.now() + offsetDays * 86400000)); return `${parts.year}-${parts.month}-${parts.day}`; }

export function CreateScreen({ user, onBack, onCreate, busy }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name || '');
  const [date, setDate] = useState(localDate(Number(volgogradParts(new Date()).hour) >= 19 ? 1 : 0));
  const [time, setTime] = useState('19:00');
  const [areaMode, setAreaMode] = useState('district');
  const [district, setDistrict] = useState('Центральный');
  const [pointAddress, setPointAddress] = useState('');
  const [radiusKm, setRadiusKm] = useState('4');
  const [selectedCategories, setCategories] = useState(['cafe', 'restaurant']);
  const [budgetMax, setBudget] = useState('2000');
  const [partySize, setPartySize] = useState('4');
  const [deadlineMinutes, setDeadline] = useState('30');
  const [exclusions, setExclusions] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [estimateError, setEstimateError] = useState('');
  const constraints = { city: 'Волгоград', timeZone: 'Europe/Volgograd', date, time, area: areaMode === 'district' ? { type: 'district', district } : { type: 'radius', pointAddress: pointAddress.trim(), radiusKm: Number(radiusKm) }, categories: selectedCategories, budgetMax: Number(budgetMax), partySize: Number(partySize), deadlineMinutes: Number(deadlineMinutes), exclusions: exclusions.trim() ? exclusions.split(',').map((item) => item.trim()).filter(Boolean) : [] };
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) && !Number.isNaN(Date.parse(`${date}T${time}:00+03:00`)) && Date.parse(`${date}T${time}:00+03:00`) > Date.now();
  const stepValid = step === 0 ? validDate : step === 1 ? areaMode === 'district' || pointAddress.trim().length >= 3 : step === 2 ? selectedCategories.length > 0 && Number(budgetMax) >= 300 : Number(partySize) >= 2 && Number(partySize) <= 12 && Number(deadlineMinutes) >= 5 && Number(deadlineMinutes) <= 120 && (user || name.trim().length >= 2);
  async function next() {
    if (step < 3) { setStep(step + 1); return; }
    setEstimateError('');
    try { const result = await api.estimate(constraints); setEstimate(result); }
    catch (error) { setEstimateError(error.message); }
  }
  return <Screen aside={<Card><Eyebrow>ПЛАН ВЕЧЕРА</Eyebrow><Text style={[common.h2, { marginTop: 16 }]}>Четыре коротких шага.</Text><Body muted style={{ marginTop: 12 }}>Сначала реши, когда и где встречаться. Остальное можно уточнить перед созданием.</Body></Card>}>
    <PageHead title={['Когда встречаемся?', 'Где ищем?', 'Что подойдёт?', 'Кого зовём?'][step]} caption={`НОВАЯ КОМНАТА · ${step + 1} ИЗ 4`} onBack={step ? () => { setEstimate(null); setStep(step - 1); } : onBack} />
    {step === 0 ? <><Field label="Дата" value={date} onChangeText={setDate} placeholder="ГГГГ-ММ-ДД" /><Field label="Время" value={time} onChangeText={setTime} placeholder="19:00" /><Notice>Выбери время в будущем. Часы работы заведений уточним по каталогу.</Notice></> : null}
    {step === 1 ? <><Text style={common.h3}>Область поиска</Text><Chips options={[{ value: 'district', label: 'Район' }, { value: 'radius', label: 'Точка + радиус' }]} value={[areaMode]} onChange={(v) => setAreaMode(v[0])} />
      {areaMode === 'district' ? <Chips options={districts} value={[district]} onChange={(v) => setDistrict(v[0])} /> : <><Field label="Адрес или ориентир" value={pointAddress} onChangeText={setPointAddress} placeholder="Например, площадь Павших Борцов" /><Field label="Радиус, км" value={radiusKm} onChangeText={setRadiusKm} keyboardType="numeric" placeholder="4" /></>}
      <Notice>Первый пилотный город — Волгоград.</Notice></> : null}
    {step === 2 ? <><Text style={common.h3}>Формат</Text><Chips options={categories} value={selectedCategories} onChange={setCategories} multiple /><Field label="Бюджет на человека, ₽" value={budgetMax} onChangeText={setBudget} keyboardType="numeric" placeholder="2000" />
      <Button variant="quiet" onPress={() => setExpanded(!expanded)}>{expanded ? 'Скрыть уточнения' : 'Уточнить выбор'}</Button>
      {expanded ? <Field label="Исключения через запятую" value={exclusions} onChangeText={setExclusions} placeholder="Например, караоке, кальян" hint="Для всей компании, необязательно" /> : null}</> : null}
    {step === 3 ? <>{!user ? <Field label="Как тебя зовут" value={name} onChangeText={setName} placeholder="Имя организатора" /> : null}<Field label="Сколько человек" value={partySize} onChangeText={(v) => { setPartySize(v); setEstimate(null); }} keyboardType="numeric" placeholder="4" /><Field label="Сколько минут голосуем" value={deadlineMinutes} onChangeText={(v) => { setDeadline(v); setEstimate(null); }} keyboardType="numeric" placeholder="30" />
      {estimate ? <Notice title={estimate.count < 12 ? 'Мест пока мало' : `Подходит около ${estimate.count} мест`} tone={estimate.count < 12 ? 'warning' : 'success'}>{estimate.count < 12 ? 'Расширь район, бюджет или категории. Комнату с пустой колодой не создаём.' : 'Это предварительное число. Общий набор закрепим при старте голосования.'}</Notice> : null}
      {estimateError ? <Notice title="Не получилось проверить каталог" tone="warning">{estimateError}</Notice> : null}
      </> : null}
    {step === 3 && estimate?.count >= 12 ? <Button loading={busy} onPress={() => onCreate(constraints, name.trim())}>Создать комнату</Button> : <Button disabled={!stepValid} onPress={next}>{step === 3 ? 'Проверить заведения' : 'Продолжить'}</Button>}
    {step === 3 && estimate?.count < 12 ? <Button variant="secondary" onPress={() => { setEstimate(null); setStep(1); }}>Изменить область поиска</Button> : null}
  </Screen>;
}

export function JoinCodeScreen({ onBack, onLookup, busy }) {
  const [code, setCode] = useState('');
  return <Screen><PageHead title="Введите код комнаты." caption="01 / ПРИСОЕДИНИТЬСЯ" onBack={onBack} />
    <Body muted style={{ marginBottom: 30 }}>Попроси четырёхзначный код у создателя комнаты.</Body>
    <Field label="Код комнаты" value={code} onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} placeholder="0000" style={styles.codeInput} />
    <Notice title="Что будет дальше">Покажем условия встречи и участников. Ты подтвердишь вход в комнату.</Notice>
    <Button disabled={code.length !== 4} loading={busy} onPress={() => onLookup(code)}>Найти комнату</Button>
  </Screen>;
}

export function PreviewScreen({ preview, user, onBack, onJoin, busy }) {
  const [name, setName] = useState(user?.name || '');
  const room = preview.room;
  const blocked = ['cancelled', 'expired', 'full', 'invalid', 'removed'].includes(preview.access);
  return <Screen><PageHead title={preview.access === 'selected' ? 'Место уже выбрали.' : blocked ? 'Сейчас войти не получится.' : `${room.hostName} зовёт на вечер.`} caption="ПРИГЛАШЕНИЕ" onBack={onBack} />
    <Card><Eyebrow>ПЛАН ВЕЧЕРА</Eyebrow><Text style={[common.h2, { marginTop: 14 }]}>{meeting(room.constraints)}</Text><Body muted style={{ marginTop: 8 }}>{room.constraints.city} · {room.constraints.area.type === 'district' ? room.constraints.area.district : room.constraints.area.pointAddress}</Body><Separator />
      <Body>{room.members.length} из {room.constraints.partySize} уже в комнате</Body><Body muted>{money(room.constraints.budgetMax)} · {room.constraints.categories.map((c) => categories.find((x) => x.value === c)?.label || c).join(', ')}</Body></Card>
    {preview.access === 'selected' ? <><Card style={{ marginTop: 18 }}><Eyebrow>ИТОГ ВЕЧЕРА</Eyebrow><Text style={[common.h2, { marginTop: 10 }]}>{room.winner?.name || 'Место уточняется'}</Text><Body muted>{room.winner?.address}</Body><Separator /><Body>{room.bookingNote === 'booked_by_host' ? 'Организатор отметил бронь столика.' : room.bookingNote === 'walk_in' ? 'Компания идёт без брони.' : 'Бронь пока не отмечена.'}</Body></Card>{room.winner?.mapUrl ? <Button variant="secondary" onPress={() => Linking.openURL(room.winner.mapUrl)}>Построить маршрут</Button> : null}</> : blocked ? <><Notice title="Приглашение недоступно" tone="warning">{preview.reason || 'Комната закрыта или ссылка больше не действует.'}</Notice><Button variant="secondary" onPress={onBack}>Создать свой выбор</Button></> : <>
      {!user ? <Field label="Как тебя зовут" value={name} onChangeText={setName} placeholder="Имя для компании" style={{ marginTop: 18 }} /> : null}
      <Button disabled={!user && name.trim().length < 2} loading={busy} onPress={() => onJoin(name.trim())}>Присоединиться</Button>
      <Text style={[common.small, { marginTop: 16 }]}>Для входа достаточно имени. Приложение устанавливать не нужно.</Text>
    </>}
  </Screen>;
}

function MemberList({ members, hostId }) { return <View>{members.map((member) => <View style={styles.member} key={member.id}><View style={styles.avatar}><Text style={styles.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={common.body}>{member.name} {member.id === hostId ? '· зовёт' : ''}</Text><Text style={common.small}>{member.finished ? 'Закончил выбор' : member.status === 'swiping' ? 'Выбирает места' : 'В комнате'}</Text></View></View>)}</View>; }

function CloseRoomControl({ onCancel }) {
  const [confirm, setConfirm] = useState(false);
  return <View style={{ marginTop: 24 }}>{confirm ? <><Notice tone="warning">Комната закроется для всех участников.</Notice><Button variant="danger" onPress={onCancel}>Да, закрыть комнату</Button><Button variant="quiet" onPress={() => setConfirm(false)}>Оставить комнату</Button></> : <Button variant="quiet" onPress={() => setConfirm(true)}>Закрыть комнату</Button>}</View>;
}

export function LobbyScreen({ room, user, onBack, onStart, onShare, onRotate, onCancel, busy }) {
  const host = isHost(room, user);
  const [confirmCancel, setConfirmCancel] = useState(false);
  return <Screen aside={<Card><Eyebrow>КОМНАТА #{room.code}</Eyebrow><Text style={[common.h2, { marginTop: 14 }]}>Всем достанется одна колода.</Text><Body muted style={{ marginTop: 12 }}>Голоса других скрыты до окончания раунда. Итог будет одинаков на каждом устройстве.</Body></Card>}>
    <PageHead title="Ждём компанию." caption="КОМНАТА ОЖИДАНИЯ" onBack={onBack} room={room} />
    <Card><Eyebrow>КОГДА И ГДЕ</Eyebrow><Text style={[common.h2, { marginTop: 12 }]}>{meeting(room.constraints)}</Text><Body muted>{room.constraints.city} · {room.constraints.area.type === 'district' ? room.constraints.area.district : room.constraints.area.pointAddress}</Body><Separator /><Body>{money(room.constraints.budgetMax)} · {room.constraints.partySize} человек</Body></Card>
    <Text style={[common.h3, { marginTop: 28, marginBottom: 8 }]}>Участники · {room.members.length}/{room.constraints.partySize}</Text><MemberList members={room.members} hostId={room.hostId} />
    {host ? <Button variant="secondary" onPress={onShare}>Позвать друзей</Button> : null}
    <Text style={[common.small, styles.center, { marginTop: 10 }]}>Код комнаты: {room.code}</Text>
    {host ? <><Button disabled={room.members.length < 2} loading={busy} onPress={onStart}>Начать выбор</Button>{room.members.length < 2 ? <Text style={[common.small, styles.center]}>Нужно минимум два участника.</Text> : null}</> : <Notice>Когда организатор начнёт выбор, здесь появятся карточки заведений.</Notice>}
    {host ? <><Separator /><Button variant="quiet" onPress={onRotate}>Заменить ссылку приглашения</Button><Text style={common.small}>После замены старая ссылка перестанет работать.</Text>
      {confirmCancel ? <><Notice tone="warning">Комната закроется для всех участников. Отменить это действие в приложении нельзя.</Notice><Button variant="danger" loading={busy} onPress={onCancel}>Да, закрыть комнату</Button><Button variant="quiet" onPress={() => setConfirmCancel(false)}>Оставить комнату</Button></> : <Button variant="quiet" onPress={() => setConfirmCancel(true)}>Закрыть комнату</Button>}</> : null}
  </Screen>;
}

function VenueFace({ venue, onDetail, compact = false }) { return <Card style={styles.venueCard}>
  <View style={[styles.venueArt, compact && { height: 150 }]}><Text style={styles.venueMonogram}>{venue.name.slice(0, 1)}</Text><Text style={styles.photoLabel}>ФОТО УТОЧНЯЕТСЯ</Text></View>
  <View style={{ paddingTop: 14 }}><Eyebrow>{categories.find((c) => c.value === venue.category)?.label || venue.category} · {venue.district}</Eyebrow><Text style={[common.h2, { marginTop: 8 }]}>{venue.name}</Text>
    <Body muted style={{ marginTop: 6 }}>{venue.cuisine || 'Кухня уточняется'} · {venue.priceHint || 'Чек уточняется'}</Body>
    <View style={styles.tagRow}>{(venue.tags || []).slice(0, 2).map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
    <Button variant="quiet" onPress={onDetail}>Адрес и детали →</Button>
  </View></Card>; }

export function DeckScreen({ room, user, onBack, onVote, onFinish, onFinishEarly, onDetail, onCancel, pending }) {
  const votes = room.ownVotes || {};
  const current = room.candidates.find((venue) => !votes[venue.id]);
  const done = Object.keys(votes).length;
  if (!current) return <WaitingScreen room={room} user={user} onBack={onBack} onFinish={onFinish} onCancel={onCancel} />;
  return <Screen aside={<Card><Eyebrow>КАК ВЫБИРАТЬ</Eyebrow><Text style={[common.h2, { marginTop: 14 }]}>Только твой ответ.</Text><Body muted style={{ marginTop: 12 }}>Кнопки «Подходит» и «Не подходит» работают на телефоне и компьютере. Другие голоса станут видны в сумме после раунда.</Body></Card>}>
    <PageHead title="Куда пойдём?" caption={`${done + 1} / ${room.candidates.length} МЕСТ`} onBack={onBack} room={room} />
    <View style={styles.progressOuter}><View style={[styles.progressInner, { width: `${Math.round(done / room.candidates.length * 100)}%` }]} /></View>
    <Text style={[common.small, { marginBottom: 16 }]}>{done} из {room.candidates.length} оценено · {room.members.filter((m) => m.finished).length} из {room.members.length} закончили</Text>
    <VenueFace venue={current} onDetail={() => onDetail(current)} compact />
    <View style={styles.voteActions}><Button variant="secondary" style={{ flex: 1 }} disabled={pending} onPress={() => onVote(current.id, 'dislike')}>Не подходит</Button><Button style={{ flex: 1 }} loading={pending} onPress={() => onVote(current.id, 'like')}>Подходит</Button></View>
    <Text style={[common.small, styles.center, { marginTop: 12 }]}>Голоса друзей пока скрыты.</Text>
    {done >= 10 ? <Button variant="quiet" disabled={pending} onPress={onFinishEarly}>Закончить выбор сейчас</Button> : null}
    {isHost(room, user) ? <CloseRoomControl onCancel={onCancel} /> : null}
  </Screen>;
}

export function WaitingScreen({ room, user, onBack, onFinish, onCancel }) {
  const finished = room.members.filter((m) => m.finished).length;
  return <Screen><PageHead title="Твой выбор готов." caption="ЖДЁМ ОСТАЛЬНЫХ" onBack={onBack} room={room} />
    <Card><Text style={common.h2}>{finished} из {room.members.length} закончили</Text><Body muted style={{ marginTop: 12 }}>Когда все ответят или истечёт время, покажем общее. Личные голоса других участников скрыты.</Body></Card>
    <Text style={[common.h3, { marginTop: 28 }]}>Компания</Text><MemberList members={room.members} hostId={room.hostId} />
    {isHost(room, user) && Date.now() >= Date.parse(room.deadlineAt) ? <Button variant="secondary" onPress={onFinish}>Подвести итог</Button> : <Notice>Экран обновится сам, когда все закончат или истечёт время голосования.</Notice>}
    {isHost(room, user) ? <CloseRoomControl onCancel={onCancel} /> : null}
  </Screen>;
}

export function MatchesScreen({ room, user, onChoose, onBack, pending, onExtend, onCancel }) {
  const host = isHost(room, user);
  const matches = room.matches || [];
  const title = room.matchMode === 'unanimous' ? 'Вот что совпало.' : room.matchMode === 'majority' ? 'Нашлось большинство.' : 'Выберем из лучших.';
  const explanation = room.matchMode === 'unanimous' ? 'Эти места подходят всем, кто закончил выбор.' : room.matchMode === 'majority' ? 'Единогласия нет. Показываем поддержку большинства честно, в числах.' : 'Общего варианта нет. Организатор выберет из мест с наибольшей поддержкой.';
  return <Screen><PageHead title={title} caption="ОБЩИЙ ВЫБОР" onBack={onBack} room={room} />
    <Notice title={room.incomplete ? 'Не все успели ответить' : undefined} tone={room.matchMode === 'unanimous' ? 'success' : 'warning'}>{room.incomplete ? 'Итог считаем по тем, кто закончил выбор. ' : ''}{explanation}</Notice>
    {matches.length ? matches.map((match, index) => <Card key={match.venue.id} style={{ marginTop: 12 }}><Eyebrow>ВАРИАНТ {index + 1}</Eyebrow><Text style={[common.h2, { marginTop: 10 }]}>{match.venue.name}</Text><Body muted>{match.venue.category} · {match.venue.district}</Body><Text style={[common.body, { color: colors.success, marginTop: 12 }]}>{match.likes} из {match.total} выбрали</Text>{host ? <Button loading={pending} onPress={() => onChoose(match.venue.id)}>Выбрать это место</Button> : null}</Card>) : <Notice title="Пока нет подходящего варианта" tone="warning">Можно расширить поиск и добавить новые места в общую колоду.</Notice>}
    {!matches.length && host ? <Button onPress={onExtend}>Добавить кандидатов</Button> : null}
    {!host ? <Text style={[common.small, { marginTop: 20 }]}>Организатор подтвердит одно место. Итог сразу появится у всех.</Text> : null}
    {host ? <CloseRoomControl onCancel={onCancel} /> : null}
  </Screen>;
}

export function ResultScreen({ room, user, onBack, onNote, onDetail, onAction, pending }) {
  const venue = room.winner;
  if (!venue) return <Screen><PageHead title="Итог уточняется." room={room} onBack={onBack} /><Notice>Подожди обновления комнаты.</Notice></Screen>;
  return <Screen aside={<Card><Eyebrow>ГОТОВО</Eyebrow><Text style={[common.h2, { marginTop: 14 }]}>План на вечер есть.</Text><Body muted style={{ marginTop: 12 }}>Адрес и время доступны по той же ссылке всем участникам.</Body></Card>}>
    <PageHead title="Место выбрано." caption="ИТОГ ВЕЧЕРА" onBack={onBack} room={room} />
    <VenueFace venue={venue} onDetail={() => onDetail(venue)} />
    <Card style={{ marginTop: 14 }}><Eyebrow>ВСТРЕЧА</Eyebrow><Text style={[common.h2, { marginTop: 10 }]}>{meeting(room.constraints)}</Text><Body muted style={{ marginTop: 8 }}>{venue.address}</Body><Separator /><Body>{room.members.map((m) => m.name).join(', ')}</Body></Card>
    {venue.phone ? <Button onPress={() => onAction('phone', `tel:${venue.phone}`)}>Позвонить</Button> : null}
    {venue.website ? <Button variant="secondary" onPress={() => onAction('website', venue.website)}>Открыть сайт</Button> : null}
    <Button variant="secondary" onPress={() => onAction('map', venue.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(venue.address)}`)}>Построить маршрут</Button>
    {isHost(room, user) ? <><Text style={[common.h3, { marginTop: 26 }]}>Что с бронью?</Text><Body muted>Отметь результат звонка или договорённости. Мы не подтверждаем бронь за заведение.</Body><Button variant="secondary" loading={pending} onPress={() => onNote('booked_by_host')}>Столик забронирован мной</Button><Button variant="quiet" loading={pending} onPress={() => onNote('walk_in')}>Идём без брони</Button></> : null}
    {room.bookingNote ? <Notice tone="success">{room.bookingNote === 'booked_by_host' ? 'Организатор отметил, что столик забронирован.' : 'Компания идёт без брони.'}</Notice> : null}
  </Screen>;
}

export function DetailsScreen({ venue, onBack, onReport, pending }) {
  return <Screen><PageHead title={venue.name} caption="О ЗАВЕДЕНИИ" onBack={onBack} />
    <View style={styles.venueArt}><Text style={styles.venueMonogram}>{venue.name.slice(0, 1)}</Text><Text style={styles.photoLabel}>ФОТО УТОЧНЯЕТСЯ</Text></View>
    <Text style={[common.h3, { marginTop: 24 }]}>{categories.find((c) => c.value === venue.category)?.label || venue.category} · {venue.cuisine || 'кухня уточняется'}</Text>
    <Body muted style={{ marginTop: 10 }}>{venue.priceHint || 'Чек уточняется'} · {venue.district}</Body>
    <Separator /><Eyebrow>АДРЕС</Eyebrow><Body>{venue.address}</Body>
    <Separator /><Eyebrow>ЧАСЫ В ДЕНЬ ВСТРЕЧИ</Eyebrow><Body>{venue.hoursLabel || 'Часы работы уточняются'}</Body>
    {venue.phone ? <Button variant="secondary" onPress={() => Linking.openURL(`tel:${venue.phone}`)}>Позвонить</Button> : null}
    {venue.website ? <Button variant="secondary" onPress={() => Linking.openURL(venue.website)}>Открыть сайт</Button> : null}
    <Separator /><Text style={common.h3}>Есть ошибка?</Text><Button variant="quiet" loading={pending} onPress={() => onReport(venue.id, 'closed')}>Заведение закрыто</Button><Button variant="quiet" loading={pending} onPress={() => onReport(venue.id, 'incorrect_data')}>Неверные данные</Button>
  </Screen>;
}

export function UnavailableScreen({ reason, onHome }) { return <Screen><Brand /><Eyebrow>КОМНАТА НЕДОСТУПНА</Eyebrow><Text style={[common.h1, { marginTop: 18 }]}>Похоже, эта ссылка больше не работает.</Text><Body muted style={{ marginTop: 16 }}>{reason}</Body><Button style={{ marginTop: 28 }} onPress={onHome}>Собрать свою компанию</Button></Screen>; }

const styles = StyleSheet.create({
  title: { marginTop: 12, marginBottom: 18 },
  caption: { marginTop: 20 },
  center: { textAlign: 'center' },
  headerLink: { color: colors.accent, fontFamily: fonts.bold, fontSize: 13 },
  roomCode: { color: colors.secondary, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1 },
  back: { alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: 0, marginTop: 0 },
  hero: { width: '100%', height: 264, justifyContent: 'flex-start', padding: 14, marginBottom: 28 },
  heroImage: { borderRadius: 18 },
  heroLabel: { alignSelf: 'flex-start', backgroundColor: colors.bg, color: colors.text, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 7, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border },
  stepNumber: { color: colors.accent, fontFamily: fonts.bold, fontSize: 13 },
  stepText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8 },
  listItem: { marginTop: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between' },
  arrow: { color: colors.accent, fontSize: 21 },
  codeInput: { fontSize: 34, letterSpacing: 16, textAlign: 'center', height: 88 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomColor: colors.border, borderBottomWidth: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.accent, fontFamily: fonts.bold, fontSize: 18 },
  venueCard: { padding: 12 },
  venueArt: { height: 220, borderRadius: 14, backgroundColor: '#5B4935', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  venueMonogram: { color: '#E9CC9D', fontFamily: fonts.bold, fontSize: 100, opacity: 0.75 },
  photoLabel: { position: 'absolute', bottom: 14, left: 16, color: '#F4F0E6', fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tag: { color: colors.text, fontFamily: fonts.medium, fontSize: 12, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.raised, borderRadius: 18 },
  progressOuter: { height: 5, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden', marginBottom: 10 },
  progressInner: { height: 5, backgroundColor: colors.accent },
  voteActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
