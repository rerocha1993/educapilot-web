"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatarData } from "@/lib/format/date";
import {
  useCartoesDaReuniao,
  useCriarCartoesDaReuniao,
  usePessoasDaEquipe,
  type DemandaDaReuniao,
} from "@/lib/flow/use-tarefas";

// Novo (2026-09, feedback do cliente) — a reunião terminava em texto: o que ficou combinado
// morria na ata e ninguém cobrava depois. Aqui a diretora registra a demanda e ela vira cartão
// no quadro de quem vai fazer (módulo Fluxos), que é onde a pessoa já olha todo dia.

interface Rascunho {
  /** Chave só de render: a demanda ainda não existe no backend, então não há id para usar. */
  chave: number;
  titulo: string;
  responsavelUserId: string;
  /** "yyyy-MM-dd" do input date; só vira instante na hora de enviar. */
  prazo: string;
}

/** A escola chama as pessoas pelo primeiro nome — é assim que o aviso de sucesso soa natural. */
function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

function listarNomes(nomes: string[]) {
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

export function DemandasDaReuniao({
  reuniaoId,
  turmaId,
  onSalvarReuniao,
}: {
  reuniaoId: number | null;
  turmaId: number | null;
  /** Salva a reunião e devolve o id — a demanda só vira cartão depois que a reunião existe. */
  onSalvarReuniao: () => Promise<number | null>;
}) {
  const { data: cartoes, isLoading: cartoesCarregando } = useCartoesDaReuniao(reuniaoId);
  const { data: pessoas } = usePessoasDaEquipe();
  const criar = useCriarCartoesDaReuniao();

  const [rascunhos, setRascunhos] = useState<Rascunho[]>([]);
  const [salvando, setSalvando] = useState(false);
  const proximaChave = useRef(0);

  const listaDePessoas = pessoas ?? [];
  const listaDeCartoes = cartoes ?? [];

  // "quem vai fazer" quase sempre é a professora da turma da reunião. Com exatamente uma pessoa
  // lecionando nela, a linha já nasce escolhida; com duas ou mais, adivinhar erraria metade das
  // vezes, então a diretora escolhe.
  const daTurma =
    turmaId === null ? [] : listaDePessoas.filter((p) => p.turmaIds?.includes(turmaId));
  const sugerido = daTurma.length === 1 ? daTurma[0].userId : "";

  // A sugestão é aplicada na leitura, não gravada no rascunho ao criar a linha: a lista de
  // pessoas chega depois do primeiro render, e a linha aberta antes disso ficaria presa sem
  // responsável. Só quando a diretora escolhe alguém o rascunho passa a mandar.
  function responsavelDe(r: Rascunho) {
    return r.responsavelUserId || sugerido;
  }

  function acrescentar() {
    setRascunhos((atuais) => [
      ...atuais,
      { chave: proximaChave.current++, titulo: "", responsavelUserId: "", prazo: "" },
    ]);
  }

  function alterar(chave: number, campo: Partial<Rascunho>) {
    setRascunhos((atuais) => atuais.map((r) => (r.chave === chave ? { ...r, ...campo } : r)));
  }

  function remover(chave: number) {
    setRascunhos((atuais) => atuais.filter((r) => r.chave !== chave));
  }

  function nomeDe(userId: string) {
    return listaDePessoas.find((p) => p.userId === userId)?.nome ?? "";
  }

  async function salvar() {
    const validas = rascunhos
      .map((r) => ({ ...r, responsavelUserId: responsavelDe(r) }))
      .filter((r) => r.titulo.trim() && r.responsavelUserId);
    if (validas.length === 0) {
      toast.error("Escreva a demanda e escolha quem vai fazer.");
      return;
    }

    setSalvando(true);
    try {
      // O cartão precisa de uma reunião para pendurar. Se a diretora ainda não salvou nada nesta
      // semana, salva antes — em vez de devolver o erro do backend e fazer ela clicar duas vezes.
      let id = reuniaoId;
      if (id === null) {
        id = await onSalvarReuniao();
        if (id === null) return; // a página já avisou por que não deu para salvar
      }

      const demandas: DemandaDaReuniao[] = validas.map((r) => ({
        titulo: r.titulo.trim(),
        // O prazo combinado é "até tal dia", não "às 00h daquele dia": grava no fim do dia.
        prazo: r.prazo ? new Date(`${r.prazo}T23:59:00`).toISOString() : null,
        responsavelUserId: r.responsavelUserId,
      }));

      await criar.mutateAsync({ reuniaoId: id, demandas });

      const nomes = [...new Set(validas.map((r) => primeiroNome(nomeDe(r.responsavelUserId))))];
      toast.success(
        `${demandas.length} ${demandas.length === 1 ? "demanda virou cartão" : "demandas viraram cartão"} ` +
          `${nomes.length === 1 ? "no quadro" : "nos quadros"} de ${listarNomes(nomes)}.`
      );
      setRascunhos([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar as demandas.");
    } finally {
      setSalvando(false);
    }
  }

  const colunas = "@xl:grid-cols-[minmax(0,1fr)_10rem_9.5rem_6.5rem]";
  const total = listaDeCartoes.length + rascunhos.length;

  return (
    // Container query: a coluna da reunião é estreita em tela média mesmo com a janela larga, então
    // a tabela depende da largura do bloco, e não da janela.
    <section aria-label="Demandas desta reunião" className="@container rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-[15.5px] font-semibold">
          Demandas desta reunião
          {total > 0 && <span className="ml-1.5 font-numeric text-xs font-normal text-muted-foreground">{total}</span>}
        </h2>
        <Button variant="outline" size="sm" onClick={acrescentar}>
          <Plus /> Demanda
        </Button>
      </div>

      {cartoesCarregando && <Skeleton className="mt-3 h-12 w-full" />}

      {/* Estado vazio de uma linha: o que for combinado vira cartão no quadro de quem ficou responsável. */}
      {!cartoesCarregando && total === 0 && (
        <p className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">
          Nenhuma demanda ainda. O que for combinado aqui vira cartão no quadro de quem ficou responsável.
        </p>
      )}

      {total > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          <div
            className={cn(
              "hidden gap-3 border-b border-border bg-muted/50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground @xl:grid",
              colunas
            )}
          >
            <span>O quê</span>
            <span>Quem</span>
            <span>Prazo</span>
            <span className="sr-only">Situação</span>
          </div>

          <ul>
            {listaDeCartoes.map((c) => (
              <li key={c.id} className="border-b border-muted last:border-0">
                {/* A demanda se resolve no quadro, não aqui: a linha é só o rastro do combinado. */}
                <Link
                  href="/flow/tarefas"
                  className={cn(
                    "flex min-h-11 flex-col gap-1 px-3 py-2 transition-colors hover:bg-muted/60 @xl:grid @xl:items-center @xl:gap-3",
                    colunas
                  )}
                >
                  <span className="min-w-0 break-words text-sm font-medium">{c.titulo}</span>
                  <span className="truncate text-xs text-muted-foreground">{c.responsavelNome}</span>
                  <span className="font-numeric text-xs text-muted-foreground">{c.prazo ? formatarData(c.prazo) : ""}</span>
                  <span>
                    {c.concluidoEm ? (
                      <Badge variant="success">Concluído</Badge>
                    ) : (
                      <Badge variant="pending">No quadro</Badge>
                    )}
                  </span>
                </Link>
              </li>
            ))}

            {rascunhos.map((r) => (
              // No celular cada demanda é um bloco empilhado, com os rótulos visíveis; a partir
              // de ~576px do bloco vira uma linha da tabela, com os rótulos só no cabeçalho.
              <li
                key={r.chave}
                className={cn(
                  "grid gap-2 border-b border-muted bg-action-soft/30 px-3 py-2.5 last:border-0 @xl:items-center @xl:gap-3 @xl:py-2",
                  colunas
                )}
              >
                <div className="flex min-w-0 flex-col gap-1 @xl:block">
                  <Label className="text-xs text-muted-foreground @xl:sr-only">Demanda</Label>
                  <Input
                    value={r.titulo}
                    onChange={(e) => alterar(r.chave, { titulo: e.target.value })}
                    placeholder="O que ficou combinado..."
                    aria-label="O que ficou combinado"
                  />
                </div>

                <div className="flex flex-col gap-1 @xl:block">
                  <Label className="text-xs text-muted-foreground @xl:sr-only">Quem vai fazer</Label>
                  <Select
                    value={responsavelDe(r) || undefined}
                    onValueChange={(v) => v && alterar(r.chave, { responsavelUserId: String(v) })}
                  >
                    <SelectTrigger className="w-full" aria-label="Quem vai fazer">
                      <SelectValue>{() => nomeDe(responsavelDe(r)) || "Escolha"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {listaDePessoas.map((p) => (
                        <SelectItem key={p.userId} value={p.userId}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1 @xl:block">
                  <Label className="text-xs text-muted-foreground @xl:sr-only">Prazo (opcional)</Label>
                  <Input
                    type="date"
                    value={r.prazo}
                    onChange={(e) => alterar(r.chave, { prazo: e.target.value })}
                    aria-label="Prazo (opcional)"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remover demanda"
                  onClick={() => remover(r.chave)}
                  className="justify-self-end text-muted-foreground"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sem rascunho não há o que salvar — e o laranja da tela é da reunião, não daqui. */}
      {rascunhos.length > 0 && (
        <div className="mt-3 flex justify-end">
          <Button onClick={salvar} disabled={salvando || criar.isPending}>
            Salvar demandas
          </Button>
        </div>
      )}
    </section>
  );
}
