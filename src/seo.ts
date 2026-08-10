import type { HeadConfig } from "vitepress";

export interface PageHeadInput {
  relativePath: string;
  title: string;
  description?: string;
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  logo: string;
  frontmatter: Record<string, unknown>;
}

export function routeFromRelativePath(relativePath: string): string {
  if (relativePath === "index.md") return "/";
  if (relativePath.endsWith("/index.md")) {
    return `/${relativePath.slice(0, -"/index.md".length)}/`;
  }
  return `/${relativePath.replace(/\.md$/, ".html")}`;
}

export function filterPublicSitemapItems<T extends { url: string }>(
  items: T[],
): T[] {
  return items.filter((item) => item.url !== "404.html");
}

function absolute(value: string, siteUrl: string): string {
  return new URL(value, siteUrl).toString();
}

export function buildPageHead(input: PageHeadInput): HeadConfig[] {
  const route = routeFromRelativePath(input.relativePath);
  const canonical = absolute(route, input.siteUrl);
  const description = input.description || input.siteDescription;
  const isArticle = input.frontmatter.article === true;
  const fallbackImage = input.logo || "/brand/og-default.png";
  const image = absolute(
    typeof input.frontmatter.coverImg === "string"
      ? input.frontmatter.coverImg
      : fallbackImage,
    input.siteUrl,
  );
  const head: HeadConfig[] = [
    ["link", { rel: "canonical", href: canonical }],
    ["meta", { name: "description", content: description }],
    ["meta", { property: "og:locale", content: "zh_CN" }],
    ["meta", { property: "og:site_name", content: input.siteTitle }],
    [
      "meta",
      { property: "og:type", content: isArticle ? "article" : "website" },
    ],
    ["meta", { property: "og:title", content: input.title || input.siteTitle }],
    ["meta", { property: "og:description", content: description }],
    ["meta", { property: "og:url", content: canonical }],
    ["meta", { property: "og:image", content: image }],
  ];

  if (input.relativePath === "404.md") {
    head.push(["meta", { name: "robots", content: "noindex, nofollow" }]);
  }

  if (isArticle) {
    const author =
      typeof input.frontmatter.author === "object" &&
      input.frontmatter.author !== null &&
      "name" in input.frontmatter.author
        ? String(input.frontmatter.author.name)
        : input.siteTitle;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: input.title,
      description,
      image: [image],
      datePublished: String(input.frontmatter.date),
      dateModified: String(input.frontmatter.date),
      mainEntityOfPage: canonical,
      author: { "@type": "Organization", name: author },
      publisher: {
        "@type": "Organization",
        name: input.siteTitle,
        logo: {
          "@type": "ImageObject",
          url: absolute(fallbackImage, input.siteUrl),
        },
      },
    };
    head.push([
      "script",
      { type: "application/ld+json" },
      JSON.stringify(jsonLd).replaceAll("<", "\\u003c"),
    ]);
  }

  return head;
}

export function buildGlobalHead(env: NodeJS.ProcessEnv): HeadConfig[] {
  const head: HeadConfig[] = [];
  if (env.GOOGLE_SITE_VERIFICATION) {
    head.push([
      "meta",
      {
        name: "google-site-verification",
        content: env.GOOGLE_SITE_VERIFICATION,
      },
    ]);
  }
  if (env.BAIDU_SITE_VERIFICATION) {
    head.push([
      "meta",
      {
        name: "baidu-site-verification",
        content: env.BAIDU_SITE_VERIFICATION,
      },
    ]);
  }
  if (env.GOOGLE_ANALYTICS_ID) {
    const id = encodeURIComponent(env.GOOGLE_ANALYTICS_ID);
    head.push([
      "script",
      {
        async: "",
        src: `https://www.googletagmanager.com/gtag/js?id=${id}`,
      },
    ]);
    head.push([
      "script",
      {},
      `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config",${JSON.stringify(env.GOOGLE_ANALYTICS_ID)});`,
    ]);
  }
  if (env.BAIDU_ANALYTICS_ID) {
    head.push([
      "script",
      {},
      `window._hmt=window._hmt||[];(function(){var hm=document.createElement("script");hm.src="https://hm.baidu.com/hm.js?"+${JSON.stringify(env.BAIDU_ANALYTICS_ID)};var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(hm,s)})();`,
    ]);
  }
  if (env.UMAMI_SCRIPT_URL && env.UMAMI_WEBSITE_ID) {
    head.push([
      "script",
      {
        defer: "",
        src: env.UMAMI_SCRIPT_URL,
        "data-website-id": env.UMAMI_WEBSITE_ID,
      },
    ]);
  }
  return head;
}
