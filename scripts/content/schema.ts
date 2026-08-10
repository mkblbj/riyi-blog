import { z } from "zod";

const stickySchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.number().int().positive().optional(),
);

export const RawPostSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(20).max(320),
  coverImg: z.string().regex(/^\/media\/[^\s]+$/),
  categories: z.array(z.uuid()).length(1),
  tags: z.array(z.string().trim().min(1).max(40)).default([]),
  authorName: z.string().trim().min(1).max(60),
  date: z.iso.datetime({ offset: true }),
  top: z.boolean().default(false),
  sticky: stickySchema,
  status: z.enum(["draft", "published", "archived"]),
});

export type RawPost = z.infer<typeof RawPostSchema>;

export interface LoadedPost {
  sourcePath: string;
  body: string;
  data: RawPost;
}

export interface PublicPost {
  id: string;
  title: string;
  description: string;
  coverImg: string;
  categoryIds: string[];
  categories: string[];
  tags: string[];
  author: { name: string };
  date: string;
  top: boolean;
  sticky?: number;
  permalink: `/posts/${string}/`;
  body: string;
  sourcePath: string;
}

export interface BuildManifest {
  generatedAt: string;
  posts: PublicPost[];
}

export interface PrepareOptions {
  contentDir: string;
  siteDir: string;
  manifestPath: string;
  optimizeImages?: boolean;
}
