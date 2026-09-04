"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { decodeFieldConfig, decodeOpcoes, encodeOpcoes } from "@/lib/flow/use-form-fields";
import {
  usePublicForm,
  useSubmitPublicForm,
  useUploadPublicFormFile,
  type PublicFormFieldDto,
} from "@/lib/flow/use-public-form";

// Novo (2026-08) — link público de preenchimento, pedido explícito do cliente:
// responsáveis externos (sem login) precisam abrir um link e preencher o formulário.
// Página FORA do grupo de rotas (app) — sem layout autenticado, sem sidebar, não
// exige sessão nenhuma. Adaptada de flow/[id]/preencher/page.tsx (staff, autenticada)
// com 2 diferenças deliberadas:
// 1. Campo tipo "referencia" vira texto livre aqui — o lookup de dado de referência
//    (GET /api/ReferenceData/{tabela}) continua [Authorize] de propósito; abrir isso
//    pra qualquer visitante do link deixaria enumerar todo o cadastro de alunos/
//    turmas/usuários da escola sem login nenhum. Um respondente externo digitando o
//    nome à mão é seguro e, na prática, é como ele preencheria de qualquer jeito.
// 2. Sem redirecionamento pós-envio (não existe tela de respostas pra um visitante) —
//    mostra uma confirmação inline.

function isVisible(field: PublicFormFieldDto, answers: Record<string, string>): boolean {
  const config = decodeFieldConfig(field.config);
  if (!config.visibleIf) return true;
  const target = answers[config.visibleIf.fieldId];
  const preenchido = !!target && target.trim() !== "";
  switch (config.visibleIf.operator) {
    case "filled":
      return preenchido;
    case "not_filled":
      return !preenchido;
    case "equals":
      return target === config.visibleIf.value;
    case "not_equals":
      return target !== config.visibleIf.value;
    default:
      return true;
  }
}

function FieldInput({
  field,
  token,
  value,
  onChange,
}: {
  field: PublicFormFieldDto;
  token: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const config = decodeFieldConfig(field.config);
  const uploadFile = useUploadPublicFormFile(token);
  const [uploadedName, setUploadedName] = useState<string | null>(null);

  switch (field.tipo) {
    case "texto_longo":
      return <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />;

    case "numero":
      return (
        <Input
          type="number"
          min={config.min}
          max={config.max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "data":
      return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />;

    case "sim_nao":
      return (
        <div className="flex gap-2">
          {["Sim", "Não"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                value === opt
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent/50"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      );

    case "selecao":
    case "dropdown": {
      const opcoes = decodeOpcoes(field.opcoes);
      if (field.tipo === "dropdown") {
        return (
          <Select value={value || undefined} onValueChange={(v) => v && onChange(String(v))}>
            <SelectTrigger className="w-full">
              <SelectValue>{() => value || "Selecione"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      return (
        <div className="flex flex-col gap-2">
          {opcoes.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                value === o
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent/50"
              )}
            >
              {o}
            </button>
          ))}
        </div>
      );
    }

    case "checkbox": {
      const opcoes = decodeOpcoes(field.opcoes);
      const selecionados = decodeOpcoes(value);
      return (
        <div className="flex flex-col gap-2">
          {opcoes.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selecionados.includes(o)}
                onCheckedChange={(checked) => {
                  const next = checked ? [...selecionados, o] : selecionados.filter((s) => s !== o);
                  onChange(encodeOpcoes(next) ?? "");
                }}
              />
              {o}
            </label>
          ))}
        </div>
      );
    }

    case "avaliacao": {
      const max = config.maxEstrelas ?? 5;
      return (
        <div className="flex gap-1.5">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                Number(value) >= n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent/50"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    case "anexo":
      return (
        <div className="flex flex-col gap-1.5">
          <input
            type="file"
            className="text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const url = await uploadFile.mutateAsync(file);
                onChange(url);
                setUploadedName(file.name);
                toast.success("Arquivo enviado.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Erro ao enviar arquivo.");
              }
            }}
          />
          {value && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="size-3" /> {uploadedName ?? "Arquivo enviado"}
            </p>
          )}
          {uploadFile.isPending && <p className="text-xs text-muted-foreground">Enviando...</p>}
        </div>
      );

    // "referencia" cai aqui de propósito — ver comentário no topo do arquivo.
    case "texto_curto":
    case "referencia":
    default:
      return (
        <Input
          value={value}
          maxLength={config.maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export default function PublicFormFillPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data: form, isLoading, isError } = usePublicForm(token);
  const submitForm = useSubmitPublicForm(token);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [nomeReferencia, setNomeReferencia] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [enviado, setEnviado] = useState(false);

  const campos = [...(form?.campos ?? [])].sort((a, b) => a.ordem - b.ordem);
  const camposVisiveis = campos.filter((c) => isVisible(c, answers));

  async function handleSubmit() {
    try {
      await submitForm.mutateAsync({
        nomeReferencia: nomeReferencia.trim() || null,
        observacoes: observacoes.trim() || null,
        itens: camposVisiveis.map((c) => ({ fieldId: c.id, valor: answers[c.id] ?? null })),
      });
      setEnviado(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar resposta.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-2xl">
        <p className="mb-4 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
          EducaPilot
        </p>

        {isLoading && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {!isLoading && (isError || !form) && (
          <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-6 text-center text-sm text-destructive-soft-foreground">
            Este link não é válido ou o formulário foi removido.
          </div>
        )}

        {!isLoading && form && form.status !== "Ativo" && (
          <div className="rounded-lg border border-warning-border bg-warning-soft px-4 py-6 text-center text-sm text-warning-soft-foreground">
            Este formulário não está aberto para respostas no momento.
          </div>
        )}

        {!isLoading && form && form.status === "Ativo" && enviado && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-4 py-10 text-center">
            <CheckCircle2 className="size-10 text-success-soft-foreground" />
            <p className="font-heading text-lg font-bold">Resposta enviada!</p>
            <p className="text-sm text-muted-foreground">Obrigado por preencher.</p>
          </div>
        )}

        {!isLoading && form && form.status === "Ativo" && !enviado && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h1 className="font-heading text-xl font-bold">{form.nome}</h1>
              {form.descricao && <p className="text-sm text-muted-foreground">{form.descricao}</p>}
            </div>

            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Seu nome (opcional)</Label>
                <Input value={nomeReferencia} onChange={(e) => setNomeReferencia(e.target.value)} />
              </div>

              {camposVisiveis.map((field) => (
                <div key={field.id} className="flex flex-col gap-[5px]">
                  <Label className="text-sm">
                    {field.label}
                    {field.obrigatorio && <span className="text-destructive"> *</span>}
                  </Label>
                  <FieldInput
                    field={field}
                    token={token}
                    value={answers[field.id] ?? ""}
                    onChange={(v) => setAnswers((a) => ({ ...a, [field.id]: v }))}
                  />
                </div>
              ))}

              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Observações (opcional)</Label>
                <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={submitForm.isPending}>
              {submitForm.isPending ? "Enviando..." : "Enviar resposta"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
