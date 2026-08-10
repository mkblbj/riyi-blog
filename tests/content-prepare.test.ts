import {
  access,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { load } from "cheerio";
import matter from "gray-matter";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import {
  prepareContent,
  publishPreparedOutputs,
  type PublicationFileSystem,
} from "../scripts/content/prepare.js";
import { SiteManifestSchema } from "../src/site-content.js";

const publishedId = "79f45644-f457-4b94-a288-44780fd8f199";
const draftId = "fa927df7-7638-4551-b5ec-62e69317cd4c";
const archivedId = "31b2cd40-b4a8-4bb9-825b-00ef98290625";
const rentId = "11111111-1111-4111-8111-111111111111";

async function writeSiteContent(
  root: string,
  options: { siteImages?: boolean } = {},
) {
  await mkdir(join(root, "content/site"), { recursive: true });
  await mkdir(join(root, "content/categories"), { recursive: true });
  await Promise.all([
    writeFile(
      join(root, "content/site/settings.yml"),
      stringify({
        schemaVersion: 1,
        layoutPreset: "official-v1",
        siteName: "日宜房产",
        siteDescription:
          "日宜房产提供日本房产租赁、买卖与安居服务，并整理区域选择、流程费用和日常生活的实用内容。",
        logo: options.siteImages ? "/site-media/logo.png" : "",
        primaryColor: "#1f6658",
        secondaryColor: "#17352f",
      }),
    ),
    writeFile(
      join(root, "content/site/home.yml"),
      stringify({
        hero: {
          title: "日宜房产",
          description: "日本找房，就上日宜。",
          image: options.siteImages ? "/site-media/hero.png" : "",
          imageAlt: options.siteImages ? "东京住宅客厅" : "",
          quickLinks: [
            {
              id: "rent",
              enabled: true,
              title: "租房指南",
              description: "租房说明",
              kind: "category",
              categoryId: rentId,
              href: "",
              order: 10,
            },
            {
              id: "purchase",
              enabled: true,
              title: "买房指南",
              description: "买房说明",
              kind: "category",
              categoryId: rentId,
              href: "",
              order: 20,
            },
            {
              id: "listings",
              enabled: true,
              title: "查看房源",
              description: "查看房源说明",
              kind: "external",
              categoryId: "",
              href: "https://riyihome.com",
              order: 30,
            },
          ],
        },
        appDownload: {
          enabled: true,
          eyebrow: "随时找房",
          title: "下载应用",
          description: "下载日宜找房应用。",
          appStoreUrl: "https://apps.apple.com/jp/app/example",
          googlePlayUrl:
            "https://play.google.com/store/apps/details?id=example",
          wechatMiniProgram: "#小程序://日宜找房/eFzVt03INd0YNma",
        },
        services: {
          eyebrow: "服务",
          title: "房产服务",
          description: "日宜房产服务说明。",
          items: ["rent", "purchase", "study"].map((id, index) => ({
            id,
            enabled: true,
            title: `${id}服务`,
            description: `${id}服务说明`,
            image:
              options.siteImages && id === "rent" ? "/site-media/rent.png" : "",
            imageAlt: options.siteImages && id === "rent" ? "日本租房服务" : "",
            linkLabel: "阅读指南",
            kind: "category",
            categoryId: rentId,
            href: "",
            order: (index + 1) * 10,
          })),
        },
        advantages: {
          enabled: true,
          eyebrow: "优势",
          title: "日宜优势",
          description: "日宜优势说明。",
          items: ["video", "commute", "verify", "follow"].map((id, index) => ({
            id,
            enabled: true,
            title: `${id}优势`,
            description: `${id}优势说明`,
            order: (index + 1) * 10,
          })),
        },
        actions: {
          eyebrow: "行动",
          title: "开始找房",
          description: "选择下一步。",
          items: [
            {
              id: "listings",
              enabled: true,
              label: "查看房源",
              description: "查看在售房源",
              tone: "primary",
              href: "https://riyihome.com",
              order: 10,
            },
            {
              id: "demand",
              enabled: true,
              label: "提交需求",
              description: "提交找房需求",
              tone: "secondary",
              href: "https://riyihome.com/demand",
              order: 20,
            },
            {
              id: "wechat",
              enabled: true,
              label: "微信咨询",
              description: "联系日宜顾问",
              tone: "quiet",
              href: "https://work.weixin.qq.com/example",
              order: 30,
            },
          ],
        },
        articles: {
          eyebrow: "内容",
          title: "最新文章",
          description: "日宜房产文章。",
        },
      }),
    ),
    writeFile(
      join(root, "content/site/navigation.yml"),
      stringify({ home: { label: "首页", order: 0 }, items: [] }),
    ),
    writeFile(
      join(root, "content/categories/rent.yml"),
      stringify({
        id: rentId,
        slug: "rent-guide",
        name: "租房指南",
        description: "日本租房费用、审查与签约流程。",
        enabled: true,
        order: 10,
      }),
    ),
  ]);
}

async function writePost(
  root: string,
  id: string,
  status: "draft" | "published" | "archived",
  title: string,
) {
  const post = matter.stringify("正文内容\n", {
    id,
    title,
    description: `${title}的说明文字，长度足够用于页面摘要。`,
    coverImg: "/media/cover.png",
    categories: [rentId],
    tags: ["日本租房"],
    authorName: "日宜房产",
    date: "2026-07-28T10:00:00+09:00",
    top: false,
    status,
  });
  await writeFile(join(root, "content/posts", `${id}.md`), post);
}

async function fixture(options: { siteImages?: boolean } = {}) {
  const root = await mkdtemp(join(tmpdir(), "riyi-content-"));
  await mkdir(join(root, "content/posts"), { recursive: true });
  await mkdir(join(root, "content/media"), { recursive: true });
  await mkdir(join(root, "site"), { recursive: true });
  await writeSiteContent(root, options);
  await sharp({
    create: {
      width: 80,
      height: 45,
      channels: 3,
      background: "#d7c3a4",
    },
  })
    .png()
    .toFile(join(root, "content/media/cover.png"));
  if (options.siteImages) {
    await mkdir(join(root, "content/site-media"), { recursive: true });
    await Promise.all(
      ["logo.png", "hero.png", "rent.png"].map((name) =>
        sharp({
          create: {
            width: 80,
            height: 45,
            channels: 3,
            background: "#1f6658",
          },
        })
          .png()
          .toFile(join(root, "content/site-media", name)),
      ),
    );
  }
  await writePost(root, publishedId, "published", "已发布文章");
  await writePost(root, draftId, "draft", "草稿文章");
  await writePost(root, archivedId, "archived", "归档文章");
  return root;
}

describe("prepareContent", () => {
  it("emits only published posts with stable id routes and Teek author data", async () => {
    const root = await fixture();
    const manifest = await prepareContent({
      contentDir: join(root, "content"),
      siteDir: join(root, "site"),
      manifestPath: join(root, ".generated/posts.json"),
    });

    expect(manifest.posts.map((post) => post.id)).toEqual([publishedId]);
    expect(manifest.posts[0]?.permalink).toBe(`/posts/${publishedId}/`);
    expect(manifest.posts[0]).toMatchObject({
      categoryIds: [rentId],
      categories: ["租房指南"],
    });

    const output = await readFile(
      join(root, "site/posts", publishedId, "index.md"),
      "utf8",
    );
    const parsed = matter(output);
    expect(parsed.data.author).toEqual({ name: "日宜房产" });
    expect(parsed.data.coverImg).toMatch(
      /^\/media\/cover\.[a-f0-9]{12}\.webp$/,
    );
    expect(parsed.data.permalink).toBe(`/posts/${publishedId}/`);
    expect(parsed.data.comment).toBe(false);
    expect(parsed.data.status).toBeUndefined();
    expect(parsed.data.categoryIds).toBeUndefined();
    expect(output).not.toContain("authorName:");
    expect(parsed.content).toContain(
      "[返回日宜房产平台](https://riyihome.com)",
    );

    const categoryPage = await readFile(
      join(root, "site/category/rent-guide/index.md"),
      "utf8",
    );
    expect(categoryPage).toContain("title: 租房指南");
    expect(categoryPage).toContain(`/posts/${publishedId}/`);

    const rss = await readFile(join(root, "site/public/rss.xml"), "utf8");
    expect(rss).toContain("<title>日宜房产资讯</title>");
    expect(rss).toContain("<description>日宜房产提供日本房产租赁");
    expect(rss).toContain("<name>日宜房产</name>");
    const $ = load(rss, { xmlMode: true });
    const feedAuthor = $("rss > channel > author");
    expect(feedAuthor).toHaveLength(1);
    expect(feedAuthor.attr("xmlns")).toBe("http://www.w3.org/2005/Atom");
    expect(feedAuthor.children("name").text()).toBe("日宜房产");
    expect(feedAuthor.children("uri").text()).toBe("https://www.riyihome.com");

    await expect(
      readFile(join(root, "site/posts", draftId, "index.md"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      readFile(join(root, "site/posts", archivedId, "index.md"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("emits a validated site manifest with hashed media used by RSS", async () => {
    const root = await fixture({ siteImages: true });
    const postsManifestPath = join(root, ".generated/posts.json");
    const postsManifest = await prepareContent({
      contentDir: join(root, "content"),
      siteDir: join(root, "site"),
      manifestPath: postsManifestPath,
    });

    const siteManifest = SiteManifestSchema.parse(
      JSON.parse(await readFile(join(root, ".generated/site.json"), "utf8")),
    );
    expect(siteManifest.generatedAt).toBe(postsManifest.generatedAt);
    expect(siteManifest.themeTokens).toMatchObject({
      primary: "#1f6658",
      secondary: "#17352f",
    });
    expect(siteManifest.content.settings.logo).toMatch(
      /^\/site-media\/logo\.[a-f0-9]{12}\.webp$/,
    );
    expect(siteManifest.content.home.hero.image).toMatch(
      /^\/site-media\/hero\.[a-f0-9]{12}\.webp$/,
    );
    expect(siteManifest.content.home.services.items[0]?.image).toMatch(
      /^\/site-media\/rent\.[a-f0-9]{12}\.webp$/,
    );
    await expect(
      access(
        join(root, "site/public", siteManifest.content.settings.logo.slice(1)),
      ),
    ).resolves.toBeUndefined();

    const rss = await readFile(join(root, "site/public/rss.xml"), "utf8");
    expect(rss).toContain(
      `https://www.riyihome.com${siteManifest.content.settings.logo}`,
    );
  });

  it("skips both media pipelines and preserves source paths when disabled", async () => {
    const root = await fixture({ siteImages: true });
    const siteManifestPath = join(root, "custom/site.json");
    const postsManifest = await prepareContent({
      contentDir: join(root, "content"),
      siteDir: join(root, "site"),
      manifestPath: join(root, ".generated/posts.json"),
      siteManifestPath,
      optimizeImages: false,
    });

    const siteManifest = SiteManifestSchema.parse(
      JSON.parse(await readFile(siteManifestPath, "utf8")),
    );
    expect(postsManifest.posts[0]?.coverImg).toBe("/media/cover.png");
    expect(siteManifest.content.settings.logo).toBe("/site-media/logo.png");
    expect(siteManifest.content.home.hero.image).toBe("/site-media/hero.png");
    expect(siteManifest.content.home.services.items[0]?.image).toBe(
      "/site-media/rent.png",
    );
    await expect(
      access(join(root, "site/public/site-media")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("preserves every previous output when a late site image check fails", async () => {
    const root = await fixture({ siteImages: true });
    await rm(join(root, "content/site-media/hero.png"));
    const sentinels = new Map([
      [join(root, "site/posts/old/index.md"), "old post"],
      [join(root, "site/category/old/index.md"), "old category"],
      [join(root, "site/categories/index.md"), "tracked category index"],
      [join(root, "site/public/media/old.webp"), "old article media"],
      [join(root, "site/public/site-media/old.webp"), "old site media"],
      [join(root, "site/public/rss.xml"), "old rss"],
      [join(root, ".generated/posts.json"), "old posts manifest"],
      [join(root, ".generated/site.json"), "old site manifest"],
    ]);
    await Promise.all(
      [...sentinels].map(async ([path, value]) => {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, value, "utf8");
      }),
    );

    await expect(
      prepareContent({
        contentDir: join(root, "content"),
        siteDir: join(root, "site"),
        manifestPath: join(root, ".generated/posts.json"),
      }),
    ).rejects.toThrow(
      "content/site/home.yml: missing site image /site-media/hero.png",
    );

    await Promise.all(
      [...sentinels].map(async ([path, value]) => {
        await expect(readFile(path, "utf8")).resolves.toBe(value);
      }),
    );
    expect(await readdir(root)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^\.content-prepare-/)]),
    );
  });

  it("preserves recovery data and continues rollback after multiple restore failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "riyi-publication-"));
    const recoveryRoot = join(root, "recovery");
    const stagedRoot = join(recoveryRoot, "staged");
    const targetsRoot = join(root, "live");
    const names = ["first", "restore-fails", "new-target", "publish-fails"];
    const outputs = names.map((name) => ({
      stagedPath: join(stagedRoot, name),
      targetPath: join(targetsRoot, name),
    }));
    await Promise.all(
      outputs.map(async ({ stagedPath }, index) => {
        await mkdir(dirname(stagedPath), { recursive: true });
        await writeFile(stagedPath, `new ${names[index]}`, "utf8");
      }),
    );
    await Promise.all(
      [0, 1, 3].map(async (index) => {
        const targetPath = outputs[index]!.targetPath;
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, `old ${names[index]}`, "utf8");
      }),
    );

    const restoreFailureTarget = outputs[1]!.targetPath;
    const removeFailureTarget = outputs[2]!.targetPath;
    const publicationFailure = outputs[3]!;
    const fileSystem: PublicationFileSystem = {
      mkdir,
      rename: async (source, target) => {
        if (
          source === publicationFailure.stagedPath &&
          target === publicationFailure.targetPath
        ) {
          throw new Error("injected publication failure");
        }
        if (
          source === join(recoveryRoot, "backups/1") &&
          target === restoreFailureTarget
        ) {
          throw new Error("injected backup restore failure");
        }
        await rename(source, target);
      },
      rm: async (path, options) => {
        if (path === removeFailureTarget) {
          throw new Error("injected target removal failure");
        }
        await rm(path, options);
      },
    };

    const error = await publishPreparedOutputs(
      outputs,
      recoveryRoot,
      fileSystem,
    ).then(
      () => undefined,
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("recovery required");
    expect((error as Error).message).toContain(recoveryRoot);
    expect((error as Error).message).toContain(restoreFailureTarget);
    expect((error as Error).message).toContain(removeFailureTarget);
    await expect(readFile(outputs[0]!.targetPath, "utf8")).resolves.toBe(
      "old first",
    );
    await expect(access(restoreFailureTarget)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(
      readFile(join(recoveryRoot, "backups/1"), "utf8"),
    ).resolves.toBe("old restore-fails");
    await expect(readFile(removeFailureTarget, "utf8")).resolves.toBe(
      "new new-target",
    );
    await expect(readFile(publicationFailure.targetPath, "utf8")).resolves.toBe(
      "old publish-fails",
    );
    await expect(access(recoveryRoot)).resolves.toBeUndefined();
  });

  it("rejects duplicate ids before writing generated content", async () => {
    const root = await fixture();
    const duplicate = matter.stringify("重复正文", {
      id: publishedId,
      title: "重复 ID",
      description: "重复 ID 应在构建阶段被拒绝并返回明确错误。",
      coverImg: "/media/cover.png",
      categories: [rentId],
      tags: [],
      authorName: "日宜房产",
      date: "2026-07-28T11:00:00+09:00",
      top: false,
      status: "published",
    });
    await writeFile(join(root, "content/posts/duplicate.md"), duplicate);

    await expect(
      prepareContent({
        contentDir: join(root, "content"),
        siteDir: join(root, "site"),
        manifestPath: join(root, ".generated/posts.json"),
        optimizeImages: false,
      }),
    ).rejects.toThrow(`Duplicate post id: ${publishedId}`);
  });

  it("rejects a filename that does not equal the immutable id", async () => {
    const root = await fixture();
    const id = "9305dfa2-1f01-4ea0-b741-c3bea6930b2e";
    await writePost(root, id, "draft", "路径测试");
    await rename(
      join(root, "content/posts", `${id}.md`),
      join(root, "content/posts/wrong-name.md"),
    );

    await expect(
      prepareContent({
        contentDir: join(root, "content"),
        siteDir: join(root, "site"),
        manifestPath: join(root, ".generated/posts.json"),
        optimizeImages: false,
      }),
    ).rejects.toThrow("must equal post id");
  });
});
