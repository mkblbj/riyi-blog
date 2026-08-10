import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { loadSiteContent } from "../scripts/content/load-site.js";
import { copyText } from "../src/clipboard.js";
import { buildAppDownloadActions } from "../src/official-site.js";
import { resolveSiteContent } from "../src/site-content.js";

describe("app download entry", () => {
  it("builds store links and a copy action from CMS values", () => {
    const config = {
      ...resolveSiteContent(loadSiteContent(join(process.cwd(), "content")))
        .home.appDownload,
      appStoreUrl: "https://downloads.example.com/ios",
      googlePlayUrl: "https://downloads.example.com/android",
      wechatMiniProgram: "#小程序://日宜找房/Fixture123",
    };

    expect(buildAppDownloadActions(config)).toEqual([
      {
        id: "app-store",
        label: "App Store",
        description: "iPhone 版日宜找房",
        kind: "link",
        value: "https://downloads.example.com/ios",
        iconUrl: "https://cdn.simpleicons.org/apple/111111",
      },
      {
        id: "google-play",
        label: "Google Play",
        description: "Android 版日宜找房",
        kind: "link",
        value: "https://downloads.example.com/android",
        iconUrl: "https://cdn.simpleicons.org/googleplay/34A853",
      },
      {
        id: "wechat-mini-program",
        label: "微信小程序",
        description: "复制口令后在微信打开",
        kind: "copy",
        value: "#小程序://日宜找房/Fixture123",
        iconUrl: "https://cdn.simpleicons.org/wechat/07C160",
      },
    ]);
  });

  it("reports copied only after the clipboard accepts the token", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(copyText("token", { writeText })).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("token");
  });

  it("falls back to manual copy when clipboard is unavailable", async () => {
    await expect(copyText("token", undefined)).resolves.toBe("manual");
  });

  it("falls back to manual copy when clipboard access is rejected", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard denied"));

    await expect(copyText("token", { writeText })).resolves.toBe("manual");
  });
});
