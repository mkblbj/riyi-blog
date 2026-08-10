import { z } from "zod";
import { ThemeTokensSchema } from "./theme-colors.js";

const uuid = z.uuid();
const shortText = z.string().trim().min(1).max(120);
const longText = z.string().trim().min(1).max(500);
const optionalSiteImage = z
  .union([z.literal(""), z.string().regex(/^\/site-media\/[^\s]+$/)])
  .default("");
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const httpsUrl = z
  .url()
  .refine((value) => new URL(value).protocol === "https:");

export const LinkTargetSchema = z.strictObject({
  kind: z.enum(["category", "internal", "external"]),
  categoryId: z.union([z.literal(""), uuid]).default(""),
  href: z.string().trim().default(""),
});

export const CategorySourceSchema = z.strictObject({
  id: uuid,
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  name: shortText,
  description: z.string().trim().max(320).default(""),
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
});

export const CategorySchema = CategorySourceSchema.extend({
  slug: z.string().regex(/^[a-z0-9-]+$/),
});

export const SiteSettingsSchema = z.strictObject({
  schemaVersion: z.literal(1),
  layoutPreset: z.literal("official-v1"),
  siteName: shortText,
  siteDescription: z.string().trim().min(20).max(320),
  logo: optionalSiteImage,
  primaryColor: hexColor,
  secondaryColor: hexColor,
});

const ordered = {
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
};
const target = LinkTargetSchema.shape;

const QuickLinkSchema = z.strictObject({
  id: z.enum(["rent", "purchase", "listings"]),
  ...ordered,
  title: shortText,
  description: longText,
  ...target,
});

const ServiceSchema = z.strictObject({
  id: z.enum(["rent", "purchase", "study"]),
  ...ordered,
  title: shortText,
  description: longText,
  image: optionalSiteImage,
  imageAlt: z.string().trim().max(160).default(""),
  linkLabel: shortText,
  ...target,
});

const AdvantageSchema = z.strictObject({
  id: z.enum(["video", "commute", "verify", "follow"]),
  ...ordered,
  title: shortText,
  description: longText,
});

const ActionSchema = z.strictObject({
  id: z.enum(["listings", "demand", "wechat"]),
  ...ordered,
  label: shortText,
  description: longText,
  tone: z.enum(["primary", "secondary", "quiet"]),
  href: httpsUrl,
});

