import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Feed } from "feed";
import type { BuildManifest } from "./content/schema.js";

interface RssIdentity {
  title: string;
  description: string;
  logo: string;
  url: string;
}

export async function writeRss(
  manifest: BuildManifest,
  outputPath: string,
  { title, description, logo, url }: RssIdentity,
): Promise<void> {
  const feedImage = new URL(logo || "/brand/og-default.png", url).toString();
  const feed = new Feed({
    title: `${title}资讯`,
    description,
    id: url,
    link: url,
    language: "zh-CN",
    image: feedImage,
    favicon: feedImage,
    copyright: `© ${new Date().getFullYear()} ${title}`,
    updated: new Date(manifest.generatedAt),
    feedLinks: { rss2: new URL("/rss.xml", url).toString() },
    author: { name: title, link: url },
  });
  feed.addExtension({
    name: "author",
    objects: {
      _attributes: { xmlns: "http://www.w3.org/2005/Atom" },
      name: { _text: title },
      uri: { _text: url },
    },
  });

  for (const post of manifest.posts) {
    feed.addItem({
      title: post.title,
      id: new URL(post.permalink, url).toString(),
      link: new URL(post.permalink, url).toString(),
      description: post.description,
      date: new Date(post.date),
      author: [{ name: post.author.name }],
      category: [
        ...post.categories.map((name) => ({ name })),
        ...post.tags.map((name) => ({ name })),
      ],
      image: new URL(post.coverImg, url).toString(),
    });
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, feed.rss2(), "utf8");
}
