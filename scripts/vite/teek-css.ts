const teekSocialFontFace =
  /@font-face\{font-family:iconfont;src:url\(iconfont\.woff2[^}]*\}/;

export function stripUnusedTeekSocialFont(css: string): string {
  return css.replace(teekSocialFontFace, "");
}

export function teekCssPlugin() {
  return {
    name: "riyi:strip-unused-teek-social-font",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (
        !id.includes("vitepress-theme-teek") ||
        !/\/index\.css(?:\?|$)/.test(id)
      ) {
        return undefined;
      }
      const transformed = stripUnusedTeekSocialFont(code);
      if (transformed === code) return undefined;
      return { code: transformed, map: null };
    },
  };
}
