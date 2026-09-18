"use client";

import { toast } from "sonner";
import { UserSearch } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { decodeFormConfig, encodeFormConfig } from "@/lib/flow/form-config";
import { useUpdateForm, type FormDto } from "@/lib/flow/use-forms";
import { decodeFieldConfig } from "@/lib/flow/use-form-fields";

/**
 * Regra de identificação, na aba Automações.
 *
 * Sem ela, o formulário público mostrava o bloco de busca no topo e o resto dos campos logo
 * abaixo, já preenchíveis. Duas coisas ruins saem disso: quem começa a digitar antes de buscar tem
 * tudo sobrescrito quando a busca acha o aluno, e a identificação vira opcional na prática — basta
 * rolar a página e ignorar.
 */
export function IdentificationRulePanel({ form }: { form: FormDto }) {
  const updateForm = useUpdateForm();

  const config = decodeFormConfig(form.config);

  // Sem campo de preenchimento automático não existe o que buscar, e a regra não teria efeito
  // nenhum — mostrar um interruptor inerte só confunde.
  const temAutoPreenchimento = (form.campos ?? []).some(
    (c) => !!decodeFieldConfig(c.config).autoPreenchimento
  );

  if (!temAutoPreenchimento) return null;

  async function salvar(mudanca: Partial<ReturnType<typeof decodeFormConfig>>) {
    try {
      const novo = encodeFormConfig({ ...config, ...mudanca });
      await updateForm.mutateAsync({ ...form, config: novo });
      toast.success("Regra atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a regra.");
    }
  }

  const exigir = !!config.exigirIdentificacao;

  // Ausente significa permitido: a regra nasceu depois dos formulários, e o padrão tem que ser o
  // que não tranca ninguém do lado de fora.
  const permitirSemEncontrar = config.permitirSemEncontrar !== false;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <UserSearch className="size-4 shrink-0 text-primary" />
        <h3 className="font-heading text-sm font-semibold">Identificação antes de preencher</h3>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label className="text-sm">Só mostrar o formulário depois de encontrar o aluno</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A família vê apenas a busca. Os campos aparecem preenchidos quando o aluno é
              localizado.
            </p>
          </div>
          <Switch
            checked={exigir}
            disabled={updateForm.isPending}
            onCheckedChange={(v) => salvar({ exigirIdentificacao: v })}
          />
        </div>

        {exigir && (
          <div className="flex items-start justify-between gap-4 border-t border-border pt-3">
            <div className="min-w-0">
              <Label className="text-sm">Deixar preencher mesmo sem encontrar</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Recomendado. Nome com grafia diferente da matrícula ou data digitada errada
                acontecem; desligado, essas famílias não conseguem enviar nada e você descobre pelo
                telefone.
              </p>
            </div>
            <Switch
              checked={permitirSemEncontrar}
              disabled={updateForm.isPending}
              onCheckedChange={(v) => salvar({ permitirSemEncontrar: v })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
