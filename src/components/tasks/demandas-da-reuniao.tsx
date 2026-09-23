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

  return (
    <div className="flex flex-col gap-3">
      {cartoesCarregando && <Skeleton className="h-12 w-full" />}

      {!cartoesCarregando && listaDeCartoes.length === 0 && (
        <p className="text-[13px] leading-[1.5] text-muted-foreground">
          O que for combinado aqui vira cartão no quadro de quem ficou responsável.
        </p>
      )}

      {listaDeCartoes.length > 0 && (
        <ul className="overflow-hidden rounded-lg border border-border">
          {listaDeCartoes.map((c) => (
            <li key={c.id} className="border-b border-muted last:border-0">
              {/* A demanda se resolve no quadro, não aqui: a linha é só o rastro do combinado. */}
              <Link
                href="/flow/tarefas"
                className="flex min-h-12 flex-col gap-1 px-3 py-2.5 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="min-w-0 break-words text-sm font-medium">{c.titulo}</span>
                <span className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{c.responsavelNome}</span>
                  {c.prazo && <span className="font-numeric">{formatarData(c.prazo)}</span>}
                  {c.concluidoEm ? (
                    <Badge variant="success">Concluído</Badge>
                  ) : (
                    <Badge variant="pending">No quadro</Badge>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {rascunhos.map((r) => (
        // No celular cada demanda é um bloco empilhado: título, responsável e prazo lado a lado
        // em 375px espremeriam o título a ponto de não caber nem uma frase curta.
        <div
          key={r.chave}
          className="flex flex-col gap-2 rounded-lg border border-border p-2.5 sm:flex-row sm:items-end"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Demanda</Label>
            <Input
              value={r.titulo}
              onChange={(e) => alterar(r.chave, { titulo: e.target.value })}
              placeholder="O que ficou combinado..."
            />
          </div>

          <div className="flex flex-col gap-[5px] sm:w-44">
            <Label className="text-xs text-muted-foreground">Quem vai fazer</Label>
            <Select
              value={responsavelDe(r) || undefined}
              onValueChange={(v) => v && alterar(r.chave, { responsavelUserId: String(v) })}
            >
              <SelectTrigger className="w-full">
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

          <div className="flex flex-col gap-[5px] sm:w-40">
            <Label className="text-xs text-muted-foreground">Prazo (opcional)</Label>
            <Input
              type="date"
              value={r.prazo}
              onChange={(e) => alterar(r.chave, { prazo: e.target.value })}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Remover demanda"
            onClick={() => remover(r.chave)}
            className="self-end text-muted-foreground"
          >
            <Trash2 />
          </Button>
        </div>
      ))}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={acrescentar}>
          <Plus /> Demanda
        </Button>
        {/* Sem rascunho não há o que salvar — e o laranja da tela é da reunião, não daqui. */}
        <Button onClick={salvar} disabled={rascunhos.length === 0 || salvando || criar.isPending}>
          Salvar demandas
        </Button>
      </div>
    </div>
  );
}
