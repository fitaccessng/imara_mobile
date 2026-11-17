import { Platform, StyleSheet } from "react-native";

export const colors = {
  background: "#F5F7F1",
  surface: "#FFFFFF",
  ink: "#102B46",
  text: "#273A37",
  muted: "#718078",
  line: "#DFE7DF",
  green: "#16834A",
  greenDark: "#11633A",
  greenWash: "#E8F3EA",
  red: "#A73337",
  redWash: "#FFF0EF",
  sand: "#E8E3D7",
};

export const typography = StyleSheet.create({
  title: {
    color: colors.ink,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif" }),
    fontSize: 32,
    letterSpacing: -0.6,
    lineHeight: 39,
  },
  body: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  caption: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
