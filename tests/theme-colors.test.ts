import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  createThemeTokens,
  parseHexColor,
  ThemeTokensSchema,
} from "../src/theme-colors.js";

describe("brand theme colors", () => {
  it("derives stable light and dark tokens from two colors", () => {
    expect(createThemeTokens("#1f6658", "#17352f")).toEqual({
      primary: "#1f6658",
      secondary: "#17352f",
      brandText: "#1f6658",
      brandHover: "#195448",
      brandStrong: "#14433a",
      brandSoft: "#e0eae8",
      secondaryStrong: "#112824",
      secondaryMuted: "#e3e7e6",
      onSecondary: "#ffffff",
      darkBrandText: "#6b9a90",
      darkSecondary: "#415954",
      darkSecondaryStrong: "#667a76",
      darkSecondaryMuted: "#1f2623",
    });
  });

  it("keeps generated text and links readable", () => {
    for (const [primary, secondary] of [
      ["#f6d365", "#fda085"],
      ["#2463eb", "#172554"],
      ["#9333ea", "#3b0764"],
    ] as const) {
      const tokens = createThemeTokens(primary, secondary);
      expect(contrastRatio(tokens.brandText, "#ffffff")).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        contrastRatio(tokens.onSecondary, secondary),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(tokens.darkBrandText, "#202321"),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("rejects invalid hex colors with the field value", () => {
    expect(() => createThemeTokens("green", "#17352f")).toThrow(
      'invalid hex color "green"',
    );
    expect(() => parseHexColor("#fff")).toThrow('invalid hex color "#fff"');
  });

  it("uses rounded channels and reaches contrast for extreme colors", () => {
    const tokens = createThemeTokens("#ffffff", "#000000");

    expect(tokens).toMatchObject({
      brandHover: "#d1d1d1",
      brandStrong: "#a8a8a8",
      brandText: "#6f6f6f",
      darkBrandText: "#ffffff",
      onSecondary: "#ffffff",
    });
    expect(contrastRatio(tokens.brandText, "#ffffff")).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      contrastRatio(tokens.darkBrandText, "#202321"),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("reports canonical WCAG contrast and rejects schema extras", () => {
    const tokens = createThemeTokens("#010101", "#000000");

    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(tokens.brandHover).toBe("#010101");
    expect(ThemeTokensSchema.safeParse(tokens).success).toBe(true);
    expect(
      ThemeTokensSchema.safeParse({ ...tokens, unexpected: "value" }).success,
    ).toBe(false);
  });
});
