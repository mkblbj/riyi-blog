import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { APP_DOWNLOAD_LINKS } from "../src/platform-links.js";

const execFileAsync = promisify(execFile);

describe("app download homepage integration", () => {
  it(
    "renders native store links and a mini-program action in the built homepage",
    async () => {
      await execFileAsync("pnpm", ["build"], {
        cwd: process.cwd(),
        maxBuffer: 10 * 1024 * 1024,
      });

      const html = await readFile(
        "site/.vitepress/dist/index.html",
        "utf8",
      );
      const $ = load(html);
      const section = $("#download-app");
      const hrefs = section
        .find("a")
        .map((_, element) => $(element).attr("href"))
        .get();

      expect(section.length).toBe(1);
      expect(section.find("h2").text()).toContain("下载日宜找房 App");
      expect(hrefs).toEqual([
        APP_DOWNLOAD_LINKS.appStore,
        APP_DOWNLOAD_LINKS.googlePlay,
      ]);
      expect(section.find("a[target='_blank']")).toHaveLength(2);
      expect(section.find("button[type='button']").text()).toContain(
        "微信小程序",
      );
    },
    30_000,
  );
});
