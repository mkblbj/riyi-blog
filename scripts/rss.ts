import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Feed } from "feed";
import {
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
} from "../src/site.js";
import type { BuildManifest } from "./content/schema.js";

export async function writeRss(
  manifest: BuildManifest,
  outputPath: string,
): Promise<void> {
  const feed = new Feed({
    title: `${SITE_TITLE}博客`,
    description: SITE_DESCRIPTION,
    id: SITE_URL,
    link: SITE_URL,
    language: "zh-CN",
    image: `${SITE_URL}/brand/og-default.png`,
    favicon: `${SITE_URL}/brand/og-default.png`,
    copyright: `© ${new Date().getFullYear()} ${SITE_TITLE}`,
    updated: new Date(manifest.generatedAt),
    feedLinks: { rss2: `${SITE_URL}/rss.xml` },
    author: { name: SITE_TITLE, link: SITE_URL },
  });

  for (const post of manifest.posts) {
    feed.addItem({
      title: post.title,
      id: `${SITE_URL}${post.permalink}`,
      link: `${SITE_URL}${post.permalink}`,
      description: post.description,
      date: new Date(post.date),
      author: [{ name: post.author.name }],
      category: [
        ...post.categories.map((name) => ({ name })),
        ...post.tags.map((name) => ({ name })),
      ],
      image: new URL(post.coverImg, SITE_URL).toString(),
    });
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, feed.rss2(), "utf8");
}
