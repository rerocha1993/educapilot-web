"use client";

import { useEffect, useReducer, useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ativarPush,
  bannerDispensado,
  buscarChavePublica,
  dispensarBanner,
  permissaoDoPush,
  pushSuportado,
  registrarServiceWorker,
  sincronizarPush,
} from "@/lib/push/registrar-push";

const semAssinatura = () => () => {};

/**
 * Faixa discreta que convida a ligar as notificações (avisos, atividades e mensagens do chat).
 *
 * Só aparece quando tudo isto é verdade: o navegador suporta push, o servidor tem push ligado
 * (`ativo`), a permissão ainda está em "default" (nem concedida, nem bloqueada) e a pessoa não
 * disse "Agora não" nos últimos 7 dias. Bloqueado ou já ativo, não aparece. Quem já concedeu a
 * permissão e entrou de novo é inscrito em silêncio, para o aparelho valer para a conta de agora.
 *
 * Monte uma vez no shell da escola e uma no portal dos pais.
 */
export function BannerDeNotificacoes({ className }: { className?: string }) {
  // false no servidor e na hidratação, true depois: o que depende do navegador só entra no cliente.
  const noCliente = useSyncExternalStore(semAssinatura, () => true, () => false);
  const [, atualizar] = useReducer((n: number) => n + 1, 0);
  const [ativando, setAtivando] = useState(false);

  const suportado = noCliente && pushSuportado();
  const permissao = suportado ? permissaoDoPush() : "indisponivel";

  const { data: chave } = useQuery({
    queryKey: ["push", "chave-publica"],
    enabled: suportado && permissao !== "denied",
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: buscarChavePublica,
  });

  // O service worker precisa estar registrado antes do primeiro push, mesmo sem permissão ainda.
  useEffect(() => {
    if (suportado) void registrarServiceWorker();
  }, [suportado]);

  const chavePublica = chave?.ativo ? chave.chavePublica : null;
  useEffect(() => {
    if (permissao === "granted" && chavePublica) void sincronizarPush(chavePublica);
  }, [permissao, chavePublica]);

  const visivel = suportado && permissao === "default" && !!chavePublica && !bannerDispensado();
  if (!visivel) return null;

  async function ativar() {
    if (ativando) return;
    setAtivando(true);
    // Sem nenhum await antes: o pedido de permissão só abre a partir do gesto do clique.
    const resultado = await ativarPush(chavePublica ?? undefined);
    setAtivando(false);
    atualizar();

    if (resultado.ok) toast.success("Notificações ativadas neste aparelho.");
    else if (resultado.motivo === "negado") toast.info(resultado.mensagem);
    else if (resultado.motivo !== "adiado") toast.error(resultado.mensagem);
  }

  function agoraNao() {
    dispensarBanner();
    atualizar();
  }

  return (
    <section
      aria-label="Notificações"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-accent px-3.5 py-2 text-[13px] text-accent-foreground",
        className
      )}
    >
      <Bell aria-hidden className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 basis-56 font-medium">Ative as notificações para receber avisos e mensagens.</p>
      <div className="flex items-center gap-1.5">
        <Button type="button" variant="default" size="sm" onClick={ativar} disabled={ativando}>
          {ativando ? "Ativando…" : "Ativar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={agoraNao} disabled={ativando}>
          Agora não
        </Button>
      </div>
    </section>
  );
}
