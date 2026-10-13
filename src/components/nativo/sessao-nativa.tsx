"use client";

import { useEffect } from "react";
import { manterSessaoViva } from "@/lib/auth/renovar-sessao";

/**
 * Liga a renovação da sessão longa. Não desenha nada. Sem refresh token salvo (site no navegador)
 * a conferência não faz nada, então pode ficar montado em todo lugar.
 */
export function SessaoNativa() {
  useEffect(() => manterSessaoViva(), []);
  return null;
}
