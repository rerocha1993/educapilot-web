"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutList, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { cn } from "@/lib/utils";
import {
  useWeeklyPlanTemplates,
  useSaveWeeklyPlanTemplate,
  useDeleteWeeklyPlanTemplate,
  useSaveWeeklyPlanField,
  useDeleteWeeklyPlanField,
} from "@/lib/tasks/use-weekly-plans";

// Novo (2026-09, feedback do cliente) — "planejamento semanal, isso eu quero que
// criemos o modelo, não pode ser fixo". Tela de configuração dos campos do
// planejamento, mesmo padrão da config de Checklist (/checklist/config): cada
// escola define os campos que quiser, sem depender de código.
export default function PlanejamentoSemanalConfigPage() {
  const router = useRouter();
  const { data: templates, isLoading } = useWeeklyPlanTemplates();
  const saveTemplate = useSaveWeeklyPlanTemplate();
  const deleteTemplate = useDeleteWeeklyPlanTemplate();
  const saveField = useSaveWeeklyPlanField();
  const deleteField = useDeleteWeeklyPlanField();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = templates?.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId === null && templates && templates.length > 0) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  const [newName, setNewName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");

  async function handleCreateTemplate() {
    if (!newName.trim()) return;
    try {
      await saveTemplate.mutateAsync({ name: newName.trim() });
      toast.success("Modelo criado.");
      setNewName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar modelo.");
    }
  }

  async function handleDeleteTemplate(id: number) {
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success("Modelo excluído.");
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  }

  async function handleAddField() {
    if (!selected || !newFieldLabel.trim()) return;
    try {
      await saveField.mutateAsync({ templateId: selected.id, label: newFieldLabel.trim(), ativo: true });
      setNewFieldLabel("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar campo.");
    }
  }

  async function toggleFieldAtivo(fieldId: number, label: string, ativo: boolean) {
    if (!selected) return;
    try {
      await saveField.mutateAsync({ id: fieldId, templateId: selected.id, label, ativo });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar campo.");
    }
  }

  async function handleDeleteField(fieldId: number) {
    try {
      await deleteField.mutateAsync(fieldId);
      toast.success("Campo removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover campo.");
    }
  }

  const orderedFields = [...(selected?.fields ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <CabecalhoDaPagina
        eyebrow="Rotina · Planejamento"
        titulo="Configurar planejamento semanal"
        apoio="Modelos e campos livres — cada escola define o que quiser preencher."
        acoes={
          <Link href="/planejamento-semanal" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="size-3.5" />
            Voltar para o preenchimento
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {templates?.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors md:py-2",
                selectedId === t.id
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-foreground hover:bg-accent/50"
              )}
            >
              <span className="truncate">{t.name}</span>
              <span className="font-numeric text-[10px] text-muted-foreground">{t.fields.length}</span>
            </button>
          ))}

          <div className="mt-2 flex gap-1.5">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do modelo"
              className="h-10 text-sm md:h-8"
            />
            <Button size="sm" onClick={handleCreateTemplate} disabled={!newName.trim() || saveTemplate.isPending}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {!selected ? (
          <EstadoVazio icone={<LayoutList />} titulo="Selecione ou crie um modelo." />
        ) : (
          <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 break-words font-heading text-[15.5px] font-semibold">
                {selected.name}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDeleteTemplate(selected.id)}
              >
                <Trash2 className="size-4" />
                Excluir modelo
              </Button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Campos
              </span>
              {orderedFields.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhum campo ainda.</p>
              )}
              {orderedFields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 border-b border-border py-2 last:border-0"
                >
                  <span className={cn("min-w-0 flex-1 break-words text-sm", !field.ativo && "text-muted-foreground line-through")}>
                    {field.label}
                  </span>

                  <Switch
                    checked={field.ativo}
                    onCheckedChange={(v) => toggleFieldAtivo(field.id, field.label, v)}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-destructive hover:text-destructive md:size-7"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}

              <div className="mt-2 flex gap-1.5">
                <Input
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  placeholder="Ex.: Objetivos gerais, Dever de casa..."
                  className="h-10 flex-1 text-sm md:h-8"
                />
                <Button size="sm" onClick={handleAddField} disabled={!newFieldLabel.trim() || saveField.isPending}>
                  <Plus className="size-4" />
                  Novo campo
                </Button>
              </div>
            </div>

            <div className="flex justify-end border-t border-border pt-4">
              <Button onClick={() => router.push("/planejamento-semanal")}>Salvar e voltar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
