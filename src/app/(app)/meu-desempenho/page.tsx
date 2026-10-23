"use client";

import { TelaMeuDesempenho } from "@/components/desempenho/tela-meu-desempenho";

// Meu desempenho: o autoatendimento do funcionário. Fora de qualquer módulo de propósito (ver pode-ver.ts, que não
// conhece esta rota), como o meu-ponto: a professora, a auxiliar e a cozinheira veem a própria nota e os feedbacks
// compartilhados com elas sem ter acesso ao RH. Quem decide se a tela serve é o servidor: sem ficha de funcionário,
// a própria tela explica.
export default function MeuDesempenhoPage() {
  return <TelaMeuDesempenho />;
}
