import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadPosts } from "../scripts/content/load-posts.js";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

describe("loadPosts", () => {
  it("normalizes an unquoted CMS timestamp to an ISO string", async () => {
    const root = await mkdtemp(join(tmpdir(), "riyi-load-posts-"));
    roots.push(root);
    const postsDir = join(root, "posts");
    await mkdir(postsDir, { recursive: true });
    const id = "f8a543d1-981d-4081-8255-3471c714acff";

    await writeFile(
      join(postsDir, `${id}.md`),
      `---
id: ${id}
title: CMS 新建文章
description: 这是客户通过在线后台创建的文章摘要，内容长度满足发布校验要求。
coverImg: /media/cover.jpg
categories:
  - 11111111-1111-4111-8111-111111111111
authorName: 日宜房产
date: 2026-08-13T21:05:00Z
top: false
status: published
---
正文内容
`,
    );

    const posts = await loadPosts(root);

    expect(posts).toHaveLength(1);
    expect(posts[0]?.data.date).toBe("2026-08-13T21:05:00.000Z");
  });
});
