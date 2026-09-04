"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Link2, Plus, Trash2, X } from "lucide-react";
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
  CHOICE_FIELD_TYPES,
  fieldTypeLabel,
  encodeFieldConfig,
  decodeFieldConfig,
  encodeOpcoes,
  decodeOpcoes,
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

const VISIBLE_IF_OPERATORS = [
  { value: "filled", label: "estiver preenchido" },
  { value: "not_filled", label: "não estiver preenchido" },
  { value: "equals", label: "for igual a" },
  { value: "not_equals", label: "for diferente de" },
] as const;

const EMPTY_FIELD_FORM = {
  label: "",
  tipo: "texto_curto",
  obrigatorio: false,
  tabelaReferencia: "",
  opcoes: [] as string[],
  min: "",
  max: "",
  minLength: "",
  maxLength: "",
  maxEstrelas: "5",
  condFieldId: "",
  condOperator: "filled" as (typeof VISIBLE_IF_OPERATORS)[number]["value"],
  condValue: "",
};
const EMPTY_RULE_FORM = { nome: "", evento: "", acao: "" };

function fieldSummary(field: FormFieldDto): string {
  const config = decodeFieldConfig(field.config);
  const parts: string[] = [fieldTypeLabel(field.tipo)];

  if (config.tabelaReferencia) {
    parts.push(`ref. ${REFERENCE_TABLES.find((t) => t.value === config.tabelaReferencia)?.label ?? config.tabelaReferencia}`);
  }
  if ((CHOICE_FIELD_TYPES as readonly string[]).includes(field.tipo)) {
    const opcoes = decodeOpcoes(field.opcoes);
    if (opcoes.length > 0) parts.push(opcoes.join(", "));
  }
  if (field.tipo === "numero" && (config.min !== undefined || config.max !== undefined)) {
    parts.push(`entre ${config.min ?? "—"} e ${config.max ?? "—"}`);
  }
  if (field.tipo === "avaliacao") {
    parts.push(`1 a ${config.maxEstrelas ?? 5}`);
  }
  if (config.visibleIf) {
    parts.push("condicional");
  }
  return parts.join(" · ");
}

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
  const isChoiceType = (CHOICE_FIELD_TYPES as readonly string[]).includes(fieldForm.tipo);

  async function handleCopiarLinkPublico() {
    if (!form?.publicToken) return;
    const url = `${window.location.origin}/f/${form.publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado.");
    } catch {
      // Clipboard API pode falhar em contexto não-seguro (http sem localhost) —
      // mostra o link no próprio toast pra pelo menos dar pra copiar à mão.
      toast.message("Copie o link:", { description: url });
    }
  }

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
      const config = encodeFieldConfig({
        tabelaReferencia: fieldForm.tabelaReferencia || undefined,
        min: fieldForm.tipo === "numero" && fieldForm.min !== "" ? Number(fieldForm.min) : undefined,
        max: fieldForm.tipo === "numero" && fieldForm.max !== "" ? Number(fieldForm.max) : undefined,
        minLength:
          (fieldForm.tipo === "texto_curto" || fieldForm.tipo === "texto_longo") && fieldForm.minLength !== ""
            ? Number(fieldForm.minLength)
            : undefined,
        maxLength:
          (fieldForm.tipo === "texto_curto" || fieldForm.tipo === "texto_longo") && fieldForm.maxLength !== ""
            ? Number(fieldForm.maxLength)
            : undefined,
        maxEstrelas: fieldForm.tipo === "avaliacao" ? Number(fieldForm.maxEstrelas || 5) : undefined,
        visibleIf: fieldForm.condFieldId
          ? {
              fieldId: fieldForm.condFieldId,
              operator: fieldForm.condOperator,
              value:
                fieldForm.condOperator === "equals" || fieldForm.condOperator === "not_equals"
                  ? fieldForm.condValue
                  : undefined,
            }
          : undefined,
      });
      const opcoes = isChoiceType ? encodeOpcoes(fieldForm.opcoes) : null;

      await createField.mutateAsync({
        label: fieldForm.label.trim(),
        tipo: fieldForm.tipo,
        ordem: campos.length,
        obrigatorio: fieldForm.obrigatorio,
        config,
        opcoes,
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

  function updateOpcao(index: number, value: string) {
    setFieldForm((f) => ({ ...f, opcoes: f.opcoes.map((o, i) => (i === index ? value : o)) }));
  }
  function addOpcao() {
    setFieldForm((f) => ({ ...f, opcoes: [...f.opcoes, ""] }));
  }
  function removeOpcao(index: number) {
    setFieldForm((f) => ({ ...f, opcoes: f.opcoes.filter((_, i) => i !== index) }));
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
          <Button variant="outline" onClick={handleCopiarLinkPublico} disabled={!form.publicToken}>
            <Link2 className="size-4" /> Copiar link público
          </Button>
          <Link href={`/flow/${formId}/preencher`} className={buttonVariants({ variant: "outline" })}>
            Preencher
          </Link>
          <Link href={`/flow/${formId}/respostas`} className={buttonVariants({ variant: "outline" })}>
            Respostas
          </Link>
          <Button onClick={handlePublicar} disabled={updateForm.isPending}>
            {form.status === "Ativo" ? "Voltar a rascunho" : "Publicar"}
          </Button>
        </div>
      </div>
      {form.status !== "Ativo" && (
        <p className="-mt-2 text-xs text-muted-foreground">
          O link público existe mas só aceita respostas quando o formulário está
          publicado (&quot;Ativo&quot;).
        </p>
      )}

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
            {campos.map((field, i) => (
              <div
                key={field.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{field.label}</p>
                  <p className="text-xs text-muted-foreground">{fieldSummary(field)}</p>
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
            ))}
            <Button variant="outline" className="mt-2" onClick={() => setFieldDialogOpen(true)}>
              + Adicionar campo
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Reordenação por setas (sem arrastar — mesmo padrão simplificado usado no
            Checklist). Um campo já criado não pode ser editado por aqui — remova e
            crie de novo se precisar mudar o tipo ou as opções.
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
        <DialogContent className="max-h-[85vh] overflow-y-auto">
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

            {fieldForm.tipo === "referencia" && (
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

            {isChoiceType && (
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Opções</Label>
                <div className="flex flex-col gap-2">
                  {fieldForm.opcoes.map((opcao, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={opcao}
                        onChange={(e) => updateOpcao(i, e.target.value)}
                        placeholder={`Opção ${i + 1}`}
                      />
                      <Button variant="ghost" size="icon-sm" onClick={() => removeOpcao(i)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="self-start" onClick={addOpcao}>
                    <Plus className="size-3.5" /> Adicionar opção
                  </Button>
                </div>
              </div>
            )}

            {fieldForm.tipo === "numero" && (
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Mínimo (opcional)</Label>
                  <Input
                    type="number"
                    value={fieldForm.min}
                    onChange={(e) => setFieldForm((f) => ({ ...f, min: e.target.value }))}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Máximo (opcional)</Label>
                  <Input
                    type="number"
                    value={fieldForm.max}
                    onChange={(e) => setFieldForm((f) => ({ ...f, max: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {(fieldForm.tipo === "texto_curto" || fieldForm.tipo === "texto_longo") && (
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Mín. caracteres (opcional)</Label>
                  <Input
                    type="number"
                    value={fieldForm.minLength}
                    onChange={(e) => setFieldForm((f) => ({ ...f, minLength: e.target.value }))}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Máx. caracteres (opcional)</Label>
                  <Input
                    type="number"
                    value={fieldForm.maxLength}
                    onChange={(e) => setFieldForm((f) => ({ ...f, maxLength: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {fieldForm.tipo === "avaliacao" && (
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Escala até (padrão 5)</Label>
                <Input
                  type="number"
                  min={2}
                  max={10}
                  value={fieldForm.maxEstrelas}
                  onChange={(e) => setFieldForm((f) => ({ ...f, maxEstrelas: e.target.value }))}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Obrigatório</Label>
              <Switch
                checked={fieldForm.obrigatorio}
                onCheckedChange={(v) => setFieldForm((f) => ({ ...f, obrigatorio: v }))}
              />
            </div>

            {campos.length > 0 && (
              <div className="flex flex-col gap-[5px] rounded-md border border-dashed border-border p-2.5">
                <Label className="text-xs text-muted-foreground">
                  Só mostrar este campo se... (opcional)
                </Label>
                <Select
                  value={fieldForm.condFieldId || "__none__"}
                  onValueChange={(v) =>
                    setFieldForm((f) => ({ ...f, condFieldId: v === "__none__" ? "" : String(v) }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() =>
                        fieldForm.condFieldId
                          ? campos.find((c) => c.id === fieldForm.condFieldId)?.label
                          : "Sem condição"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem condição</SelectItem>
                    {campos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldForm.condFieldId && (
                  <>
                    <Select
                      value={fieldForm.condOperator}
                      onValueChange={(v) => v && setFieldForm((f) => ({ ...f, condOperator: v as typeof f.condOperator }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {() => VISIBLE_IF_OPERATORS.find((o) => o.value === fieldForm.condOperator)?.label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {VISIBLE_IF_OPERATORS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(fieldForm.condOperator === "equals" || fieldForm.condOperator === "not_equals") && (
                      <Input
                        value={fieldForm.condValue}
                        onChange={(e) => setFieldForm((f) => ({ ...f, condValue: e.target.value }))}
                        placeholder="Valor de comparação"
                      />
                    )}
                  </>
                )}
              </div>
            )}
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
