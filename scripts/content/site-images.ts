import type { ResolvedSiteContent } from "../../src/site-content.js";
import type { MediaManifest } from "./images.js";

function resolveSiteImage(
  sourcePath: string,
  image: string,
  media: MediaManifest,
): string {
  if (!image) {
    return image;
  }
  const publicPath = media.paths.get(image);
  if (!publicPath) {
    throw new Error(`${sourcePath}: missing site image ${image}`);
  }
  return publicPath;
}

export function applySiteMediaManifest(
  content: ResolvedSiteContent,
  media: MediaManifest,
): ResolvedSiteContent {
  return {
    ...content,
    settings: {
      ...content.settings,
      logo: resolveSiteImage(
        "content/site/settings.yml",
        content.settings.logo,
        media,
      ),
    },
    home: {
      ...content.home,
      hero: {
        ...content.home.hero,
        image: resolveSiteImage(
          "content/site/home.yml",
          content.home.hero.image,
          media,
        ),
      },
      services: {
        ...content.home.services,
        items: content.home.services.items.map((service) => ({
          ...service,
          image: resolveSiteImage(
            "content/site/home.yml",
            service.image,
            media,
          ),
        })),
      },
    },
  };
}
