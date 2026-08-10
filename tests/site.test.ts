import { readFileSync } from "node:fs";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { PLATFORM_LINKS } from "../src/platform-links.js";
import { SiteManifestSchema, type SiteManifest } from "../src/site-content.js";
import { PLATFORM_URL, SITE_URL } from "../src/site.js";
import siteConfig from "../site/.vitepress/config.js";
import { teekConfig, teekVitePlugins } from "../site/.vitepress/teek-config.js";

const runtimeManifest = SiteManifestSchema.parse(
  JSON.parse(readFileSync(".generated/site.json", "utf8")),
);

async function runtimeManifestLoader() {
  const manifestModule =
    (await import("../site/.vitepress/site-manifest.js")) as {
      loadRuntimeSiteManifest?: (projectRoot?: string) => SiteManifest;
    };
  expect(manifestModule.loadRuntimeSiteManifest).toBeTypeOf("function");
  return manifestModule.loadRuntimeSiteManifest!;
}

describe("site contract", () => {
  it("keeps the blog and property platform on separate hosts", () => {
    expect(SITE_URL).toBe("https://www.riyihome.com");
    expect(PLATFORM_URL).toBe("https://riyihome.com");
  });

  it("uses only HTTPS business entry points", () => {
    expect(PLATFORM_LINKS).toEqual({
      home: "https://riyihome.com",
      submitDemand: "https://riyihome.com/index.html#/pages/project/advisory",
      wechatConsult: "https://work.weixin.qq.com/kfid/kfcc5d6c8170e5733d0",
    });
    for (const url of Object.values(PLATFORM_LINKS)) {
      expect(new URL(url).protocol).toBe("https:");
    }
  });

  it("loads the generated runtime manifest before source content", async () => {
    const loadRuntimeSiteManifest = await runtimeManifestLoader();

    expect(loadRuntimeSiteManifest()).toEqual(runtimeManifest);
  });

  it("falls back to source YAML only when the generated manifest is absent", async () => {
    const root = await mkdtemp(join(tmpdir(), "riyi-runtime-site-"));
    await cp("content", join(root, "content"), { recursive: true });
    const settingsPath = join(root, "content/site/settings.yml");
    const settings = await readFile(settingsPath, "utf8");
    await writeFile(
      settingsPath,
      settings.replace('logo: ""', "logo: /site-media/customer-logo.png"),
      "utf8",
    );
    const loadRuntimeSiteManifest = await runtimeManifestLoader();

    const manifest = loadRuntimeSiteManifest(root);

    expect(manifest.content.settings.logo).toBe(
      "/site-media/customer-logo.png",
    );
    expect(manifest.themeTokens).toMatchObject({
      primary: "#1f6658",
      secondary: "#17352f",
    });
  });

  it("reports the generated manifest path instead of masking invalid JSON", async () => {
    const root = await mkdtemp(join(tmpdir(), "riyi-runtime-site-"));
    const generatedDir = join(root, ".generated");
    const manifestPath = join(generatedDir, "site.json");
    await mkdir(generatedDir, { recursive: true });
    await writeFile(manifestPath, "{ invalid json", "utf8");
    const loadRuntimeSiteManifest = await runtimeManifestLoader();

    expect(() => loadRuntimeSiteManifest(root)).toThrow(manifestPath);
  });

  it("reports the generated manifest path for non-ENOENT read failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "riyi-runtime-site-"));
    const manifestPath = join(root, ".generated/site.json");
    await mkdir(manifestPath, { recursive: true });
    const loadRuntimeSiteManifest = await runtimeManifestLoader();

    expect(() => loadRuntimeSiteManifest(root)).toThrow(manifestPath);
  });

  it("projects runtime identity and content into VitePress and Teek", () => {
    const site = runtimeManifest.content;
    const themeConfig = siteConfig.themeConfig as unknown as Record<
      string,
      unknown
    >;
    const teekTheme = teekConfig.themeConfig as Record<string, any>;
    const expectedFeatures = site.home.hero.quickLinks
      .filter(({ enabled }) => enabled)
      .sort((left, right) => left.order - right.order)
      .map(({ title, description, href }) => ({
        title,
        details: description,
        link: href,
      }));

    expect(siteConfig).toMatchObject({
      title: site.settings.siteName,
      titleTemplate: `:title｜${site.settings.siteName}`,
      description: site.settings.siteDescription,
    });
    expect(themeConfig).toMatchObject({
      logo: site.settings.logo || undefined,
      riyi: site,
    });
    expect(teekTheme.author).toMatchObject({ name: site.settings.siteName });
    expect(teekTheme.blogger).toMatchObject({
      name: site.settings.siteName,
      slogan: site.settings.siteDescription,
      avatar: site.settings.logo || "/brand/og-default.png",
    });
    expect(teekTheme.banner).toMatchObject({
      name: site.home.hero.title,
      bgStyle: site.home.hero.image ? "partImg" : "pure",
      pureBgColor: site.settings.secondaryColor,
      textColor: runtimeManifest.themeTokens.onSecondary,
      description: [site.home.hero.description],
      features: expectedFeatures,
    });
    expect(teekTheme.footerInfo.copyright.suffix).toBe(site.settings.siteName);
  });

  it("overrides stale homepage frontmatter with runtime identity", async () => {
    const pageData = {
      relativePath: "index.md",
      title: "旧首页标题",
      frontmatter: { description: "旧首页说明" },
    };

    await siteConfig.transformPageData?.(pageData as never, {} as never);

    expect(pageData.title).toBe(runtimeManifest.content.settings.siteName);
    expect(pageData.frontmatter.description).toBe(
      runtimeManifest.content.settings.siteDescription,
    );
  });

  it("contains every required fixed page", async () => {
    await Promise.all(
      [
        "site/index.md",
        "site/categories/index.md",
        "site/tags/index.md",
        "site/archives/index.md",
        "site/about/index.md",
        "site/privacy/index.md",
        "site/404.md",
      ].map((path) => expect(access(path)).resolves.toBeUndefined()),
    );
  });

  it("uses the official-site identity on the homepage", async () => {
    const source = await readFile("site/index.md", "utf8");
    const { data } = matter(source);

    expect(data.title).toBe(runtimeManifest.content.settings.siteName);
    expect(data.description).toBe(
      runtimeManifest.content.settings.siteDescription,
    );
  });

  it("keeps the official about page free of blog-only navigation", async () => {
    const source = await readFile("site/about/index.md", "utf8");
    const { data } = matter(source);

    expect(data).toMatchObject({
      article: false,
      articleUpdate: false,
      lastUpdated: false,
      next: false,
      prev: false,
      sidebar: false,
    });
  });

  it("does not rewrite native directory article routes on the client", () => {
    const pluginNames = (teekConfig.vite?.plugins ?? [])
      .flat()
      .map((plugin) =>
        plugin && typeof plugin === "object" && "name" in plugin
          ? plugin.name
          : "",
      );

    expect(pluginNames).not.toContain("vite-plugin-vitepress-auto-permalink");
    expect(pluginNames).not.toContain("vite-plugin-vitepress-use-permalink");
  });

  it("keeps generated post folders out of the public sidebar", () => {
    expect(teekVitePlugins.sidebarOption.ignoreList).toContain("posts");
  });

  it("does not expose implementation folder names as breadcrumbs", () => {
    expect(teekConfig.themeConfig?.breadcrumb).toEqual({ enabled: false });
  });

  it("selects a Simplified Chinese font before Japanese fallbacks", async () => {
    const css = await readFile("site/.vitepress/theme/custom.css", "utf8");
    const declaration = css.match(/--vp-font-family-base:\s*([^;]+);/)?.[1];
    const families = declaration
      ?.split(",")
      .map((family) => family.trim().replace(/^["']|["']$/g, ""));
    const availableFonts = new Set([
      "Noto Sans JP",
      "Hiragino Sans",
      "PingFang SC",
      "sans-serif",
    ]);

    expect(families?.find((family) => availableFonts.has(family))).toBe(
      "PingFang SC",
    );
  });
});
