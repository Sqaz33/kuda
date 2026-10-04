import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, common, fonts } from './theme';

export function Screen({ children, footer, scroll = true }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.shell}>
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Brand({ subtitle = 'Выбираем место вместе', right }) {
  return (
    <View style={styles.brandBar}>
      <View>
        <Text style={styles.brand}>куда.</Text>
        <Text style={styles.brandSubtitle}>{subtitle}</Text>
      </View>
      {right}
    </View>
  );
}

export function Eyebrow({ children, style }) {
  return <Text style={[common.label, style]}>{children}</Text>;
}

export function Body({ children, muted = false, style }) {
  return <Text style={[muted ? common.muted : common.body, style]}>{children}</Text>;
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  testID,
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'quiet' && styles.quietButton,
        variant === 'danger' && styles.dangerButton,
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.text} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'primary' && styles.primaryButtonText,
            variant === 'danger' && styles.dangerButtonText,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, error, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.muted}
        selectionColor={colors.red}
        style={[
          styles.input,
          props.multiline && styles.multiline,
          error && styles.inputError,
          props.style,
        ]}
      />
      {error || hint ? (
        <Text style={[common.small, error && { color: colors.red }]}>{error || hint}</Text>
      ) : null}
    </View>
  );
}

export function Chips({ options, value, onChange, multiple = false }) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = value.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() =>
              onChange(
                multiple
                  ? selected
                    ? value.filter((item) => item !== option.value)
                    : [...value, option.value]
                  : [option.value],
              )
            }
            style={[
              styles.chip,
              option.width && { width: option.width },
              selected && styles.selectedChip,
            ]}
          >
            <Text style={[styles.chipText, selected && styles.selectedChipText]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Notice({ title, children, tone = 'neutral' }) {
  return (
    <View style={styles.notice}>
      {title ? (
        <View style={styles.noticeTitleRow}>
          <View style={[styles.noticeDot, tone === 'warning' && { backgroundColor: colors.red }]} />
          <Text style={styles.noticeTitle}>{title}</Text>
        </View>
      ) : null}
      {children ? <Text style={common.muted}>{children}</Text> : null}
    </View>
  );
}

export function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  shell: { flex: 1, width: '100%', maxWidth: 438, alignSelf: 'center' },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 24 },
  footer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 33, backgroundColor: colors.bg },
  brandBar: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 30,
  },
  brand: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 25,
    lineHeight: 27,
    letterSpacing: -1,
  },
  brandSubtitle: {
    color: colors.secondary,
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 15,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: 18,
  },
  button: {
    minHeight: 49,
    paddingHorizontal: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: colors.primary },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  quietButton: { backgroundColor: 'transparent' },
  dangerButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.red },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
  buttonText: {
    color: colors.text,
    fontFamily: fonts.monoBold,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.7,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  primaryButtonText: { color: colors.onPrimary },
  dangerButtonText: { color: colors.red },
  field: { gap: 10, marginBottom: 20 },
  fieldLabel: { ...common.label },
  input: {
    minHeight: 54,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 },
  inputError: { borderColor: colors.red },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 27,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
  selectedChip: { borderColor: colors.text, backgroundColor: colors.text },
  chipText: {
    color: colors.secondary,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  selectedChipText: { color: colors.onPrimary },
  notice: {
    gap: 18,
    marginVertical: 10,
    padding: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  noticeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  noticeTitle: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.7 },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 17 },
});
