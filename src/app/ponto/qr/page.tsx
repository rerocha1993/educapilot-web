"use client";

import { TelaDeQrDaRecepcao } from "@/components/ponto/tela-de-qr";

// Tela do QR para o tablet da recepção. Pública de propósito (sem login e fora do menu do sistema):
// quem a abre é o tablet, com o endereço que a gestão copiou em RH › Ponto › Telas de recepção. O
// que dá acesso é o token do endereço, que a gestão pode desativar a qualquer momento.
export default function QrDaRecepcaoPage() {
  return <TelaDeQrDaRecepcao />;
}
