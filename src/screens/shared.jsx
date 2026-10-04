import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Brand, Eyebrow } from '../ui';
import { colors, common, fonts } from '../theme';

export const categories = [
  { value: 'bar', label: 'Бар' },
  { value: 'restaurant', label: 'Ресторан' },
  { value: 'cafe', label: 'Кафе' },
];

export const districts = [
  { value: 'Центральный', label: 'Центр Волгограда' },
  { value: 'Ворошиловский', label: 'Ворошиловский' },
  { value: 'Дзержинский', label: 'Дзержинский' },
  { value: 'Весь город', label: 'Весь город' },
];

export const isHost = (room, user) => room?.hostId === user?.id;
export const money = (value) => `до ${Number(value).toLocaleString('ru-RU')} ₽`;

export function meeting(constraints) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Volgograd' }).format(
    new Date(),
  );
  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Volgograd' }).format(
    new Date(Date.now() + 86400000),
  );
  const day =
    constraints.date === today
      ? 'Сегодня'
      : constraints.date === tomorrow
        ? 'Завтра'
        : constraints.date.split('-').reverse().slice(0, 2).join('.');
  return `${day} · ${constraints.time}`;
}

export function categoryLabel(value) {
  return categories.find((item) => item.value === value)?.label || value;
}

export function categorySummary(values = []) {
  if (values.includes('bar') && values.includes('restaurant')) return 'Бар или ресторан';
  return values.map(categoryLabel).join(' или ') || 'Формат не выбран';
}

export function areaSummary(constraints) {
  const area = constraints.area;
  if (area.type === 'radius') return `${area.pointAddress} · ${area.radiusKm} км`;
  return districts.find((item) => item.value === area.district)?.label || area.district;
}

export function Topline({ room, center, onAccount }) {
  return (
    <View style={styles.topline}>
      <View style={styles.topLeft}>
        <View style={styles.redDot} />
        <Text style={styles.topText}>{room ? `КОМНАТА #${room.code}` : 'ВОЛГОГРАД'}</Text>
      </View>
      <Text style={styles.topCenter} numberOfLines={1}>
        {center || (room ? meeting(room.constraints).toUpperCase() : 'СЕГОДНЯ · 19:30')}
      </Text>
      <Pressable onPress={onAccount} style={styles.topRight} accessibilityRole="button">
        <Text style={styles.topRightText}>{room ? `КОД: ${room.code}` : 'КУДА ↗'}</Text>
      </Pressable>
    </View>
  );
}

