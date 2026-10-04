import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Chips, Eyebrow, Field, Notice, Screen } from '../ui';
import { colors, common, fonts } from '../theme';
import {
  areaSummary,
  BackLink,
  categories,
  categorySummary,
  districts,
  Header,
  meeting,
  money,
  PageIntro,
} from './shared';
import { api } from '../api';

function localDate(offsetDays = 0) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Volgograd' }).format(
    new Date(Date.now() + offsetDays * 86400000),
  );
}

function SettingRow({ label, value, onPress }) {
  return (
    <View style={styles.setting}>
      <Eyebrow>{label}</Eyebrow>
      <Pressable onPress={onPress} style={styles.settingButton} accessibilityRole="button">
        <Text style={styles.settingValue}>{value}</Text>
        <Text style={styles.settingChevron}>›</Text>
      </Pressable>
    </View>
  );
}

export function CreateScreen({ user, onBack, onCreate, busy }) {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState(user?.name || '');
  const [date, setDate] = useState(() => {
    const today = localDate();
    return Date.parse(`${today}T19:30:00+03:00`) > Date.now() ? today : localDate(1);
  });
  const [time, setTime] = useState('19:30');
  const [areaMode, setAreaMode] = useState('radius');
  const [district, setDistrict] = useState('Центральный');
  const [pointAddress, setPointAddress] = useState('Центр Волгограда');
  const [radiusKm, setRadiusKm] = useState('3');
  const [selectedCategories, setCategories] = useState([]);
  const [budgetMax, setBudget] = useState('2000');
  const [partySize, setPartySize] = useState('4');
  const [deadlineMinutes, setDeadline] = useState('15');
  const [exclusions, setExclusions] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [estimateError, setEstimateError] = useState('');

  const constraints = {
    city: 'Волгоград',
    timeZone: 'Europe/Volgograd',
    date,
    time,
    area:
      areaMode === 'district'
        ? { type: 'district', district }
        : { type: 'radius', pointAddress: pointAddress.trim(), radiusKm: Number(radiusKm) },
    categories: selectedCategories.length
      ? selectedCategories
      : categories.map((item) => item.value),
    budgetMax: Number(budgetMax),
    partySize: Number(partySize),
    deadlineMinutes: Number(deadlineMinutes),
    exclusions: exclusions.trim()
      ? exclusions
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  };
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{2}:\d{2}$/.test(time) &&
    Date.parse(`${date}T${time}:00+03:00`) > Date.now();
  const valid =
    validDate &&
    Number(budgetMax) >= 300 &&
    Number(partySize) >= 2 &&
    Number(partySize) <= 12 &&
    Number(deadlineMinutes) >= 5 &&
    Number(deadlineMinutes) <= 120 &&
    (areaMode === 'district' || (pointAddress.trim().length >= 3 && Number(radiusKm) > 0));
  const constraintsKey = JSON.stringify(constraints);

  useEffect(() => {
    if (!validDate) {
      setEstimate(null);
      return;
    }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await api.estimate(constraints);
        if (active) {
          setEstimate(result);
          setEstimateError('');
        }
      } catch (error) {
        if (active) {
          setEstimate(null);
          setEstimateError(error.message);
        }
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [constraintsKey]);

  const ready = valid && estimate?.count >= 12;
  const closeEditor = () => setEditing(null);
  const footer = editing ? (
    <Button onPress={closeEditor}>Сохранить</Button>
  ) : (
    <Button
      disabled={!ready}
      loading={busy}
      onPress={() => onCreate(constraints, name.trim() || 'Гость')}
    >
      Создать встречу
    </Button>
  );

  if (editing) {
    return (
      <Screen footer={footer}>
        <Header center={meeting(constraints).toUpperCase()} />
        <BackLink onPress={closeEditor} children="К УСЛОВИЯМ" />
        <PageIntro
          label="01 / УСЛОВИЯ ВСТРЕЧИ"
          title={
            editing === 'when'
              ? 'Когда встречаемся?'
              : editing === 'where'
                ? 'Где будем искать?'
                : editing === 'budget'
                  ? 'Какой бюджет?'
                  : 'Кого зовём?'
          }
          description="Уточните детали встречи — общий набор мест будет одинаковым для всех."
        />
        <View style={styles.editorFields}>
          {editing === 'when' ? (
            <>
              <Field
                label="Дата · ГГГГ-ММ-ДД"
                value={date}
                onChangeText={setDate}
                placeholder="2026-10-06"
              />
              <Field
                label="Время · ЧЧ:ММ"
                value={time}
                onChangeText={setTime}
                placeholder="19:30"
              />
            </>
          ) : null}
          {editing === 'where' ? (
            <>
              <Eyebrow>ОБЛАСТЬ ПОИСКА</Eyebrow>
              <Chips
                options={[
                  { value: 'radius', label: 'Точка + радиус' },
                  { value: 'district', label: 'Район' },
                ]}
                value={[areaMode]}
                onChange={(value) => setAreaMode(value[0])}
              />
              {areaMode === 'radius' ? (
                <>
                  <Field
                    label="Адрес или ориентир"
                    value={pointAddress}
                    onChangeText={setPointAddress}
                    placeholder="Центр Волгограда"
                  />
                  <Field
                    label="Радиус, км"
                    value={radiusKm}
                    onChangeText={setRadiusKm}
                    keyboardType="numeric"
                  />
                </>
              ) : (
                <Chips
                  options={districts}
                  value={[district]}
                  onChange={(value) => setDistrict(value[0])}
                />
              )}
            </>
          ) : null}
          {editing === 'budget' ? (
            <>
              <Field
                label="Бюджет на человека, ₽"
                value={budgetMax}
                onChangeText={setBudget}
                keyboardType="numeric"
              />
              <Field
                label="Исключения через запятую · необязательно"
                value={exclusions}
                onChangeText={setExclusions}
                placeholder="Например, караоке"
              />
            </>
          ) : null}
          {editing === 'party' ? (
            <>
              <Field
                label="Сколько человек"
                value={partySize}
                onChangeText={setPartySize}
                keyboardType="numeric"
              />
              <Field
                label="Сколько минут голосуем"
                value={deadlineMinutes}
                onChangeText={setDeadline}
                keyboardType="numeric"
              />
              {!user ? (
                <Field
                  label="Ваше имя"
                  value={name}
                  onChangeText={setName}
                  placeholder="Имя для компании"
                />
              ) : null}
            </>
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen footer={footer}>
      <Header center={meeting(constraints).toUpperCase()} />
      <PageIntro
        label="01 / УСЛОВИЯ ВСТРЕЧИ"
        title="Собрать вечер."
        description="Пара деталей — и мы покажем места, которые подойдут компании."
      />
      <View style={styles.form}>
        <SettingRow
          label="КОГДА"
          value={meeting(constraints).replace(' · ', ', ')}
          onPress={() => setEditing('when')}
        />
        <SettingRow
          label="РАЙОН"
          value={
            areaMode === 'radius' ? `${pointAddress} · ${radiusKm} км` : areaSummary(constraints)
          }
          onPress={() => setEditing('where')}
        />
        <View style={styles.setting}>
          <Eyebrow>ЧТО ИЩЕМ</Eyebrow>
          <Chips
            options={categories}
            value={selectedCategories}
            onChange={(value) => setCategories(value[0] === selectedCategories[0] ? [] : value)}
          />
        </View>
        <SettingRow
          label="БЮДЖЕТ НА ЧЕЛОВЕКА"
          value={`До ${Number(budgetMax).toLocaleString('ru-RU')} ₽`}
          onPress={() => setEditing('budget')}
        />
        <SettingRow
          label="КОМПАНИЯ"
          value={`${partySize} человека`}
          onPress={() => setEditing('party')}
        />
      </View>
      <Text style={[styles.estimate, estimate?.count < 12 && { color: colors.red }]}>
        {estimateError
          ? 'НЕ УДАЛОСЬ ПРОВЕРИТЬ КАТАЛОГ'
          : estimate
            ? `${estimate.count} ПОДХОДЯЩИХ МЕСТ`
            : 'ПРОВЕРЯЕМ МЕСТА…'}
      </Text>
      {estimate?.count < 12 ? (
        <Notice title="МЕСТ ПОКА МАЛО" tone="warning">
          Расширьте район, бюджет или категории.
        </Notice>
      ) : null}
      {estimateError ? <Body muted>{estimateError}</Body> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 36 },
  setting: { gap: 10, marginBottom: 19 },
  settingButton: {
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
  },
  settingValue: { color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  settingChevron: { color: colors.secondary, fontSize: 24 },
  estimate: {
    marginTop: 43,
    marginBottom: 8,
    color: colors.green,
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  editorFields: { marginTop: 48, gap: 8 },
});
