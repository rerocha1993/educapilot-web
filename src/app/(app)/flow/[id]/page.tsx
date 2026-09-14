"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Link2, Plus, Trash2, X, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  AUTO_FILL_OPTIONS,
  type CepParte,
  type AutoFillKey,
  encodeOpcoes,
  decodeOpcoes,
  useCreateFormField,
  useUpdateFormField,
  useReordenarCampos,
  useDeleteFormField,
} from "@/lib/flow/use-form-fields";
import { REFERENCE_TABLES } from "@/lib/flow/use-reference-data";
import { ListaOrdenavel } from "@/components/flow/lista-ordenavel";
import { DadosDoFormulario } from "@/components/flow/dados-do-formulario";
import { TagDoTipo } from "@/components/flow/tag-do-tipo";
import { tipoDoFormulario } from "@/lib/flow/tipo-do-formulario";
import { CEP_PARTE_OPTIONS } from "@/lib/flow/cep";
import { CAMPO_CADASTRO_OPTIONS, rotuloDoDestino } from "@/lib/registry/campos-do-cadastro";
import { ContractRulesPanel } from "@/components/flow/contract-rules-panel";
import { IdentificationRulePanel } from "@/components/flow/identification-rule-panel";
import { CepRulePanel } from "@/components/flow/cep-rule-panel";
import { RegistryRulePanel } from "@/components/flow/registry-rule-panel";
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
  autoPreenchimento: "",
  travado: false,
  valorPadrao: "",
  preenchidoPeloCep: "",
  gravarEm: "",
  contratoTexto: "",
  tituloContrato: "",
  signatarioNomeFieldId: "",
  signatarioEmailFieldId: "",
  signatarioCpfFieldId: "",
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
  if (field.tipo === "contrato") {
    parts.push(config.contratoTexto ? "texto cadastrado" : "SEM TEXTO — a família não verá nada");
  }
  if (config.gravarEm) {
    parts.push(`grava em ${rotuloDoDestino(config.gravarEm)}`);
  }
  if (config.preenchidoPeloCep) {
    parts.push(`vem do CEP: ${CEP_PARTE_OPTIONS.find((o) => o.value === config.preenchidoPeloCep)?.label}`);
  }
  if (config.autoPreenchimento) {
    const opcao = AUTO_FILL_OPTIONS.find((o) => o.value === config.autoPreenchimento);
    parts.push(config.travado ? `auto: ${opcao?.label} (travado)` : `auto: ${opcao?.label}`);
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
  const reordenar = useReordenarCampos(formId);
  const deleteField = useDeleteFormField(formId);
  const { data: automations } = useFormAutomations(formId);
  const createAutomation = useCreateAutomation(formId);
  const toggleAutomation = useToggleAutomation(formId);

  const [editandoDados, setEditandoDados] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [fieldForm, setFieldForm] = useState(EMPTY_FIELD_FORM);

  // null = criando um campo novo; um id = editando aquele campo.
  //
  // Até aqui só dava para adicionar e apagar. Num formulário com contrato isso significava que
  // não havia onde colar o texto de um campo já existente — apagar e recriar é a única saída, e
  // ela leva junto a ordem do campo e qualquer referência de assinatura apontando para ele.
  const [editandoCampoId, setEditandoCampoId] = useState<string | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE_FORM);

  const campos = [...(form?.campos ?? [])].sort((a, b) => a.ordem - b.ordem);
  const isChoiceType = (CHOICE_FIELD_TYPES as readonly string[]).includes(fieldForm.tipo);

  // Marcadores do contrato que não casam com nenhum campo.
  //
  // Vale a conferência aqui porque o erro é silencioso: o texto parece certo na tela, e só na hora
  // de gerar o PDF o backend recusa por marcador não resolvido — depois que a família preencheu
  // tudo. A comparação ignora acento, caixa e pontuação, igual ao renderizador do backend.
  const marcadoresOrfaos = (() => {
    if (fieldForm.tipo !== "contrato" || !fieldForm.contratoTexto) return [];

    const normalizar = (v: string) =>
      v
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const conhecidos = new Set(campos.map((c) => normalizar(c.label)));
    conhecidos.add("data atual");

    const encontrados = [...fieldForm.contratoTexto.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(
      (m) => m[1]
    );

    return [...new Set(encontrados.filter((m) => !conhecidos.has(normalizar(m))))];
  })();

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

  function abrirEdicao(field: FormFieldDto) {
    const config = decodeFieldConfig(field.config);

    setFieldForm({
      label: field.label,
      tipo: field.tipo,
      obrigatorio: field.obrigatorio,
      tabelaReferencia: config.tabelaReferencia ?? "",
      opcoes: decodeOpcoes(field.opcoes),
      min: config.min === undefined ? "" : String(config.min),
      max: config.max === undefined ? "" : String(config.max),
      minLength: config.minLength === undefined ? "" : String(config.minLength),
      maxLength: config.maxLength === undefined ? "" : String(config.maxLength),
      maxEstrelas: String(config.maxEstrelas ?? 5),
      condFieldId: config.visibleIf?.fieldId ?? "",
      condOperator: config.visibleIf?.operator ?? "filled",
      condValue: config.visibleIf?.value ?? "",
      autoPreenchimento: config.autoPreenchimento ?? "",
      travado: !!config.travado,
      valorPadrao: config.valorPadrao ?? "",
      preenchidoPeloCep: config.preenchidoPeloCep ?? "",
      gravarEm: config.gravarEm ?? "",
      contratoTexto: config.contratoTexto ?? "",
      tituloContrato: config.titulo ?? "",
      signatarioNomeFieldId: config.signatarioNomeFieldId ?? "",
      signatarioEmailFieldId: config.signatarioEmailFieldId ?? "",
      signatarioCpfFieldId: config.signatarioCpfFieldId ?? "",
    });

    setEditandoCampoId(field.id);
    setFieldDialogOpen(true);
  }

  function fecharDialogoCampo() {
    setFieldDialogOpen(false);
    setEditandoCampoId(null);
    setFieldForm(EMPTY_FIELD_FORM);
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
        contratoTexto: fieldForm.tipo === "contrato" ? fieldForm.contratoTexto || undefined : undefined,
        titulo: fieldForm.tipo === "contrato" ? fieldForm.tituloContrato || undefined : undefined,
        signatarioNomeFieldId:
          fieldForm.tipo === "contrato" ? fieldForm.signatarioNomeFieldId || undefined : undefined,
        signatarioEmailFieldId:
          fieldForm.tipo === "contrato" ? fieldForm.signatarioEmailFieldId || undefined : undefined,
        signatarioCpfFieldId:
          fieldForm.tipo === "contrato" ? fieldForm.signatarioCpfFieldId || undefined : undefined,
        autoPreenchimento: (fieldForm.autoPreenchimento || undefined) as AutoFillKey | undefined,

        // travado sozinho nao significa nada: so faz sentido sobre um campo que a escola preenche.
        travado: fieldForm.travado ? true : undefined,
        valorPadrao: fieldForm.valorPadrao || undefined,
        preenchidoPeloCep: (fieldForm.preenchidoPeloCep || undefined) as CepParte | undefined,
        gravarEm: fieldForm.gravarEm || undefined,
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

      const original = campos.find((c) => c.id === editandoCampoId);

      if (original) {
        // Ordem e ativo preservados: quem edita veio mexer no conteúdo do campo, e reposicioná-lo
        // no fim da lista por causa disso embaralharia o formulário.
        await updateField.mutateAsync({
          ...original,
          label: fieldForm.label.trim(),
          tipo: fieldForm.tipo,
          obrigatorio: fieldForm.obrigatorio,
          config,
          opcoes,
        });
        toast.success("Campo atualizado.");
      } else {
        await createField.mutateAsync({
          label: fieldForm.label.trim(),
          tipo: fieldForm.tipo,
          // Depois do maior número de ordem, e não na quantidade de campos: o importador numera a
          // partir de 1, e a quantidade coincidia com a ordem do último campo — os dois ficavam
          // no mesmo número e as setas deixavam de mover qualquer um deles.
          ordem: campos.reduce((maior, c) => Math.max(maior, c.ordem), 0) + 1,
          obrigatorio: fieldForm.obrigatorio,
          config,
          opcoes,
        });
        toast.success("Campo adicionado.");
      }

      fecharDialogoCampo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o campo.");
    }
  }

  // Arrastar e setas gravam a sequência inteira. Antes as setas trocavam a ordem de dois campos
  // em duas gravações; com os dois no mesmo número, a troca não mudava nada e o campo não se mexia.
  async function handleReordenar(ids: string[]) {
    try {
      await reordenar.mutateAsync(ids);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reordenar.");
    }
  }

  function handleMove(field: FormFieldDto, direction: "up" | "down") {
    const index = campos.findIndex((c) => c.id === field.id);
    const alvo = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || alvo < 0 || alvo >= campos.length) return;
    const ids = campos.map((c) => c.id);
    [ids[index], ids[alvo]] = [ids[alvo], ids[index]];
    handleReordenar(ids);
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
            <TagDoTipo tipo={tipoDoFormulario(form)} />
            <Button
              variant="ghost"
              size="icon-sm"
              title="Editar nome, descrição e tipo"
              onClick={() => setEditandoDados(true)}
            >
              <Pencil className="size-4" />
            </Button>
          </div>
          {form.descricao && <p className="text-sm text-muted-foreground">{form.descricao}</p>}
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

      <Dialog open={editandoDados} onOpenChange={setEditandoDados}>
        <DialogContent>
          {editandoDados && <DadosDoFormulario form={form} onFechar={() => setEditandoDados(false)} />}
        </DialogContent>
      </Dialog>

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
            <ListaOrdenavel
              itens={campos}
              desabilitado={reordenar.isPending}
              onReordenar={handleReordenar}
              renderItem={(field, i) => (
              <div
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
                  <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => abrirEdicao(field)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteField(field.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              )}
            />
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
          {/* O contrato vem primeiro: é a regra que realmente executa hoje, e a mais cara de
              errar. As regras abaixo dela ainda são só intenção. */}
          <div className="flex flex-col gap-3">
            {form && <IdentificationRulePanel form={form} />}
            <CepRulePanel campos={campos} />
            <RegistryRulePanel campos={campos} />
            <ContractRulesPanel formId={formId} campos={campos} />
          </div>

          <div className="mt-4 flex items-center justify-between">
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

      <Dialog open={fieldDialogOpen} onOpenChange={(open) => (open ? setFieldDialogOpen(true) : fecharDialogoCampo())}>
        <DialogContent
          className={
            // Um contrato tem dezenas de páginas: no diálogo estreito padrão sobra uma janelinha de
            // poucas linhas, impossível de revisar. Largo só quando o campo é de contrato — os
            // outros tipos cabem folgados no tamanho normal.
            fieldForm.tipo === "contrato"
              ? "sm:max-w-3xl max-h-[88vh] overflow-y-auto"
              : "max-h-[85vh] overflow-y-auto"
          }
        >
          <DialogHeader>
            <DialogTitle>{editandoCampoId ? "Editar campo" : "Novo campo"}</DialogTitle>
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

            {/* Contrato (2026-09): sem estes campos não havia onde colar o texto, e o campo de
                contrato era criado vazio — a família abria o link e não via contrato nenhum. */}
            {fieldForm.tipo === "contrato" && (
              <div className="flex flex-col gap-3 rounded-md border border-dashed border-border p-2.5">
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Título do contrato</Label>
                  <Input
                    value={fieldForm.tituloContrato}
                    placeholder="Contrato de Prestação de Serviços Educacionais 2027"
                    onChange={(e) => setFieldForm((f) => ({ ...f, tituloContrato: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Texto do contrato</Label>
                  <Textarea
                    rows={24}
                    // field-sizing-fixed: o padrão do projeto cresce com o conteúdo, e 36 mil
                    // caracteres virariam uma caixa de vários metros. Altura fixa, texto rola dentro.
                    className="field-sizing-fixed h-[55vh] resize-y font-mono text-xs leading-relaxed"
                    value={fieldForm.contratoTexto}
                    placeholder={"Cole aqui o texto completo do contrato.\n\nUse {{Nome do aluno}} para inserir a resposta de um campo do formulário."}
                    onChange={(e) => setFieldForm((f) => ({ ...f, contratoTexto: e.target.value }))}
                  />
                  {marcadoresOrfaos.length > 0 && (
                    <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
                      <p className="font-medium">
                        {marcadoresOrfaos.length} marcador(es) não correspondem a nenhum campo deste
                        formulário:
                      </p>
                      <p className="mt-1 font-mono">{marcadoresOrfaos.join(", ")}</p>
                      <p className="mt-1">
                        O contrato não será enviado enquanto sobrar algum. Corrija o nome ou crie o
                        campo correspondente.
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Escreva <code>{"{{Nome do campo}}"}</code> onde o dado do formulário deve entrar. O
                    nome precisa ser o rótulo do campo. <code>{"{{data_atual}}"}</code> vira a data da
                    assinatura.
                  </p>
                </div>

                {/* Quem assina. Sem isso o contrato é gerado mas não há para quem enviar. */}
                {([
                  ["signatarioNomeFieldId", "Campo com o NOME de quem assina"],
                  ["signatarioEmailFieldId", "Campo com o E-MAIL de quem assina"],
                  ["signatarioCpfFieldId", "Campo com o CPF de quem assina"],
                ] as const).map(([chave, rotulo]) => (
                  <div key={chave} className="flex flex-col gap-[5px]">
                    <Label className="text-xs text-muted-foreground">{rotulo}</Label>
                    <Select
                      value={fieldForm[chave] || "__none__"}
                      onValueChange={(v) =>
                        setFieldForm((f) => ({ ...f, [chave]: v === "__none__" ? "" : String(v) }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {() =>
                            campos.find((c) => c.id === fieldForm[chave])?.label ?? "Não definido"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não definido</SelectItem>
                        {campos.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            {/* Preenchimento automático (2026-09): usado na rematrícula, em que a família se
                identifica e o formulário já vem com o que a escola sabe. */}
            <div className="flex flex-col gap-[5px] rounded-md border border-dashed border-border p-2.5">
              <Label className="text-xs text-muted-foreground">Preencher pelo CEP (opcional)</Label>
              <Select
                value={fieldForm.preenchidoPeloCep || "__none__"}
                onValueChange={(v) =>
                  setFieldForm((f) => ({
                    ...f,
                    preenchidoPeloCep: v === "__none__" ? "" : String(v),
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() =>
                      CEP_PARTE_OPTIONS.find((o) => o.value === fieldForm.preenchidoPeloCep)?.label ??
                      "Não preencher"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não preencher</SelectItem>
                  {CEP_PARTE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Precisa existir um campo do tipo &quot;CEP&quot; no formulário. Ao digitar o CEP, este
                campo recebe a parte escolhida.
              </p>
            </div>

            <div className="flex flex-col gap-[5px] rounded-md border border-dashed border-border p-2.5">
              <Label className="text-xs text-muted-foreground">Gravar no cadastro (opcional)</Label>
              <Select
                value={fieldForm.gravarEm || "__none__"}
                onValueChange={(v) =>
                  setFieldForm((f) => ({ ...f, gravarEm: v === "__none__" ? "" : String(v) }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => rotuloDoDestino(fieldForm.gravarEm) ?? "Não gravar"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não gravar</SelectItem>
                  {CAMPO_CADASTRO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.grupo} · {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A resposta entra no cadastro quando a gestão <strong>aprova</strong> o contrato — não
                no envio. Resposta em branco não apaga o que já existe.
              </p>
            </div>

            <div className="flex flex-col gap-[5px] rounded-md border border-dashed border-border p-2.5">
              <Label className="text-xs text-muted-foreground">
                Preencher automaticamente com... (opcional)
              </Label>
              <Select
                value={fieldForm.autoPreenchimento || "__none__"}
                onValueChange={(v) =>
                  setFieldForm((f) => ({
                    ...f,
                    autoPreenchimento: v === "__none__" ? "" : String(v),
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() =>
                      AUTO_FILL_OPTIONS.find((o) => o.value === fieldForm.autoPreenchimento)?.label ??
                      "Não preencher"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não preencher</SelectItem>
                  {AUTO_FILL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>

            <div className="flex flex-col gap-[5px] rounded-md border border-dashed border-border p-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Não deixar a família alterar</Label>
                <Switch
                  checked={fieldForm.travado}
                  onCheckedChange={(v) => setFieldForm((f) => ({ ...f, travado: v }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Para o que a escola define: valor da mensalidade, turma do próximo ano, desconto.
                O campo aparece somente leitura.
              </p>

              <Label className="mt-2 text-xs text-muted-foreground">Valor fixo (opcional)</Label>
              <Input
                placeholder="Ex.: Não se aplica"
                value={fieldForm.valorPadrao}
                onChange={(e) => setFieldForm((f) => ({ ...f, valorPadrao: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Preenche o campo desde o início. Necessário quando o contrato cita o campo mas ele
                não se aplica neste formulário: um marcador vazio impede o envio do contrato.
              </p>
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
            <Button variant="outline" onClick={fecharDialogoCampo}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddField}
              disabled={createField.isPending || updateField.isPending || !fieldForm.label.trim()}
            >
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
