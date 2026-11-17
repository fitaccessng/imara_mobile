import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, typography } from "@/ui/theme";

export function BrandMark() {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandMark} accessibilityElementsHidden>
        <View style={styles.leafLarge} />
        <View style={styles.leafSmall} />
      </View>
      <Text style={styles.brandName}>IMARA</Text>
      <View style={styles.brandDot} />
    </View>
  );
}

export function AuthFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.frame}>
          <View style={styles.topRow}>
            <BrandMark />
            <View style={styles.privatePill}>
              <View style={styles.privateDot} />
              <Text style={styles.privateText}>PRIVATE BY DESIGN</Text>
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.orbitOuter} />
            <View style={styles.orbitInner} />
            <View style={styles.eyebrowWrap}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrow}>{eyebrow}</Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          <View style={styles.formCard}>{children}</View>

          <Text style={styles.footer}>Your work and moments, together in one place.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor="#9AA69F"
        selectionColor={colors.green}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && !isDisabled ? styles.primaryButtonPressed : null,
        isDisabled ? styles.buttonDisabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.surface} />
      ) : (
        <>
          <Text style={styles.primaryButtonText}>{title}</Text>
          <Text style={styles.buttonArrow}>›</Text>
        </>
      )}
    </Pressable>
  );
}

export function TextLink({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.textLink, pressed ? styles.linkPressed : null]}
    >
      <Text style={[styles.textLinkText, disabled ? styles.linkDisabled : null]}>{title}</Text>
    </Pressable>
  );
}

export function Notice({ children, success = false }: { children: string; success?: boolean }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.notice, success ? styles.noticeSuccess : styles.noticeError]}
    >
      <Text style={[styles.noticeText, success ? styles.noticeSuccessText : null]}>{children}</Text>
    </View>
  );
}

export function ScreenMessage({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.messageScreen}>
      <BrandMark />
      <Text style={styles.messageTitle}>{title}</Text>
      <Text style={styles.messageBody}>{message}</Text>
      {action}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  frame: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandMark: {
    width: 35,
    height: 35,
    borderRadius: 12,
    borderCurve: "continuous",
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  leafLarge: {
    width: 12,
    height: 19,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "42deg" }, { translateX: -1 }],
  },
  leafSmall: {
    position: "absolute",
    width: 7,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#BEE6C8",
    transform: [{ rotate: "-38deg" }, { translateX: 6 }, { translateY: 3 }],
  },
  brandName: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  brandDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.green,
    alignSelf: "flex-end",
    marginBottom: 8,
    marginLeft: -7,
  },
  privatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FBFCF9",
  },
  privateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  privateText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    minHeight: 218,
    justifyContent: "flex-end",
    paddingTop: 40,
    paddingBottom: 28,
  },
  orbitOuter: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 1,
    borderColor: "#DCE7DA",
    right: -120,
    top: 5,
  },
  orbitInner: {
    position: "absolute",
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 1,
    borderColor: "#E3EADD",
    right: -87,
    top: 38,
  },
  eyebrowWrap: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 13,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  eyebrow: {
    color: colors.greenDark,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  title: {
    ...typography.title,
    maxWidth: 340,
  },
  description: {
    ...typography.caption,
    marginTop: 9,
    maxWidth: 370,
    fontSize: 14,
    lineHeight: 21,
  },
  formCard: {
    gap: 16,
    borderRadius: 24,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#E6EBE4",
    backgroundColor: colors.surface,
    padding: 21,
    boxShadow: "0 8px 26px rgba(27, 55, 37, 0.06)",
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    ...typography.label,
  },
  input: {
    minHeight: 52,
    borderRadius: 13,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#FCFDFB",
    paddingHorizontal: 15,
    color: colors.text,
    fontSize: 15,
  },
  inputError: {
    borderColor: colors.red,
  },
  fieldError: {
    color: colors.red,
    fontSize: 12,
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: colors.green,
    paddingHorizontal: 18,
  },
  primaryButtonPressed: {
    backgroundColor: colors.greenDark,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "700",
  },
  buttonArrow: {
    color: colors.surface,
    fontSize: 22,
    lineHeight: 24,
    marginTop: -2,
  },
  textLink: {
    alignSelf: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  linkPressed: {
    opacity: 0.65,
  },
  textLinkText: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  linkDisabled: {
    color: colors.muted,
  },
  notice: {
    borderRadius: 12,
    borderCurve: "continuous",
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  noticeError: {
    borderColor: "#F1D2D1",
    backgroundColor: colors.redWash,
  },
  noticeSuccess: {
    borderColor: "#CFE4D2",
    backgroundColor: colors.greenWash,
  },
  noticeText: {
    color: colors.red,
    fontSize: 13,
    lineHeight: 19,
  },
  noticeSuccessText: {
    color: colors.greenDark,
  },
  footer: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
    paddingTop: 20,
  },
  messageScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    backgroundColor: colors.background,
    padding: 28,
  },
  messageTitle: {
    ...typography.title,
    textAlign: "center",
  },
  messageBody: {
    ...typography.caption,
    maxWidth: 350,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
});
