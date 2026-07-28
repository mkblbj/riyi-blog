import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  PLATFORM_URL,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
} from "../src/site.js";

describe("site contract", () => {
  it("keeps the blog and property platform on separate hosts", () => {
    expect(SITE_URL).toBe("https://www.riyihome.com");
    expect(PLATFORM_URL).toBe("https://riyihome.com");
    expect(SITE_TITLE).toBe("日宜房产");
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(20);
  });

  it("publishes the approved fixed categories", () => {
    expect(CATEGORIES).toEqual([
      "租房指南",
      "买房指南",
      "日本生活",
      "区域介绍",
      "房产政策",
      "公司动态",
    ]);
  });
});
