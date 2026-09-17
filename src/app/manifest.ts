import type { MetadataRoute } from "next";

// Faz o site instalável na tela inicial do celular ("Adicionar à tela de início"), abrindo sem a
// barra do navegador. Abre em /inicio, a tela de atalhos pensada para o celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EducaPilot",
    short_name: "EducaPilot",
    description: "Gestão escolar sem complicação",
    lang: "pt-BR",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAFAF9",
    theme_color: "#FFFFFF",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
