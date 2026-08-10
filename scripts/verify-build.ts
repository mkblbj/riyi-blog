import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";
import { glob } from "tinyglobby";
import { SiteManifestSchema, type SiteManifest } from "../src/site-content.js";
import { loadPosts } from "./content/load-posts.js";

export interface VerifyBuildOptions {
  distDir: string;
  contentDir: string;
  manifestPath: string;
  siteManifestPath: string;
}

export interface VerifyResult {
  errors: string[];
  warnings: string[];
}

const credentialPatterns = [
  /LTAI[A-Za-z0-9]{12,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
];

const siteOrigin = new URL("https://www.riyihome.com");

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function localFileForHref(distDir: string, href: string): string | undefined {
  if (href.startsWith("#")) return undefined;
  let url: URL;
  try {
    url = new URL(href, siteOrigin);
  } catch (error) {
    throw new Error(`invalid URL ${href}: ${errorMessage(error)}`, {
      cause: error,
    });
  }
  if (url.origin !== siteOrigin.origin) return undefined;

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (error) {
    throw new Error(`invalid URL encoding ${href}: ${errorMessage(error)}`, {
      cause: error,
    });
  }
  if (/[\\\u0000-\u001f\u007f-\u009f]/.test(pathname)) {
    throw new Error(`unsafe internal link: ${href}`);
  }
  const relativePath = pathname.replace(/^\/+/, "");
  const candidate = pathname.endsWith("/")
    ? join(distDir, relativePath, "index.html")
    : /\.[a-z0-9]+$/i.test(pathname)
      ? join(distDir, relativePath)
      : join(distDir, `${relativePath}.html`);
  const resolvedCandidate = resolve(candidate);
  const relativeCandidate = relative(resolve(distDir), resolvedCandidate);
  if (
    relativeCandidate === ".." ||
    relativeCandidate.startsWith(`..${sep}`) ||
    isAbsolute(relativeCandidate)
  ) {
    throw new Error(`unsafe internal link: ${href}`);
  }
  return resolvedCandidate;
}

function internalNavigationTarget(distDir: string, href: string): string {
  if (!/^\/(?!\/)/.test(href) || /[\\\u0000-\u001f\u007f-\u009f]/.test(href)) {
    throw new Error(`unsafe internal navigation href: ${href}`);
  }
  const target = localFileForHref(distDir, href);
  if (!target) throw new Error(`unsafe internal navigation href: ${href}`);
  return target;
}

async function loadSiteManifest(path: string): Promise<SiteManifest> {
  try {
    return SiteManifestSchema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    throw new Error(`${path}: invalid site manifest: ${errorMessage(error)}`, {
      cause: error,
    });
  }
}

export async function verifyBuild(
  options: VerifyBuildOptions,
): Promise<VerifyResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const siteManifest = await loadSiteManifest(options.siteManifestPath);
  for (const required of [
    "index.html",
    "404.html",
    "rss.xml",
    "sitemap.xml",
    "robots.txt",
  ]) {
    await access(join(options.distDir, required)).catch(() =>
      errors.push(`missing required output: ${required}`),
    );
  }

  const sourcePosts = await loadPosts(options.contentDir);
  const unpublishedIds = sourcePosts
    .filter((post) => post.data.status !== "published")
    .map((post) => post.data.id);
  const files = await glob("**/*", {
    cwd: options.distDir,
    absolute: true,
    onlyFiles: true,
  });
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  const linkChecks: Promise<void>[] = [];
  const homepagePath = join(options.distDir, "index.html");
  const homepage = await readFile(homepagePath, "utf8").catch(() => "");
  if (homepage) {
    const $ = load(homepage);
    if (!$.root().text().includes(siteManifest.content.settings.siteName)) {
      errors.push(
        `index.html: missing CMS current site identity "${siteManifest.content.settings.siteName}"`,
      );
    }
    if ($("style#riyi-theme-tokens").length !== 1) {
      errors.push("index.html: missing #riyi-theme-tokens style");
    }
  }

  for (const navigation of siteManifest.content.navigation.items) {
    if (navigation.external) continue;
    try {
      const target = internalNavigationTarget(options.distDir, navigation.href);
      linkChecks.push(
        access(target).catch(() => {
          errors.push(`missing internal navigation output: ${navigation.href}`);
        }),
      );
    } catch (error) {
      errors.push(
        `unsafe internal navigation ${navigation.href}: ${errorMessage(error)}`,
      );
    }
  }

  for (const category of siteManifest.content.categories) {
    if (!category.enabled) continue;
    linkChecks.push(
      access(
        join(options.distDir, "category", category.slug, "index.html"),
      ).catch(() => {
        errors.push(`missing enabled category output: ${category.slug}`);
      }),
    );
  }

  const officialImages = new Set(
    [
      siteManifest.content.settings.logo,
      siteManifest.content.home.hero.image,
      ...siteManifest.content.home.services.items.map(({ image }) => image),
    ].filter(Boolean),
  );
  for (const imagePath of officialImages) {
    try {
      const target = localFileForHref(options.distDir, imagePath);
      if (!target) {
        errors.push(`invalid official image path: ${imagePath}`);
        continue;
      }
      linkChecks.push(
        access(target).catch(() => {
          errors.push(`missing official image output: ${imagePath}`);
        }),
      );
    } catch (error) {
      errors.push(
        `invalid official image path ${imagePath}: ${errorMessage(error)}`,
      );
    }
  }

  for (const file of files) {
    if (!/\.(?:html|js|css|xml|txt|json)$/i.test(file)) continue;
    const text = await readFile(file, "utf8");
    for (const id of unpublishedIds) {
      if (text.includes(id)) {
        errors.push(`${file}: contains unpublished id ${id}`);
      }
    }
    for (const pattern of credentialPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        errors.push(`${file}: contains credential pattern`);
      }
    }
  }

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const $ = load(html);
    if (!file.endsWith("404.html") && $('link[rel="canonical"]').length !== 1) {
      errors.push(`${file}: expected exactly one canonical link`);
    }
    $("a[href]").each((_index, element) => {
      const href = $(element).attr("href");
      if (!href) return;
      try {
        const target = localFileForHref(options.distDir, href);
        if (target) {
          linkChecks.push(
            access(target).catch(() => {
              errors.push(`${file}: broken internal link ${href}`);
            }),
          );
        }
      } catch (error) {
        errors.push(`${file}: ${errorMessage(error)}`);
      }
    });
    $("img").each((_index, element) => {
      const alt = $(element).attr("alt");
      if (!alt?.trim()) {
        warnings.push(`${file}: image is missing descriptive alt text`);
      }
      const src = $(element).attr("src");
      if (!src) return;
      try {
        const target = localFileForHref(options.distDir, src);
        if (target) {
          linkChecks.push(
            access(target).catch(() => {
              errors.push(`${file}: broken image ${src}`);
            }),
          );
        }
      } catch (error) {
        errors.push(`${file}: ${errorMessage(error)}`);
      }
    });
  }

  await Promise.all(linkChecks);
  const manifest = JSON.parse(await readFile(options.manifestPath, "utf8")) as {
    posts: Array<{ id: string; permalink: string }>;
  };
  const rss = await readFile(join(options.distDir, "rss.xml"), "utf8");
  const sitemap = await readFile(join(options.distDir, "sitemap.xml"), "utf8");
  for (const post of manifest.posts) {
    const articleFile = join(options.distDir, post.permalink, "index.html");
    await access(articleFile).catch(() =>
      errors.push(`missing article output: ${post.permalink}`),
    );
    const html = await readFile(articleFile, "utf8").catch(() => "");
    const $ = load(html);
    if (
      $('script[type="application/ld+json"]').filter((_index, node) =>
        $(node).text().includes("BlogPosting"),
      ).length === 0
    ) {
      errors.push(`${articleFile}: missing BlogPosting JSON-LD`);
    }
    if (!rss.includes(post.id)) {
      errors.push(`rss.xml: missing published id ${post.id}`);
    }
    if (!sitemap.includes(post.id)) {
      errors.push(`sitemap.xml: missing published id ${post.id}`);
    }
  }

  if (errors.length) throw new Error(errors.join("\n"));
  return { errors, warnings };
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await verifyBuild({
    distDir: join(projectRoot, "site/.vitepress/dist"),
    contentDir: join(projectRoot, "content"),
    manifestPath: join(projectRoot, ".generated/posts.json"),
    siteManifestPath: join(projectRoot, ".generated/site.json"),
  });
  for (const warning of result.warnings) {
    console.warn(`warning: ${warning}`);
  }
}
