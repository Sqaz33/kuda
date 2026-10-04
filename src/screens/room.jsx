import React, { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, Eyebrow, Notice, Screen, Separator } from '../ui';
import { colors, common, fonts } from '../theme';
import { inviteLink } from '../links';
import {
  areaSummary,
  AvatarStack,
  BackLink,
  categoryLabel,
  categorySummary,
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
      {venue.category === 'bar' ? 'КОКТЕЙЛЬНЫЙ БАР' : categoryLabel(venue.category).toUpperCase()}
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

function Overlay({ title, children, onClose, style }) {
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.overlayShade}>
        <View style={[styles.overlayCard, style]}>
          <View style={styles.overlayHeading}>
            <Text style={styles.overlayTitle}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button">
              <Text style={styles.overlayClose}>×</Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

function ReviewOverlay({ onClose }) {
  return (
    <Overlay title="Отзывы и фото" onClose={onClose} style={styles.reviewsOverlay}>
      <View>
        <Text style={styles.modalRating}>★ 4,9</Text>
        <Body muted>420 отзывов в карточке источника</Body>
      </View>
      <Card style={styles.reviewPlaceholder}>
        <Eyebrow style={{ color: colors.red }}>ПРИМЕР ПРОТОТИПА</Eyebrow>
        <Body style={{ marginTop: 20 }}>
          Фотографии и отзывы будут открываться здесь после подключения источника данных.
        </Body>
      </Card>
      <Button onPress={onClose}>Назад к месту</Button>
    </Overlay>
  );
}

function RoomAvatars({ room, onMember }) {
  return (
    <View style={styles.roomAvatars}>
      {room.members.map((member) => (
        <Pressable
          key={member.id}
          onPress={() => onMember(member)}
          accessibilityRole="button"
          style={styles.roomAvatar}
        >
          <Text style={styles.roomAvatarText}>{member.name.slice(0, 2).toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function LobbyScreen({
  room,
  user,
  onBack,
  onStart,
  onShare,
  onRotate,
  onCancel,
  onLeave,
  onRemove,
  busy,
}) {
  const host = isHost(room, user);
  const [member, setMember] = useState(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [sharing, setSharing] = useState(false);
  async function shareLink() {
    if ((await onShare()) === 'shown') setSharing(true);
  }
  return (
    <>
      <Screen
        footer={
          <>
            {host ? (
              <TwoButtons
                left={
                  <Button variant="secondary" onPress={shareLink} style={styles.flexButton}>
                    Поделиться ссылкой
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
            ) : (
              <Button variant="secondary" onPress={shareLink}>
                Поделиться ссылкой
              </Button>
            )}
            <Text style={styles.footerHint}>КУДА.　 /　 ОДНА КОМНАТА — ОДНО РЕШЕНИЕ</Text>
          </>
        }
      >
        <Header room={room} />
        <PageIntro
          label={host ? '02 / КОМНАТА СОЗДАНА' : '02 / ВЫ В КОМНАТЕ'}
          title={host ? 'Позовите своих.' : 'Вы в комнате.'}
          description={
            host
              ? `Когда все соберутся, начните выбор. На голосование у компании будет ${room.constraints.deadlineMinutes} минут.`
              : `Организатор начнёт выбор, когда все соберутся. После старта у вас будет ${room.constraints.deadlineMinutes} минут.`
          }
        />
        <Card style={styles.codeCard}>
          <Eyebrow>КОД КОМНАТЫ</Eyebrow>
          <Text style={styles.code}>{room.code}</Text>
          <Text style={styles.codeCaption}>Отправьте ссылку или продиктуйте код</Text>
        </Card>
        <View style={styles.participantSection}>
          <Eyebrow>
            УЧАСТНИКИ　 ·　 {room.members.length} ИЗ {room.constraints.partySize}
          </Eyebrow>
          <RoomAvatars room={room} onMember={setMember} />
        </View>
        <Card style={styles.summaryCard}>
          <Eyebrow>{meeting(room.constraints).toUpperCase().replace(' · ', '　 ·　 ')}</Eyebrow>
          <Text style={styles.summaryTitle}>{categorySummary(room.constraints.categories)}</Text>
          <Body muted style={styles.summaryDetail}>
            {room.constraints.area.pointAddress || areaSummary(room.constraints)} ·{' '}
            {money(room.constraints.budgetMax)}
          </Body>
        </Card>
        <View style={styles.roomBottomActions}>
          <Eyebrow style={{ color: colors.green }}>ВЫ — {host ? 'СОЗДАТЕЛЬ' : 'УЧАСТНИК'}</Eyebrow>
          <Pressable onPress={() => setConfirmExit(true)} accessibilityRole="button">
            <Eyebrow style={{ color: colors.red }}>ВЫЙТИ ИЗ КОМНАТЫ</Eyebrow>
          </Pressable>
        </View>
      </Screen>
      {member ? (
        <Overlay title="Участник комнаты" onClose={() => setMember(null)}>
          <View style={styles.modalAvatar}>
            <Text style={styles.modalInitial}>{member.name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={styles.modalName}>{member.name}</Text>
          <Eyebrow style={styles.modalRole}>
            {member.id === room.hostId ? 'СОЗДАТЕЛЬ КОМНАТЫ' : 'УЧАСТНИК'}
          </Eyebrow>
          {host && member.id !== room.hostId ? (
            <Button
              variant="danger"
              style={styles.removeMemberButton}
              onPress={() => {
                onRemove(member.id);
                setMember(null);
              }}
            >
              Исключить из комнаты
            </Button>
          ) : null}
          <Button onPress={() => setMember(null)}>Закрыть</Button>
        </Overlay>
      ) : null}
      {sharing ? (
        <Overlay title="Пригласить друзей" onClose={() => setSharing(false)}>
          <Body muted>Отправьте эту ссылку участникам встречи:</Body>
          <Text selectable style={styles.shareLink}>
            {inviteLink(room.inviteToken)}
          </Text>
          <Button onPress={() => setSharing(false)}>Готово</Button>
        </Overlay>
      ) : null}
      {confirmExit ? (
        <Overlay
          title="Выйти из комнаты?"
          onClose={() => setConfirmExit(false)}
          style={styles.exitOverlay}
        >
          <Body muted style={styles.modalBody}>
            {host
              ? 'Если вы выйдете, комната закроется для всех участников.'
              : 'Вы сможете снова войти по ссылке приглашения.'}
          </Body>
          <TwoButtons
            left={
              <Button
                variant="secondary"
                style={styles.flexButton}
                onPress={() => setConfirmExit(false)}
              >
                Отмена
              </Button>
            }
            right={
              <Button
                variant="alert"
                style={styles.flexButton}
                onPress={() => {
                  setConfirmExit(false);
                  if (host) onCancel();
                  else onLeave();
                }}
              >
                {host ? 'Закрыть комнату' : 'Выйти'}
              </Button>
            }
          />
        </Overlay>
      ) : null}
    </>
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
  const [showVotes, setShowVotes] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
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
    <>
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
            <View style={styles.deckFooterLinks}>
              <Pressable onPress={() => setShowVotes(true)} accessibilityRole="button">
                <Text style={styles.deckFooterText}>
                  ПОСМОТРЕТЬ СОВПАДЕНИЯ:{' '}
                  {Object.values(votes).filter((value) => value === 'like').length}
                </Text>
              </Pressable>
              <Pressable
                onPress={onFinishEarly}
                disabled={done < 10 || pending}
                accessibilityRole="button"
              >
                <Text style={[styles.deckFooterText, done < 10 && { color: colors.secondary }]}>
                  ЗАВЕРШИТЬ ГОЛОСОВАНИЕ
                </Text>
              </Pressable>
            </View>
          </>
        }
      >
        <Header
          room={room}
          center={`${Math.max(0, Math.floor((Date.parse(room.deadlineAt) - Date.now()) / 60000))} МИН ДО КОНЦА\nМЕСТО ${String(done + 1).padStart(2, '0')} / ${room.candidates.length}`}
          onExit={() => setConfirmExit(true)}
        />
        <View style={styles.deckPhoto}>
          <VenueImage venue={current} height={378} badge="★ 4,9　·　420 ОТЗЫВОВ" />
        </View>
        <Eyebrow style={styles.deckCategory}>
          {categoryLabel(current.category)}
          {current.category === 'bar' ? ' · коктейли' : ''}
        </Eyebrow>
        <Text style={styles.deckVenueName}>{current.name}</Text>
        <View style={styles.deckAddress}>
          <Body muted>{current.address}</Body>
          <Text style={styles.walk}>15 мин пешком · 1,2 км</Text>
        </View>
        <View style={styles.deckFact}>
          <Eyebrow style={{ color: colors.green }}>●　ОТКРЫТО ДО 04:00</Eyebrow>
          <Eyebrow>≈ {current.priceHint?.replace('Ориентир ', '') || '2 000 ₽/ЧЕЛ.'}</Eyebrow>
        </View>
        <View style={styles.deckFact}>
          <Eyebrow>КУХНЯ</Eyebrow>
          <Text style={styles.factValue}>{current.cuisine || 'Авторская кухня'}</Text>
        </View>
        <View style={styles.deckFact}>
          <Eyebrow>ФОРМАТ</Eyebrow>
          <Text style={styles.factValue}>
            {categoryLabel(current.category)} · {current.tags?.[0] || 'для компании'}
          </Text>
        </View>
        <Pressable
          onPress={() => onDetail(current)}
          style={styles.mapHeading}
          accessibilityRole="button"
        >
          <Eyebrow>ГДЕ НАХОДИТСЯ　↓</Eyebrow>
        </Pressable>
        <MapPreview onPress={() => onDetail(current)} />
      </Screen>
      {showVotes ? (
        <Overlay title="Ваш выбор" onClose={() => setShowVotes(false)}>
          <Body muted>
            Отмечено «подходит»: {Object.values(votes).filter((value) => value === 'like').length}.
            Общие совпадения появятся после завершения голосования.
          </Body>
          <Button variant="secondary" onPress={() => setShowVotes(false)}>
            К карточкам
          </Button>
        </Overlay>
      ) : null}
      {confirmExit ? (
        <Overlay title="Выйти из комнаты?" onClose={() => setConfirmExit(false)}>
          <Body muted>Ваши ответы сохранятся. Вы сможете вернуться по коду комнаты.</Body>
          <Button variant="secondary" onPress={onBack}>
            Выйти
          </Button>
          <Button variant="quiet" onPress={() => setConfirmExit(false)}>
            Остаться
          </Button>
        </Overlay>
      ) : null}
    </>
  );
}

export function WaitingScreen({ room, user, onBack, onFinish, onCancel }) {
  const finished = room.members.filter((member) => member.finished).length;
  const allFinished = finished === room.members.length;
  const canFinish =
    isHost(room, user) && (allFinished || Date.now() >= Date.parse(room.deadlineAt));
  return (
    <Screen footer={canFinish ? <Button onPress={onFinish}>Посмотреть результат</Button> : null}>
      <Header room={room} />
      <PageIntro
        label="06 / ВЫБОР ЗАВЕРШЁН"
        title={allFinished ? 'Все закончили.' : 'Ждём остальных.'}
        descriptionStyle={{ marginTop: 45 }}
        description={
          allFinished
            ? 'Все участники сделали выбор. Результат готов.'
            : 'Ваши ответы сохранены. Результат появится, когда все закончат или истечёт время.'
        }
      />
      <View style={styles.resultNotice}>
        <Notice title="ВАШИ ГОЛОСА СОХРАНЕНЫ">
          {allFinished
            ? 'Компания закончила выбор. Можно смотреть итог.'
            : 'Ещё один участник выбирает заведения.'}
        </Notice>
      </View>
      <Card style={styles.finishedCard}>
        <Text style={styles.finishedNumber}>{String(finished).padStart(2, '0')}</Text>
        <View>
          <Text style={styles.finishedTitle}>из {room.members.length} закончили</Text>
          <Eyebrow style={styles.finishedNames}>
            {room.members
              .filter((member) => member.finished)
              .map((member) => member.name)
              .join(' · ')}
          </Eyebrow>
        </View>
      </Card>
    </Screen>
  );
}

export function MatchesScreen({ room, user, onChoose, onBack, pending, onExtend, onCancel }) {
  const matches = (room.matches || []).slice(0, room.matchMode === 'unanimous' ? 5 : 3);
  const host = isHost(room, user);
  const unanimous = room.matchMode === 'unanimous';
  const [selected, setSelected] = useState(unanimous ? matches[0]?.venue.id : null);
  return (
    <Screen
      footer={
        host && matches.length ? (
          <Button loading={pending} disabled={!selected} onPress={() => onChoose(selected)}>
            {selected && !unanimous
              ? `Подтвердить: ${matches.find((match) => match.venue.id === selected)?.venue.name}`
              : unanimous
                ? 'Выбрать место'
                : 'Сначала выберите место'}
          </Button>
        ) : (
          <Button variant="secondary" disabled>
            Ждём решения создателя
          </Button>
        )
      }
    >
      <Header room={room} />
      <PageIntro
        label={
          unanimous
            ? '03 / РЕЗУЛЬТАТЫ ГОЛОСОВАНИЯ'
            : selected && host
              ? 'ПОСЛЕ ДЕДЛАЙНА / ВЫБОР МЕСТА'
              : 'ПОСЛЕ ДЕДЛАЙНА'
        }
        descriptionStyle={{ marginTop: 45 }}
        title={
          unanimous
            ? 'Есть совпадение.'
            : matches.length
              ? 'Почти сошлись.'
              : 'Пока без совпадений.'
        }
        description={
          unanimous
            ? host
              ? 'Одно место понравилось всем. Вы создатель — подтвердите его для компании.'
              : 'Одно место понравилось всем. Создатель подтвердит его для компании.'
            : matches.length
              ? host
                ? selected
                  ? 'Место выделено. Подтвердите выбор для всей компании.'
                  : 'Выберите одно из трёх мест, затем подтвердите решение.'
                : 'Три места получили поддержку. Создатель выберет одно для всей компании.'
              : 'Ни одно место не набрало достаточно голосов.'
        }
      />
      {!unanimous && matches.length ? (
        <View style={styles.majorityNotice}>
          <Notice
            title={
              host
                ? selected
                  ? `ВЫБРАНО: ${matches.find((match) => match.venue.id === selected)?.venue.name.toUpperCase()}`
                  : 'ВЫБОР ЗА КОМПАНИЕЙ'
                : 'РЕШЕНИЕ ЗА СОЗДАТЕЛЕМ'
            }
          >
            {selected && host
              ? 'После подтверждения все увидят итог.'
              : !host
                ? 'Создатель сравнивает три варианта.'
                : `${room.incomplete ? 'Не все участники успели ответить. ' : ''}Три места получили поддержку компании.`}
          </Notice>
        </View>
      ) : null}
      <View style={[styles.matchesList, !unanimous && styles.majorityList]}>
        {matches.map((match, index) => (
          <Pressable
            key={match.venue.id}
            onPress={() => host && setSelected(match.venue.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === match.venue.id }}
            style={[
              styles.matchCard,
              !unanimous && styles.majorityRow,
              selected === match.venue.id && host && !unanimous && styles.matchSelected,
            ]}
          >
            {unanimous ? (
              <View style={styles.matchPhoto}>
                <VenueImage venue={match.venue} height={144} />
              </View>
            ) : (
              <Text style={styles.majorityNumber}>
                {selected === match.venue.id && host ? '✓' : String(index + 1).padStart(2, '0')}
              </Text>
            )}
            <View style={styles.matchDetails}>
              {unanimous ? <VenueMeta venue={match.venue} /> : null}
              <Text style={styles.matchName}>{match.venue.name}</Text>
              <Text style={styles.matchVotes}>
                {unanimous
                  ? `✓　${match.likes} / ${match.total} ГОЛОСА`
                  : `${match.likes} / ${match.total}　·　${categoryLabel(match.venue.category).toUpperCase()}`}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      {!matches.length && host ? (
        <Button onPress={onExtend} style={styles.extraAction}>
          Добавить кандидатов
        </Button>
      ) : null}
    </Screen>
  );
}

export function ResultScreen({ room, user, onBack, onNote, onDetail, onAction, pending }) {
  const [showContact, setShowContact] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const venue = room.winner;
  if (!venue) return <UnavailableScreen reason="Итог встречи ещё загружается." onHome={onBack} />;
  const mapUrl = venue.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(venue.address)}`;
  return (
    <>
      <Screen
        footer={
          <TwoButtons
            left={
              <Button onPress={() => setShowContact(true)} style={styles.flexButton}>
                Позвонить
              </Button>
            }
            right={
              <Button
                variant="secondary"
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
          descriptionStyle={{ marginTop: 15 }}
        />
        <View style={styles.resultVenue}>
          <Pressable onPress={() => setShowReviews(true)} accessibilityRole="button">
            <VenueImage venue={venue} height={281} badge="★ 4,9　·　420 ОТЗЫВОВ" />
          </Pressable>
          <Card style={styles.resultInfo}>
            <Text style={styles.address}>{venue.address.toUpperCase()}</Text>
            <Eyebrow style={{ marginTop: 18 }}>15 МИН ПЕШКОМ ОТ ТОЧКИ ВСТРЕЧИ</Eyebrow>
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
        </View>
        <View style={{ marginTop: 6 }}>
          <MapPreview onPress={() => onAction('map', mapUrl)} />
        </View>
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
      {showContact ? (
        <Overlay title="Контакт заведения" onClose={() => setShowContact(false)}>
          <Body muted>
            {venue.phone
              ? `Телефон: ${venue.phone}`
              : 'В этой демонстрационной карточке телефон не указан. Уточните контакт заведения перед поездкой.'}
          </Body>
          <Button
            onPress={() => {
              setShowContact(false);
              if (venue.phone) onAction('phone', `tel:${venue.phone}`);
            }}
          >
            {venue.phone ? 'Позвонить' : 'Понятно'}
          </Button>
        </Overlay>
      ) : null}
      {showReviews ? <ReviewOverlay onClose={() => setShowReviews(false)} /> : null}
    </>
  );
}

export function DetailsScreen({ venue, room, onBack, onVote, onFinishEarly, onReport, pending }) {
  const [showReviews, setShowReviews] = useState(false);
  const voting = room?.status === 'swiping';
  const votes = room?.ownVotes || {};
  const done = Object.keys(votes).length;
  return (
    <>
      <Screen
        footer={
          voting ? (
            <>
              <TwoButtons
                left={
                  <Button
                    variant="secondary"
                    loading={pending}
                    onPress={() => onVote(venue.id, 'dislike')}
                    style={styles.flexButton}
                  >
                    Пропустить
                  </Button>
                }
                right={
                  <Button
                    loading={pending}
                    onPress={() => onVote(venue.id, 'like')}
                    style={styles.flexButton}
                  >
                    Подходит
                  </Button>
                }
              />
              <View style={styles.deckFooterLinks}>
                <Text style={styles.deckFooterText}>
                  ПОСМОТРЕТЬ СОВПАДЕНИЯ:{' '}
                  {Object.values(votes).filter((value) => value === 'like').length}
                </Text>
                <Pressable disabled={done < 10} onPress={onFinishEarly}>
                  <Text style={[styles.deckFooterText, done < 10 && { color: colors.secondary }]}>
                    ЗАВЕРШИТЬ ГОЛОСОВАНИЕ
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Button variant="secondary" onPress={onBack}>
              Назад к месту
            </Button>
          )
        }
      >
        <Header
          room={room}
          center={
            voting
              ? `${Math.max(0, Math.floor((Date.parse(room.deadlineAt) - Date.now()) / 60000))} МИН ДО КОНЦА\nМЕСТО ${String(done + 1).padStart(2, '0')} / ${room.candidates.length}`
              : 'О МЕСТЕ'
          }
          onExit={onBack}
        />
        <View style={styles.detailsNav}>
          <Text style={styles.detailsName}>{venue.name}</Text>
          <Pressable onPress={onBack} accessibilityRole="button">
            <Eyebrow>К НАЧАЛУ ↑</Eyebrow>
          </Pressable>
        </View>
        <MapPreview height={285} onPress={() => Linking.openURL(venue.mapUrl)}>
          <View style={styles.mapAddress}>
            <Text style={styles.mapAddressText}>{venue.address}</Text>
            <Eyebrow>МАРШРУТ ↗</Eyebrow>
          </View>
        </MapPreview>
        <Eyebrow style={styles.detailsLabel}>О МЕСТЕ</Eyebrow>
        <Card style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            {venue.id === 'venue-1'
              ? 'Коктейльный бар с авторскими напитками и тапас.'
              : `${categoryLabel(venue.category)} для компании. ${venue.cuisine || 'Кухня уточняется'}.`}
          </Text>
          <Separator />
          <View style={styles.aboutTags}>
            <Eyebrow>{categoryLabel(venue.category).toUpperCase()}</Eyebrow>
            <Eyebrow>{venue.tags?.[0]?.toUpperCase()}</Eyebrow>
            <Eyebrow>ДО 04:00</Eyebrow>
          </View>
        </Card>
        <Eyebrow style={styles.detailsLabel}>ОТЗЫВЫ И ФОТО</Eyebrow>
        <Pressable
          onPress={() => setShowReviews(true)}
          accessibilityRole="button"
          style={styles.reviewCard}
        >
          <Text style={styles.reviewRating}>★ 4,9</Text>
          <Text style={styles.reviewLink}>420 ОТЗЫВОВ · СМОТРЕТЬ ФОТОГРАФИИ ↗</Text>
        </Pressable>
        <View style={styles.reportLinks}>
          <Pressable onPress={() => onReport(venue.id, 'closed')}>
            <Eyebrow>ЗАВЕДЕНИЕ ЗАКРЫТО?</Eyebrow>
          </Pressable>
          <Pressable onPress={() => onReport(venue.id, 'incorrect_data')}>
            <Eyebrow>НЕВЕРНЫЕ ДАННЫЕ?</Eyebrow>
          </Pressable>
        </View>
      </Screen>
      {showReviews ? <ReviewOverlay onClose={() => setShowReviews(false)} /> : null}
    </>
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
  codeCard: { marginTop: 45, paddingVertical: 19.5, minHeight: 169 },
  code: {
    color: colors.text,
    fontFamily: fonts.monoBold,
    fontSize: 56,
    letterSpacing: 6,
    marginTop: 22,
  },
  codeCaption: { ...common.small, marginTop: 1 },
  participantSection: { marginTop: 38 },
  roomAvatars: { flexDirection: 'row', gap: 13, marginTop: 24 },
  roomAvatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  roomAvatarText: { color: colors.text, fontFamily: fonts.bold, fontSize: 11 },
  summaryTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 21, marginTop: 20 },
  summaryDetail: { marginTop: 16 },
  roomBottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 23,
    marginBottom: 4,
  },
  overlayShade: {
    flex: 1,
    backgroundColor: '#000A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  overlayCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: 20,
    gap: 15,
  },
  overlayHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: 15,
  },
  overlayTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 22 },
  overlayClose: { color: colors.secondary, fontSize: 27 },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalInitial: { color: colors.text, fontFamily: fonts.bold, fontSize: 19 },
  modalName: { color: colors.text, fontFamily: fonts.bold, fontSize: 22, textAlign: 'center' },
  modalRole: { textAlign: 'center', marginBottom: 4 },
  removeMemberButton: { backgroundColor: colors.surfaceRaised, borderColor: colors.surfaceRaised },
  exitOverlay: { minHeight: 270, justifyContent: 'space-between' },
  modalBody: { marginVertical: 10 },
  modalRating: { color: colors.text, fontFamily: fonts.bold, fontSize: 28 },
  shareLink: { color: colors.text, fontFamily: fonts.mono, fontSize: 12, lineHeight: 18 },
  reviewsOverlay: { minHeight: 440, justifyContent: 'space-between' },
  reviewPlaceholder: { minHeight: 144 },
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
  summaryCard: { marginTop: 40, minHeight: 150 },
  inviteLink: { ...common.small, marginTop: 24 },
  endRoom: { marginTop: 30 },
  deckPhoto: { marginTop: -12 },
  deckCategory: { marginTop: 23 },
  deckVenueName: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 32,
    marginTop: 15,
    marginBottom: 5,
  },
  deckAddress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  walk: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  deckFact: {
    minHeight: 47,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factValue: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  mapHeading: { borderTopColor: colors.border, borderTopWidth: 1, paddingTop: 18 },
  deckFooterLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingBottom: 0,
  },
  deckFooterText: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 9 },
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
  finishedCard: {
    marginTop: 21,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 30,
    paddingVertical: 21,
  },
  finishedNumber: { color: colors.red, fontFamily: fonts.monoBold, fontSize: 13, marginTop: 4 },
  finishedTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
  finishedNames: { marginTop: 12 },
  resultNotice: { marginTop: 37 },
  bigCount: { color: colors.text, fontFamily: fonts.number, fontSize: 72, marginTop: 14 },
  countSuffix: { color: colors.muted, fontSize: 29 },
  matchesList: { marginTop: 58, gap: 16 },
  majorityList: { marginTop: 22 },
  majorityNotice: { marginTop: 56 },
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
  matchSelected: { borderColor: colors.red, backgroundColor: '#24191B' },
  majorityRow: { height: 91, paddingHorizontal: 17, gap: 30 },
  majorityNumber: { color: colors.red, fontFamily: fonts.monoBold, fontSize: 13 },
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
  resultVenue: { marginTop: 38 },
  resultInfo: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingVertical: 22,
    minHeight: 212,
  },
  address: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.8 },
  bookingStatus: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.8 },
  booking: { marginTop: 30 },
  detailBody: { marginTop: 12, marginBottom: 24 },
  detailsNav: {
    marginTop: -30,
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsName: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  mapAddress: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    right: 12,
    minHeight: 42,
    borderRadius: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapAddressText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
  detailsLabel: { marginTop: 24, marginBottom: 18 },
  aboutCard: { minHeight: 169 },
  aboutText: { color: colors.text, fontFamily: fonts.medium, fontSize: 16, lineHeight: 21 },
  aboutTags: { flexDirection: 'row', gap: 12 },
  reviewCard: {
    minHeight: 70,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewRating: { color: colors.text, fontFamily: fonts.bold, fontSize: 22 },
  reviewLink: { color: colors.secondary, fontFamily: fonts.mono, fontSize: 9 },
  reportLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  unavailable: { marginTop: 75 },
});
