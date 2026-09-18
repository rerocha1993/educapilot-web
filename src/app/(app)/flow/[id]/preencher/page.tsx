"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
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
import { useForm, type FormFieldDto } from "@/lib/flow/use-forms";
import { decodeFieldConfig, decodeOpcoes, encodeOpcoes } from "@/lib/flow/use-form-fields";
import { ContractField } from "@/components/flow/contract-field";
import { CepInput } from "@/components/flow/cep-input";
import { valorDaParte, type EnderecoCep } from "@/lib/flow/cep";
import { useReferenceOptions } from "@/lib/flow/use-reference-data";
import { useSubmitForm, useUploadFormFile } from "@/lib/flow/use-form-fill";

// Novo (2026-08): item 2 do gap analysis de Formulários — até este ponto não existia
// NENHUMA tela de preenchimento, nem pra staff nem pra ninguém (FormResponsesController/
// FormResponseItemsController só tinham CRUD [Authorize], sem UI nenhuma na frente).
// Decisão deliberada de escopo: preenchimento por usuário autenticado (staff), não
// anônimo/público — ver comentário em FormResponsesController.Submit.

/** Rótulo de campo do guia: maiúsculas pequenas, bold, muito espaçadas. */
const rotulo = "text-[11px] font-bold uppercase tracking-[.1em] text-muted-foreground";

