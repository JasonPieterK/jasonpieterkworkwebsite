import type { MetadataRoute } from "next";
import { getSubjects } from "@/lib/github";

const SITE_URL = "https://jasonpieterkwork.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const subjects = await getSubjects();

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...subjects.map((s) => ({
      url: `${SITE_URL}/subject/${s.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
