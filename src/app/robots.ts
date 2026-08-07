import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/einstellungen"],
      },
    ],
    sitemap: [
      "https://www.republicofpixels.com/sitemap.xml",
      "https://www.republicofpixels.com/news-sitemap.xml",
    ],
  };
}
