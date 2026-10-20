import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone com um server.js autocontido (só as dependências
  // realmente usadas). É o formato que o Azure App Service roda direto com
  // `node server.js`, sem precisar de npm install no servidor.
  output: "standalone",

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
