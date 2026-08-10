import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveSiteContent } from "../src/site-content.js";
import { loadSiteContent } from "../scripts/content/load-site.js";
import { applySiteMediaManifest } from "../scripts/content/site-images.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function siteContentWithImages() {
  const content = structuredClone(
    resolveSiteContent(loadSiteContent(join(projectRoot, "content"))),
  );
  content.settings.logo = "/site-media/logo.png";
  content.home.hero.image = "/site-media/hero.png";
  content.home.services.items[0]!.image = "/site-media/rent.png";
  return content;
}

describe("official-site media", () => {
  it("rewrites every configured official-site image without mutating the input", () => {
    const content = siteContentWithImages();
    const rewritten = applySiteMediaManifest(content, {
      paths: new Map([
        ["/site-media/logo.png", "/site-media/logo.111111111111.webp"],
        ["/site-media/hero.png", "/site-media/hero.222222222222.webp"],
        ["/site-media/rent.png", "/site-media/rent.333333333333.webp"],
      ]),
      files: [],
    });

    expect(rewritten.settings.logo).toBe("/site-media/logo.111111111111.webp");
    expect(rewritten.home.hero.image).toBe(
      "/site-media/hero.222222222222.webp",
    );
    expect(rewritten.home.services.items[0]?.image).toBe(
      "/site-media/rent.333333333333.webp",
    );
    expect(content.settings.logo).toBe("/site-media/logo.png");
    expect(content.home.hero.image).toBe("/site-media/hero.png");
    expect(content.home.services.items[0]?.image).toBe("/site-media/rent.png");
  });

  it("rejects a configured image that is absent from the media manifest", () => {
    const content = siteContentWithImages();
    content.settings.logo = "";

    expect(() =>
      applySiteMediaManifest(content, { paths: new Map(), files: [] }),
    ).toThrow("content/site/home.yml: missing site image /site-media/hero.png");
  });
});
