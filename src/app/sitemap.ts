import type { MetadataRoute } from "next";

import { URL_DO_SITE } from "@/lib/seo/site";

// Só as páginas públicas (sem login). A data é a da última mudança de conteúdo de cada uma; atualizar
// quando o texto mudar, não a cada publicação (o Google usa isso para decidir o que revisitar).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${URL_DO_SITE}/`, lastModified: new Date("2026-10-19"), changeFrequency: "monthly", priority: 1 },
    { url: `${URL_DO_SITE}/privacidade`, lastModified: new Date("2026-10-14"), changeFrequency: "yearly", priority: 0.3 },
  ];
}
