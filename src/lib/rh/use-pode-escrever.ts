"use client";

import { useSessaoLocal } from "@/lib/auth/use-sessao-local";

/**
 * A pessoa pode alterar dados do RH?
 *
 * Professor (perfil Teacher) só lê. É só a tela: os botões de escrita somem, e se alguma chamada
 * escapar o servidor devolve 403 e a mensagem dele aparece em toast. Enquanto a sessão não é lida
 * (prerender e hidratação) a resposta é "não", para o botão não piscar para quem não pode.
 */
export function usePodeEscreverNoRh(): boolean {
  const sessao = useSessaoLocal();
  return !!sessao && sessao.role !== "Teacher";
}
