"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, useUpdateForm, type FormFieldDto } from "@/lib/flow/use-forms";
import {
  FIELD_TYPES,
  fieldTypeLabel,
  encodeFieldConfig,
  decodeFieldConfig,
  useCreateFormField,
  useUpdateFormField,
  useDeleteFormField,
} from "@/lib/flow/use-form-fields";
import { REFERENCE_TABLES } from "@/lib/flow/use-reference-data";
import {
  useFormAutomations,
  useCreateAutomation,
  useToggleAutomation,
} from "@/lib/flow/use-form-automations";

const EMPTY_FIELD_FORM = { label: "", tipo: "texto_curto", obrigatorio: false, tabelaReferencia: "" };
const EMPTY_RULE_FORM = { nome: "", evento: "", acao: "" };

export default function FormBuilderPage() {
  const params = useParams<{ id: string }>();
  const formId = params.id;

  const { data: form, isLoading, isError } = useForm(formId);
  const updateForm = useUpdateForm();
  const createField = useCreateFormField(formId);
  const updateField = useUpdateFormField(formId);
  const deleteField = useDeleteFormField(formId);
  const { data: automations } = useFormAutomations(formId);
  const createAutomation = useCreateAutomation(formId);
  const toggleAutomation = useToggleAutomation(formId);

  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState(EMPTY_FIELD_FORM);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE_FORM);

  const campos = [...(form?.campos ?? [])].sort((a, b) => a.ordem - b.ordem);

  async function handlePublicar() {
    if (!form) return;
    try {
      await updateForm.mutateAsync({ ...form, status: form.status === "Ativo" ? "Rascunho" : "Ativo" });
      toast.success(form.status === "Ativo" ? "Formulário voltou a rascunho." : "Formulário publicado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar status.");
    }
  }

  async function handleAddField() {
    if (!fieldForm.label.trim()) return;
    try {
      await createField.mutateAsync({
        label: fieldForm.label.trim(),
        tipo: fieldForm.tipo,
        ordem: campos.length,
        obrigatorio: fieldForm.obrigatorio,
        config: encodeFieldConfig(fieldForm.tabelaReferencia || undefined),
      });
      toast.success("Campo adicionado.");
      setFieldDialogOpen(false);
      setFieldForm(EMPTY_FIELD_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar campo.");
    }
  }

  async function handleMove(field: FormFieldDto, direction: "up" | "down") {
    const index = campos.findIndex((c) => c.id === field.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= campos.length) return;
    const other = campos[swapIndex];
    try {
      await Promise.all([
        updateField.mutateAsync({ ...field, ordem: other.ordem }),
        updateField.mutateAsync({ ...other, ordem: field.ordem }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reordenar.");
    }
  }

  async function handleDeleteField(id: string) {
    try {
      await deleteField.mutateAsync(id);
      toast.success("Campo removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover campo.");
    }
  }

  async function handleAddRule() {
    if (!ruleForm.nome.trim() || !ruleForm.evento.trim() || !ruleForm.acao.trim()) return;
    try {
      await createAutomation.mutateAsync(ruleForm);
      toast.success("Regra criada.");
      setRuleDialogOpen(false);
      setRuleForm(EMPTY_RULE_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar regra.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
        Não foi possível carregar o formulário.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/flow" className="text-xs text-muted-foreground hover:underline">
            ← Formulários
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-xl font-bold">{form.nome}</h1>
            <Badge variant={form.status === "Ativo" ? "default" : "secondary"}>{form.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/flow/${formId}/respostas`} className={buttonVariants({ variant: "outline" })}>
            Respostas
          </Link>
          <Button onClick={handlePublicar} disabled={updateForm.isPending}>
            {form.status === "Ativo" ? "Voltar a rascunho" : "Publicar"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="campos">
        <TabsList>
          <TabsTrigger value="campos">Campos</TabsTrigger>
          <TabsTrigger value="automacoes">Automações</TabsTrigger>
        </TabsList>

        <TabsContent value="campos" className="mt-4">
          <div className="flex flex-col gap-2">
            {campos.length === 0 && (
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Nenhum campo ainda.
              </div>
            )}
            {campos.map((field, i) => {
              const { tabelaReferencia } = decodeFieldConfig(field.config);
              return (
                <div
                  key={field.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {fieldTypeLabel(field.tipo)}
                      {tabelaReferencia
                        ? ` (ref. ${REFERENCE_TABLES.find((t) => t.value === tabelaReferencia)?.label ?? tabelaReferencia})`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={field.obrigatorio ? "default" : "secondary"}>
                      {field.obrigatorio ? "Obrigatório" : "Opcional"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={i === 0}
                      onClick={() => handleMove(field, "up")}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={i === campos.length - 1}
                      onClick={() => handleMove(field, "down")}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteField(field.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button variant="outline" className="mt-2" onClick={() => setFieldDialogOpen(true)}>
              + Adicionar campo
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Reordenação por setas (sem arrastar — mesmo padrão simplificado usado no
            Checklist). &quot;Visível ao responsável&quot; não existe no backend, não está
            nesta tela.
          </p>
        </TabsContent>

        <TabsContent value="automacoes" className="mt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold">Automações</h2>
            <Button size="sm" onClick={() => setRuleDialogOpen(true)}>
              + Nova regra
            </Button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {automations?.length === 0 && (
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Nenhuma regra ainda.
              </div>
            )}
            {automations?.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{rule.nome}</p>
                  <Switch
                    checked={rule.ativo}
                    onCheckedChange={() => toggleAutomation.mutate(rule)}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">Quando:</span> {rule.evento}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Então:</span> {rule.acao}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            As regras aqui são só configuração — o backend ainda não tem um motor que
            realmente execute nada quando uma resposta é enviada (não dispara
            notificação, não cria ocorrência, etc.). Salvamos a intenção pra quando esse
            motor existir.
          </p>
        </TabsContent>
      </Tabs>

      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo campo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Rótulo</Label>
              <Input
                value={fieldForm.label}
                onChange={(e) => setFieldForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select
                value={fieldForm.tipo}
                onValueChange={(v) => v && setFieldForm((f) => ({ ...f, tipo: String(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{() => fieldTypeLabel(fieldForm.tipo)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(fieldForm.tipo === "selecao" || fieldForm.tipo === "referencia") && (
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Fonte de dados</Label>
                <Select
                  value={fieldForm.tabelaReferencia}
                  onValueChange={(v) => v && setFieldForm((f) => ({ ...f, tabelaReferencia: String(v) }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() => REFERENCE_TABLES.find((t) => t.value === fieldForm.tabelaReferencia)?.label ?? "Selecione"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {REFERENCE_TABLES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Obrigatório</Label>
              <Switch
                checked={fieldForm.obrigatorio}
                onCheckedChange={(v) => setFieldForm((f) => ({ ...f, obrigatorio: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddField} disabled={createField.isPending || !fieldForm.label.trim()}>
              {createField.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova regra</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome da regra</Label>
              <Input value={ruleForm.nome} onChange={(e) => setRuleForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Quando</Label>
              <Input
                value={ruleForm.evento}
                onChange={(e) => setRuleForm((f) => ({ ...f, evento: e.target.value }))}
                placeholder="Ao enviar resposta"
              />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Então</Label>
              <Input
                value={ruleForm.acao}
                onChange={(e) => setRuleForm((f) => ({ ...f, acao: e.target.value }))}
                placeholder="Notificar coordenação do turno"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddRule}
              disabled={createAutomation.isPending || !ruleForm.nome.trim()}
            >
              {createAutomation.isPending ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
