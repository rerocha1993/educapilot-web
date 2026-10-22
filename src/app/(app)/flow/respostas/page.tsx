"use client";

import Link from "next/link";
import { Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { AbasDeFormularios } from "@/components/flow/abas-de-formularios";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { TagDoTipo } from "@/components/flow/tag-do-tipo";
import { formatarData } from "@/lib/format/date";
import type { TipoDeFormulario } from "@/lib/flow/form-config";
import { useCaixaDeEnvios, type FormularioDaCaixa } from "@/lib/flow/use-caixa-de-envios";

// Caixa de envios: tela de entrada (2026-10).
//
// Antes, a Caixa abria direto numa lista única com todos os envios de todos os formulários, e o
// seletor de formulários ficava por cima. Agora a entrada é um cartão por formulário, com o que
// chegou em cada um, e os resultados abrem por formulário em /flow/respostas/<id>.

export default function CaixaDeEnviosPage() {
  const { data, isLoading, isError } = useCaixaDeEnvios();
  const formularios = data?.formularios ?? [];

  return (
    <div className="flex flex-col gap-4">
      <AbasDeFormularios />

      <CabecalhoDaPagina
        titulo="Caixa de envios"
        apoio="Escolha um formulário para ver o que as famílias enviaram."
        acoes={
          <>
            <Link href="/flow/relatorios" className={buttonVariants({ variant: "outline" })}>
              Baixar Excel em Relatórios
            </Link>
            <Link href="/admin/contratos" className={buttonVariants({ variant: "action" })}>
              Ir para Contratos
            </Link>
          </>
        }
      />

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <EstadoVazio icone={<Inbox />} titulo="Não foi possível carregar os formulários." texto="Tente novamente em instantes." />
      )}

      {!isLoading && !isError && formularios.length === 0 && (
        <EstadoVazio icone={<Inbox />} titulo="Nenhum formulário ainda." texto="Crie um formulário para receber envios." />
      )}

      {formularios.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {formularios.map((f) => (
            <CartaoDoFormulario key={f.formId} formulario={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoDoFormulario({ formulario: f }: { formulario: FormularioDaCaixa }) {
  const tipo = (f.tipo === "matricula" || f.tipo === "rematricula" ? f.tipo : null) as TipoDeFormulario | null;

  return (
    <Link
      href={`/flow/respostas/${f.formId}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4.5 pt-4 pb-4 transition-colors hover:border-action-brand"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[13px] leading-snug font-semibold text-foreground">{f.nome}</span>
        <TagDoTipo tipo={tipo} />
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-heading text-[26px] font-semibold tracking-[-.03em] tabular-nums">
          {f.totalEnvios}
        </span>
        <span className="text-[12.5px] text-muted-foreground">
          {f.totalEnvios === 1 ? "envio" : "envios"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
        {f.pendentes > 0 && (
          <span className="rounded-md bg-action-soft px-1.5 py-0.5 font-mono whitespace-nowrap tabular-nums text-action-soft-foreground">
            {f.pendentes} pendente{f.pendentes === 1 ? "" : "s"}
          </span>
        )}
        {f.paraRevisar > 0 && (
          <span className="rounded-md bg-warning-soft px-1.5 py-0.5 font-mono whitespace-nowrap tabular-nums text-warning-soft-foreground">
            {f.paraRevisar} p/ revisar
          </span>
        )}
        {f.concluidos > 0 && (
          <span className="rounded-md bg-success-soft px-1.5 py-0.5 font-mono whitespace-nowrap tabular-nums text-success-soft-foreground">
            {f.concluidos} concluído{f.concluidos === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <span className="text-xs text-muted-foreground">
        {f.ultimoEnvioEm
          ? `Último envio em ${formatarData(f.ultimoEnvioEm, { day: "2-digit", month: "short" })}`
          : "Nenhum envio ainda"}
      </span>
    </Link>
  );
}
