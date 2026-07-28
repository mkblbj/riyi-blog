import { access, readFile } from "node:fs/promises";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";
import { glob } from "tinyglobby";
import { loadPosts } from "./content/load-posts.js";

export interface VerifyBuildOptions {
  distDir: string;
  contentDir: string;
  manifestPath: string;
}

export interface VerifyResult {
  errors: string[];
  warnings: string[];
}

const credentialPatterns = [
  /LTAI[A-Za-z0-9]{12,}/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
];

function localFileForHref(
  distDir: string,
  href: string,
): string | undefined {
  if (/^(?:https?:|mailto:|tel:|#)/.test(href)) return undefined;
  const pathname = decodeURIComponent(
    new URL(href, "https://www.riyihome.com").pathname,
  );
  const relativePath = pathname.replace(/^\/+/, "");
  const candidate = pathname.endsWith("/")
    ? join(distDir, relativePath, "index.html")
    : /\.[a-z0-9]+$/i.test(pathname)
      ? join(distDir, relativePath)
      : join(distDir, `${relativePath}.html`);
  const normalized = normalize(candidate);
  if (relative(resolve(distDir), resolve(normalized)).startsWith("..")) {
    throw new Error(`unsafe internal link: ${href}`);
  }
  return normalized;
}

export async function verifyBuild(
  options: VerifyBuildOptions,
): Promise<VerifyResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
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
    if (
      !file.endsWith("404.html") &&
      $('link[rel="canonical"]').length !== 1
    ) {
      errors.push(`${file}: expected exactly one canonical link`);
    }
    $("a[href]").each((_index, element) => {
      const href = $(element).attr("href");
      if (!href) return;
      const target = localFileForHref(options.distDir, href);
      if (target) {
        linkChecks.push(
          access(target).catch(() => {
            errors.push(`${file}: broken internal link ${href}`);
          }),
        );
      }
    });
    $("img").each((_index, element) => {
      const alt = $(element).attr("alt");
      if (!alt?.trim()) {
        warnings.push(`${file}: image is missing descriptive alt text`);
      }
      const src = $(element).attr("src");
      if (!src) return;
      const target = localFileForHref(options.distDir, src);
      if (target) {
        linkChecks.push(
          access(target).catch(() => {
            errors.push(`${file}: broken image ${src}`);
          }),
        );
      }
    });
  }

  await Promise.all(linkChecks);
  const manifest = JSON.parse(
    await readFile(options.manifestPath, "utf8"),
  ) as {
    posts: Array<{ id: string; permalink: string }>;
  };
  const rss = await readFile(join(options.distDir, "rss.xml"), "utf8");
  const sitemap = await readFile(
    join(options.distDir, "sitemap.xml"),
    "utf8",
  );
  for (const post of manifest.posts) {
    const articleFile = join(
      options.distDir,
      post.permalink,
      "index.html",
    );
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
  });
  for (const warning of result.warnings) {
    console.warn(`warning: ${warning}`);
  }
}
