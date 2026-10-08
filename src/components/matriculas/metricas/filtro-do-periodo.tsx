"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { ROTULO_DA_ORIGEM } from "@/lib/matriculas/rotulos";
import {
  ATALHOS,
  ORIGENS,
  atalhoAtivo,
  ehDiaValido,
  lerFiltro,
  paraQuery,
  periodoDoAtalho,
  type AtalhoDePeriodo,
} from "@/lib/matriculas/periodo-das-metricas";
import type { OrigemDoLead } from "@/lib/matriculas/tipos";
import type { FiltroDasMetricas } from "@/lib/matriculas/use-metricas";

/**
 * O filtro do Painel e das Métricas mora na URL (?de=&ate=&origem=): é o que deixa a equipe mandar o link da
 * reunião, e o que faz as duas páginas mostrarem o mesmo recorte quando se passa de uma para a outra.
 */
export function useFiltroDaUrl() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filtro = useMemo(() => lerFiltro(params), [params]);

  const mudar = (novo: Partial<FiltroDasMetricas>) => {
    router.replace(`${pathname}${paraQuery({ ...filtro, ...novo })}`, { scroll: false });
  };
  return { filtro, mudar };
}

/** "05/10/2026 a 11/10/2026", ou "Todo o histórico". */
export function textoDoPeriodo(filtro: Pick<FiltroDasMetricas, "de" | "ate">): string {
  return filtro.de && filtro.ate ? `${formatarSoData(filtro.de)} a ${formatarSoData(filtro.ate)}` : "Todo o histórico";
}

export function FiltroDoPeriodo({ filtro, mudar }: { filtro: FiltroDasMetricas; mudar: (novo: Partial<FiltroDasMetricas>) => void }) {
  const hoje = hojeIsoBrasilia();
  const ativo = atalhoAtivo(filtro, hoje);
  // "Personalizado" abre os dois dias mesmo antes de haver um período válido digitado.
  const [abrirPersonalizado, setAbrirPersonalizado] = useState(false);
  const personalizado = ativo === "personalizado" && (filtro.de != null || abrirPersonalizado);

  const escolher = (atalho: AtalhoDePeriodo) => {
    setAbrirPersonalizado(false);
    mudar(periodoDoAtalho(atalho, hoje));
  };

  return (
    <div className="flex flex-col gap-3 print:hidden">
      <div role="radiogroup" aria-label="Período" className="flex flex-wrap gap-1 rounded-lg bg-muted p-[3px]">
        {ATALHOS.map((a) => (
          <Opcao key={a.id} marcada={!personalizado && ativo === a.id} onClick={() => escolher(a.id)}>
            {a.rotulo}
          </Opcao>
        ))}
        <Opcao marcada={personalizado} onClick={() => setAbrirPersonalizado(true)}>
          Personalizado
        </Opcao>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {personalizado && <DiasPersonalizados key={`${filtro.de}|${filtro.ate}`} filtro={filtro} mudar={mudar} />}
        <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
          Origem
          <select
            value={filtro.origem ?? ""}
            onChange={(e) => mudar({ origem: (e.target.value || null) as OrigemDoLead | null })}
            className="h-8 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-10 dark:bg-input/30"
          >
            <option value="">Todas</option>
            {ORIGENS.map((o) => (
              <option key={o} value={o}>
                {ROTULO_DA_ORIGEM[o]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function Opcao({ marcada, onClick, children }: { marcada: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcada}
      onClick={onClick}
      className={cn("min-h-8 rounded-md px-3 text-[13px] font-medium", marcada ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}
    >
      {children}
    </button>
  );
}

/** Os dois dias, escritos à mão. O período só vale quando os dois são datas e o primeiro não passa do segundo. */
function DiasPersonalizados({ filtro, mudar }: { filtro: FiltroDasMetricas; mudar: (novo: Partial<FiltroDasMetricas>) => void }) {
  const [de, setDe] = useState(filtro.de ?? "");
  const [ate, setAte] = useState(filtro.ate ?? "");
  const invalido = de !== "" && ate !== "" && de > ate;

  const aplicar = (novoDe: string, novoAte: string) => {
    if (ehDiaValido(novoDe) && ehDiaValido(novoAte) && novoDe <= novoAte) mudar({ de: novoDe, ate: novoAte });
  };

  return (
    <>
      <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
        De
        <Input
          type="date"
          value={de}
          aria-invalid={invalido}
          className="w-auto"
          onChange={(e) => {
            setDe(e.target.value);
            aplicar(e.target.value, ate);
          }}
        />
      </label>
      <label className="flex flex-col gap-1 text-[12px] font-medium text-muted-foreground">
        Até
        <Input
          type="date"
          value={ate}
          aria-invalid={invalido}
          className="w-auto"
          onChange={(e) => {
            setAte(e.target.value);
            aplicar(de, e.target.value);
          }}
        />
      </label>
      {invalido && <p className="pb-1.5 text-[12.5px] text-destructive">O primeiro dia não pode ser depois do último.</p>}
    </>
  );
}

/**
 * Título, o que o recorte é, o botão de imprimir e o caminho para a outra página, que leva o mesmo recorte.
 * Na impressão sobra só o título e a linha "Período · Origem · Emitido em".
 */
export function CabecalhoDasMetricas({
  titulo,
  texto,
  filtro,
  outra,
  carregado,
}: {
  titulo: string;
  texto: string;
  filtro: FiltroDasMetricas;
  outra: { href: string; rotulo: string };
  carregado: boolean;
}) {
  const emitido = formatarSoData(hojeIsoBrasilia());
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action print:hidden">Matrículas</p>
        <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em] print:mt-0 print:text-2xl">{titulo}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground print:hidden">{texto}</p>
        <p className="mt-1 hidden text-sm text-muted-foreground print:block">
          {textoDoPeriodo(filtro)}
          {filtro.origem && ` · ${ROTULO_DA_ORIGEM[filtro.origem]}`} · Emitido em {emitido}
        </p>
      </div>
      <div className="flex items-center gap-2 print:hidden">
        <Link href={`${outra.href}${paraQuery(filtro)}`} className="text-sm text-primary underline-offset-4 hover:underline">
          {outra.rotulo}
        </Link>
        <Button variant="outline" disabled={!carregado} onClick={() => window.print()}>
          <Printer />
          Imprimir
        </Button>
      </div>
    </div>
  );
}
