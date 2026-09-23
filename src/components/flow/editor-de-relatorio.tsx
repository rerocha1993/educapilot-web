"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForms } from "@/lib/flow/use-forms";
import { useSalvarRelatorio, type RelatorioDeFormulario } from "@/lib/flow/use-relatorios";

const TODAS = "todas";
const SITUACOES = [
  { valor: TODAS, rotulo: "Todos os envios" },
  { valor: "Concluída", rotulo: "Só os aprovados (Concluída)" },
  { valor: "Pendente", rotulo: "Só os pendentes" },
  { valor: "Revisar", rotulo: "Só os para revisar" },
];

/**
 * Criação e edição de um relatório. Conteúdo de um Dialog, montado só enquanto aberto: o estado
 * começa sempre do relatório atual.
 *
 * As colunas saem na ordem das perguntas no formulário — é a ordem em que a família preencheu, e a
 * que a escola já reconhece.
 */
export function EditorDeRelatorio({
  relatorio,
  onFechar,
  onSalvo,
}: {
  relatorio?: RelatorioDeFormulario;
  onFechar: () => void;
  onSalvo?: (salvo: RelatorioDeFormulario) => void;
}) {
  const { data: forms } = useForms();
  const salvar = useSalvarRelatorio();

  const [nome, setNome] = useState(relatorio?.nome ?? "");
  const [descricao, setDescricao] = useState(relatorio?.descricao ?? "");
  const [formId, setFormId] = useState(relatorio?.formId ?? "");
  const [situacao, setSituacao] = useState(relatorio?.statusFiltro ?? TODAS);
  const [somenteGestao, setSomenteGestao] = useState(relatorio?.somenteGestao ?? false);
  // Nulo = todas as perguntas (é como o relatório grava "todas"). Vira lista na primeira mudança.
  const [campos, setCampos] = useState<Set<string> | null>(() =>
    relatorio && relatorio.camposIds.length > 0 ? new Set(relatorio.camposIds) : relatorio ? null : new Set()
  );

  const formularios = forms ?? [];
  const form = formularios.find((f) => f.id === formId);
  const perguntas = [...(form?.campos ?? [])].sort((a, b) => a.ordem - b.ordem);

  const marcada = (id: string) => campos === null || campos.has(id);

  function escolherFormulario(id: string) {
    setFormId(id);
    // Perguntas são de cada formulário: trocar de formulário começa com todas marcadas.
    setCampos(null);
  }

  function alternar(id: string, marcado: boolean) {
    setCampos((atuais) => {
      const proximos = new Set(atuais ?? perguntas.map((p) => p.id));
      if (marcado) proximos.add(id);
      else proximos.delete(id);
      return proximos;
    });
  }

  async function handleSalvar() {
    if (!nome.trim() || !formId) return;
    const escolhidas = perguntas.filter((p) => marcada(p.id)).map((p) => p.id);
    if (perguntas.length > 0 && escolhidas.length === 0) {
      toast.error("Escolha ao menos uma pergunta para virar coluna.");
      return;
    }

    try {
      const salvo = await salvar.mutateAsync({
        id: relatorio?.id,
        dados: {
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          formId,
          // Todas marcadas grava vazio: pergunta nova no formulário entra sozinha no relatório.
          camposIds: escolhidas.length === perguntas.length ? [] : escolhidas,
          statusFiltro: situacao === TODAS ? null : situacao,
          somenteGestao,
        },
      });
      toast.success(relatorio ? "Relatório atualizado." : "Relatório criado.");
      onSalvo?.(salvo);
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o relatório.");
    }
  }

  const quantasMarcadas = perguntas.filter((p) => marcada(p.id)).length;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{relatorio ? "Editar relatório" : "Novo relatório"}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Autorizações de passeio" />
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Descrição (opcional)</Label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        {/* min-w-0 nos dois: item de grid tem largura mínima automática, e o nome comprido do
            formulário empurrava a caixa para fora do diálogo, com barra de rolagem horizontal. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Formulário</Label>
            <Select value={formId || undefined} onValueChange={(v) => v && escolherFormulario(String(v))}>
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
          <div className="flex min-w-0 flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Envios</Label>
            <Select value={situacao} onValueChange={(v) => v && setSituacao(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue>{() => SITUACOES.find((s) => s.valor === situacao)?.rotulo}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SITUACOES.map((s) => (
                  <SelectItem key={s.valor} value={s.valor}>
                    {s.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {form && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <Label className="text-xs text-muted-foreground">
                Colunas (<span className="font-mono tabular-nums">{perguntas.length}</span> perguntas)
              </Label>
              <div className="flex gap-2">
                <Button variant="link" size="sm" className="h-auto min-h-10 px-0 md:min-h-0" onClick={() => setCampos(null)}>
                  Marcar todas
                </Button>
                <Button variant="link" size="sm" className="h-auto min-h-10 px-0 md:min-h-0" onClick={() => setCampos(new Set())}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="flex max-h-64 flex-col overflow-y-auto rounded-lg border border-border p-1.5">
              {perguntas.length === 0 && (
                <p className="px-2 py-2 text-xs text-muted-foreground">Este formulário ainda não tem perguntas.</p>
              )}
              {/* Pergunta longa quebra em vez de ser cortada: são 42 numa ficha de matrícula, e
                  metade delas começa igual ("Nome do...", "Data de nascimento do..."). */}
              {perguntas.map((p) => (
                <label
                  key={p.id}
                  className="flex min-h-9 cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 text-sm leading-snug hover:bg-muted"
                >
                  <Checkbox
                    className="mt-0.5 shrink-0"
                    checked={marcada(p.id)}
                    onCheckedChange={(v) => alternar(p.id, !!v)}
                  />
                  <span className="min-w-0 break-words">{p.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {quantasMarcadas === perguntas.length
                ? "Todas as perguntas viram coluna, inclusive as que forem criadas depois."
                : `${quantasMarcadas} coluna(s) escolhida(s).`}
            </p>
          </div>
        )}

        {/* A ficha de matrícula traz mensalidade e desconto negociado. Quem atende no balcão
            precisa da ficha, não do valor — e a coluna não some sozinha, porque a resposta é uma
            só, então o que se esconde é o relatório inteiro. */}
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <Checkbox
            className="mt-0.5 shrink-0"
            checked={somenteGestao}
            onCheckedChange={(v) => setSomenteGestao(!!v)}
          />
          <span className="min-w-0">
            <span className="block font-medium">Somente a gestão vê este relatório</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              Marque quando o relatório mostrar valores. Secretaria, coordenação e professores não
              veem o relatório nem o download dele.
            </span>
          </span>
        </label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button onClick={handleSalvar} disabled={salvar.isPending || !nome.trim() || !formId}>
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}
