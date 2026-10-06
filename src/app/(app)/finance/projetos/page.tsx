"use client";

import { useState } from "react";
import Link from "next/link";
import { PartyPopper, Plus } from "lucide-react";

import { FinanceNav } from "@/components/finance/finance-nav";
import { EtiquetaDoProjeto, LinhaComBarra, Numero } from "@/components/finance/projetos/comum";
import { DialogProjeto } from "@/components/finance/projetos/dialog-projeto";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarSoData } from "@/lib/format/date";
import {
  ROTULO_DO_STATUS,
  useProjetos,
  type ProjetoResumo,
  type StatusDoProjeto,
} from "@/lib/finance/use-projetos";
import { formatarMoeda } from "@/lib/rh/formatar";

type Filtro = StatusDoProjeto | "todos";

const STATUS: StatusDoProjeto[] = ["Orcamento", "Planejamento", "Encerrado"];

function rotuloDoFiltro(f: Filtro): string {
  return f === "todos" ? "Todos os status" : ROTULO_DO_STATUS[f];
}

export default function ProjetosPage() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [criando, setCriando] = useState(false);
  const { data, isLoading, isError, refetch } = useProjetos(filtro === "todos" ? null : filtro, null);

  // Mais recente primeiro: o evento que vem aí fica no alto; sem data, vale a criação.
  const lista = [...(data ?? [])].sort((a, b) =>
    (b.dataDoEvento ?? b.criadoEm).localeCompare(a.dataDoEvento ?? a.criadoEm)
  );

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Projetos"
        apoio="Orçamento, gasto e arrecadação de cada festa ou evento, num lugar só."
        acoesClassName="w-full md:w-auto"
        acoes={
          <>
            <Select value={filtro} onValueChange={(v) => v && setFiltro(v as Filtro)}>
              <SelectTrigger aria-label="Filtrar por status" className="w-full md:w-44">
                <SelectValue>{() => rotuloDoFiltro(filtro)}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="todos">{rotuloDoFiltro("todos")}</SelectItem>
                {STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ROTULO_DO_STATUS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="action" className="w-full md:w-auto" onClick={() => setCriando(true)}>
              <Plus />
              Novo projeto
            </Button>
          </>
        }
      />

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os projetos." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        filtro === "todos" ? (
          <EstadoVazio
            icone={<PartyPopper />}
            titulo="Nenhum projeto ainda"
            texto="Monte o orçamento da festa, aprove e acompanhe gasto e arrecadação num lugar só."
            textoClassName="max-w-[420px]"
            acao={
              <Button variant="action" onClick={() => setCriando(true)}>
                <Plus />
                Novo projeto
              </Button>
            }
          />
        ) : (
          <EstadoVazio
            icone={<PartyPopper />}
            titulo="Nenhum projeto neste status"
            texto={`Não há projetos em "${rotuloDoFiltro(filtro)}".`}
            acao={
              <Button variant="outline" onClick={() => setFiltro("todos")}>
                Ver todos
              </Button>
            }
          />
        )
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {lista.map((p) => (
            <CartaoDoProjeto key={p.id} projeto={p} />
          ))}
        </div>
      )}

      {criando && <DialogProjeto onFechar={() => setCriando(false)} />}
    </div>
  );
}

function CartaoDoProjeto({ projeto: p }: { projeto: ProjetoResumo }) {
  // Receita prevista: o que as famílias pagam se todas pagarem o valor por família.
  const previsto = p.valorPorFamilia * p.numeroDeFamilias;
  const turmas = p.turmas.map((t) => t.nome).join(", ");

  return (
    <Link
      href={`/finance/projetos/${p.id}`}
      className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-[16px] font-semibold break-words">{p.nome}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {p.dataDoEvento ? `Evento em ${formatarSoData(p.dataDoEvento)}` : "Sem data marcada"}
            {" · "}
            {turmas || "Escola toda"}
          </p>
        </div>
        <EtiquetaDoProjeto status={p.status} />
      </div>

      <div className="mt-4 grid gap-3">
        <LinhaComBarra rotulo="Gasto / orçamento" valor={p.gasto} total={p.custoTotal} />
        <LinhaComBarra rotulo="Arrecadado / previsto" valor={p.arrecadado} total={previsto} inverso />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 sm:grid-cols-5">
        <Numero rotulo="Orçamento" valor={formatarMoeda(p.custoTotal)} />
        <Numero rotulo="Gasto" valor={formatarMoeda(p.gasto)} />
        <Numero rotulo="Arrecadado" valor={formatarMoeda(p.arrecadado)} />
        <Numero rotulo="A receber" valor={formatarMoeda(p.aReceber)} />
        <Numero rotulo="Saldo" valor={formatarMoeda(p.saldo)} tom={p.saldo < 0 ? "danger" : undefined} />
      </div>
    </Link>
  );
}
