import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import siteConfig, * as siteConfigModule from "../site/.vitepress/config.js";
import { runtimeSiteManifest } from "../site/.vitepress/site-manifest.js";
import type { ThemeTokens } from "../src/theme-colors.js";

const iconFilterByForeground: Record<ThemeTokens["onSecondary"], string> = {
  "#ffffff": "brightness(0) invert(1)",
  "#111111": "brightness(0) invert(0.067)",
};

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
    const runtimeCss = themeStyle?.[2];
    const buildThemeCss = (
      siteConfigModule as unknown as {
        buildThemeCss?: (tokens: ThemeTokens) => string;
      }
    ).buildThemeCss;
    const darkForegroundTokens: ThemeTokens = {
      ...runtimeSiteManifest.themeTokens,
      onSecondary: "#111111",
    };

    expect(runtimeCss).toBeTypeOf("string");
    expect(buildThemeCss).toBeTypeOf("function");
    for (const { css, tokens } of [
      {
        css: runtimeCss ?? "",
        tokens: runtimeSiteManifest.themeTokens,
      },
      {
        css: buildThemeCss!(darkForegroundTokens),
        tokens: darkForegroundTokens,
      },
    ]) {
      expect(declarationsFor(css, ":root")).toEqual({
        "--riyi-primary": tokens.primary,
        "--riyi-secondary": tokens.secondary,
        "--riyi-brand-text": tokens.brandText,
        "--riyi-brand-hover": tokens.brandHover,
        "--riyi-brand-strong": tokens.brandStrong,
        "--riyi-brand-soft": tokens.brandSoft,
        "--riyi-secondary-strong": tokens.secondaryStrong,
        "--riyi-secondary-muted": tokens.secondaryMuted,
        "--riyi-on-secondary": tokens.onSecondary,
        "--riyi-on-secondary-filter":
          iconFilterByForeground[tokens.onSecondary],
      });
      expect(declarationsFor(css, ".dark")).toEqual({
        "--riyi-brand-text": tokens.darkBrandText,
        "--riyi-secondary": tokens.darkSecondary,
        "--riyi-secondary-strong": tokens.darkSecondaryStrong,
        "--riyi-secondary-muted": tokens.darkSecondaryMuted,
      });
    }
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

  it("derives branded effects from the editable theme instead of the seeded green palette", async () => {
    const css = await readFile("site/.vitepress/theme/custom.css", "utf8");
    const root = declarationsFor(css, ":root");
    const dark = declarationsFor(css, ".dark");
    const effects = [
      [root["--riyi-border"], "--riyi-brand-text"],
      [root["--riyi-shadow"], "--riyi-secondary-strong"],
      [dark["--riyi-border"], "--riyi-brand-text"],
      [
        declarationsFor(css, ".riyi-home-promotion").background,
        "--riyi-brand-text",
      ],
      [
        declarationsFor(css, ".riyi-app-download")["box-shadow"],
        "--riyi-secondary-strong",
      ],
      [
        declarationsFor(css, ".riyi-action-panel")["box-shadow"],
        "--riyi-secondary-strong",
      ],
      [
        declarationsFor(css, ".riyi-article-cta").background,
        "--riyi-brand-text",
      ],
      [
        declarationsFor(css, ".riyi-article-cta__link:focus-visible").outline,
        "--riyi-brand-text",
      ],
      [
        declarationsFor(css, ".riyi-service-card:hover")["border-color"],
        "--riyi-brand-text",
      ],
      [
        declarationsFor(css, ".riyi-service-card:hover")["box-shadow"],
        "--riyi-secondary-strong",
      ],
    ] as const;

    for (const [effect, token] of effects) {
      expect(effect).toContain(`var(${token}`);
      expect(effect).not.toMatch(
        /rgba\((?:31, 102, 88|20, 55, 48|16, 42, 37),/,
      );
    }
  });

  it("matches image-icon filtering to either allowed secondary foreground", async () => {
    const css = await readFile("site/.vitepress/theme/custom.css", "utf8");
    const buildThemeCss = (
      siteConfigModule as unknown as {
        buildThemeCss?: (tokens: ThemeTokens) => string;
      }
    ).buildThemeCss;

    expect(buildThemeCss).toBeTypeOf("function");
    const darkForegroundCss = buildThemeCss!({
      ...runtimeSiteManifest.themeTokens,
      onSecondary: "#111111",
    });
    expect(
      declarationsFor(darkForegroundCss, ":root")["--riyi-on-secondary-filter"],
    ).toBe("brightness(0) invert(0.067)");
    expect(
      declarationsFor(css, ".riyi-download-action > .tk-icon").filter,
    ).toBe("var(--riyi-on-secondary-filter, brightness(0) invert(1))");
  });

  it("uses the secondary foreground for panel decoration without changing neutral surfaces", async () => {
    const css = await readFile("site/.vitepress/theme/custom.css", "utf8");
    const panelEffects = [
      declarationsFor(css, ".riyi-app-download::after").background,
      declarationsFor(css, ".riyi-download-action").border,
      declarationsFor(css, ".riyi-download-action").background,
      declarationsFor(css, ".riyi-action-panel::after").background,
      declarationsFor(css, ".riyi-action-link").border,
      declarationsFor(css, ".riyi-action-link--primary")["border-color"],
      declarationsFor(css, ".riyi-action-link--primary").background,
      declarationsFor(css, ".riyi-action-link--secondary").background,
      declarationsFor(css, ".riyi-download-action:hover")["border-color"],
      declarationsFor(css, ".riyi-download-action:hover").background,
      declarationsFor(css, ".riyi-action-link--quiet:hover")["border-color"],
      declarationsFor(css, ".riyi-action-link--quiet:hover").background,
      declarationsFor(css, ".riyi-action-link:focus-visible").outline,
    ];

    for (const effect of panelEffects) {
      expect(effect).toBeTypeOf("string");
      expect(effect ?? "").toContain("var(--riyi-on-secondary");
    }
    expect(declarationsFor(css, ":root")["--riyi-surface"]).toBe("#ffffff");
    expect(declarationsFor(css, ".dark")["--riyi-surface"]).toBe("#202321");
  });
});
