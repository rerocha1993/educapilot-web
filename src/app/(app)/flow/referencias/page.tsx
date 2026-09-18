"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { REFERENCE_TABLES, useReferenceOptions } from "@/lib/flow/use-reference-data";

function ReferenceTableRow({ value, label }: { value: string; label: string }) {
  const { data, isLoading } = useReferenceOptions(value);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium break-words">{label}</p>
        <p className="text-xs text-muted-foreground">tabela &quot;{value}&quot;</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-5 w-16" />
      ) : (
        <span className="shrink-0 text-sm font-medium text-muted-foreground">
          <span className="font-mono tabular-nums">{data?.length ?? 0}</span> reg.
        </span>
      )}
    </div>
  );
}

export default function ReferenceDataPage() {
  return (
    <div className="flex flex-col gap-4">
      <CabecalhoDaPagina
        eyebrow="← Formulários"
        eyebrowHref="/flow"
        titulo="Dados de referência"
        apoio="Tabelas que podem ser usadas como fonte de dados em campos do tipo Seleção ou Dado de referência."
      />

      <div className="flex flex-col gap-2">
        {REFERENCE_TABLES.map((t) => (
          <ReferenceTableRow key={t.value} value={t.value} label={t.label} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Só essas 3 tabelas têm implementação real no backend hoje (alunos/turmas/
        usuários) — não existe endpoint para criar uma nova tabela de referência
        (&quot;+ Nova tabela&quot; do wireframe) nem para contar em quantos formulários
        cada uma é usada.
      </p>
    </div>
  );
}
