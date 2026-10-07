"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, Clock, History, Smartphone, UserRoundX } from "lucide-react";

import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Skeleton } from "@/components/ui/skeleton";
import { ErroDeCarga } from "@/components/rh/campo";
import { dataPorExtenso, relogioDe, useAgoraDaEscola } from "@/lib/rh/ponto-formatar";
import {
  ROTULO_DO_BOTAO,
  comprovanteDoDia,
  useAparelhoDesteCelular,
  useAtualizarMeuPonto,
  useMeuPonto,
  type ComprovanteDoPonto,
  type MeuPonto,
  type TipoDeBatida,
} from "@/lib/rh/use-meu-ponto";

import { FluxoDaBatida } from "./fluxo-da-batida";
import { FolhaDosAparelhos, FolhaDoHistorico } from "./historico-e-aparelhos";
import { LinhaDoDia } from "./linha-do-dia";
import { BotaoGrande, ComprovanteDeBatida } from "./pecas";

/**
 * Meu ponto: a tela de quem bate o ponto pelo celular. Feita para ser usada em pé, com uma mão —
 * relógio e dia no alto, o botão grande embaixo, ao alcance do polegar.
 */
export function TelaMeuPonto() {
  const { data, isLoading, isError, error, refetch } = useMeuPonto();

  if (isLoading) {
    return (
      <Moldura>
        <div className="grid gap-4" role="status" aria-label="Carregando">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="mt-8 h-20 w-full rounded-2xl" />
        </div>
      </Moldura>
    );
  }

  if (isError || !data) {
    return (
      <Moldura>
        <ErroDeCarga
          texto={error instanceof Error ? error.message : "Não foi possível carregar o seu ponto."}
          onTentar={() => refetch()}
        />
      </Moldura>
    );
  }

  if (data.status === "sem-ficha") {
    return (
      <Moldura>
        <EstadoVazio
          icone={<UserRoundX />}
          titulo="Seu usuário ainda não está ligado a uma ficha de funcionário"
          texto="Peça à secretaria para ligar o seu usuário à sua ficha. Depois disso, o ponto aparece aqui."
          textoClassName="max-w-[320px]"
        />
      </Moldura>
    );
  }

  if (!data.dados.configuracao.ativo) {
    return (
      <Moldura>
        <EstadoVazio
          icone={<Clock />}
          titulo="A escola não usa ponto pelo celular"
          texto="Quando a escola ligar esta função, você bate o ponto por aqui."
        />
      </Moldura>
    );
  }

  return <PainelDoDia dados={data.dados} />;
}

/** Largura de celular, centralizada, com altura para o botão descer até o polegar. */
function Moldura({
  children,
  titulo = "Meu ponto",
  apoio,
}: {
  children: React.ReactNode;
  titulo?: string;
  apoio?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-md flex-col gap-5 md:min-h-0">
      <header className="flex items-center gap-1">
        <Link
          href="/inicio"
          aria-label="Voltar ao Início"
          className="-ml-2 grid size-12 shrink-0 place-items-center rounded-full text-foreground active:bg-muted md:hover:bg-muted"
        >
          <ArrowLeft className="size-6" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-heading text-lg leading-tight font-semibold tracking-[-.02em]">{titulo}</h1>
          {apoio && <p className="truncate text-[13px] text-muted-foreground">{apoio}</p>}
        </div>
      </header>
      {children}
    </div>
  );
}

type FolhaAberta =
  | { tipo: "historico" }
  | { tipo: "aparelhos" }
  | { tipo: "comprovante"; comprovante: ComprovanteDoPonto; recem: boolean; voltarPara: "historico" | null };

