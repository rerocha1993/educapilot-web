"use client";

import { TelaMeuPonto } from "@/components/ponto/tela-meu-ponto";

// Meu ponto: a batida de ponto pelo celular. Fora de qualquer módulo de propósito (ver pode-ver.ts,
// que não conhece esta rota): quem bate o ponto é a professora, a auxiliar, a cozinheira — nem
// todas têm acesso ao RH. Quem decide se a tela serve é o servidor: sem ficha de funcionário ou com
// o ponto desligado, a própria tela explica.
export default function MeuPontoPage() {
  return <TelaMeuPonto />;
}
