import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone com um server.js autocontido (só as dependências
  // realmente usadas). É o formato que o Azure App Service roda direto com
  // `node server.js`, sem precisar de npm install no servidor.
  output: "standalone",
};

export default nextConfig;
