import { access, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  applyMediaManifest,
  MAX_IMAGE_BYTES,
  optimizeMedia,
  rewriteMediaReferences,
} from "../scripts/content/images.js";

describe("image pipeline", () => {
  it("keeps originals and emits a hashed WebP no wider than 1920px", async () => {
    const root = await mkdtemp(join(tmpdir(), "riyi-images-"));
    const input = join(root, "input");
    const output = join(root, "output");
    await mkdir(input, { recursive: true });
    await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 3,
        background: "#d7c3a4",
      },
    })
      .png()
      .toFile(join(input, "cover.png"));

    const manifest = await optimizeMedia(input, output);
    const publicPath = manifest.paths.get("/media/cover.png");
    expect(publicPath).toMatch(/^\/media\/cover\.[a-f0-9]{12}\.webp$/);
    const generated = join(output, publicPath!.replace("/media/", ""));
    const metadata = await sharp(generated).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1920);
    await expect(access(join(input, "cover.png"))).resolves.toBeUndefined();
  });

  it("rewrites cover and Markdown paths from the generated map", () => {
    const paths = new Map([
      ["/media/cover.png", "/media/cover.0123456789ab.webp"],
    ]);
    expect(
      rewriteMediaReferences(
        '![东京住宅](/media/cover.png)\n<img src="/media/cover.png" alt="住宅">',
        paths,
      ),
    ).toBe(
      '![东京住宅](/media/cover.0123456789ab.webp)\n<img src="/media/cover.0123456789ab.webp" alt="住宅">',
    );
  });

  it("rejects a source image larger than 10 MiB before decoding", async () => {
    const root = await mkdtemp(join(tmpdir(), "riyi-large-image-"));
    const input = join(root, "input");
    await mkdir(input, { recursive: true });
    await writeFile(
      join(input, "too-large.png"),
      Buffer.alloc(MAX_IMAGE_BYTES + 1),
    );
    await expect(optimizeMedia(input, join(root, "output"))).rejects.toThrow(
      "exceeds 10 MiB",
    );
  });

  it("rejects a missing body image instead of leaving a broken public URL", () => {
    expect(() =>
      applyMediaManifest(
        {
          id: "79f45644-f457-4b94-a288-44780fd8f199",
          title: "图片检查",
          description: "正文中的本地图片不存在时，构建必须立即失败并指出路径。",
          coverImg: "/media/cover.png",
          categoryIds: ["11111111-1111-4111-8111-111111111111"],
          categories: ["租房指南"],
          tags: [],
          author: { name: "日宜房产" },
          date: "2026-07-28T10:00:00+09:00",
          top: false,
          permalink: "/posts/79f45644-f457-4b94-a288-44780fd8f199/",
          body: "![不存在的图片](/media/missing.png)",
          sourcePath: "content/posts/79f45644-f457-4b94-a288-44780fd8f199.md",
        },
        {
          paths: new Map([
            ["/media/cover.png", "/media/cover.0123456789ab.webp"],
          ]),
          files: [],
        },
      ),
    ).toThrow("missing body image /media/missing.png");
  });
});
