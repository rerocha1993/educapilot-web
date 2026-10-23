import type { NextConfig } from "next";

// Segurança (2026-10, auditoria): o token de sessão mora no storage do navegador, e qualquer script que rode na
// página consegue lê-lo. Estes cabeçalhos fecham as saídas: a política de conteúdo (CSP) só deixa a página falar
// com a própria origem e com a API, então um script injetado não consegue mandar o token para fora por fetch,
// WebSocket ou imagem; ninguém embute o sistema num iframe (clickjacking); e os links com ?token= (convite,
// redefinir senha) não vazam no cabeçalho Referer para sites externos.
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";
const apiOrigem = new URL(apiBase).origin;
const apiSocket = apiOrigem.replace(/^http/, "ws");
const emDesenvolvimento = process.env.NODE_ENV !== "production";

const politicaDoSistema = [
  "default-src 'self'",
  // Next injeta scripts inline de hidratação; 'unsafe-eval' só no next dev (recarga rápida).
  `script-src 'self' 'unsafe-inline'${emDesenvolvimento ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Fotos e anexos chegam da API como blob:; QR do Pix em data:; mapa da portaria no OpenStreetMap.
  `img-src 'self' data: blob: ${apiOrigem} https://*.tile.openstreetmap.org`,
  "font-src 'self' data:",
  // API (REST e SignalR) e o CEP. Nenhum outro destino recebe dados da página.
  `connect-src 'self' ${apiOrigem} ${apiSocket} https://viacep.com.br${emDesenvolvimento ? " ws: wss:" : ""}`,
  "media-src 'self' blob: data:",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(emDesenvolvimento ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// Site institucional estático (public/site): usa React/Babel no navegador e o three.js do unpkg. Não fala com a API.
const politicaDoSite = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://plus.unsplash.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://unpkg.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const comuns = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Sem Referer para fora: links de convite e de senha carregam o token na URL.
  { key: "Referrer-Policy", value: "no-referrer" },
  // Câmera (foto da portaria, comprovante) e localização (ponto) só para o próprio site.
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(emDesenvolvimento ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  // Gera .next/standalone com um server.js autocontido (só as dependências
  // realmente usadas). É o formato que o Azure App Service roda direto com
  // `node server.js`, sem precisar de npm install no servidor.
  output: "standalone",

  // Não anuncia "X-Powered-By: Next.js" (dá a versão de bandeja para quem procura falha conhecida).
  poweredByHeader: false,

  // A Reunião com os pais virou "Reuniões e atendimentos": os endereços antigos (favoritos, links do dossiê)
  // seguem funcionando. Os parâmetros (?turma=&aluno=) passam junto.
  async redirects() {
    return [
      { source: "/reunioes-pais", destination: "/reunioes-e-atendimentos", permanent: false },
      { source: "/reunioes-pais/:caminho*", destination: "/reunioes-e-atendimentos/:caminho*", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/((?!site/).*)",
        headers: [...comuns, { key: "Content-Security-Policy", value: politicaDoSistema }],
      },
      {
        source: "/site/:path*",
        headers: [...comuns, { key: "Content-Security-Policy", value: politicaDoSite }],
      },
      {
        // Service worker do push (public/sw.js). Nunca em cache: o navegador precisa ver a versão
        // nova na hora, ou o push continua rodando código velho. O escopo é a raiz do site (o
        // arquivo está em /), e o cabeçalho deixa isso explícito.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
