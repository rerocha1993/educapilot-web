"use client";

import { useState } from "react";
import { ChevronRight, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { dataCurta, somarDias } from "@/lib/rh/ponto-formatar";
import {
  comprovanteDoHistorico,
  rotuloDoTipo,
  useHistoricoDoPonto,
  type AparelhoDoFuncionario,
  type BatidaDoHistorico,
  type ComprovanteDoPonto,
  type MeuPonto,
} from "@/lib/rh/use-meu-ponto";
import { cn } from "@/lib/utils";

import { PassoAparelho } from "./fluxo-da-batida";
import { Folha } from "./folha";
import { Aviso, BotaoGrande, EtiquetaDaSituacao } from "./pecas";

const PAGINA_EM_DIAS = 30;

/** O histórico do funcionário: os últimos 30 dias, agrupados por dia, com "mostrar mais". */
export function FolhaDoHistorico({
  dados,
  onAbrir,
  onFechar,
}: {
  dados: MeuPonto;
  onAbrir: (comprovante: ComprovanteDoPonto) => void;
  onFechar: () => void;
}) {
  const [dias, setDias] = useState(PAGINA_EM_DIAS);
  const ate = dados.hoje.data;
  const de = somarDias(ate, -(dias - 1));
  const { data, isLoading, isError, error, refetch, isFetching } = useHistoricoDoPonto(de, ate);

  const porDia = new Map<string, BatidaDoHistorico[]>();
  for (const b of data ?? []) porDia.set(b.data, [...(porDia.get(b.data) ?? []), b]);

  return (
    <Folha titulo="Histórico" descricao={`Suas batidas dos últimos ${dias} dias.`} onFechar={onFechar}>
      {isLoading && (
        <div className="grid gap-2" role="status" aria-label="Carregando">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <Aviso tom="erro">
          <p>{error instanceof Error ? error.message : "Não foi possível carregar o histórico."}</p>
          <button type="button" onClick={() => refetch()} className="mt-1 min-h-10 font-semibold underline">
            Tentar de novo
          </button>
        </Aviso>
      )}

      {data && data.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma batida neste período.</p>
      )}

      <div className="grid gap-4">
        {[...porDia.entries()].map(([dia, batidas]) => (
          <section key={dia}>
            <h3 className="mb-1.5 text-xs font-bold tracking-[.08em] text-muted-foreground uppercase">
              {dataCurta(dia)}
            </h3>
            <ul className="grid gap-1.5">
              {batidas
                .slice()
                .sort((a, b) => a.horaLocal.localeCompare(b.horaLocal))
                .map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => onAbrir(comprovanteDoHistorico(b, dados.funcionario.nome))}
                      className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 text-left active:bg-muted"
                    >
                      <span className="font-mono text-lg font-semibold tabular-nums">{b.horaLocal}</span>
                      <span className="min-w-0 flex-1 truncate text-[15px]">{rotuloDoTipo(b.tipo)}</span>
                      {b.situacao !== "Normal" && <EtiquetaDaSituacao situacao={b.situacao} />}
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      {data && (
        <BotaoGrande variant="outline" className="mt-4" disabled={isFetching} onClick={() => setDias((d) => d + PAGINA_EM_DIAS)}>
          {isFetching ? "Carregando..." : `Mostrar mais ${PAGINA_EM_DIAS} dias`}
        </BotaoGrande>
      )}
    </Folha>
  );
}

function situacaoDoAparelho(a: AparelhoDoFuncionario) {
  if (!a.ativo) return { texto: "Desativado", variante: "overdue" as const };
  if (!a.aprovado) return { texto: "Aguardando aprovação", variante: "pending" as const };
  return { texto: "Aprovado", variante: "success" as const };
}

/** Os celulares cadastrados. Só leitura: quem desativa é a escola. */
export function FolhaDosAparelhos({
  aparelhos,
  aparelhoDeste,
  onFechar,
}: {
  aparelhos: AparelhoDoFuncionario[];
  aparelhoDeste: AparelhoDoFuncionario | null;
  onFechar: () => void;
}) {
  const [cadastrando, setCadastrando] = useState(false);

  return (
    <Folha
      titulo="Meus celulares"
      descricao="Só os celulares aprovados batem o seu ponto. Para tirar um, fale com a escola."
      onFechar={onFechar}
    >
      {cadastrando ? (
        <PassoAparelho onPronto={() => setCadastrando(false)} />
      ) : (
        <>
          {aparelhos.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum celular cadastrado ainda.</p>
          )}

          <ul className="grid gap-2">
            {aparelhos.map((a) => {
              const { texto, variante } = situacaoDoAparelho(a);
              const este = aparelhoDeste?.id === a.id;
              return (
                <li
                  key={a.id}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-xl border bg-card px-3.5 py-2",
                    este ? "border-primary/40" : "border-border"
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                    <Smartphone className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{a.nome}</span>
                    {este && <span className="block text-xs font-semibold text-primary">Este celular</span>}
                  </span>
                  <Badge variant={variante} className="h-7 px-2.5 text-[12.5px]">
                    {texto}
                  </Badge>
                </li>
              );
            })}
          </ul>

          {!aparelhoDeste && (
            <BotaoGrande variant="action" className="mt-4" onClick={() => setCadastrando(true)}>
              <Smartphone className="size-5" aria-hidden />
              Cadastrar este celular
            </BotaoGrande>
          )}
        </>
      )}
    </Folha>
  );
}
