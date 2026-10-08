"use client";

import { useEffect, useState } from "react";
import { QrCode, WifiOff } from "lucide-react";

import { useQueryStringLocal } from "@/lib/auth/use-sessao-local";
import { dataPorExtenso, diaIsoDe, relogioDe, useAgoraDaEscola, useNoNavegador } from "@/lib/rh/ponto-formatar";
import { buscarCodigoDaTela, type CodigoDaTelaPublica } from "@/lib/rh/use-marcacoes";
import { cn } from "@/lib/utils";

import { QrDesenhado } from "./qr-desenhado";

type Aviso = "sem-rede" | "espera" | "erro" | null;

/** Código recebido e o instante (do tablet) em que chegou: a contagem usa os `segundos` do servidor. */
interface CodigoRecebido {
  dados: CodigoDaTelaPublica;
  recebidoEm: number;
}

const ESPERA_APOS_FALHA_MS = 5_000;

/**
 * A tela do QR da recepção, feita para um tablet em pé: nome da escola, um QR grande que muda a
 * cada poucos segundos, relógio e a contagem para o próximo código. Sem botões — ninguém toca nela.
 *
 * O funcionário aponta a câmera do celular (Meu ponto › Ler o QR da recepção) e prova que está na
 * escola. O código vence rápido de propósito: uma foto dele não adianta de casa.
 */
