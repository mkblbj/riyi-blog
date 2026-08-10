import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SiteManifestSchema } from "../../src/site-content.js";
import { SITE_URL } from "../../src/site.js";
import type { BuildManifest } from "../content/schema.js";
import { smoke } from "../smoke.js";
import { planUpload } from "./cache-policy.js";
import { createCdnClient, refreshUrls, urlsForRefresh } from "./cdn.js";
import { createOssClient, removeStaleHtml, uploadPlan } from "./oss.js";

function requireEnvironment(env: NodeJS.ProcessEnv): {
  ALIYUN_ACCESS_KEY_ID: string;
  ALIYUN_ACCESS_KEY_SECRET: string;
  ALIYUN_OSS_REGION: string;
  ALIYUN_OSS_BUCKET: string;
} {
  const names = [
    "ALIYUN_ACCESS_KEY_ID",
    "ALIYUN_ACCESS_KEY_SECRET",
    "ALIYUN_OSS_REGION",
    "ALIYUN_OSS_BUCKET",
  ] as const;
  const missing = names.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing deployment environment: ${missing.join(", ")}`);
  }
  return Object.fromEntries(names.map((name) => [name, env[name]!])) as {
    ALIYUN_ACCESS_KEY_ID: string;
    ALIYUN_ACCESS_KEY_SECRET: string;
    ALIYUN_OSS_REGION: string;
    ALIYUN_OSS_BUCKET: string;
  };
}

export function deploymentSmokePaths(
  posts: readonly { permalink: string }[],
  categories: readonly { slug: string; enabled: boolean }[],
): string[] {
  return [
    "/",
    ...posts.slice(0, 3).map(({ permalink }) => permalink),
    ...categories
      .filter(({ enabled }) => enabled)
      .map(({ slug }) => `/category/${slug}/`),
  ];
}

export async function runDeployment(): Promise<void> {
  const env = requireEnvironment(process.env);
  const root = resolve(import.meta.dirname, "../..");
  const plan = await planUpload(resolve(root, "site/.vitepress/dist"));
  const oss = createOssClient(env);
  const uploaded = await uploadPlan(oss, plan);
  const currentObjectNames = new Set(
    [...plan.assets, ...plan.documents].map((entry) => entry.objectName),
  );
  const removedHtml = await removeStaleHtml(oss, currentObjectNames);
  const refreshed = urlsForRefresh([...uploaded, ...removedHtml]);
  await refreshUrls(createCdnClient(env), refreshed);

  const manifest = JSON.parse(
    await readFile(resolve(root, ".generated/posts.json"), "utf8"),
  ) as BuildManifest;
  const siteManifest = SiteManifestSchema.parse(
    JSON.parse(await readFile(resolve(root, ".generated/site.json"), "utf8")),
  );
  const smokeBaseUrl = process.env.SMOKE_BASE_URL || SITE_URL;
  const canonicalPaths = deploymentSmokePaths(
    manifest.posts,
    siteManifest.content.categories,
  );
  const smokePaths =
    process.env.SMOKE_OBJECT_PATHS === "true"
      ? canonicalPaths.map((path) =>
          path === "/" ? "/index.html" : `${path}index.html`,
        )
      : canonicalPaths;
  await smoke(smokeBaseUrl, smokePaths);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await runDeployment();
}
