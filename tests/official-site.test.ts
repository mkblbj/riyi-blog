import { describe, expect, it } from "vitest";
import {
  HOME_ADVANTAGES,
  HOME_SERVICES,
  OFFICIAL_ACTIONS,
  shouldShowArticleCta,
} from "../src/official-site.js";

describe("official site promotion", () => {
  it("presents the three approved service paths", () => {
    expect(HOME_SERVICES.map(({ title }) => title)).toEqual([
      "日本租房",
      "日本买房",
      "留学安居",
    ]);
  });

  it("presents only credible service advantages", () => {
    expect(HOME_ADVANTAGES.map(({ title }) => title)).toEqual([
      "短视频了解房源",
      "结合通勤与生活圈筛选",
      "整理与核验房源信息",
      "按需求持续关注",
    ]);
    expect(HOME_ADVANTAGES).toHaveLength(4);
  });

  it("provides three secure business actions", () => {
    expect(OFFICIAL_ACTIONS.map(({ label }) => label)).toEqual([
      "查看房源",
      "提交需求",
      "微信咨询",
    ]);
    for (const action of OFFICIAL_ACTIONS) {
      expect(new URL(action.href).protocol).toBe("https:");
    }
  });

  it("shows the article CTA only for explicit article pages", () => {
    expect(shouldShowArticleCta({ article: true })).toBe(true);
    expect(shouldShowArticleCta({ article: false })).toBe(false);
    expect(shouldShowArticleCta({ article: "true" })).toBe(false);
    expect(shouldShowArticleCta({})).toBe(false);
  });
});
