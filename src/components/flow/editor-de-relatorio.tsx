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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-[5px]">
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
          <div className="flex flex-col gap-[5px]">
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
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Colunas ({perguntas.length} perguntas)</Label>
              <div className="flex gap-2">
                <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setCampos(null)}>
                  Marcar todas
                </Button>
                <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setCampos(new Set())}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2">
              {perguntas.length === 0 && (
                <p className="px-1 py-2 text-xs text-muted-foreground">Este formulário ainda não tem perguntas.</p>
              )}
              {perguntas.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                  <Checkbox checked={marcada(p.id)} onCheckedChange={(v) => alternar(p.id, !!v)} />
                  <span className="truncate">{p.label}</span>
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
