import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "../..");

async function render(
  output: string,
  width: number,
  height: number,
  title: string,
  subtitle: string,
) {
  await mkdir(dirname(output), { recursive: true });
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#17352f"/>
      <circle cx="${width * 0.82}" cy="${height * 0.2}" r="${height * 0.38}" fill="#d7c3a4" opacity=".22"/>
      <text x="${width * 0.08}" y="${height * 0.48}" fill="#ffffff"
        font-size="${height * 0.15}" font-weight="700"
        font-family="PingFang SC, Microsoft YaHei, sans-serif">${title}</text>
      <text x="${width * 0.08}" y="${height * 0.64}" fill="#f1e8d8"
        font-size="${height * 0.055}"
        font-family="PingFang SC, Microsoft YaHei, sans-serif">${subtitle}</text>
    </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(output);
}

await render(
  resolve(root, "content/media/riyihome-intro.png"),
  1600,
  900,
  "日宜房产",
  "日本安居实用指南",
);
await render(
  resolve(root, "site/public/brand/og-default.png"),
  1200,
  630,
  "日宜房产",
  "租房 · 买房 · 区域 · 日本生活",
);
