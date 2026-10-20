import type { MetadataRoute } from "next";

import { URL_DO_SITE } from "@/lib/seo/site";

// O que o Google pode indexar: o site institucional (/), as páginas legais e os assets. As telas do
// sistema ficam atrás de login e não interessam à busca; /site/index.html é a mesma página que a raiz
// (duplicada) e o canonical dela já aponta para /.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: [
          "/site/index.html",
          "/login",
          "/convite",
          "/inicio",
          "/admin",
          "/f/",
          "/master",
          "/ponto",
          "/responsavel",
          "/api/",
        ],
      },
    ],
    sitemap: `${URL_DO_SITE}/sitemap.xml`,
    host: URL_DO_SITE,
  };
}