function isVisible(field: FormFieldDto, answers: Record<string, string>): boolean {
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
  value,
  onChange,
  valoresPorRotulo,
  onEndereco,
}: {
  field: FormFieldDto;
  value: string;
  onChange: (v: string) => void;
  /** Recebe o endereco achado pelo CEP, para preencher os campos marcados. */
  onEndereco?: (endereco: EnderecoCep) => void;
  /** Rotulo -> resposta, para o contrato resolver os marcadores {{campo}}. */
  valoresPorRotulo?: Record<string, string>;
}) {
  const config = decodeFieldConfig(field.config);
  const uploadFile = useUploadFormFile(field.formId);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  // Hook sempre chamado (nunca dentro do switch abaixo) pra não violar Rules of
  // Hooks — só busca de fato quando o tipo é "referencia" (enabled: !!tabela em
  // useReferenceOptions faz o resto).
  const referenceOptions = useReferenceOptions(
    field.tipo === "referencia" ? config.tabelaReferencia : undefined
  );

  switch (field.tipo) {
    case "texto_longo":
      return <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} />;

    case "numero":
      return (
        <Input
          type="number"
          min={config.min}
          max={config.max}
          className="font-mono tabular-nums"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "data":
      return (
        <Input
          type="date"
          className="font-mono tabular-nums"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "sim_nao":
      return (
        <div className="flex gap-2">
          {["Sim", "Não"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-3 text-sm font-medium transition-colors md:py-2",
                value === opt
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-card hover:bg-muted"
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
                "rounded-lg border px-3 py-3 text-left text-sm break-words transition-colors md:py-2",
                value === o
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-card hover:bg-muted"
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
            <label key={o} className="flex min-h-11 items-center gap-3 text-sm md:min-h-0 md:gap-2">
              <Checkbox
                checked={selecionados.includes(o)}
                onCheckedChange={(checked) => {
                  const next = checked ? [...selecionados, o] : selecionados.filter((s) => s !== o);
                  onChange(encodeOpcoes(next) ?? "");
                }}
              />
              <span className="min-w-0 break-words">{o}</span>
            </label>
          ))}
        </div>
      );
    }

    case "avaliacao": {
      const max = config.maxEstrelas ?? 5;
      return (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className={cn(
                "flex size-10 items-center justify-center rounded-full border font-mono text-sm tabular-nums transition-colors md:size-9",
                Number(value) >= n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-card hover:bg-muted"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    case "referencia": {
      const options = referenceOptions.data;
      return (
        <Select value={value || undefined} onValueChange={(v) => v && onChange(String(v))}>
          <SelectTrigger className="w-full">
            <SelectValue>{() => options?.find((o) => o.id === value)?.label ?? "Selecione"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options?.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Mesmo renderizador da tela publica: o tipo existia no construtor e no backend, mas
    // nenhuma tela de preenchimento sabia desenha-lo. Ver contract-field.tsx.
    case "cep":
      return (
        <CepInput
          value={value}
          onChange={onChange}
          onEndereco={(endereco) => onEndereco?.(endereco)}
        />
      );

    case "contrato":
      return (
        <ContractField
          titulo={config.titulo}
          texto={config.contratoTexto ?? ""}
          valoresPorRotulo={valoresPorRotulo ?? {}}
          aceito={value.toLowerCase() === "aceito"}
          onAceitar={(aceito) => onChange(aceito ? "aceito" : "")}
        />
      );

    case "anexo":
      return (
        <div className="flex flex-col gap-1.5">
          {/* Botao de verdade em vez do <input type=file> cru, que so mostrava o texto do
              navegador e nao parecia clicavel. */}
          <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-card px-3 py-3 text-sm font-medium transition-colors hover:bg-muted md:w-fit md:justify-start md:py-2">
            <Paperclip className="size-4" />
            {uploadFile.isPending
              ? "Enviando..."
              : value
                ? "Trocar arquivo"
                : "Escolher arquivo"}
          <input
            type="file"
            className="sr-only"
            disabled={uploadFile.isPending}
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
          </label>
          {value && (
            <p className="flex min-w-0 items-center gap-1 text-xs break-all text-muted-foreground">
              <Paperclip className="size-3 shrink-0" /> {uploadedName ?? "Arquivo enviado"}
            </p>
          )}
        </div>
      );

    case "texto_curto":
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

export default function FormFillPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const formId = params.id;

  const { data: form, isLoading, isError } = useForm(formId);
  const submitForm = useSubmitForm(formId);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [nomeReferencia, setNomeReferencia] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const campos = [...(form?.campos ?? [])]
    .filter((c) => c.ativo)
    .sort((a, b) => a.ordem - b.ordem);
  const camposVisiveis = campos.filter((c) => isVisible(c, answers));

  // Rotulo -> resposta, para o contrato resolver os marcadores {{campo}} igual ao backend faz
  // ao gerar o PDF: quem le na tela ve o texto que sera assinado.
  // Mesma logica da tela publica: espalha o endereco do CEP nos campos marcados.
  function aplicarEndereco(endereco: EnderecoCep) {
    setAnswers((atuais) => {
      const proximos = { ...atuais };

      for (const campo of campos) {
        const parte = decodeFieldConfig(campo.config).preenchidoPeloCep;
        if (!parte) continue;

        const valor = valorDaParte(parte, endereco);
        if (valor) proximos[campo.id] = valor;
      }

      return proximos;
    });
  }

  const valoresPorRotulo = Object.fromEntries(
    campos.map((c) => [c.label, answers[c.id] ?? ""])
  );

  async function handleSubmit() {
    try {
      await submitForm.mutateAsync({
        nomeReferencia: nomeReferencia.trim() || null,
        observacoes: observacoes.trim() || null,
        itens: camposVisiveis.map((c) => ({ fieldId: c.id, valor: answers[c.id] ?? null })),
      });
      toast.success("Resposta enviada com sucesso.");
      router.push(`/flow/${formId}/respostas`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar resposta.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-full max-w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="rounded-xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
        Não foi possível carregar o formulário.
      </div>
    );
  }

  if (form.status !== "Ativo") {
    return (
      <div className="flex flex-col gap-4">
        <Link href={`/flow/${formId}`} className="text-xs text-muted-foreground hover:underline">
          ← {form.nome}
        </Link>
        <div className="rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
          Este formulário está em {form.status.toLowerCase()} e não está aberto para
          respostas. Publique-o na tela do formulário pra habilitar o preenchimento.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <Link href={`/flow/${formId}`} className="text-xs text-muted-foreground hover:underline">
          ← {form.nome}
        </Link>
        <h1 className="font-heading text-[clamp(24px,3vw,32px)] font-semibold tracking-[-.03em] break-words">
          {form.nome}
        </h1>
        {form.descricao && (
          <p className="mt-1 text-sm break-words text-muted-foreground">{form.descricao}</p>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-1.5">
          <Label className={rotulo}>Nome/Referência (opcional)</Label>
          <Input value={nomeReferencia} onChange={(e) => setNomeReferencia(e.target.value)} />
        </div>

        {camposVisiveis.length === 0 && (
          <p className="text-sm text-muted-foreground">Este formulário ainda não tem campos.</p>
        )}

        {camposVisiveis.map((field) => (
          <div key={field.id} className="flex flex-col gap-1.5">
            <Label className="block text-sm leading-snug font-medium break-words md:flex md:leading-none">
              {field.label}
              {/* Laranja: marca o que ainda falta decidir, não é erro. */}
              {field.obrigatorio && <span className="text-action"> *</span>}
            </Label>
            <FieldInput
              field={field}
              value={answers[field.id] ?? ""}
              onChange={(v) => setAnswers((a) => ({ ...a, [field.id]: v }))}
              valoresPorRotulo={valoresPorRotulo}
              onEndereco={aplicarEndereco}
            />
          </div>
        ))}

        <div className="flex flex-col gap-1.5">
          <Label className={rotulo}>Observações (opcional)</Label>
          <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
        </div>
      </div>

      <Button
        variant="action"
        onClick={handleSubmit}
        disabled={submitForm.isPending || camposVisiveis.length === 0}
        className="h-12 w-full text-base md:h-10 md:text-sm"
      >
        {submitForm.isPending ? "Enviando..." : "Enviar resposta"}
      </Button>
    </div>
  );
}
