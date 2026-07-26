import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  const BASE = getAppUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/profile/"] },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
