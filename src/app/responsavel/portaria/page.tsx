"use client";

import { MapPin } from "lucide-react";

import { ErroDoPortal } from "@/components/relacionamento/portal/comum";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarDistancia } from "@/lib/reception/distancia";
import { horaBrasilia } from "@/lib/reception/formatar";
import { useRastreio } from "@/lib/reception/rastreio-context";
import type { SituacaoTrajeto } from "@/lib/reception/use-mapa";
import {
  usePainelDoResponsavel,
  type AlunoDoResponsavel,
  type TrajetoDoResponsavel,
} from "@/lib/reception/use-responsavel";

const TEXTO_SITUACAO: Record<SituacaoTrajeto, string> = {
  ACaminho: "A caminho",
  Chegando: "Chegando",
  Chegou: "Você chegou",
};

/**
 * Portaria: entrada e saída dos filhos e o "Estou a caminho". É o conteúdo que antes era a página
 * inteira do site do responsável, agora uma aba.
 *
 * O rastreio vem do layout (ver rastreio-context): trocar de aba não desliga o GPS.
 */
export default function PortariaDoResponsavelPage() {
  const { data: painel, isLoading, isError, refetch } = usePainelDoResponsavel(true);
  const rastreio = useRastreio();

  // Trajeto que ficou aberto (a página foi fechada no caminho) aparece de novo, até ser encerrado aqui.
  const trajetoDoServidor =
    painel?.trajetoAtivo && painel.trajetoAtivo.id !== rastreio.encerradoId ? painel.trajetoAtivo : null;
  const trajeto: TrajetoDoResponsavel | null = rastreio.trajeto ?? trajetoDoServidor;
  const rastreando = rastreio.estado === "rastreando";

  return (
    <>
      <div>
        <h1 className="font-heading text-[clamp(22px,6vw,26px)] font-semibold tracking-[-.03em]">Portaria</h1>
        <p className="text-sm text-muted-foreground">Chegada e saída dos seus filhos e o aviso de que você está a caminho.</p>
      </div>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {isError && <ErroDoPortal texto="Não foi possível carregar seus dados. Tente de novo em instantes." onTentar={() => refetch()} />}

      {painel && (
        <>
          <section className="flex flex-col gap-2">
            {painel.alunos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum aluno vinculado a você. Fale com a escola.</p>
            )}
            {painel.alunos.map((a) => (
              <CartaoDoAluno key={a.studentId} aluno={a} />
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
            {trajeto && (
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-heading text-lg font-semibold tracking-[-.03em]">
                    {TEXTO_SITUACAO[trajeto.situacao]}
                  </p>
                  {rastreando && <Badge variant="success">Enviando localização</Badge>}
                </div>
                {trajeto.distanciaMetros != null && trajeto.situacao !== "Chegou" && (
                  <p className="text-sm">
                    Você está a{" "}
                    <span className="font-mono tabular-nums">{formatarDistancia(trajeto.distanciaMetros)}</span> da
                    escola.
                  </p>
                )}
                {trajeto.situacao === "Chegou" && <p className="text-sm">A escola já foi avisada da sua chegada.</p>}
                <p className="text-xs text-muted-foreground">
                  Atualizado às <span className="font-mono tabular-nums">{horaBrasilia(trajeto.atualizadoEm)}</span>
                </p>
              </div>
            )}

            {rastreio.aviso && (
              <div className="rounded-lg border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
                {rastreio.aviso}
              </div>
            )}
            {rastreio.erro && (
              <div className="rounded-lg border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
                {rastreio.erro}
              </div>
            )}

            {!trajeto && (
              <Button
                variant="action"
                className="h-14 w-full text-base md:h-14"
                onClick={() => rastreio.comecar()}
                disabled={rastreio.estado === "iniciando" || painel.alunos.length === 0}
              >
                <MapPin className="size-5" />
                {rastreio.estado === "iniciando" ? "Avisando a escola..." : "Estou a caminho"}
              </Button>
            )}

            {trajeto && !rastreando && trajeto.situacao !== "Chegou" && (
              <Button
                variant="action"
                className="h-14 w-full text-base md:h-14"
                onClick={() => rastreio.comecar(trajeto)}
                disabled={rastreio.estado === "iniciando"}
              >
                <MapPin className="size-5" /> Continuar enviando localização
              </Button>
            )}

            {trajeto && (
              <Button variant="outline" className="h-12 w-full md:h-11" onClick={() => rastreio.encerrar(trajeto.id)}>
                Encerrar
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              Mantenha o site aberto até chegar. Pelo site, a localização só é enviada com a página aberta; você pode
              trocar de aba aqui dentro sem interromper.
            </p>
          </section>
        </>
      )}
    </>
  );
}

function CartaoDoAluno({ aluno }: { aluno: AlunoDoResponsavel }) {
  let situacao: React.ReactNode;
  if (aluno.saidaEm) {
    situacao = (
      <Badge variant="secondary">
        Saiu às <span className="font-mono tabular-nums">{horaBrasilia(aluno.saidaEm)}</span>
      </Badge>
    );
  } else if (aluno.chegadaEm) {
    situacao = (
      <Badge variant="success">
        Na escola desde <span className="font-mono tabular-nums">{horaBrasilia(aluno.chegadaEm)}</span>
      </Badge>
    );
  } else {
    situacao = <Badge variant="pending">Aguardando chegada</Badge>;
  }

  // Horário separado do rótulo para sair em mono, como todo número do guia.
  const horaPrevista = aluno.saidaEm ? null : aluno.chegadaEm ? aluno.saidaPrevista : aluno.entradaPrevista;
  const rotuloPrevisto = aluno.chegadaEm ? "Saída prevista às" : "Entrada prevista às";

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{aluno.nome}</p>
          {aluno.turmaNome && <p className="text-xs text-muted-foreground">{aluno.turmaNome}</p>}
        </div>
        {situacao}
      </div>
      {horaPrevista && (
        <p className="text-xs text-muted-foreground">
          {rotuloPrevisto} <span className="font-mono tabular-nums">{horaPrevista}</span>
        </p>
      )}
    </div>
  );
}
