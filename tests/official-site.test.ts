import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSiteContent } from "../scripts/content/load-site.js";
import {
  selectVisibleActions,
  selectVisibleAdvantages,
  selectVisibleServices,
  shouldShowArticleCta,
} from "../src/official-site.js";
import { resolveSiteContent } from "../src/site-content.js";

function homeFixture() {
  const home = structuredClone(
    resolveSiteContent(loadSiteContent(join(process.cwd(), "content"))).home,
  );

  const serviceOrder = { purchase: 10, rent: 20, study: 30 };
  for (const service of home.services.items) {
    service.enabled = service.id !== "study";
    service.order = serviceOrder[service.id];
  }

  const advantageOrder = {
    follow: 10,
    verify: 20,
    commute: 30,
    video: 40,
  };
  for (const advantage of home.advantages.items) {
    advantage.enabled = advantage.id !== "video";
    advantage.order = advantageOrder[advantage.id];
  }

  const actionOrder = { listings: 10, wechat: 20, demand: 30 };
  for (const action of home.actions.items) {
    action.enabled = action.id !== "demand";
    action.order = actionOrder[action.id];
  }

  return home;
}

describe("official site promotion", () => {
  it("sorts and filters CMS services and actions", () => {
    const home = homeFixture();

    expect(selectVisibleServices(home.services).map(({ id }) => id)).toEqual([
      "purchase",
      "rent",
    ]);
    expect(selectVisibleActions(home.actions).map(({ id }) => id)).toEqual([
      "listings",
      "wechat",
    ]);
  });

  it("sorts and filters CMS advantages without mutating their source order", () => {
    const home = homeFixture();
    const sourceOrder = home.advantages.items.map(({ id }) => id);

    expect(
      selectVisibleAdvantages(home.advantages).map(({ id }) => id),
    ).toEqual(["follow", "verify", "commute"]);
    expect(home.advantages.items.map(({ id }) => id)).toEqual(sourceOrder);
  });

  it("shows the article CTA only for explicit article pages", () => {
    expect(shouldShowArticleCta({ article: true })).toBe(true);
    expect(shouldShowArticleCta({ article: false })).toBe(false);
    expect(shouldShowArticleCta({ article: "true" })).toBe(false);
    expect(shouldShowArticleCta({})).toBe(false);
  });
});
