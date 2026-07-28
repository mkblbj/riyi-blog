import matter from "gray-matter";
import { LoadedPost, PublicPost } from "./schema.js";

export function toPublicPost(post: LoadedPost): PublicPost {
  const { authorName, status: _status, ...data } = post.data;
  return {
    ...data,
    author: { name: authorName },
    permalink: `/posts/${data.id}/`,
    body: post.body,
    sourcePath: post.sourcePath,
  };
}

export function renderPost(post: PublicPost): string {
  const {
    body,
    sourcePath: _sourcePath,
    id,
    title,
    description,
    coverImg,
    categories,
    tags,
    author,
    date,
    top,
    sticky,
    permalink,
  } = post;

  const publicBody = `${body.trimEnd()}

---

> 本文由日宜房产整理，仅作一般信息参考。具体契约、费用和政策请以最新资料及个别条件为准。

[返回日宜房产平台](https://riyihome.com)
`;

  return matter.stringify(publicBody, {
    id,
    title,
    description,
    coverImg,
    categories,
    tags,
    author,
    date,
    top,
    ...(sticky === undefined ? {} : { sticky }),
    permalink,
    article: true,
    comment: false,
  });
}
