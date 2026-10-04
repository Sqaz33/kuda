import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, common, fonts } from './theme';
export function Screen({ children, aside, scroll = true }) {
    const { width } = useWindowDimensions();
    const content = <View style={[styles.columns, width >= 960 && styles.wide]}>
    <View style={styles.primary}>{children}</View>
    {width >= 960 && aside ? <View style={styles.aside}>{aside}</View> : null}
  </View>;
    return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Brand({ subtitle = 'Выбираем место вместе', right }) {
    return <View style={styles.brandBar}>
    <View><Text style={styles.brand}>куда<Text style={{ color: colors.accent }}>.</Text></Text><Text style={styles.brandSubtitle}>{subtitle}</Text></View>
    {right}
  </View>;
}
export function Eyebrow({ children, style }) {
    return <Text style={[common.eyebrow, style]}>{children}</Text>;
}
export function Body({ children, muted = false, style }) {
    return <Text style={[common.body, muted && { color: colors.secondary }, style]}>{children}</Text>;
}
export function Card({ children, style }) {
    return <View style={[styles.card, style]}>{children}</View>;
}
export function Button({ children, onPress, variant = 'primary', disabled = false, loading = false, style, testID }) {
    return <Pressable testID={testID} accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, variant === 'primary' && styles.primaryButton, variant === 'secondary' && styles.secondaryButton,
            variant === 'quiet' && styles.quietButton, variant === 'danger' && styles.dangerButton,
            (disabled || loading) && { opacity: 0.48 }, pressed && { opacity: 0.78 }, style]}>
    {loading ? <ActivityIndicator color={variant === 'primary' ? colors.onAccent : colors.text}/> :
            <Text style={[styles.buttonText, variant === 'primary' && { color: colors.onAccent }, variant === 'danger' && { color: colors.danger }]}>{children}</Text>}
  </Pressable>;
}
export function Field({ label, hint, error, ...props }) {
    return <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput {...props} placeholderTextColor={colors.muted} selectionColor={colors.accent} style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, error && { borderColor: colors.danger }, props.style]}/>
    {error || hint ? <Text style={[common.small, error && { color: colors.danger }]}>{error || hint}</Text> : null}
  </View>;
}
export function Chips({ options, value, onChange, multiple = false }) {
    return <View style={styles.chips}>{options.map((option) => {
            const selected = value.includes(option.value);
            return <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onChange(multiple
                    ? selected ? value.filter((item) => item !== option.value) : [...value, option.value]
                    : [option.value])} style={[styles.chip, selected && styles.selectedChip]}>
      <Text style={[styles.chipText, selected && { color: colors.onAccent }]}>{option.label}</Text>
    </Pressable>;
        })}</View>;
}
export function Notice({ title, children, tone = 'neutral' }) {
    return <View style={[styles.notice, tone === 'warning' && { borderColor: colors.accent }, tone === 'success' && { borderColor: colors.success }]}>
    {title ? <Text style={[common.h3, { marginBottom: 4 }]}>{title}</Text> : null}<Text style={common.small}>{children}</Text>
  </View>;
}
export function Separator() { return <View style={styles.separator}/>; }
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { minHeight: '100%', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36 },
    columns: { width: '100%', alignSelf: 'center', maxWidth: 452, flexDirection: 'row', gap: 48 },
    wide: { maxWidth: 824, paddingHorizontal: 24, justifyContent: 'center' },
    primary: { flex: 1, minWidth: 0, maxWidth: 420 },
    aside: { width: 300 },
    brandBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 18, marginBottom: 28, borderBottomWidth: 1, borderBottomColor: colors.border },
    brand: { fontFamily: fonts.bold, color: colors.text, fontSize: 26, lineHeight: 29, letterSpacing: -1.3 },
    brandSubtitle: { color: colors.secondary, fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 20 },
    button: { minHeight: 52, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    primaryButton: { backgroundColor: colors.accent },
    secondaryButton: { backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border },
    quietButton: { backgroundColor: 'transparent' },
    dangerButton: { backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.danger },
    buttonText: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, textAlign: 'center' },
    field: { gap: 8, marginBottom: 18 },
    fieldLabel: { color: colors.secondary, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
    input: { color: colors.text, backgroundColor: colors.raised, borderColor: colors.border, borderWidth: 1, borderRadius: 14, minHeight: 52, paddingHorizontal: 16, fontFamily: fonts.medium, fontSize: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 14 },
    chip: { minHeight: 40, borderRadius: 24, backgroundColor: colors.raised, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
    selectedChip: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 13 },
    notice: { padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.raised, marginVertical: 10 },
    separator: { height: 1, backgroundColor: colors.border, marginVertical: 18 },
});
