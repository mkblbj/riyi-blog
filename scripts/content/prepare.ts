import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
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

interface StagedOutput {
  stagedPath: string;
  targetPath: string;
}

function isMissingPath(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

async function moveIfPresent(source: string, target: string): Promise<boolean> {
  try {
    await rename(source, target);
    return true;
  } catch (error) {
    if (isMissingPath(error)) {
      return false;
    }
    throw error;
  }
}

async function replaceGeneratedOutputs(
  outputs: readonly StagedOutput[],
  backupRoot: string,
): Promise<void> {
  await mkdir(backupRoot, { recursive: true });
  const applied: Array<{
    targetPath: string;
    backupPath: string;
    hadTarget: boolean;
  }> = [];

  try {
    for (const [index, output] of outputs.entries()) {
      await mkdir(dirname(output.targetPath), { recursive: true });
      const backupPath = join(backupRoot, String(index));
      const hadTarget = await moveIfPresent(output.targetPath, backupPath);
      try {
        await rename(output.stagedPath, output.targetPath);
      } catch (error) {
        if (hadTarget) {
          await rename(backupPath, output.targetPath);
        }
        throw error;
      }
      applied.push({
        targetPath: output.targetPath,
        backupPath,
        hadTarget,
      });
    }
  } catch (error) {
    for (const output of applied.reverse()) {
      await rm(output.targetPath, { recursive: true, force: true });
      if (output.hadTarget) {
        await rename(output.backupPath, output.targetPath);
      }
    }
    throw error;
  }
}

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
  const siteManifestPath =
    options.siteManifestPath ??
    join(dirname(options.manifestPath), "site.json");
  await mkdir(dirname(options.siteDir), { recursive: true });
  const stagingRoot = await mkdtemp(
    join(dirname(options.siteDir), ".content-prepare-"),
  );

  try {
    const stagedSiteDir = join(stagingRoot, "site");
    const postsOutput = join(stagedSiteDir, "posts");
    const categoriesOutput = join(stagedSiteDir, "category");
    const mediaOutput = join(stagedSiteDir, "public/media");
    const siteMediaOutput = join(stagedSiteDir, "public/site-media");
    const rssOutput = join(stagedSiteDir, "public/rss.xml");
    const stagedPostsManifest = join(stagingRoot, "posts.json");
    const stagedSiteManifest = join(stagingRoot, "site.json");
    await mkdir(postsOutput, { recursive: true });
    await mkdir(categoriesOutput, { recursive: true });

    const media =
      options.optimizeImages === false
        ? undefined
        : await optimizeMedia(join(options.contentDir, "media"), mediaOutput);
    const siteMedia =
      options.optimizeImages === false
        ? undefined
        : await optimizeMedia(
            join(options.contentDir, "site-media"),
            siteMediaOutput,
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
    await writeFile(
      stagedPostsManifest,
      JSON.stringify(manifest, null, 2),
      "utf8",
    );
    const siteManifest: SiteManifest = SiteManifestSchema.parse({
      generatedAt: manifest.generatedAt,
      content: publicSiteContent,
      themeTokens: createThemeTokens(
        publicSiteContent.settings.primaryColor,
        publicSiteContent.settings.secondaryColor,
      ),
    });
    await writeFile(
      stagedSiteManifest,
      JSON.stringify(siteManifest, null, 2),
      "utf8",
    );
    await writeRss(manifest, rssOutput, {
      title: publicSiteContent.settings.siteName,
      description: publicSiteContent.settings.siteDescription,
      logo: publicSiteContent.settings.logo,
      url: SITE_URL,
    });

    const outputs: StagedOutput[] = [
      {
        stagedPath: postsOutput,
        targetPath: join(options.siteDir, "posts"),
      },
      {
        stagedPath: categoriesOutput,
        targetPath: join(options.siteDir, "category"),
      },
    ];
    if (media && siteMedia) {
      outputs.push(
        {
          stagedPath: mediaOutput,
          targetPath: join(options.siteDir, "public/media"),
        },
        {
          stagedPath: siteMediaOutput,
          targetPath: join(options.siteDir, "public/site-media"),
        },
      );
    }
    outputs.push(
      {
        stagedPath: rssOutput,
        targetPath: join(options.siteDir, "public/rss.xml"),
      },
      { stagedPath: stagedPostsManifest, targetPath: options.manifestPath },
      { stagedPath: stagedSiteManifest, targetPath: siteManifestPath },
    );
    await replaceGeneratedOutputs(outputs, join(stagingRoot, "backups"));
    return manifest;
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await prepareContent();
}
