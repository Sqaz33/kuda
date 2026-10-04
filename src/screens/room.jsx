import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Eyebrow, Notice, Screen, Separator } from '../ui';
import { colors, common, fonts } from '../theme';
import { inviteLink } from '../links';
import {
  areaSummary,
  AvatarStack,
  BackLink,
  categoryLabel,
  Header,
  isHost,
  MapPreview,
  meeting,
  money,
  PageIntro,
  TwoButtons,
  VenueImage,
} from './shared';

function VenueMeta({ venue }) {
  return (
    <Text style={styles.venueMeta}>
      {categoryLabel(venue.category).toUpperCase()} · {venue.district.toUpperCase()} ·{' '}
      {venue.priceHint || 'ЧЕК УТОЧНЯЕТСЯ'}
    </Text>
  );
}

function EndRoom({ onCancel }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <View style={styles.endRoom}>
      <Notice title="ЗАКРЫТЬ КОМНАТУ?" tone="warning">
        Доступ к этой встрече закроется для всех участников.
      </Notice>
      <Button variant="danger" onPress={onCancel}>
        Да, закрыть
      </Button>
      <Button variant="quiet" onPress={() => setConfirm(false)}>
        Оставить комнату
      </Button>
    </View>
  ) : (
    <Button variant="quiet" onPress={() => setConfirm(true)} style={styles.endRoom}>
      Закрыть комнату
    </Button>
  );
}

