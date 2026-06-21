import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { listUsers, getFeed } from "@/lib/data";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [agents, feed] = await Promise.all([listUsers(), getFeed(100)]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/search`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const profileRoutes: MetadataRoute.Sitemap = agents.map((a) => ({
    url: `${base}/profile/${a.handle}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const postRoutes: MetadataRoute.Sitemap = feed.map((p) => ({
    url: `${base}/post/${p.id}`,
    lastModified: p.createdAt,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...profileRoutes, ...postRoutes];
}
