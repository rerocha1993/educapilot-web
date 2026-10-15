"use client";

import { useSyncExternalStore } from "react";

import { plataformaDoApp } from "@/lib/nativo/app";

const CHAVE = "educapilot_tema_ios";

function temaPedido(): "ios" | "padrao" | null {
  try {
    const pedido = new URLSearchParams(window.location.search).get("tema");
    if (pedido === "ios" || pedido === "padrao") window.sessionStorage.setItem(CHAVE, pedido);
    const guardado = window.sessionStorage.getItem(CHAVE);
    return guardado === "ios" || guardado === "padrao" ? guardado : null;
  } catch {
    return null; // Storage bloqueado: vale só o aparelho.
  }
}

function ligadoNoCliente(): boolean {
  const pedido = temaPedido();
  return pedido === "ios" || (pedido !== "padrao" && plataformaDoApp() === "ios");
}

const semAssinatura = () => () => {};

/**
 * O visual "iPhone" (vidro, cantos grandes, barra flutuante) vale para o app no iOS. No navegador e no
 * Android o portal segue como está. Para ver o tema fora do iPhone (capturas da loja, revisão de
 * design), abra qualquer tela do portal com `?tema=ios`; `?tema=padrao` desliga. A escolha fica só na aba.
 *
 * No servidor vale falso (ele não sabe em que aparelho está) e o cliente corrige ao hidratar.
 */
export function useTemaIos(): boolean {
  return useSyncExternalStore(semAssinatura, ligadoNoCliente, () => false);
}
