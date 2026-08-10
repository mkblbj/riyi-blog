import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import siteConfig from "../site/.vitepress/config.js";
import { runtimeSiteManifest } from "../site/.vitepress/site-manifest.js";

function declarationsFor(
  css: string,
  selector: string,
): Record<string, string> {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = css.match(
    new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`),
  )?.[1];
  if (!body) return {};

  return Object.fromEntries(
    body
      .split(";")
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const separator = declaration.indexOf(":");
        return [
          declaration.slice(0, separator).trim(),
          declaration.slice(separator + 1).trim(),
        ];
      }),
  );
}

describe("official site brand CSS", () => {
  it("styles every official-site section", async () => {
    const css = await readFile("site/.vitepress/theme/custom.css", "utf8");

    for (const selector of [
      ".riyi-home-promotion",
      ".riyi-app-download",
      ".riyi-app-download__actions",
      ".riyi-download-action",
      ".riyi-mini-program-token",
      ".riyi-service-grid",
      ".riyi-service-card__image",
      ".riyi-advantage-grid",
      ".riyi-action-panel",
      ".riyi-section-heading",
      ".riyi-article-cta",
    ]) {
      expect(css).toContain(selector);
    }
  });

  it("fits optional service images into the card", async () => {
    const css = await readFile("site/.vitepress/theme/custom.css", "utf8");
    const imageRule = css.match(
      /\.riyi-service-card__image\s*\{([^}]*)\}/,
    )?.[1];

    expect(imageRule).toMatch(/aspect-ratio:\s*16\s*\/\s*9/);
    expect(imageRule).toMatch(/object-fit:\s*cover/);
    expect(imageRule).toMatch(/width:\s*100%/);
    expect(imageRule).toMatch(/border-radius:/);
  });

  it("keeps keyboard, mobile and reduced-motion affordances", async () => {
    const css = await readFile("site/.vitepress/theme/custom.css", "utf8");

    expect(css).toMatch(/\.riyi-action-link[^\n]*:focus-visible/);
    expect(css).toMatch(/\.riyi-download-action[^\n]*:focus-visible/);
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.riyi-download-action/,
    );
  });

  it("projects every derived theme token into the global inline style", () => {
    const themeStyle = siteConfig.head?.find(
      ([tag, attributes]) =>
        tag === "style" && attributes.id === "riyi-theme-tokens",
    );
    const css = themeStyle?.[2];

    expect(css).toBeTypeOf("string");
    expect(declarationsFor(css ?? "", ":root")).toEqual({
      "--riyi-primary": runtimeSiteManifest.themeTokens.primary,
      "--riyi-secondary": runtimeSiteManifest.themeTokens.secondary,
      "--riyi-brand-text": runtimeSiteManifest.themeTokens.brandText,
      "--riyi-brand-hover": runtimeSiteManifest.themeTokens.brandHover,
      "--riyi-brand-strong": runtimeSiteManifest.themeTokens.brandStrong,
      "--riyi-brand-soft": runtimeSiteManifest.themeTokens.brandSoft,
      "--riyi-secondary-strong":
        runtimeSiteManifest.themeTokens.secondaryStrong,
      "--riyi-secondary-muted": runtimeSiteManifest.themeTokens.secondaryMuted,
      "--riyi-on-secondary": runtimeSiteManifest.themeTokens.onSecondary,
    });
    expect(declarationsFor(css ?? "", ".dark")).toEqual({
      "--riyi-brand-text": runtimeSiteManifest.themeTokens.darkBrandText,
      "--riyi-secondary": runtimeSiteManifest.themeTokens.darkSecondary,
      "--riyi-secondary-strong":
        runtimeSiteManifest.themeTokens.darkSecondaryStrong,
      "--riyi-secondary-muted":
        runtimeSiteManifest.themeTokens.darkSecondaryMuted,
    });
  });

  it("consumes theme variables with visual defaults", async () => {
    const css = await readFile("site/.vitepress/theme/custom.css", "utf8");

    expect(declarationsFor(css, ":root")).toMatchObject({
      "--vp-c-brand-1": "var(--riyi-brand-text, #1f6658)",
      "--vp-c-brand-2": "var(--riyi-brand-hover, #174f45)",
      "--vp-c-brand-3": "var(--riyi-brand-strong, #123f37)",
      "--riyi-forest": "var(--riyi-secondary, #17352f)",
    });
    for (const selector of [
      ".riyi-app-download",
      ".riyi-app-download__copy h2",
      ".riyi-download-action",
      ".riyi-action-panel",
      ".riyi-action-copy h2",
      ".riyi-action-link",
    ]) {
      expect(declarationsFor(css, selector).color).toBe(
        "var(--riyi-on-secondary, #ffffff)",
      );
    }
    for (const [selector, opacity] of [
      [".riyi-app-download__copy > p:last-child", "0.72"],
      [".riyi-mini-program-token", "0.86"],
      [".riyi-action-copy > p:last-child", "0.72"],
    ] as const) {
      expect(declarationsFor(css, selector)).toMatchObject({
        color: "var(--riyi-on-secondary, #ffffff)",
        opacity,
      });
    }
  });
});