function MemberRows({ members, hostId }) {
  return members.map((member) => (
    <View style={styles.memberRow} key={member.id}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>{member.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={common.small}>
          {member.id === hostId
            ? 'Создатель комнаты'
            : member.finished
              ? 'Закончил выбор'
              : 'В комнате'}
        </Text>
      </View>
      <Text style={styles.memberStatus}>{member.finished ? 'ГОТОВ' : '●'}</Text>
    </View>
  ));
}

export function LobbyScreen({ room, user, onBack, onStart, onShare, onRotate, onCancel, busy }) {
  const host = isHost(room, user);
  return (
    <Screen
      footer={
        host ? (
          <>
            <TwoButtons
              left={
                <Button variant="secondary" onPress={onShare} style={styles.flexButton}>
                  Поделиться
                </Button>
              }
              right={
                <Button
                  onPress={onStart}
                  loading={busy}
                  disabled={room.members.length < 2}
                  style={styles.flexButton}
                >
                  Начать выбор
                </Button>
              }
            />
            {room.members.length < 2 ? (
              <Text style={styles.footerHint}>ДЛЯ СТАРТА НУЖНО МИНИМУМ 2 ЧЕЛОВЕКА</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.footerHint}>КОГДА СОЗДАТЕЛЬ НАЧНЁТ, КАРТОЧКИ ПОЯВЯТСЯ ЗДЕСЬ</Text>
        )
      }
    >
      <Header room={room} />
      <PageIntro
        label={host ? '02 / КОМНАТА СОЗДАНА' : '02 / ВЫ В КОМНАТЕ'}
        title={host ? 'Позовите своих.' : 'Ждём создателя.'}
        description={
          host
            ? 'Отправьте ссылку друзьям. Выбор начнётся, когда компания соберётся.'
            : 'Вы присоединились. Когда создатель начнёт выбор, здесь появятся карточки мест.'
        }
      />
      <Card style={styles.codeCard}>
        <Eyebrow>КОД КОМНАТЫ</Eyebrow>
        <Text style={styles.code}>{room.code}</Text>
        <Text style={styles.codeCaption}>
          {host ? 'Друзья могут ввести этот код на главной' : 'Сохраните код для повторного входа'}
        </Text>
      </Card>
      <View style={styles.sectionHead}>
        <Eyebrow>В КОМНАТЕ</Eyebrow>
        <AvatarStack members={room.members} />
      </View>
      <MemberRows members={room.members} hostId={room.hostId} />
      <Card style={styles.summaryCard}>
        <Eyebrow>ПЛАН НА ВЕЧЕР</Eyebrow>
        <Text style={[common.heading, { marginTop: 15 }]}>{meeting(room.constraints)}</Text>
        <Body muted style={{ marginTop: 7 }}>
          {areaSummary(room.constraints)}
        </Body>
        <Separator />
        <Eyebrow>
          {money(room.constraints.budgetMax)} · {room.constraints.partySize} ЧЕЛОВЕКА
        </Eyebrow>
      </Card>
      {host ? (
        <>
          <Text selectable style={styles.inviteLink}>
            {inviteLink(room.inviteToken)}
          </Text>
          <Button variant="quiet" onPress={onRotate}>
            Заменить ссылку приглашения
          </Button>
          <EndRoom onCancel={onCancel} />
        </>
      ) : (
        <Notice>Ожидаем остальных участников. Экран обновится сам.</Notice>
      )}
      <BackLink onPress={onBack} />
    </Screen>
  );
}

export function DeckScreen({
  room,
  user,
  onBack,
  onVote,
  onFinish,
  onFinishEarly,
  onDetail,
  onCancel,
  pending,
}) {
  const votes = room.ownVotes || {};
  const current = room.candidates.find((candidate) => !votes[candidate.id]);
  const done = Object.keys(votes).length;
  if (!current)
    return (
      <WaitingScreen
        room={room}
        user={user}
        onBack={onBack}
        onFinish={onFinish}
        onCancel={onCancel}
      />
    );
  return (
    <Screen
      footer={
        <>
          <TwoButtons
            left={
              <Button
                variant="secondary"
                disabled={pending}
                onPress={() => onVote(current.id, 'dislike')}
                style={styles.flexButton}
              >
                Пропустить
              </Button>
            }
            right={
              <Button
                loading={pending}
                onPress={() => onVote(current.id, 'like')}
                style={styles.flexButton}
              >
                Подходит
              </Button>
            }
          />
          <Text style={styles.footerHint}>ВАШ ВЫБОР НЕ ВИДЕН ДРУГИМ ДО ИТОГА</Text>
        </>
      }
    >
      <Header room={room} center={`ВЫБОР · ${done + 1} / ${room.candidates.length}`} />
      <View style={styles.deckTop}>
        <Eyebrow>03 / ВЫБИРАЕМ МЕСТО</Eyebrow>
        <Text style={styles.deckCount}>
          {String(done + 1).padStart(2, '0')}
          <Text style={styles.deckTotal}> / {room.candidates.length}</Text>
        </Text>
      </View>
      <View style={styles.progress}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round((done / room.candidates.length) * 100)}%` },
          ]}
        />
      </View>
      <VenueImage venue={current} height={310} badge="МЕСТО ДЛЯ ВАШЕГО ВЕЧЕРА" />
      <VenueMeta venue={current} />
      <Text style={[common.title, styles.venueTitle]}>{current.name}</Text>
      <Body muted>
        {current.cuisine || 'Кухня уточняется'} · {current.tags?.join(' · ') || 'Для компании'}
      </Body>
      <Pressable
        onPress={() => onDetail(current)}
        accessibilityRole="button"
        style={styles.detailLink}
      >
        <Text style={styles.detailLinkText}>АДРЕС И ПОДРОБНОСТИ ↗</Text>
      </Pressable>
      <MapPreview onPress={() => onDetail(current)} />
      {done >= 10 ? (
        <Button
          variant="quiet"
          disabled={pending}
          onPress={onFinishEarly}
          style={styles.extraAction}
        >
          Закончить выбор сейчас
        </Button>
      ) : null}
      {isHost(room, user) ? <EndRoom onCancel={onCancel} /> : null}
      <BackLink onPress={onBack} />
    </Screen>
  );
}

export function WaitingScreen({ room, user, onBack, onFinish, onCancel, onRefresh }) {
  const finished = room.members.filter((member) => member.finished).length;
  const canFinish = isHost(room, user) && Date.now() >= Date.parse(room.deadlineAt);
  return (
    <Screen
      footer={
        <Button onPress={canFinish ? onFinish : onRefresh} disabled={!canFinish && !onRefresh}>
          {canFinish ? 'Подвести итог' : 'Проверить статус'}
        </Button>
      }
    >
      <Header room={room} />
      <PageIntro
        label="04 / ЖДЁМ КОМПАНИЮ"
        title="Ваш выбор готов."
        description="Когда все закончат, покажем места, которые подошли компании."
      />
      <Card style={styles.waitingCard}>
        <Eyebrow>УЧАСТНИКИ</Eyebrow>
        <Text style={styles.bigCount}>
          {finished}
          <Text style={styles.countSuffix}> / {room.members.length}</Text>
        </Text>
        <Body muted>закончили выбор мест</Body>
      </Card>
      <View style={styles.sectionHead}>
        <Eyebrow>КОМПАНИЯ</Eyebrow>
        <AvatarStack members={room.members} />
      </View>
      <MemberRows members={room.members} hostId={room.hostId} />
      <Notice title="ГОЛОСА ПОКА СКРЫТЫ">
        Итог появится после голосования или когда закончится время.
      </Notice>
      {isHost(room, user) ? <EndRoom onCancel={onCancel} /> : null}
      <BackLink onPress={onBack} />
    </Screen>
  );
}

export function MatchesScreen({ room, user, onChoose, onBack, pending, onExtend, onCancel }) {
  const matches = room.matches || [];
  const [selected, setSelected] = useState(matches[0]?.venue.id);
  const host = isHost(room, user);
  const unanimous = room.matchMode === 'unanimous';
  return (
    <Screen
      footer={
        host && matches.length ? (
          <Button loading={pending} disabled={!selected} onPress={() => onChoose(selected)}>
            Выбрать место
          </Button>
        ) : null
      }
    >
      <Header room={room} />
      <PageIntro
        label="03 / РЕЗУЛЬТАТЫ ГОЛОСОВАНИЯ"
        title={
          unanimous
            ? 'Есть совпадение.'
            : matches.length
              ? 'Нашлось большинство.'
              : 'Пока без совпадений.'
        }
        description={
          unanimous
            ? 'Одно место понравилось всем. Создатель подтвердит его для компании.'
            : matches.length
              ? 'Показываем поддержку компании в числах. Организатор подтвердит одно место.'
              : 'Попробуйте добавить места в общую колоду.'
        }
      />
      {room.incomplete ? (
        <Notice title="НЕ ВСЕ УСПЕЛИ" tone="warning">
          Итог посчитан по ответившим участникам.
        </Notice>
      ) : null}
      <View style={styles.matchesList}>
        {matches.map((match, index) => (
          <Pressable
            key={match.venue.id}
            onPress={() => host && setSelected(match.venue.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === match.venue.id }}
            style={[styles.matchCard, selected === match.venue.id && host && styles.matchSelected]}
          >
            <View style={styles.matchPhoto}>
              <VenueImage venue={match.venue} height={144} />
              {!unanimous ? (
                <Text style={styles.matchNumber}>{String(index + 1).padStart(2, '0')}</Text>
              ) : null}
            </View>
            <View style={styles.matchDetails}>
              <VenueMeta venue={match.venue} />
              <Text style={styles.matchName}>{match.venue.name}</Text>
              <Text style={styles.matchVotes}>
                {match.likes} из {match.total} выбрали
              </Text>
            </View>
            <Text style={styles.matchArrow}>
              {host ? (selected === match.venue.id ? '●' : '○') : '↗'}
            </Text>
          </Pressable>
        ))}
      </View>
      {!matches.length && host ? (
        <Button onPress={onExtend} style={styles.extraAction}>
          Добавить кандидатов
        </Button>
      ) : null}
      {!host && matches.length ? (
        <Notice>Организатор выберет одно место. Результат появится здесь у всех.</Notice>
      ) : null}
      {host ? <EndRoom onCancel={onCancel} /> : null}
      <BackLink onPress={onBack} />
    </Screen>
  );
}

export function ResultScreen({ room, user, onBack, onNote, onDetail, onAction, pending }) {
  const venue = room.winner;
  if (!venue) return <UnavailableScreen reason="Итог встречи ещё загружается." onHome={onBack} />;
  const mapUrl = venue.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(venue.address)}`;
  return (
    <Screen
      footer={
        <TwoButtons
          left={
            <Button
              variant={venue.phone ? 'primary' : 'secondary'}
              disabled={!venue.phone}
              onPress={() => onAction('phone', `tel:${venue.phone}`)}
              style={styles.flexButton}
            >
              Позвонить
            </Button>
          }
          right={
            <Button
              variant={venue.phone ? 'secondary' : 'primary'}
              onPress={() => onAction('map', mapUrl)}
              style={styles.flexButton}
            >
              Маршрут ↗
            </Button>
          }
        />
      }
    >
      <Header room={room} />
      <PageIntro
        label="04 / ВЕЧЕР РЕШЁН"
        title={venue.name}
        description={`${meeting(room.constraints)} · ${room.members.length} участников`}
      />
      <View style={styles.resultVenue}>
        <VenueImage venue={venue} height={280} badge="ВАШ ВЫБОР" />
        <Card style={styles.resultInfo}>
          <Text style={styles.address}>{venue.address.toUpperCase()}</Text>
          <Eyebrow style={{ marginTop: 12 }}>{areaSummary(room.constraints).toUpperCase()}</Eyebrow>
          <Separator />
          <Text
            style={[
              styles.bookingStatus,
              { color: room.bookingNote === 'booked_by_host' ? colors.green : colors.red },
            ]}
          >
            {room.bookingNote === 'booked_by_host'
              ? 'СТОЛИК ЗАБРОНИРОВАН ОРГАНИЗАТОРОМ'
              : room.bookingNote === 'walk_in'
                ? 'ИДЁМ БЕЗ БРОНИ'
                : 'СТОЛИК ПОКА НЕ ЗАБРОНИРОВАН'}
          </Text>
          <Eyebrow style={{ marginTop: 15 }}>ПОЗВОНИТЕ В ЗАВЕДЕНИЕ ПЕРЕД ПОЕЗДКОЙ</Eyebrow>
        </Card>
        <Pressable onPress={() => onDetail(venue)} style={styles.detailLink}>
          <Text style={styles.detailLinkText}>ПОДРОБНОСТИ О МЕСТЕ ↗</Text>
        </Pressable>
      </View>
      <MapPreview onPress={() => onAction('map', mapUrl)} />
      {isHost(room, user) ? (
        <View style={styles.booking}>
          <Eyebrow>ЧТО С БРОНЬЮ?</Eyebrow>
          <Body muted style={{ marginVertical: 15 }}>
            Отметьте результат после звонка. Приложение не бронирует столик.
          </Body>
          <Button variant="secondary" loading={pending} onPress={() => onNote('booked_by_host')}>
            Я забронировал столик
          </Button>
          <Button variant="quiet" loading={pending} onPress={() => onNote('walk_in')}>
            Идём без брони
          </Button>
        </View>
      ) : null}
      <BackLink onPress={onBack} />
    </Screen>
  );
}

export function DetailsScreen({ venue, onBack, onReport, pending }) {
  return (
    <Screen
      footer={
        <Button variant="secondary" onPress={onBack}>
          Вернуться к выбору
        </Button>
      }
    >
      <Header center="О МЕСТЕ" />
      <BackLink onPress={onBack} children="НАЗАД" />
      <VenueImage venue={venue} height={310} />
      <VenueMeta venue={venue} />
      <Text style={[common.title, styles.venueTitle]}>{venue.name}</Text>
      <Body muted>{venue.cuisine || 'Кухня уточняется'}</Body>
      <Separator />
      <Eyebrow>АДРЕС</Eyebrow>
      <Body style={styles.detailBody}>{venue.address}</Body>
      <Eyebrow>ЧАСЫ РАБОТЫ</Eyebrow>
      <Body style={styles.detailBody}>{venue.hoursLabel || 'Уточняются'}</Body>
      {venue.phone ? (
        <Button variant="secondary" onPress={() => Linking.openURL(`tel:${venue.phone}`)}>
          Позвонить
        </Button>
      ) : null}
      {venue.website ? (
        <Button
          variant="secondary"
          onPress={() => Linking.openURL(venue.website)}
          style={styles.extraAction}
        >
          Открыть сайт
        </Button>
      ) : null}
      <Separator />
      <Eyebrow>НАШЛИ ОШИБКУ?</Eyebrow>
      <Button variant="quiet" loading={pending} onPress={() => onReport(venue.id, 'closed')}>
        Заведение закрыто
      </Button>
      <Button
        variant="quiet"
        loading={pending}
        onPress={() => onReport(venue.id, 'incorrect_data')}
      >
        Неверные данные
      </Button>
    </Screen>
  );
}

export function UnavailableScreen({ reason, onHome }) {
  return (
    <Screen footer={<Button onPress={onHome}>На главную</Button>}>
      <Header center="КОМНАТА НЕДОСТУПНА" />
      <PageIntro
        label="ССЫЛКА НЕ РАБОТАЕТ"
        title="Встреча недоступна."
        description={reason}
        style={styles.unavailable}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flexButton: { flex: 1 },
  footerHint: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 14,
  },
  codeCard: { marginTop: 42, alignItems: 'center', paddingVertical: 31 },
  code: {
    color: colors.text,
    fontFamily: fonts.monoBold,
    fontSize: 56,
    letterSpacing: 12,
    marginTop: 13,
  },
  codeCaption: { ...common.small, marginTop: 8 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 38,
    marginBottom: 18,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  memberInitial: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  memberName: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  memberStatus: { color: colors.green, fontFamily: fonts.mono, fontSize: 10 },
  summaryCard: { marginTop: 26 },
  inviteLink: { ...common.small, marginTop: 24 },
  endRoom: { marginTop: 30 },
  deckTop: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deckCount: { color: colors.text, fontFamily: fonts.number, fontSize: 25 },
  deckTotal: { color: colors.muted, fontSize: 14 },
  progress: { height: 3, backgroundColor: colors.border, marginTop: 15, marginBottom: 20 },
  progressFill: { height: 3, backgroundColor: colors.red },
  venueMeta: {
    color: colors.secondary,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.6,
    marginTop: 22,
    textTransform: 'uppercase',
  },
  venueTitle: { marginTop: 9, marginBottom: 12 },
  detailLink: { alignSelf: 'flex-start', marginTop: 18, paddingVertical: 7 },
  detailLinkText: {
    color: colors.text,
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  extraAction: { marginTop: 22 },
  waitingCard: { marginTop: 45, paddingVertical: 27 },
  bigCount: { color: colors.text, fontFamily: fonts.number, fontSize: 72, marginTop: 14 },
  countSuffix: { color: colors.muted, fontSize: 29 },
  matchesList: { marginTop: 35, gap: 10 },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 5,
    overflow: 'hidden',
    gap: 16,
  },
  matchSelected: { borderColor: colors.red },
  matchPhoto: { width: 144, height: 144 },
  matchNumber: {
    position: 'absolute',
    top: 7,
    left: 7,
    color: colors.text,
    fontFamily: fonts.number,
    fontSize: 20,
  },
  matchDetails: { flex: 1 },
  matchName: { color: colors.text, fontFamily: fonts.bold, fontSize: 21, marginTop: 9 },
  matchVotes: { color: colors.green, fontFamily: fonts.mono, fontSize: 10, marginTop: 11 },
  matchArrow: { color: colors.red, fontSize: 20, marginRight: 12 },
  resultVenue: { marginTop: 35 },
  resultInfo: { borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingVertical: 22 },
  address: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.8 },
  bookingStatus: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.8 },
  booking: { marginTop: 30 },
  detailBody: { marginTop: 12, marginBottom: 24 },
  unavailable: { marginTop: 75 },
});
