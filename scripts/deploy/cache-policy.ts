import { extname, relative, sep } from "node:path";
import { glob } from "tinyglobby";

export interface UploadEntry {
  objectName: string;
  localPath: string;
  cacheControl: string;
  contentType: string;
}

export interface UploadPlan {
  assets: UploadEntry[];
  documents: UploadEntry[];
}

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function posixPath(value: string): string {
  return value.split(sep).join("/");
}

export function cacheControlFor(objectName: string): string {
  if (/\.[a-f0-9]{8,}\./i.test(objectName)) {
    return "public, max-age=31536000, immutable";
  }
  if (objectName.endsWith(".html")) {
    return "public, max-age=60, must-revalidate";
  }
  if (["rss.xml", "sitemap.xml", "robots.txt"].includes(objectName)) {
    return "public, max-age=300, must-revalidate";
  }
  return "public, max-age=3600";
}

export async function planUpload(distDir: string): Promise<UploadPlan> {
  const files = await glob("**/*", {
    cwd: distDir,
    absolute: true,
    onlyFiles: true,
  });
  const entries = files.map((localPath) => {
    const objectName = posixPath(relative(distDir, localPath));
    return {
      objectName,
      localPath,
      cacheControl: cacheControlFor(objectName),
      contentType:
        contentTypes[extname(objectName).toLowerCase()] ??
        "application/octet-stream",
    };
  });
  const isDocument = (entry: UploadEntry) =>
    entry.objectName.endsWith(".html") ||
    ["rss.xml", "sitemap.xml", "robots.txt"].includes(entry.objectName);
  const assetOrder = (entry: UploadEntry) =>
    /\.[a-f0-9]{8,}\./i.test(entry.objectName) ? 0 : 1;
  return {
    assets: entries
      .filter((entry) => !isDocument(entry))
      .sort(
        (left, right) =>
          assetOrder(left) - assetOrder(right) || sortByName(left, right),
      ),
    documents: entries.filter(isDocument).sort(sortByName),
  };
}

function sortByName(left: UploadEntry, right: UploadEntry): number {
  return left.objectName.localeCompare(right.objectName);
}
