import { describe, expect, it, vi } from "vitest";
import { copyText } from "../src/clipboard.js";
import { APP_DOWNLOAD_ACTIONS } from "../src/official-site.js";
import { APP_DOWNLOAD_LINKS } from "../src/platform-links.js";

describe("app download entry", () => {
  it("publishes the approved native app and mini-program channels", () => {
    expect(APP_DOWNLOAD_LINKS).toEqual({
      appStore:
        "https://apps.apple.com/jp/app/%E6%97%A5%E5%AE%9C%E6%89%BE%E6%88%BF/id6756088611",
      googlePlay:
        "https://play.google.com/store/apps/details?id=com.rykj.riyizhaofang",
      wechatMiniProgram: "#小程序://日宜找房/eFzVt03INd0YNma",
    });
    expect(APP_DOWNLOAD_ACTIONS.map(({ id }) => id)).toEqual([
      "app-store",
      "google-play",
      "wechat-mini-program",
    ]);
  });

  it("reports copied only after the clipboard accepts the token", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(copyText("token", { writeText })).resolves.toBe(
      "copied",
    );
    expect(writeText).toHaveBeenCalledWith("token");
  });

  it("falls back to manual copy when clipboard is unavailable", async () => {
    await expect(copyText("token", undefined)).resolves.toBe("manual");
  });

  it("falls back to manual copy when clipboard access is rejected", async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(new Error("clipboard denied"));

    await expect(copyText("token", { writeText })).resolves.toBe(
      "manual",
    );
  });
});
