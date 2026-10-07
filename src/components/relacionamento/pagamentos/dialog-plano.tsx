"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CampoDeDinheiro, emCentavos, emReais } from "@/components/finance/campo-de-dinheiro";
import { SeletorDeAlunos } from "@/components/relacionamento/pagamentos/seletor-de-alunos";
import { Campo } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { hojeIsoBrasilia } from "@/lib/format/date";
import {
  useCriarPlano,
  useDefinirAlunosDoPlano,
  useEditarPlano,
  type Plano,
  type SalvarPlano,
} from "@/lib/relacionamento/use-pagamentos";

/** O mês tem 28 dias no mínimo: dia de vencimento acima disso falharia em fevereiro. */
const DIA_MAXIMO = 28;

/**
 * Plano recorrente (integral, transporte, aula extra): dados, vigência e, na criação, os alunos.
 * Na edição os alunos ficam no detalhe do plano, onde a lista atual aparece.
 */
export function DialogPlano({ plano, onFechar }: { plano?: Plano; onFechar: () => void }) {
  const criar = useCriarPlano();
  const editar = useEditarPlano();
  const pendente = criar.isPending || editar.isPending;

  const [nome, setNome] = useState(plano?.nome ?? "");
  const [descricao, setDescricao] = useState(plano?.descricao ?? "");
  const [valor, setValor] = useState<number | null>(plano ? plano.valor : null);
  const [dia, setDia] = useState(String(plano?.diaVencimento ?? 10));
  const [inicio, setInicio] = useState(plano?.inicio || hojeIsoBrasilia());
  const [fim, setFim] = useState(plano?.fim ?? "");
  const [asaas, setAsaas] = useState(plano?.gerarCobrancaAsaas ?? true);
  const [alunos, setAlunos] = useState<number[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const diaNumero = Number(dia);
    if (!nome.trim()) return setErro("Dê um nome ao plano.");
    if (valor === null || valor <= 0) return setErro("Informe o valor mensal.");
    if (!Number.isInteger(diaNumero) || diaNumero < 1 || diaNumero > DIA_MAXIMO) {
      return setErro(`O dia do vencimento vai de 1 a ${DIA_MAXIMO}.`);
    }
    if (!inicio) return setErro("Informe quando o plano começa.");
    if (fim && fim < inicio) return setErro("O fim não pode vir antes do início.");

    const dados: SalvarPlano = {
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      valor,
      diaVencimento: diaNumero,
      inicio,
      fim: fim || undefined,
      gerarCobrancaAsaas: asaas,
    };

    try {
      if (plano) {
        await editar.mutateAsync({ id: plano.id, dados });
        toast.success("Plano atualizado.");
      } else {
        await criar.mutateAsync({ ...dados, studentIds: alunos });
        toast.success("Plano criado.");
      }
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o plano.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{plano ? "Editar plano" : "Novo plano recorrente"}</DialogTitle>
          <DialogDescription>
            Cobrança mensal fora da mensalidade, como período integral ou transporte. O valor vale para cada aluno do
            plano.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={salvar} noValidate className="grid gap-3.5">
          <Campo id="plano-nome" rotulo="Nome do plano">
            <Input
              id="plano-nome"
              value={nome}
              maxLength={80}
              placeholder="Ex.: Período integral"
              onChange={(e) => {
                setNome(e.target.value);
                setErro(null);
              }}
            />
          </Campo>

          <Campo id="plano-descricao" rotulo="Descrição (opcional)" dica="Aparece na cobrança que a família recebe.">
            <Textarea id="plano-descricao" rows={2} value={descricao} maxLength={300} onChange={(e) => setDescricao(e.target.value)} />
          </Campo>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo id="plano-valor" rotulo="Valor mensal">
              <CampoDeDinheiro
                id="plano-valor"
                valorEmCentavos={emCentavos(valor)}
                onChange={(c) => {
                  setValor(c === null ? null : emReais(c));
                  setErro(null);
                }}
              />
            </Campo>
            <Campo id="plano-dia" rotulo="Dia do vencimento" dica={`De 1 a ${DIA_MAXIMO}.`}>
              <Input
                id="plano-dia"
                type="number"
                inputMode="numeric"
                min={1}
                max={DIA_MAXIMO}
                value={dia}
                onChange={(e) => setDia(e.target.value)}
              />
            </Campo>
            <Campo id="plano-inicio" rotulo="Começa em">
              <Input id="plano-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </Campo>
            <Campo id="plano-fim" rotulo="Termina em (opcional)">
              <Input id="plano-fim" type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} />
            </Campo>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <Checkbox checked={asaas} onCheckedChange={(v) => setAsaas(v === true)} className="mt-0.5" />
            <span>
              Gerar no Asaas (link, Pix e boleto)
              <span className="block text-[13px] text-muted-foreground">
                Precisa do Asaas da escola configurado e do CPF do responsável. Sem isso a cobrança sai manual.
              </span>
            </span>
          </label>

          {!plano && (
            <div className="grid gap-2">
              <span className="text-sm leading-none font-medium">Alunos do plano</span>
              <SeletorDeAlunos valor={alunos} onChange={setAlunos} disabled={pendente} rotulo="Alunos do plano" />
              <p className="text-xs text-muted-foreground">Dá para mudar a lista depois, no detalhe do plano.</p>
            </div>
          )}

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pendente} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={pendente}>
              {pendente ? "Salvando..." : plano ? "Salvar" : "Criar plano"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Troca a lista de alunos de um plano (a enviada substitui a atual). */
export function DialogAlunosDoPlano({
  planoId,
  nome,
  inicial,
  onFechar,
}: {
  planoId: string;
  nome: string;
  inicial: number[];
  onFechar: () => void;
}) {
  const definir = useDefinirAlunosDoPlano();
  const [alunos, setAlunos] = useState<number[]>(inicial);

  async function salvar() {
    try {
      await definir.mutateAsync({ id: planoId, studentIds: alunos });
      toast.success("Alunos do plano atualizados.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar os alunos do plano.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !definir.isPending && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Alunos de {nome}</DialogTitle>
          <DialogDescription>
            A lista marcada substitui a atual: quem ficar desmarcado sai do plano e não recebe as próximas cobranças.
          </DialogDescription>
        </DialogHeader>
        <SeletorDeAlunos valor={alunos} onChange={setAlunos} disabled={definir.isPending} rotulo="Alunos do plano" />
        <DialogFooter>
          <Button variant="outline" disabled={definir.isPending} onClick={onFechar}>
            Cancelar
          </Button>
          <Button variant="action" disabled={definir.isPending} onClick={salvar}>
            {definir.isPending ? "Salvando..." : "Salvar alunos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
