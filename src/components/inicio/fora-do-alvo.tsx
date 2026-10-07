"use client";

import Link from "next/link";
import { Calculator } from "lucide-react";

import { EtiquetaDoCartao } from "@/components/padroes/estatistica";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarInteiro } from "@/lib/finance/precificacao-formatar";
import { usePainelDePrecificacao } from "@/lib/finance/use-precificacao";
import { formatarMoeda } from "@/lib/rh/formatar";

/**
 * O bloco "Mensalidades fora do alvo" da tela Início: quantas mensalidades ativas estão abaixo do
 * alvo do estudo de precificação em andamento, quanto isso vale no ano e o alvo médio.
 *
 * Lê o painel (GET /api/Precificacao/painel). Sem estudo, o bloco convida a criar o primeiro.
 */
export function ForaDoAlvo() {
  const { data, isLoading, isError } = usePainelDePrecificacao();
  const estudo = data?.estudoAtual;

  const href = estudo ? `/finance/precificacao/${estudo.id}` : "/finance/precificacao";

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-muted px-4.5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="font-heading text-[17px] font-semibold md:text-[15.5px]">Mensalidades fora do alvo</span>
          {estudo && <EtiquetaDoCartao tom="neutro">{estudo.anoAlvo}</EtiquetaDoCartao>}
        </div>
        {data && (
          <Link
            href={href}
            className="inline-flex min-h-10 items-center text-[13px] font-semibold text-primary hover:underline md:min-h-8 md:text-[12.5px]"
          >
            {estudo ? "Abrir estudo" : "Criar estudo"}
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3 p-4.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : isError || !data ? (
        <p className="px-4.5 py-6 text-[13.5px] text-muted-foreground">
          Não foi possível carregar a precificação agora.
        </p>
      ) : !estudo ? (
        <div className="flex items-center gap-3 px-4.5 py-6">
          <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Calculator className="size-4" />
          </span>
          <p className="text-[14px] text-muted-foreground">
            Nenhum estudo de precificação ainda. Crie um para comparar as mensalidades com o custo.
          </p>
        </div>
      ) : (
        <dl className="grid grid-cols-3 gap-3 p-4.5">
          <Numero
            rotulo="Fora do alvo"
            valor={formatarInteiro(data.mensalidadesForaDoAlvo)}
            alerta={data.mensalidadesForaDoAlvo > 0}
          />
          <Numero rotulo="Impacto no ano" valor={formatarMoeda(data.impactoAnual)} />
          <Numero rotulo="Alvo médio" valor={formatarMoeda(data.mensalidadeAlvoMedia)} />
        </dl>
      )}
    </section>
  );
}

function Numero({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12.5px] leading-snug text-muted-foreground md:text-[12px]">{rotulo}</dt>
      <dd
        className={`mt-1 truncate font-heading text-[20px] font-semibold tracking-[-.02em] tabular-nums sm:text-[24px] ${
          alerta ? "text-action-soft-foreground" : ""
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}