export const HomeContentSchema = z.strictObject({
  hero: z.strictObject({
    title: shortText,
    description: longText,
    image: optionalSiteImage,
    imageAlt: z.string().trim().max(160).default(""),
    quickLinks: z.array(QuickLinkSchema).length(3),
  }),
  appDownload: z.strictObject({
    enabled: z.boolean(),
    eyebrow: shortText,
    title: shortText,
    description: longText,
    appStoreUrl: httpsUrl,
    googlePlayUrl: httpsUrl,
    wechatMiniProgram: z.string().regex(/^#小程序:\/\/[^/\s]+\/[A-Za-z0-9]+$/),
  }),
  services: z.strictObject({
    eyebrow: shortText,
    title: shortText,
    description: longText,
    items: z.array(ServiceSchema).length(3),
  }),
  advantages: z.strictObject({
    enabled: z.boolean(),
    eyebrow: shortText,
    title: shortText,
    description: longText,
    items: z.array(AdvantageSchema).length(4),
  }),
  actions: z.strictObject({
    eyebrow: shortText,
    title: shortText,
    description: longText,
    items: z.array(ActionSchema).length(3),
  }),
  articles: z.strictObject({
    eyebrow: shortText,
    title: shortText,
    description: longText,
  }),
});

export const NavigationSchema = z.strictObject({
  home: z.strictObject({
    label: shortText,
    order: z.number().int().nonnegative(),
  }),
  items: z.array(
    z.strictObject({
      id: uuid,
      label: shortText,
      kind: z.enum(["category", "internal", "external"]),
      categoryId: z.union([z.literal(""), uuid]).default(""),
      href: z.string().trim().default(""),
      visible: z.boolean(),
      newWindow: z.boolean(),
      order: z.number().int().nonnegative(),
    }),
  ),
});

export type LinkTarget = z.infer<typeof LinkTargetSchema>;
export type CategorySource = z.infer<typeof CategorySourceSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type SiteSettings = z.infer<typeof SiteSettingsSchema>;
export type HomeContent = z.infer<typeof HomeContentSchema>;
export type Navigation = z.infer<typeof NavigationSchema>;

export interface SiteSourceContent {
  settings: SiteSettings;
  home: HomeContent;
  navigation: Navigation;
  categories: Category[];
}

const ResolvedQuickLinkSchema = QuickLinkSchema.omit({
  kind: true,
  categoryId: true,
}).extend({
  href: z.string(),
  external: z.boolean(),
});

const ResolvedServiceSchema = ServiceSchema.omit({
  kind: true,
  categoryId: true,
}).extend({
  href: z.string(),
  external: z.boolean(),
});

export const ResolvedHomeContentSchema = HomeContentSchema.extend({
  hero: HomeContentSchema.shape.hero.extend({
    quickLinks: z.array(ResolvedQuickLinkSchema).length(3),
  }),
  services: HomeContentSchema.shape.services.extend({
    items: z.array(ResolvedServiceSchema).length(3),
  }),
  actions: HomeContentSchema.shape.actions.extend({
    items: z
      .array(ActionSchema.extend({ external: z.literal(true) }))
      .length(3),
  }),
});

export const ResolvedNavigationItemSchema = z.object({
  id: z.string(),
  label: shortText,
  href: z.string(),
  external: z.boolean(),
  newWindow: z.boolean(),
  order: z.number().int().nonnegative(),
});

export const ResolvedNavigationSchema = z.object({
  items: z.array(ResolvedNavigationItemSchema),
});

export const ResolvedSiteContentSchema = z.object({
  settings: SiteSettingsSchema,
  home: ResolvedHomeContentSchema,
  navigation: ResolvedNavigationSchema,
  categories: z.array(CategorySchema),
});

export type ResolvedHomeContent = z.infer<typeof ResolvedHomeContentSchema>;
export type ResolvedNavigationItem = z.infer<
  typeof ResolvedNavigationItemSchema
>;
export type ResolvedSiteContent = z.infer<typeof ResolvedSiteContentSchema>;

export const SiteManifestSchema = z.object({
  generatedAt: z.iso.datetime({ offset: true }),
  content: ResolvedSiteContentSchema,
  themeTokens: ThemeTokensSchema,
});

export type SiteManifest = z.infer<typeof SiteManifestSchema>;

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const internalLinkOrigin = "https://site-content.invalid";

function isInternalUrl(value: string): boolean {
  if (
    !/^\/(?!\/)/.test(value) ||
    /[\\\u0000-\u001f\u007f-\u009f]/.test(value)
  ) {
    return false;
  }
  try {
    return new URL(value, internalLinkOrigin).origin === internalLinkOrigin;
  } catch {
    return false;
  }
}

export function resolveLinkTarget(
  targetValue: LinkTarget,
  categories: readonly Category[],
  sourcePath: string,
): { href: string; external: boolean } {
  if (targetValue.kind === "category") {
    const category = categories.find(({ id }) => id === targetValue.categoryId);
    if (!category) {
      throw new Error(
        `${sourcePath}: category ${targetValue.categoryId} is missing`,
      );
    }
    if (!category.enabled) {
      throw new Error(
        `${sourcePath}: category ${targetValue.categoryId} is disabled`,
      );
    }
    return { href: `/category/${category.slug}/`, external: false };
  }
  if (targetValue.kind === "internal" && isInternalUrl(targetValue.href)) {
    return { href: targetValue.href, external: false };
  }
  if (targetValue.kind === "external" && isHttpsUrl(targetValue.href)) {
    return { href: targetValue.href, external: true };
  }
  throw new Error(`${sourcePath}: invalid ${targetValue.kind} target`);
}

export function validatePostCategoryReferences(
  categoryIds: readonly string[],
  categories: readonly Category[],
  sourcePath: string,
): void {
  for (const categoryId of categoryIds) {
    const category = categories.find(({ id }) => id === categoryId);
    if (!category) {
      throw new Error(`${sourcePath}: missing category ${categoryId}`);
    }
    if (!category.enabled) {
      throw new Error(
        `${sourcePath}: disabled category ${categoryId}; choose an enabled category`,
      );
    }
  }
}

function assertUniqueNavigation(source: SiteSourceContent): void {
  const ids = new Set<string>();
  const orders = new Set<number>([source.navigation.home.order]);
  for (const item of source.navigation.items) {
    if (ids.has(item.id)) {
      throw new Error("content/site/navigation.yml: duplicate item id");
    }
    ids.add(item.id);
    if (orders.has(item.order)) {
      throw new Error("content/site/navigation.yml: duplicate item order");
    }
    orders.add(item.order);
  }
}

function resolveHome(source: SiteSourceContent): ResolvedHomeContent {
  const sourcePath = "content/site/home.yml";
  if (source.home.hero.image && !source.home.hero.imageAlt) {
    throw new Error(
      `${sourcePath}: hero imageAlt is required when image is set`,
    );
  }
  for (const service of source.home.services.items) {
    if (service.image && !service.imageAlt) {
      throw new Error(
        `${sourcePath}: service ${service.id} imageAlt is required when image is set`,
      );
    }
  }
  if (!source.home.actions.items.some(({ enabled }) => enabled)) {
    throw new Error(`${sourcePath}: at least one action must be enabled`);
  }

  const quickLinks = source.home.hero.quickLinks.map(
    ({ kind, categoryId, ...item }) => ({
      ...item,
      ...resolveLinkTarget(
        { kind, categoryId, href: item.href },
        source.categories,
        sourcePath,
      ),
    }),
  );
  const services = source.home.services.items.map(
    ({ kind, categoryId, ...item }) => ({
      ...item,
      ...resolveLinkTarget(
        { kind, categoryId, href: item.href },
        source.categories,
        sourcePath,
      ),
    }),
  );

  return ResolvedHomeContentSchema.parse({
    ...source.home,
    hero: { ...source.home.hero, quickLinks },
    services: { ...source.home.services, items: services },
    actions: {
      ...source.home.actions,
      items: source.home.actions.items.map((action) => ({
        ...action,
        external: true as const,
      })),
    },
  });
}

function resolveNavigation(
  source: SiteSourceContent,
): z.infer<typeof ResolvedNavigationSchema> {
  const sourcePath = "content/site/navigation.yml";
  assertUniqueNavigation(source);

  const items: ResolvedNavigationItem[] = [
    {
      id: "home",
      label: source.navigation.home.label,
      href: "/",
      external: false,
      newWindow: false,
      order: source.navigation.home.order,
    },
  ];

  for (const item of source.navigation.items) {
    const resolvedTarget = resolveLinkTarget(
      item,
      source.categories,
      sourcePath,
    );
    if (item.kind !== "external" && item.newWindow) {
      throw new Error(
        `${sourcePath}: newWindow is only valid for external items`,
      );
    }
    if (item.visible) {
      items.push({
        id: item.id,
        label: item.label,
        ...resolvedTarget,
        newWindow: item.kind === "external" ? item.newWindow : false,
        order: item.order,
      });
    }
  }

  items.sort(
    (left, right) =>
      left.order - right.order || left.label.localeCompare(right.label),
  );
  return { items };
}

export function resolveSiteContent(
  source: SiteSourceContent,
): ResolvedSiteContent {
  const navigation = resolveNavigation(source);
  const home = resolveHome(source);
  return ResolvedSiteContentSchema.parse({
    settings: source.settings,
    home,
    navigation,
    categories: source.categories,
  });
}
