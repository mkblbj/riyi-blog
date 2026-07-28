import { mkdtemp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { prepareContent } from "../scripts/content/prepare.js";

const publishedId = "79f45644-f457-4b94-a288-44780fd8f199";
const draftId = "fa927df7-7638-4551-b5ec-62e69317cd4c";
const archivedId = "31b2cd40-b4a8-4bb9-825b-00ef98290625";

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
    categories: ["租房指南"],
    tags: ["日本租房"],
    authorName: "日宜房产",
    date: "2026-07-28T10:00:00+09:00",
    top: false,
    status,
  });
  await writeFile(join(root, "content/posts", `${id}.md`), post);
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "riyi-content-"));
  await mkdir(join(root, "content/posts"), { recursive: true });
  await mkdir(join(root, "content/media"), { recursive: true });
  await mkdir(join(root, "site"), { recursive: true });
  await writeFile(join(root, "content/media/cover.png"), "image");
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
      optimizeImages: false,
    });

    expect(manifest.posts.map((post) => post.id)).toEqual([publishedId]);
    expect(manifest.posts[0]?.permalink).toBe(`/posts/${publishedId}/`);

    const output = await readFile(
      join(root, "site/posts", publishedId, "index.md"),
      "utf8",
    );
    const parsed = matter(output);
    expect(parsed.data.author).toEqual({ name: "日宜房产" });
    expect(parsed.data.permalink).toBe(`/posts/${publishedId}/`);
    expect(parsed.data.comment).toBe(false);
    expect(parsed.data.status).toBeUndefined();
    expect(output).not.toContain("authorName:");
    expect(parsed.content).toContain("[返回日宜房产平台](https://riyihome.com)");

    await expect(
      readFile(join(root, "site/posts", draftId, "index.md"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      readFile(join(root, "site/posts", archivedId, "index.md"), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects duplicate ids before writing generated content", async () => {
    const root = await fixture();
    const duplicate = matter.stringify("重复正文", {
      id: publishedId,
      title: "重复 ID",
      description: "重复 ID 应在构建阶段被拒绝并返回明确错误。",
      coverImg: "/media/cover.png",
      categories: ["租房指南"],
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
