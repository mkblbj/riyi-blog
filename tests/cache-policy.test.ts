import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { planUpload } from "../scripts/deploy/cache-policy.js";

describe("upload plan", () => {
  it("uploads immutable assets first and HTML/index documents last", async () => {
    const dist = await mkdtemp(join(tmpdir(), "riyi-upload-"));
    await mkdir(join(dist, "assets"), { recursive: true });
    await mkdir(join(dist, "posts/id"), { recursive: true });
    await writeFile(join(dist, "assets/app.0123456789ab.js"), "js");
    await writeFile(join(dist, "media.0123456789ab.webp"), "image");
    await writeFile(join(dist, "favicon.png"), "icon");
    await writeFile(join(dist, "posts/id/index.html"), "article");
    await writeFile(join(dist, "index.html"), "home");
    await writeFile(join(dist, "rss.xml"), "rss");
    await writeFile(join(dist, "sitemap.xml"), "sitemap");
    await writeFile(join(dist, "robots.txt"), "robots");

    const plan = await planUpload(dist);
    expect(plan.assets.map((entry) => entry.objectName)).toEqual([
      "assets/app.0123456789ab.js",
      "media.0123456789ab.webp",
      "favicon.png",
    ]);
    expect(plan.documents.map((entry) => entry.objectName)).toEqual([
      "index.html",
      "posts/id/index.html",
      "robots.txt",
      "rss.xml",
      "sitemap.xml",
    ]);
    expect(plan.assets[0]?.cacheControl).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(plan.documents[0]?.cacheControl).toBe(
      "public, max-age=60, must-revalidate",
    );
  });
});
