"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Link2, PenLine, Send, Square, SquareCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { copiarTexto } from "@/lib/copiar";
import { formatarData, formatarSoData } from "@/lib/format/date";
import { useCriarConvite, type ConviteCriado } from "@/lib/flow/use-convites";
import type { CampoRespondido, FormularioNaFicha, RespostaNaFicha } from "@/lib/tasks/use-resumo-do-aluno";
import { cn } from "@/lib/utils";

/**
 * Seção da ficha para um formulário vinculado (anamnese etc.): a resposta mais recente com todos os
 * campos legíveis, as anteriores e os atalhos para pedir à família ou preencher aqui.
 *
 * Dado de saúde é sensível: nada daqui vai para log, console ou notificação.
 */

const VARIANTE_DO_STATUS: Record<string, "success" | "pending" | "waiting"> = {
  "Concluída": "success",
  Revisar: "pending",
  Pendente: "waiting",
};

const ROTULO_DA_ORIGEM: Record<string, string> = { Familia: "pela família", Equipe: "pela equipe" };

function quando(r: RespostaNaFicha) {
  return `${formatarSoData(r.data)}${r.hora ? ` às ${r.hora}` : ""}`;
}

/** Texto curto para o cabeçalho da seção recolhida. */
export function resumoDoFormulario(f: FormularioNaFicha): string {
  if (!f.ultima) return "Ainda não preenchido";
  const anteriores = f.anteriores?.length ?? 0;
  return `Preenchido em ${formatarSoData(f.ultima.data)}${anteriores > 0 ? ` · ${anteriores} ${anteriores === 1 ? "anterior" : "anteriores"}` : ""}`;
}

function Anexo({ valor }: { valor: string }) {
  const ehLink = /^https?:\/\//i.test(valor) || valor.startsWith("/");
  if (!ehLink) return <>{valor}</>;
  return (
    <a href={valor} target="_blank" rel="noopener noreferrer" className="font-medium text-action hover:underline">
      Abrir anexo
    </a>
  );
}

