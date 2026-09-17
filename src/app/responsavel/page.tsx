"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { clearSession } from "@/lib/auth/session";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";
import { horaBrasilia } from "@/lib/reception/formatar";
import { formatarDistancia } from "@/lib/reception/distancia";
import { usePainelDoResponsavel, type AlunoDoResponsavel, type TrajetoDoResponsavel } from "@/lib/reception/use-responsavel";
import { useRastreioTrajeto } from "@/lib/reception/use-rastreio-trajeto";
import type { SituacaoTrajeto } from "@/lib/reception/use-mapa";

/**
 * Site do responsável. Fica fora do (app) de propósito: o shell da equipe chama APIs que este papel
 * não pode usar, e no celular o que importa é um botão grande, não um menu.
 */
export default function ResponsavelPage() {
  const router = useRouter();
  const sessao = useSessaoLocal();

  useEffect(() => {
    if (sessao === undefined) return;
    if (!sessao) router.replace("/login");
    else if (sessao.role !== "Responsavel") router.replace("/");
  }, [sessao, router]);

  if (sessao?.role !== "Responsavel") return null;

  return <PortalDoResponsavel />;
}

const TEXTO_SITUACAO: Record<SituacaoTrajeto, string> = {
  ACaminho: "A caminho",
  Chegando: "Chegando",
  Chegou: "Você chegou",
};

function PortalDoResponsavel() {
  const router = useRouter();
  const { data: painel, isLoading, isError } = usePainelDoResponsavel(true);
  const rastreio = useRastreioTrajeto();

  // Trajeto que ficou aberto (a página foi fechada no caminho) aparece de novo, até ser encerrado aqui.
  const trajetoDoServidor =
    painel?.trajetoAtivo && painel.trajetoAtivo.id !== rastreio.encerradoId ? painel.trajetoAtivo : null;
  const trajeto: TrajetoDoResponsavel | null = rastreio.trajeto ?? trajetoDoServidor;
  const rastreando = rastreio.estado === "rastreando";

  function sair() {
    rastreio.parar();
    clearSession();
    router.replace("/login");
  }

  return (
    // Com viewportFit "cover", instalado na tela inicial a página vai até atrás do notch e da
    // barra de gesto: o padding respeita essas áreas (no computador env() é 0 e fica o p-4).
    <main className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col gap-4 bg-background px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between">
        <Image src="/logo.png" alt="EducaPilot" width={156} height={123} className="h-8 w-auto" priority />
        <Button variant="ghost" size="sm" onClick={sair}>
          <LogOut /> Sair
        </Button>
      </header>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar seus dados. Tente de novo em instantes.
        </div>
      )}

      {painel && (
        <>
          <div>
            <h1 className="font-heading text-xl font-bold">Olá, {painel.nome}</h1>
            <p className="text-sm text-muted-foreground">{painel.escola.nome}</p>
          </div>

          <section className="flex flex-col gap-2">
            {painel.alunos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum aluno vinculado a você. Fale com a escola.</p>
            )}
            {painel.alunos.map((a) => (
              <CartaoDoAluno key={a.studentId} aluno={a} />
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            {trajeto && (
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-heading text-lg font-bold">{TEXTO_SITUACAO[trajeto.situacao]}</p>
                  {rastreando && (
                    <Badge className="bg-success-soft text-success-soft-foreground">Enviando localização</Badge>
                  )}
                </div>
                {trajeto.distanciaMetros != null && trajeto.situacao !== "Chegou" && (
                  <p className="text-sm">Você está a {formatarDistancia(trajeto.distanciaMetros)} da escola.</p>
                )}
                {trajeto.situacao === "Chegou" && (
                  <p className="text-sm">A escola já foi avisada da sua chegada.</p>
                )}
                <p className="text-xs text-muted-foreground">Atualizado às {horaBrasilia(trajeto.atualizadoEm)}</p>
              </div>
            )}

            {rastreio.aviso && (
              <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
                {rastreio.aviso}
              </div>
            )}
            {rastreio.erro && (
              <div className="rounded-md border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
                {rastreio.erro}
              </div>
            )}

            {!trajeto && (
              <Button
                className="h-14 text-base md:h-14"
                onClick={() => rastreio.comecar()}
                disabled={rastreio.estado === "iniciando" || painel.alunos.length === 0}
              >
                <MapPin className="size-5" />
                {rastreio.estado === "iniciando" ? "Avisando a escola..." : "Estou a caminho"}
              </Button>
            )}

            {trajeto && !rastreando && trajeto.situacao !== "Chegou" && (
              <Button
                className="h-14 text-base md:h-14"
                onClick={() => rastreio.comecar(trajeto)}
                disabled={rastreio.estado === "iniciando"}
              >
                <MapPin className="size-5" /> Continuar enviando localização
              </Button>
            )}

            {trajeto && (
              <Button variant="outline" className="h-12 md:h-11" onClick={() => rastreio.encerrar(trajeto.id)}>
                Encerrar
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              Mantenha esta tela aberta até chegar. Pelo site, a localização só é enviada com a página aberta.
            </p>
          </section>
        </>
      )}
    </main>
  );
}

function CartaoDoAluno({ aluno }: { aluno: AlunoDoResponsavel }) {
  let situacao: React.ReactNode;
  if (aluno.saidaEm) {
    situacao = <Badge variant="secondary">Saiu às {horaBrasilia(aluno.saidaEm)}</Badge>;
  } else if (aluno.chegadaEm) {
    situacao = (
      <Badge className="bg-success-soft text-success-soft-foreground">Na escola desde {horaBrasilia(aluno.chegadaEm)}</Badge>
    );
  } else {
    situacao = <Badge className="bg-warning-soft text-warning-soft-foreground">Aguardando chegada</Badge>;
  }

  const previsto = aluno.saidaEm
    ? null
    : aluno.chegadaEm
      ? aluno.saidaPrevista && `Saída prevista às ${aluno.saidaPrevista}`
      : aluno.entradaPrevista && `Entrada prevista às ${aluno.entradaPrevista}`;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{aluno.nome}</p>
          {aluno.turmaNome && <p className="text-xs text-muted-foreground">{aluno.turmaNome}</p>}
        </div>
        {situacao}
      </div>
      {previsto && <p className="text-xs text-muted-foreground">{previsto}</p>}
    </div>
  );
}