export function AvatarStack({ members = [], compact = false }) {
  const shown = members.slice(0, 4);
  return (
    <View style={styles.avatarStack}>
      <View style={styles.avatarRow}>
        {shown.map((member, index) => (
          <View
            key={member.id}
            style={[styles.avatar, compact && styles.avatarSmall, index > 0 && { marginLeft: -9 }]}
          >
            <Text style={styles.avatarText}>{member.name.slice(0, 2).toUpperCase()}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.avatarCount}>{members.length}</Text>
    </View>
  );
}

export function Header({ room, center, onAccount }) {
  return (
    <>
      <Topline room={room} center={center} onAccount={onAccount} />
      <Brand right={room ? <AvatarStack members={room.members} compact /> : null} />
    </>
  );
}

export function PageIntro({ label, title, description, style }) {
  return (
    <View style={style}>
      <Eyebrow>{label}</Eyebrow>
      <Text style={[common.title, styles.pageTitle]}>{title}</Text>
      {description ? (
        <Body muted style={styles.pageDescription}>
          {description}
        </Body>
      ) : null}
    </View>
  );
}

export function BackLink({ onPress, children = 'НА ГЛАВНУЮ' }) {
  return (
    <Pressable onPress={onPress} style={styles.back} accessibilityRole="button">
      <Text style={styles.backText}>← {children}</Text>
    </Pressable>
  );
}

export function VenueImage({ venue, height = 281, badge }) {
  const source = venue?.photoUrl
    ? { uri: venue.photoUrl }
    : venue?.photoKey === 'neon' || venue?.id === 'venue-1'
      ? require('../../assets/venue-neon.png')
      : venue?.photoKey === 'salt' || venue?.id === 'venue-2'
        ? require('../../assets/venue-salt.png')
        : null;
  return source ? (
    <ImageBackground
      source={source}
      imageStyle={styles.venueImage}
      style={[styles.venuePhoto, { height }]}
    >
      {badge ? <Text style={styles.photoBadge}>{badge}</Text> : null}
      <Text style={styles.photoPager}>━━ ▪ ▪ ▪</Text>
    </ImageBackground>
  ) : (
    <View style={[styles.photoPlaceholder, { height }]}>
      <Text style={styles.photoInitial}>{venue?.name?.slice(0, 1) || 'К'}</Text>
      <Text style={styles.photoHint}>ФОТО УТОЧНЯЕТСЯ</Text>
    </View>
  );
}

export function MapPreview({ onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.map} accessibilityRole="button">
      <View style={styles.mapRoadVertical} />
      <View style={styles.mapRoadHorizontal} />
      <View style={styles.mapBlockOne} />
      <View style={styles.mapBlockTwo} />
      <View style={styles.mapPin} />
    </Pressable>
  );
}

export function TwoButtons({ left, right }) {
  return (
    <View style={styles.twoButtons}>
      {left}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  topline: {
    height: 49,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  redDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.red },
  topText: { color: colors.secondary, fontFamily: fonts.mono, fontSize: 10 },
  topCenter: {
    color: colors.secondary,
    fontFamily: fonts.medium,
    fontSize: 10,
    flex: 1,
    textAlign: 'center',
  },
  topRight: {
    minWidth: 96,
    height: 26,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightText: {
    color: colors.secondary,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmall: { width: 31, height: 31, borderRadius: 16 },
  avatarText: { color: colors.text, fontFamily: fonts.bold, fontSize: 10 },
  avatarCount: { color: colors.secondary, fontFamily: fonts.medium, fontSize: 12 },
  pageTitle: { marginTop: 22 },
  pageDescription: { marginTop: 38 },
  back: { alignSelf: 'flex-start', paddingVertical: 3, marginBottom: 40 },
  backText: { color: colors.secondary, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.8 },
  venuePhoto: { width: '100%', overflow: 'hidden', justifyContent: 'space-between', padding: 12 },
  venueImage: { borderRadius: 5 },
  photoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0E0F12CC',
    color: colors.text,
    fontFamily: fonts.monoBold,
    fontSize: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  photoPager: { color: colors.text, alignSelf: 'flex-end', fontSize: 11 },
  photoPlaceholder: {
    width: '100%',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: { color: colors.borderStrong, fontFamily: fonts.bold, fontSize: 98 },
  photoHint: { ...common.label, position: 'absolute', bottom: 15, right: 12 },
  map: {
    height: 105,
    backgroundColor: '#1B1E23',
    overflow: 'hidden',
    borderRadius: 5,
    marginTop: 14,
  },
  mapRoadVertical: {
    position: 'absolute',
    width: 5,
    height: 140,
    left: '35%',
    backgroundColor: '#363840',
  },
  mapRoadHorizontal: {
    position: 'absolute',
    height: 5,
    width: '120%',
    top: 54,
    backgroundColor: '#363840',
  },
  mapBlockOne: {
    position: 'absolute',
    width: 100,
    height: 20,
    top: 20,
    left: 12,
    backgroundColor: '#25272B',
  },
  mapBlockTwo: {
    position: 'absolute',
    width: 100,
    height: 20,
    bottom: 16,
    right: 20,
    backgroundColor: '#25272B',
  },
  mapPin: {
    position: 'absolute',
    left: '54%',
    top: 42,
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 7,
    borderColor: '#7F242A',
    backgroundColor: colors.red,
  },
  twoButtons: { flexDirection: 'row', gap: 10 },
});
