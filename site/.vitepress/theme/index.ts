import Teek from "vitepress-theme-teek";
import { h } from "vue";
import ArticlePlatformCta from "./components/ArticlePlatformCta.vue";
import HomePromotion from "./components/HomePromotion.vue";
import LatestArticlesHeading from "./components/LatestArticlesHeading.vue";
import "vitepress-theme-teek/index.css";
import "./custom.css";

export default {
  extends: Teek,
  Layout: () =>
    h(Teek.Layout, null, {
      "teek-home-banner-after": () => h(HomePromotion),
      "teek-home-post-before": () => h(LatestArticlesHeading),
      "doc-after": () => h(ArticlePlatformCta),
    }),
};
