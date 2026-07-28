import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import matter from "gray-matter";
import { glob } from "tinyglobby";
import { LoadedPost, RawPostSchema } from "./schema.js";

export async function loadPosts(contentDir: string): Promise<LoadedPost[]> {
  const postsDir = join(contentDir, "posts");
  const files = await glob("*.md", { cwd: postsDir, absolute: true });
  const seen = new Set<string>();
  const loaded: LoadedPost[] = [];

  for (const sourcePath of files.sort()) {
    const source = await readFile(sourcePath, "utf8");
    const parsed = matter(source);
    const data = RawPostSchema.parse(parsed.data);
    if (!parsed.content.trim()) {
      throw new Error(`${sourcePath}: body must not be empty`);
    }
    if (seen.has(data.id)) {
      throw new Error(`Duplicate post id: ${data.id}`);
    }
    seen.add(data.id);
    const stem = basename(sourcePath, ".md");
    if (stem !== data.id) {
      throw new Error(
        `${sourcePath}: filename "${stem}" must equal post id "${data.id}"`,
      );
    }
    loaded.push({ sourcePath, body: parsed.content, data });
  }

  return loaded;
}
