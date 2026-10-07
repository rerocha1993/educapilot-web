"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarOff,
  Clock,
  FileHeart,
  FileText,
  Settings2,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Estatistica } from "@/components/padroes/estatistica";
import { ErroDeCarga } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { RhNav } from "@/components/rh/rh-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { podeVerArea } from "@/lib/access/pode-ver";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";
import { useImportarUsuarios, useResumoDoRh } from "@/lib/rh/use-rh";

/** Atalhos da visão geral: um por aba do RH, na mesma ordem e com o mesmo slug de área. */
const ATALHOS: { href: string; area: string; titulo: string; texto: string; icone: LucideIcon }[] = [
  {
    href: "/rh/funcionarios",
    area: "funcionarios",
    titulo: "Funcionários",
    texto: "Fichas da equipe, contratos e desligamentos.",
    icone: UsersRound,
  },
  {
    href: "/rh/ponto",
    area: "ponto",
    titulo: "Ponto",
    texto: "Lançar, corrigir e importar o ponto do mês.",
    icone: Clock,
  },
  {
    href: "/rh/atestados",
    area: "atestados",
    titulo: "Atestados",
    texto: "Atestados médicos com o arquivo anexado.",
    icone: FileHeart,
  },
  {
    href: "/rh/afastamentos",
    area: "afastamentos",
    titulo: "Afastamentos",
    texto: "Férias, licenças, folgas e suspensões.",
    icone: CalendarOff,
  },
  {
    href: "/rh/documentos",
    area: "documentos",
    titulo: "Documentos",
    texto: "A pasta de documentos de cada funcionário.",
    icone: FileText,
  },
  {
    href: "/rh/relatorios",
    area: "relatorios",
    titulo: "Relatórios",
    texto: "Horas, faltas e saldo da equipe, com exportação.",
    icone: BarChart3,
  },
  {
    href: "/rh/configuracao",
    area: "configuracao",
    titulo: "Configuração",
    texto: "Jornada padrão e dias de trabalho.",
    icone: Settings2,
  },
];

/** Abaixo disto a escola provavelmente ainda não cadastrou a equipe: oferece criar as fichas. */
const POUCOS_FUNCIONARIOS = 5;

export default function RhVisaoGeralPage() {
  const podeEscrever = usePodeEscreverNoRh();
  const { data: meuAcesso } = useMeuAcesso();
  const { data: resumo, isLoading, isError, refetch } = useResumoDoRh();
  const importar = useImportarUsuarios();
  const [confirmando, setConfirmando] = useState(false);

  const atalhos = ATALHOS.filter((a) => podeVerArea(meuAcesso, "rh", a.area));
  const oferecerFichas =
    podeEscrever &&
    podeVerArea(meuAcesso, "rh", "funcionarios") &&
    resumo !== undefined &&
    resumo.funcionariosAtivos < POUCOS_FUNCIONARIOS;

  async function criarFichas() {
    try {
      const r = await importar.mutateAsync();
      toast.success(
        r.criados === 0
          ? `Nenhuma ficha nova: ${r.existentes} ${r.existentes === 1 ? "usuário já tinha" : "usuários já tinham"} ficha.`
          : `${r.criados} ${r.criados === 1 ? "ficha criada" : "fichas criadas"}${
              r.existentes > 0 ? `; ${r.existentes} já existiam` : ""
            }.`
      );
      setConfirmando(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar as fichas.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RhNav />

      <CabecalhoDaPagina
        eyebrow="RH"
        titulo="Recursos humanos"
        apoio="A equipe da escola num só lugar: fichas, ponto, atestados, afastamentos e documentos."
        acoesClassName="w-full md:w-auto"
        acoes={
          oferecerFichas && (
            <Button variant="action" className="w-full md:w-auto" onClick={() => setConfirmando(true)}>
              <UserPlus />
              Criar fichas a partir dos usuários
            </Button>
          )
        }
      />

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar o resumo do RH." onTentar={() => refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {isLoading || !resumo ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
          ) : (
            <>
              <Estatistica rotulo="Funcionários ativos" valor={resumo.funcionariosAtivos} />
              <Estatistica rotulo="Aniversariantes do mês" valor={resumo.aniversariantesDoMes} />
              <Estatistica rotulo="Atestados no mês" valor={resumo.atestadosNoMes} />
              <Estatistica rotulo="Afastados hoje" valor={resumo.afastadosHoje} />
              <Estatistica
                rotulo="Faltas no mês"
                valor={resumo.faltasNoMes}
                tom={resumo.faltasNoMes > 0 ? "danger" : undefined}
              />
            </>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {atalhos.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex min-h-20 items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground group-hover:text-foreground [&_svg]:size-[18px]">
              <a.icone />
            </span>
            <span className="min-w-0">
              <span className="block font-heading text-[15px] font-semibold">{a.titulo}</span>
              <span className="mt-0.5 block text-[13px] leading-[1.5] text-muted-foreground">{a.texto}</span>
            </span>
          </Link>
        ))}
      </div>

      {confirmando && (
        <Confirmacao
          titulo="Criar fichas a partir dos usuários?"
          descricao="Cada usuário da escola que ainda não tem ficha ganha uma, com nome, e-mail e a conta já ligada. Quem já tem ficha não é alterado."
          rotuloConfirmar="Criar fichas"
          pendente={importar.isPending}
          onConfirmar={criarFichas}
          onFechar={() => setConfirmando(false)}
        />
      )}
    </div>
  );
}
