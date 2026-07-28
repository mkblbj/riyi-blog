import { describe, expect, it } from "vitest";
import {
  stripUnusedTeekSocialFont,
  teekCssPlugin,
} from "../scripts/vite/teek-css.js";

describe("Teek CSS compatibility", () => {
  it("removes only the unpublished social icon font face", () => {
    const css =
      '@font-face{font-family:iconfont;src:url(iconfont.woff2?t=1) format("woff2"),url(iconfont.ttf?t=1) format("truetype")}@font-face{font-family:kept;src:url(kept.woff2)}.iconfont{font-family:iconfont}.page{color:red}';
    expect(stripUnusedTeekSocialFont(css)).toBe(
      "@font-face{font-family:kept;src:url(kept.woff2)}.iconfont{font-family:iconfont}.page{color:red}",
    );
  });

  it("transforms only the Teek package stylesheet", () => {
    const plugin = teekCssPlugin();
    const css =
      "@font-face{font-family:iconfont;src:url(iconfont.woff2)}.page{color:red}";
    expect(
      plugin.transform(css, "/node_modules/vitepress-theme-teek/index.css"),
    ).toMatchObject({ code: ".page{color:red}", map: null });
    expect(plugin.transform(css, "/site/theme/custom.css")).toBeUndefined();
  });
});
