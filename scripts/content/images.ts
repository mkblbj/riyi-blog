import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { basename, dirname, extname, join, relative, sep } from "node:path";
import sharp from "sharp";
import { glob } from "tinyglobby";
import { PublicPost } from "./schema.js";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export interface OptimizedMedia {
  sourcePath: string;
  publicPath: string;
  outputPath: string;
}

export interface MediaManifest {
  paths: ReadonlyMap<string, string>;
  files: OptimizedMedia[];
}

function toPosix(value: string): string {
  return value.split(sep).join("/");
}

export async function optimizeMedia(
  inputDir: string,
  outputDir: string,
): Promise<MediaManifest> {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const sourceFiles = await glob(`**/*.{${IMAGE_EXTENSIONS.join(",")}}`, {
    cwd: inputDir,
    absolute: true,
    caseSensitiveMatch: false,
  });
  const paths = new Map<string, string>();
  const files: OptimizedMedia[] = [];

  for (const sourcePath of sourceFiles.sort()) {
    const info = await stat(sourcePath);
    if (info.size > MAX_IMAGE_BYTES) {
      throw new Error(`${sourcePath} exceeds 10 MiB`);
    }
    const sourceBytes = await readFile(sourcePath);
    const digest = createHash("sha256")
      .update(sourceBytes)
      .digest("hex")
      .slice(0, 12);
    const relativePath = toPosix(relative(inputDir, sourcePath));
    const extension = extname(relativePath);
    const stem = basename(relativePath, extension);
    const relativeDir =
      toPosix(dirname(relativePath)) === "."
        ? ""
        : toPosix(dirname(relativePath));
    const outputName = `${stem}.${digest}.webp`;
    const outputRelative = relativeDir
      ? `${relativeDir}/${outputName}`
      : outputName;
    const outputPath = join(outputDir, ...outputRelative.split("/"));
    await mkdir(dirname(outputPath), { recursive: true });
    await sharp(sourcePath)
      .rotate()
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toFile(outputPath);

    const originalPublicPath = `/media/${relativePath}`;
    const publicPath = `/media/${outputRelative}`;
    paths.set(originalPublicPath, publicPath);
    files.push({ sourcePath, publicPath, outputPath });
  }

  return { paths, files };
}

export function rewriteMediaReferences(
  value: string,
  paths: ReadonlyMap<string, string>,
): string {
  return [...paths.entries()]
    .sort(([left], [right]) => right.length - left.length)
    .reduce(
      (rewritten, [source, target]) => rewritten.split(source).join(target),
      value,
    );
}

export function applyMediaManifest(
  post: PublicPost,
  media: MediaManifest,
): PublicPost {
  const coverImg = media.paths.get(post.coverImg);
  if (!coverImg) {
    throw new Error(`${post.sourcePath}: missing cover image ${post.coverImg}`);
  }
  const bodyMediaPaths = [
    ...post.body.matchAll(/\/media\/[^)\s"'<>]+/g),
  ].map((match) => match[0]);
  const missingBodyPath = bodyMediaPaths.find((path) => !media.paths.has(path));
  if (missingBodyPath) {
    throw new Error(
      `${post.sourcePath}: missing body image ${missingBodyPath}`,
    );
  }
  return {
    ...post,
    coverImg,
    body: rewriteMediaReferences(post.body, media.paths),
  };
}