function CampoLegivel({ c }: { c: CampoRespondido }) {
  const rotulo = (
    <dt className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground print:text-[7.5pt]">{c.rotulo}</dt>
  );

  if (c.tipo === "checkbox" && c.opcoes && c.opcoes.length > 0) {
    const marcadas = new Set(c.marcadas ?? []);
    return (
      <div className="min-w-0">
        {rotulo}
        <dd className="mt-1">
          <ul className="flex flex-col gap-0.5 text-sm">
            {c.opcoes.map((o) => {
              const marcada = marcadas.has(o);
              return (
                <li key={o} className={cn("flex items-start gap-2", marcada ? "font-medium" : "text-muted-foreground")}>
                  {marcada ? (
                    <SquareCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <Square aria-hidden className="mt-0.5 size-4 shrink-0" />
                  )}
                  <span className="min-w-0 break-words">
                    {o}
                    <span className="sr-only">{marcada ? " (marcada)" : " (não marcada)"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </dd>
      </div>
    );
  }

  if (c.tipo === "tabela" && c.linhas && c.linhas.length > 0) {
    const colunas = c.colunas ?? [];
    return (
      <div className="min-w-0 sm:col-span-2">
        {rotulo}
        <dd className="mt-1 max-w-full overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[13px]">
            <caption className="sr-only">{c.rotulo}</caption>
            <thead>
              <tr className="bg-muted/50">
                <th scope="col" className="px-2 py-1.5 text-left font-semibold text-muted-foreground">
                  <span className="sr-only">Pergunta</span>
                </th>
                {colunas.map((col) => (
                  <th key={col} scope="col" className="px-2 py-1.5 text-center font-semibold text-muted-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.linhas.map((l) => (
                <tr key={l.linha} className="border-t border-border">
                  <th scope="row" className="px-2 py-1.5 text-left font-normal break-words">
                    {l.linha}
                    {l.resposta == null && <span className="ml-1.5 text-muted-foreground">(sem resposta)</span>}
                  </th>
                  {colunas.map((col) => {
                    const escolhida = l.resposta === col;
                    return (
                      <td key={col} className="px-2 py-1.5 text-center">
                        {escolhida ? (
                          <>
                            <Check aria-hidden className="mx-auto size-4 text-primary" strokeWidth={3} />
                            <span className="sr-only">escolhida</span>
                          </>
                        ) : (
                          <span aria-hidden className="text-border">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </dd>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {rotulo}
      <dd className="mt-0.5 whitespace-pre-line break-words text-sm font-medium print:text-[10pt]">
        {c.texto ? c.tipo === "anexo" ? <Anexo valor={c.texto} /> : c.texto : <span className="font-normal text-muted-foreground">Não respondido</span>}
      </dd>
    </div>
  );
}

function RespostaLegivel({ r }: { r: RespostaNaFicha }) {
  return (
    <div>
      <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
        <span>
          Preenchida em <span className="font-numeric">{quando(r)}</span> por{" "}
          <span className="font-medium text-foreground">{r.preenchidoPor}</span>
          {ROTULO_DA_ORIGEM[r.origem] ? ` (${ROTULO_DA_ORIGEM[r.origem]})` : ""}
        </span>
        <Badge variant={VARIANTE_DO_STATUS[r.status] ?? "outline"}>{r.status}</Badge>
      </p>
      {r.campos.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Esta resposta não tem campos.</p>
      ) : (
        <dl className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-x-5 gap-y-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
          {r.campos.map((c, i) => (
            <CampoLegivel key={`${c.rotulo}-${i}`} c={c} />
          ))}
        </dl>
      )}
    </div>
  );
}

function ConviteDialog({
  formId,
  secao,
  studentId,
  aberto,
  onFechar,
}: {
  formId: string;
  secao: string;
  studentId: number;
  aberto: boolean;
  onFechar: () => void;
}) {
  const criar = useCriarConvite(formId);
  const [convite, setConvite] = useState<ConviteCriado | null>(null);

  async function gerar() {
    try {
      setConvite(await criar.mutateAsync(studentId));
    } catch {
      // A mensagem do servidor aparece abaixo (criar.error).
    }
  }

  function fechar() {
    setConvite(null);
    criar.reset();
    onFechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar {secao} para a família</DialogTitle>
          <DialogDescription>
            Geramos um link só para este aluno. A família abre, não precisa se identificar e a resposta entra direto na ficha.
            O sistema não envia e-mail: copie o link e mande pelo canal que a escola já usa.
          </DialogDescription>
        </DialogHeader>

        {!convite && (
          <div className="flex flex-col gap-2">
            {criar.isError && (
              <p role="alert" className="rounded-md border border-destructive-border bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
                {criar.error instanceof Error ? criar.error.message : "Não foi possível gerar o link."}
              </p>
            )}
            <Button onClick={() => void gerar()} disabled={criar.isPending} className="w-full sm:w-fit">
              <Link2 className="size-4" />
              {criar.isPending ? "Gerando…" : "Gerar link"}
            </Button>
          </div>
        )}

        {convite && (
          <div className="flex flex-col gap-2">
            <label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground" htmlFor="link-do-convite">
              Link para a família
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="link-do-convite" readOnly value={convite.link} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
              <Button variant="action" onClick={() => void copiarTexto(convite.link, "Link")} className="sm:shrink-0">
                <Copy className="size-4" />
                Copiar link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Vale até <span className="font-numeric">{formatarData(convite.expiraEm)}</span> e só pode ser usado uma vez. Quem tiver o
              link preenche em nome deste aluno: mande só para o responsável.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={fechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FormularioDaFichaConteudo({
  f,
  studentId,
  voltaPara,
}: {
  f: FormularioNaFicha;
  studentId: number;
  /** Caminho da ficha, para o "Preencher aqui" voltar para ela. */
  voltaPara: string;
}) {
  const [convite, setConvite] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);
  const anteriores = f.anteriores ?? [];

  return (
    <div className="flex flex-col gap-4">
      {f.aceitaEnvios ? (
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" onClick={() => setConvite(true)}>
            <Send className="size-4" />
            Enviar {f.secao} para a família
          </Button>
          <Link
            href={`/flow/${f.formId}/preencher?aluno=${studentId}&volta=${encodeURIComponent(voltaPara)}`}
            className={buttonVariants({ variant: "outline" })}
          >
            <PenLine className="size-4" />
            Preencher aqui
          </Link>
        </div>
      ) : (
        <p className="text-[12.5px] text-muted-foreground print:hidden">
          Este formulário não está aberto para novas respostas. Só o histórico aparece aqui.
        </p>
      )}

      {f.ultima ? (
        <RespostaLegivel r={f.ultima} />
      ) : (
        <p className="py-1 text-sm text-muted-foreground">Ninguém preencheu este formulário para este aluno ainda.</p>
      )}

      {anteriores.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground print:text-[8pt]">
            Respostas anteriores
          </h3>
          <ul className="flex flex-col">
            {anteriores.map((r) => {
              const aberto = aberta === r.id;
              return (
                <li key={r.id} className="border-t border-border py-2 first:border-t-0 print:break-inside-avoid">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-numeric">{quando(r)}</span>
                    <Badge variant={VARIANTE_DO_STATUS[r.status] ?? "outline"}>{r.status}</Badge>
                    <span className="min-w-0 break-words text-muted-foreground">{r.preenchidoPor}</span>
                    <button
                      type="button"
                      aria-expanded={aberto}
                      onClick={() => setAberta(aberto ? null : r.id)}
                      className="ml-auto text-[12.5px] font-medium text-action hover:underline print:hidden"
                    >
                      {aberto ? "Esconder" : "Ver respostas"}
                    </button>
                  </div>
                  <div className={cn("mt-3 rounded-lg border border-border bg-background p-3 print:block print:border-0 print:bg-transparent print:p-0", !aberto && "hidden")}>
                    <RespostaLegivel r={r} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ConviteDialog formId={f.formId} secao={f.secao} studentId={studentId} aberto={convite} onFechar={() => setConvite(false)} />
    </div>
  );
}