export function TelaDeQrDaRecepcao() {
  const token = useQueryStringLocal().get("tela")?.trim() ?? "";
  const noNavegador = useNoNavegador();
  const agora = useAgoraDaEscola(0);

  const [codigo, setCodigo] = useState<CodigoRecebido | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [revogada, setRevogada] = useState(false);

  // Pede o código, espera `segundos` e pede de novo. Falha de rede e 429 só adiam a próxima busca.
  useEffect(() => {
    if (!token) return;

    let vivo = true;
    let relogio: number | undefined;

    async function buscar() {
      const r = await buscarCodigoDaTela(token);
      if (!vivo) return;

      let proxima = ESPERA_APOS_FALHA_MS;
      if (r.status === "ok") {
        setCodigo({ dados: r.dados, recebidoEm: Date.now() });
        setAviso(null);
        proxima = r.dados.segundos * 1000;
      } else if (r.status === "revogada") {
        setRevogada(true);
        return;
      } else if (r.status === "espera") {
        setAviso("espera");
        proxima = r.segundos * 1000;
      } else {
        setAviso(r.status);
      }
      relogio = window.setTimeout(() => void buscar(), proxima);
    }

    void buscar();

    return () => {
      vivo = false;
      if (relogio !== undefined) window.clearTimeout(relogio);
    };
  }, [token]);

  // Mantém o tablet acordado: a tela apagada deixaria a recepção sem QR.
  useEffect(() => {
    let trava: WakeLockSentinel | null = null;

    async function pedir() {
      try {
        trava = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // sem suporte ou sem permissão: o tablet precisa estar configurado para não apagar a tela
      }
    }

    const aoVoltar = () => {
      if (document.visibilityState === "visible") void pedir();
    };

    void pedir();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      void trava?.release().catch(() => undefined);
    };
  }, []);

  const segundosTotais = codigo?.dados.segundos ?? 0;
  const decorrido = codigo ? (agora - codigo.recebidoEm) / 1000 : 0;
  const restante = codigo ? Math.max(0, Math.ceil(segundosTotais - decorrido)) : 0;
  // O código novo costuma chegar logo ao zerar; só some o QR se passou da hora e nada chegou.
  const vencido = !!codigo && decorrido > segundosTotais + 3;
  const fracao = codigo && segundosTotais > 0 ? Math.min(1, Math.max(0, restante / segundosTotais)) : 0;
  const { horaMinuto, segundos } = relogioDe(agora);

  if (!noNavegador) return <Moldura />;

  if (!token) {
    return (
      <Moldura>
        <Mensagem
          titulo="Link incompleto"
          texto="Este endereço está sem o código da tela. Peça à gestão o link completo, em RH › Ponto › Telas de recepção."
        />
      </Moldura>
    );
  }

  if (revogada) {
    return (
      <Moldura>
        <Mensagem
          titulo="Esta tela foi desativada."
          texto="Peça à gestão um novo link."
        />
      </Moldura>
    );
  }

  return (
    <Moldura>
      <header className="text-center">
        <h1 className="font-heading text-[clamp(1.75rem,5vw,3rem)] leading-tight font-semibold tracking-[-.02em]">
          {codigo?.dados.escolaNome || " "}
        </h1>
        <p className="mt-1 text-[clamp(1rem,2.2vw,1.375rem)] text-neutral-500">{codigo?.dados.telaNome || " "}</p>
      </header>

      <section aria-label="QR do ponto" className="flex w-full flex-col items-center gap-5">
        <div
          className={cn(
            "relative w-[min(86vw,56dvh)] rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm transition-opacity duration-300",
            (!codigo || vencido) && "opacity-30"
          )}
        >
          {codigo ? (
            <QrDesenhado texto={codigo.dados.codigo} rotulo="QR para bater o ponto" />
          ) : (
            <div className="grid aspect-square w-full place-items-center rounded-xl bg-neutral-100 text-neutral-400">
              <QrCode className="size-1/3" aria-hidden />
            </div>
          )}
        </div>

        <div className="w-[min(86vw,56dvh)]">
          <div
            className="h-2.5 overflow-hidden rounded-full bg-neutral-200"
            role="progressbar"
            aria-label="Tempo para o próximo código"
            aria-valuemin={0}
            aria-valuemax={segundosTotais}
            aria-valuenow={restante}
          >
            <div
              className="h-full origin-left rounded-full bg-neutral-800 transition-[width] duration-1000 ease-linear"
              style={{ width: `${fracao * 100}%` }}
            />
          </div>
          <p className="mt-2 text-center text-[clamp(1rem,2.2vw,1.25rem)] text-neutral-600" aria-live="off">
            {codigo ? (
              restante === 0 ? (
                "Atualizando o código..."
              ) : (
                <>
                  Novo código em <span className="font-mono font-medium tabular-nums">{restante}</span> s
                </>
              )
            ) : (
              "Carregando o código..."
            )}
          </p>
        </div>

        {aviso === "sem-rede" || aviso === "erro" ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-[clamp(.9rem,1.8vw,1.1rem)] font-medium text-amber-900"
          >
            <WifiOff className="size-5" aria-hidden />
            {aviso === "sem-rede"
              ? "Sem conexão com a internet. Tentando de novo..."
              : "Não foi possível atualizar o código. Tentando de novo..."}
          </p>
        ) : null}
      </section>

      <footer className="text-center">
        <p className="font-heading text-[clamp(2.5rem,8vw,5rem)] leading-none font-semibold tracking-[-.04em] tabular-nums">
          {horaMinuto}
          <span className="text-[.4em] tracking-normal text-neutral-400">:{segundos}</span>
        </p>
        <p className="mt-1 text-[clamp(.95rem,2vw,1.25rem)] text-neutral-500 first-letter:uppercase">
          {dataPorExtenso(diaIsoDe(agora))}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-[clamp(.85rem,1.6vw,1.05rem)] text-neutral-500">
          Para bater o ponto, abra Meu ponto no celular e toque em Ler o QR da recepção.
        </p>
      </footer>
    </Moldura>
  );
}

/** Fundo claro, tela toda, conteúdo distribuído de cima a baixo: o tablet fica em pé. */
function Moldura({ children }: { children?: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-between gap-6 bg-white px-6 py-8 text-neutral-900">
      {children}
    </main>
  );
}

function Mensagem({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="m-auto flex max-w-xl flex-col items-center gap-4 text-center">
      <span className="grid size-20 place-items-center rounded-3xl bg-neutral-100 text-neutral-500">
        <QrCode className="size-10" aria-hidden />
      </span>
      <h1 className="font-heading text-3xl font-semibold tracking-[-.02em]">{titulo}</h1>
      <p className="text-xl text-neutral-600">{texto}</p>
    </div>
  );
}
