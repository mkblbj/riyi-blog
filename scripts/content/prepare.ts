import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeRss } from "../rss.js";
import { applyMediaManifest, optimizeMedia } from "./images.js";
import { loadPosts } from "./load-posts.js";
import { renderPost, toPublicPost } from "./render-post.js";
import { BuildManifest, PrepareOptions } from "./schema.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export async function prepareContent(
  options: PrepareOptions = {
    contentDir: join(projectRoot, "content"),
    siteDir: join(projectRoot, "site"),
    manifestPath: join(projectRoot, ".generated/posts.json"),
    optimizeImages: true,
  },
): Promise<BuildManifest> {
  const postsOutput = join(options.siteDir, "posts");
  await rm(postsOutput, { recursive: true, force: true });
  await mkdir(postsOutput, { recursive: true });

  const loaded = await loadPosts(options.contentDir);
  const media =
    options.optimizeImages === false
      ? undefined
      : await optimizeMedia(
          join(options.contentDir, "media"),
          join(options.siteDir, "public/media"),
        );
  const posts = loaded
    .filter((post) => post.data.status === "published")
    .map(toPublicPost)
    .map((post) => (media ? applyMediaManifest(post, media) : post))
    .sort((left, right) => right.date.localeCompare(left.date));

  for (const post of posts) {
    const output = join(postsOutput, post.id, "index.md");
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, renderPost(post), "utf8");
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
  await writeRss(manifest, join(options.siteDir, "public/rss.xml"));
  return manifest;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await prepareContent();
}
