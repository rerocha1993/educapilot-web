"use client";

import { toast } from "sonner";
import { FileSignature } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  decodeFieldConfig,
  encodeFieldConfig,
  useUpdateFormField,
} from "@/lib/flow/use-form-fields";
import type { FormFieldDto } from "@/lib/flow/use-forms";

// Regras do contrato dentro de Automações (2026-09).
//
// Estas escolhas — de qual campo sai o nome, o e-mail e o CPF de quem assina — já eram editáveis,
// mas só abrindo o campo do contrato. Ficavam invisíveis: quem olha um formulário pronto não tem
// como saber por que o contrato foi para um endereço e não para outro.
//
// Gravam no MESMO lugar (Config do campo do tipo "contrato"), não numa cópia. Duas telas para o
// mesmo dado é aceitável; dois lugares guardando o mesmo dado, não — uma hora divergem e ninguém
// sabe qual vale.

const PAPEIS = [
  {
    chave: "signatarioNomeFieldId",
    titulo: "Nome de quem assina",
    ajuda: "Aparece como signatário no documento.",
  },
  {
    chave: "signatarioEmailFieldId",
    titulo: "E-mail que recebe o contrato",
    ajuda: "Para onde vai o link de assinatura e, depois da aprovação, a via assinada.",
  },
  {
    chave: "signatarioCpfFieldId",
    titulo: "CPF de quem assina",
    ajuda: "Registrado na trilha de auditoria da assinatura.",
  },
] as const;

export function ContractRulesPanel({
  formId,
  campos,
}: {
  formId: string;
  campos: FormFieldDto[];
}) {
  const updateField = useUpdateFormField(formId);

  const campoContrato = campos.find((c) => c.tipo === "contrato");

  // Formulário sem contrato não tem o que configurar aqui, e um painel vazio só ocuparia espaço.
  if (!campoContrato) return null;

  const config = decodeFieldConfig(campoContrato.config);

  async function salvar(chave: string, fieldId: string | null) {
    if (!campoContrato) return;
    try {
      const atual = decodeFieldConfig(campoContrato.config);
      const novo = encodeFieldConfig({ ...atual, [chave]: fieldId ?? undefined });

      await updateField.mutateAsync({ ...campoContrato, config: novo });
      toast.success("Regra do contrato atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a regra.");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <FileSignature className="size-4 shrink-0 text-primary" />
        <h3 className="font-heading text-sm font-semibold">Contrato · quem assina</h3>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        De quais campos do formulário saem os dados do signatário. Vale para{" "}
        <strong>{campoContrato.label}</strong>.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {PAPEIS.map((papel) => {
          const atual = config[papel.chave] as string | undefined;
          const campoEscolhido = campos.find((c) => c.id === atual);

          return (
            <div key={papel.chave} className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">{papel.titulo}</Label>

              <Select
                value={atual || "__none__"}
                onValueChange={(v) => v && salvar(papel.chave, v === "__none__" ? null : String(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{() => campoEscolhido?.label ?? "Não definido"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não definido</SelectItem>
                  {campos
                    .filter((c) => c.tipo !== "contrato")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">{papel.ajuda}</p>

              {/* Sem e-mail o contrato é gerado e não sai do lugar — é a falha mais cara aqui,
                  porque só aparece quando a família reclama que não recebeu. */}
              {!atual && papel.chave === "signatarioEmailFieldId" && (
                <p className="rounded-md border border-warning-border bg-warning-soft px-2 py-1 text-xs text-warning-soft-foreground">
                  Sem este campo definido, ninguém recebe o contrato para assinar.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