function PainelDoDia({ dados }: { dados: MeuPonto }) {
  const atualizar = useAtualizarMeuPonto();
  const agora = useAgoraDaEscola(dados.deslocamentoMs);
  const aparelhoDeste = useAparelhoDesteCelular(dados.aparelhos);
  const [fluxo, setFluxo] = useState<TipoDeBatida | null>(null);
  const [folha, setFolha] = useState<FolhaAberta | null>(null);

  const { proximaBatida, concluido, batidas } = dados.hoje;
  const { horaMinuto, segundos } = relogioDe(agora);
  const nomeDaEscola = dados.escola?.nome ?? null;
  const primeiroNome = dados.funcionario.nome.split(" ").find(Boolean) ?? "";

  return (
    <Moldura titulo={nomeDaEscola ?? "Meu ponto"} apoio={primeiroNome ? `Olá, ${primeiroNome}` : undefined}>
      {/* Relógio da escola: a hora do servidor, não a do celular. */}
      <section aria-label="Relógio da escola" className="text-center">
        <p className="font-heading text-[clamp(3.5rem,19vw,5rem)] leading-none font-semibold tracking-[-.04em] tabular-nums">
          {horaMinuto}
          <span className="text-[.4em] tracking-normal text-muted-foreground">:{segundos}</span>
        </p>
        <p className="mt-2 text-[15px] text-muted-foreground first-letter:uppercase">
          {dataPorExtenso(dados.hoje.data)}
        </p>
      </section>

      <section aria-label="Seu dia" className="rounded-2xl border border-border bg-card px-2 py-3">
        <LinhaDoDia
          batidas={batidas}
          proxima={proximaBatida}
          onAbrir={(b) =>
            setFolha({ tipo: "comprovante", comprovante: comprovanteDoDia(b, dados), recem: false, voltarPara: null })
          }
        />
      </section>

      <div className="mt-auto flex flex-col gap-3 pt-2">
        {concluido ? (
          <div className="flex h-20 items-center justify-center gap-3 rounded-2xl bg-success-soft text-xl font-semibold text-success-soft-foreground">
            <CircleCheck className="size-7" aria-hidden />
            Dia completo
          </div>
        ) : proximaBatida ? (
          <>
            <BotaoGrande
              variant="action"
              className="h-20 rounded-2xl text-xl max-md:h-20"
              onClick={() => setFluxo(proximaBatida)}
            >
              {ROTULO_DO_BOTAO[proximaBatida]}
            </BotaoGrande>
            {/* Dia sem intervalo: depois da entrada, a saída direta. */}
            {proximaBatida === "SaidaIntervalo" && (
              <button
                type="button"
                onClick={() => setFluxo("Saida")}
                className="mx-auto min-h-12 rounded-lg px-4 text-sm font-medium text-muted-foreground underline underline-offset-4 active:text-foreground"
              >
                Sair sem intervalo
              </button>
            )}
          </>
        ) : (
          <p className="rounded-2xl bg-muted px-4 py-5 text-center text-sm text-muted-foreground">
            Não há nada para registrar agora.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <BotaoGrande variant="outline" onClick={() => setFolha({ tipo: "historico" })}>
            <History className="size-5" aria-hidden />
            Histórico
          </BotaoGrande>
          <BotaoGrande variant="outline" onClick={() => setFolha({ tipo: "aparelhos" })}>
            <Smartphone className="size-5" aria-hidden />
            Meus celulares
          </BotaoGrande>
        </div>
      </div>

      {fluxo && (
        <FluxoDaBatida
          tipo={fluxo}
          dados={dados}
          aparelhoDeste={aparelhoDeste}
          onFechar={() => setFluxo(null)}
          onAtualizar={() => void atualizar()}
          onConcluir={(comprovante) => {
            setFluxo(null);
            setFolha({ tipo: "comprovante", comprovante, recem: true, voltarPara: null });
            void atualizar();
          }}
        />
      )}

      {folha?.tipo === "historico" && (
        <FolhaDoHistorico
          dados={dados}
          onFechar={() => setFolha(null)}
          onAbrir={(comprovante) => setFolha({ tipo: "comprovante", comprovante, recem: false, voltarPara: "historico" })}
        />
      )}

      {folha?.tipo === "aparelhos" && (
        <FolhaDosAparelhos aparelhos={dados.aparelhos} aparelhoDeste={aparelhoDeste} onFechar={() => setFolha(null)} />
      )}

      {folha?.tipo === "comprovante" && (
        <ComprovanteDeBatida
          comprovante={folha.comprovante}
          recemRegistrado={folha.recem}
          onFechar={() => setFolha(folha.voltarPara ? { tipo: folha.voltarPara } : null)}
        />
      )}
    </Moldura>
  );
}
