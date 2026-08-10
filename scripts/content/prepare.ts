import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveSiteContent,
  SiteManifestSchema,
  type SiteManifest,
} from "../../src/site-content.js";
import { SITE_URL } from "../../src/site.js";
import { createThemeTokens } from "../../src/theme-colors.js";
import { writeRss } from "../rss.js";
import { applyMediaManifest, optimizeMedia } from "./images.js";
import { loadPosts } from "./load-posts.js";
import { loadSiteContent } from "./load-site.js";
import { renderCategoryPage } from "./render-category.js";
import { renderPost, toPublicPost } from "./render-post.js";
import { BuildManifest, PrepareOptions } from "./schema.js";
import { applySiteMediaManifest } from "./site-images.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export async function prepareContent(
  options: PrepareOptions = {
    contentDir: join(projectRoot, "content"),
    siteDir: join(projectRoot, "site"),
    manifestPath: join(projectRoot, ".generated/posts.json"),
    optimizeImages: true,
  },
): Promise<BuildManifest> {
  const siteContent = resolveSiteContent(loadSiteContent(options.contentDir));
  const loaded = await loadPosts(options.contentDir);
  const postsOutput = join(options.siteDir, "posts");
  const categoriesOutput = join(options.siteDir, "category");
  await rm(postsOutput, { recursive: true, force: true });
  await rm(categoriesOutput, { recursive: true, force: true });
  await mkdir(postsOutput, { recursive: true });
  await mkdir(categoriesOutput, { recursive: true });

  const media =
    options.optimizeImages === false
      ? undefined
      : await optimizeMedia(
          join(options.contentDir, "media"),
          join(options.siteDir, "public/media"),
        );
  const siteMedia =
    options.optimizeImages === false
      ? undefined
      : await optimizeMedia(
          join(options.contentDir, "site-media"),
          join(options.siteDir, "public/site-media"),
          "/site-media",
        );
  const publicSiteContent = siteMedia
    ? applySiteMediaManifest(siteContent, siteMedia)
    : siteContent;
  const posts = loaded
    .filter((post) => post.data.status === "published")
    .map((post) => toPublicPost(post, siteContent.categories))
    .map((post) => (media ? applyMediaManifest(post, media) : post))
    .sort((left, right) => right.date.localeCompare(left.date));

  for (const post of posts) {
    const output = join(postsOutput, post.id, "index.md");
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, renderPost(post), "utf8");
  }

  for (const category of siteContent.categories.filter(
    ({ enabled }) => enabled,
  )) {
    const output = join(categoriesOutput, category.slug, "index.md");
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, renderCategoryPage(category, posts), "utf8");
  }

  const manifest: BuildManifest = {
    generatedAt: new Date().toISOString(),
    posts,
  };
  await mkdir(dirname(options.manifestPath), { recursive: true });
  await writeFile(
    options.manifestPath,
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  const siteManifestPath =
    options.siteManifestPath ??
    join(dirname(options.manifestPath), "site.json");
  const siteManifest: SiteManifest = SiteManifestSchema.parse({
    generatedAt: manifest.generatedAt,
    content: publicSiteContent,
    themeTokens: createThemeTokens(
      publicSiteContent.settings.primaryColor,
      publicSiteContent.settings.secondaryColor,
    ),
  });
  await mkdir(dirname(siteManifestPath), { recursive: true });
  await writeFile(
    siteManifestPath,
    JSON.stringify(siteManifest, null, 2),
    "utf8",
  );
  await writeRss(manifest, join(options.siteDir, "public/rss.xml"), {
    title: publicSiteContent.settings.siteName,
    description: publicSiteContent.settings.siteDescription,
    logo: publicSiteContent.settings.logo,
    url: SITE_URL,
  });
  return manifest;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await prepareContent();
}
