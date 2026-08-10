import { z } from "zod";

interface Rgb {
  red: number;
  green: number;
  blue: number;
}

export interface ThemeTokens {
  primary: string;
  secondary: string;
  brandText: string;
  brandHover: string;
  brandStrong: string;
  brandSoft: string;
  secondaryStrong: string;
  secondaryMuted: string;
  onSecondary: "#111111" | "#ffffff";
  darkBrandText: string;
  darkSecondary: string;
  darkSecondaryStrong: string;
  darkSecondaryMuted: string;
}

const themeColor = z.string().regex(/^#[0-9a-f]{6}$/);

export const ThemeTokensSchema = z.strictObject({
  primary: themeColor,
  secondary: themeColor,
  brandText: themeColor,
  brandHover: themeColor,
  brandStrong: themeColor,
  brandSoft: themeColor,
  secondaryStrong: themeColor,
  secondaryMuted: themeColor,
  onSecondary: z.enum(["#111111", "#ffffff"]),
  darkBrandText: themeColor,
  darkSecondary: themeColor,
  darkSecondaryStrong: themeColor,
  darkSecondaryMuted: themeColor,
});

export function parseHexColor(value: string): Rgb {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`invalid hex color "${value}"`);
  }

  return {
    red: Number.parseInt(value.slice(1, 3), 16),
    green: Number.parseInt(value.slice(3, 5), 16),
    blue: Number.parseInt(value.slice(5, 7), 16),
  };
}

function formatHexColor({ red, green, blue }: Rgb): string {
  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function mix(left: string, right: string, amount: number): string {
  const leftRgb = parseHexColor(left);
  const rightRgb = parseHexColor(right);
  const leftAmount = 1 - amount;

  return formatHexColor({
    red: Math.round(leftRgb.red * leftAmount + rightRgb.red * amount),
    green: Math.round(leftRgb.green * leftAmount + rightRgb.green * amount),
    blue: Math.round(leftRgb.blue * leftAmount + rightRgb.blue * amount),
  });
}

function relativeLuminance(color: string): number {
  const { red, green, blue } = parseHexColor(color);
  const linear = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

export function contrastRatio(left: string, right: string): number {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function deriveAccessibleText(
  color: string,
  background: string,
  adjustment: "#000000" | "#ffffff",
): string {
  let result = color;

  while (contrastRatio(result, background) < 4.5) {
    const next = mix(result, adjustment, 0.08);
    if (next === result) {
      return adjustment;
    }
    result = next;
  }

  return result;
}

export function createThemeTokens(
  primary: string,
  secondary: string,
): ThemeTokens {
  const normalizedPrimary = formatHexColor(parseHexColor(primary));
  const normalizedSecondary = formatHexColor(parseHexColor(secondary));
  const onSecondary =
    contrastRatio("#111111", normalizedSecondary) >=
    contrastRatio("#ffffff", normalizedSecondary)
      ? "#111111"
      : "#ffffff";

  if (contrastRatio(onSecondary, normalizedSecondary) < 4.5) {
    throw new Error(
      `secondary color "${secondary}" does not support accessible text`,
    );
  }

  return ThemeTokensSchema.parse({
    primary: normalizedPrimary,
    secondary: normalizedSecondary,
    brandText: deriveAccessibleText(normalizedPrimary, "#ffffff", "#000000"),
    brandHover: mix(normalizedPrimary, "#000000", 0.18),
    brandStrong: mix(normalizedPrimary, "#000000", 0.34),
    brandSoft: mix("#ffffff", normalizedPrimary, 0.14),
    secondaryStrong: mix(normalizedSecondary, "#000000", 0.24),
    secondaryMuted: mix("#ffffff", normalizedSecondary, 0.12),
    onSecondary,
    darkBrandText: deriveAccessibleText(
      normalizedPrimary,
      "#202321",
      "#ffffff",
    ),
    darkSecondary: mix(normalizedSecondary, "#ffffff", 0.18),
    darkSecondaryStrong: mix(normalizedSecondary, "#ffffff", 0.34),
    darkSecondaryMuted: mix("#202321", normalizedSecondary, 0.14),
  });
}
