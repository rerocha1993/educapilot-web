"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForms } from "@/lib/flow/use-forms";
import {
  useEtiquetas,
  usePessoasDaEquipe,
  useSalvarRegraDeCartao,
  type EventoDaRegra,
  type RegraDeCartao,
} from "@/lib/flow/use-tarefas";

/** Rótulos do enum de evento do backend (0 = envio da família, 1 = aprovação da gestão). */
export const EVENTOS: { valor: EventoDaRegra; rotulo: string }[] = [
  { valor: 0, rotulo: "Quando a família enviar" },
  { valor: 1, rotulo: "Quando a gestão aprovar" },
];

export function rotuloDoEvento(evento: EventoDaRegra) {
  return EVENTOS.find((e) => e.valor === evento)?.rotulo ?? "";
}

/** O Select do base-ui trabalha com texto; "sem" é o valor para "nenhuma etiqueta". */
const SEM_ETIQUETA = "sem";

/** Quantos rótulos de campo cabem como atalho sem virar uma segunda lista dentro do Dialog. */
const MAX_ATALHOS = 8;

/**
 * Criação e edição de uma regra que transforma envio de formulário em cartão.
 *
 * O título aceita marcadores com o rótulo da pergunta ({{Nome completo do aluno(a)}}): é o que faz
 * o cartão chegar com o nome da criança em vez de "Nova ficha". Como ninguém decora rótulo de
 * pergunta, os do formulário escolhido viram atalhos clicáveis abaixo do campo.
 */
export function EditorDeRegraDeCartao({
  regra,
  onFechar,
}: {
  regra?: RegraDeCartao;
  onFechar: () => void;
}) {
  const { data: forms } = useForms();
  const { data: pessoas } = usePessoasDaEquipe();
  const { data: etiquetas } = useEtiquetas();
  const salvar = useSalvarRegraDeCartao();

  const [formId, setFormId] = useState(regra?.formId ?? "");
  const [evento, setEvento] = useState(String(regra?.evento ?? 0));
  const [userId, setUserId] = useState(regra?.responsavelUserId ?? "");
  const [titulo, setTitulo] = useState(regra?.tituloTemplate ?? "");
  const [etiquetaId, setEtiquetaId] = useState(regra?.etiquetaId ?? SEM_ETIQUETA);
  const [prazoEmDias, setPrazoEmDias] = useState(
    regra?.prazoEmDias == null ? "" : String(regra.prazoEmDias)
  );
  const [ativa, setAtiva] = useState(regra?.ativa ?? true);

  const formularios = forms ?? [];
  const listaDePessoas = pessoas ?? [];
  const listaDeEtiquetas = etiquetas ?? [];

  const form = formularios.find((f) => f.id === formId);
  const responsavel = listaDePessoas.find((p) => p.userId === userId);
  const etiqueta = listaDeEtiquetas.find((e) => e.id === etiquetaId);

  const perguntas = [...(form?.campos ?? [])].sort((a, b) => a.ordem - b.ordem).slice(0, MAX_ATALHOS);

  async function handleSalvar() {
    if (!formId || !userId || !titulo.trim()) return;

    const dias = prazoEmDias.trim() === "" ? null : Number(prazoEmDias);
    if (dias !== null && (!Number.isInteger(dias) || dias < 0)) {
      toast.error("O prazo precisa ser um número de dias.");
      return;
    }

    try {
      await salvar.mutateAsync({
        id: regra?.id,
        formId,
        evento: Number(evento) as EventoDaRegra,
        responsavelUserId: userId,
        tituloTemplate: titulo.trim(),
        etiquetaId: etiquetaId === SEM_ETIQUETA ? null : etiquetaId,
        prazoEmDias: dias,
        ativa,
      });
      toast.success(regra ? "Regra atualizada." : "Regra criada.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a regra.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{regra ? "Editar regra" : "Nova regra"}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Formulário</Label>
            <Select value={formId || undefined} onValueChange={(v) => v && setFormId(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue>{() => form?.nome ?? "Escolha o formulário"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {formularios.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Quando criar o cartão</Label>
            <Select value={evento} onValueChange={(v) => v && setEvento(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue>{() => rotuloDoEvento(Number(evento) as EventoDaRegra)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {EVENTOS.map((e) => (
                  <SelectItem key={e.valor} value={String(e.valor)}>
                    {e.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Quem recebe a tarefa</Label>
            <Select value={userId || undefined} onValueChange={(v) => v && setUserId(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue>{() => responsavel?.nome ?? "Escolha a pessoa"}</SelectValue>
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

          <div className="flex flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Etiqueta (opcional)</Label>
            <Select value={etiquetaId} onValueChange={(v) => v && setEtiquetaId(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue>{() => etiqueta?.nome ?? "Sem etiqueta"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_ETIQUETA}>Sem etiqueta</SelectItem>
                {listaDeEtiquetas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Título do cartão</Label>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Conferir a ficha de {{Nome completo do aluno(a)}}"
          />
          <p className="text-xs text-muted-foreground">
            Escreva entre chaves duplas o nome exato da pergunta e o cartão chega com a resposta da
            família no lugar. Ex.: <span className="font-mono">{"Conferir a ficha de {{Nome completo do aluno(a)}}"}</span>
          </p>
          {perguntas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {perguntas.map((p) => (
                <Button
                  key={p.id}
                  variant="outline"
                  size="xs"
                  // Rótulo de pergunta é longo: o botão encolhe e corta em vez de estourar a
                  // largura do Dialog no celular.
                  className="max-w-full shrink truncate"
                  title="Colocar esta pergunta no título"
                  onClick={() => setTitulo((atual) => `${atual}{{${p.label}}}`)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[5px] sm:max-w-56">
          <Label className="text-xs text-muted-foreground">Prazo, em dias (opcional)</Label>
          <Input
            type="number"
            min={0}
            value={prazoEmDias}
            onChange={(e) => setPrazoEmDias(e.target.value)}
            placeholder="Em branco = sem prazo"
          />
          <p className="text-xs text-muted-foreground">Contados a partir do dia em que o cartão nasce.</p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
          <div className="min-w-0">
            <Label className="text-sm">Ativa</Label>
            <p className="text-xs text-muted-foreground">
              Desligada, os envios deixam de virar tarefa, mas a regra continua guardada.
            </p>
          </div>
          <Switch checked={ativa} onCheckedChange={(v) => setAtiva(v)} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button onClick={handleSalvar} disabled={salvar.isPending || !formId || !userId || !titulo.trim()}>
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}
