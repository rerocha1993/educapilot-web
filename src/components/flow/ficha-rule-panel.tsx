"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  decodeFormConfig,
  encodeFormConfig,
  LIMITE_DO_TITULO_DA_SECAO,
  type FichaDoFormulario,
  type QuemVeOFormularioDaFicha,
} from "@/lib/flow/form-config";
import { useUpdateForm, type FormDto } from "@/lib/flow/use-forms";

const QUEM_VE: { valor: QuemVeOFormularioDaFicha; titulo: string; texto: string }[] = [
  {
    valor: "Gestao",
    titulo: "Só a gestão",
    texto: "Quem tem acesso à ficha e não é professor. Indicado para dados de saúde.",
  },
  {
    valor: "GestaoEProfessores",
    titulo: "Gestão e professoras",
    texto: "Também as professoras das turmas do aluno.",
  },
];

/**
 * Caixa "Mostrar na ficha do aluno", na aba Automações do construtor.
 *
 * Ligada, a última resposta de cada aluno vira uma seção da ficha (ex.: "Anamnese") e as anteriores
 * ficam no histórico. Quem vê é definido aqui, em cada formulário, e o servidor é quem filtra.
 */
export function FichaRulePanel({ form }: { form: FormDto }) {
  const updateForm = useUpdateForm();
  const config = decodeFormConfig(form.config);
  const ficha = config.ficha;
  const ligado = !!ficha?.mostrar;

  const secaoSalva = ficha?.secao ?? "";
  const [secao, setSecao] = useState(secaoSalva || form.nome.slice(0, LIMITE_DO_TITULO_DA_SECAO));
  const secaoLimpa = secao.trim();
  const mudouASecao = ligado && secaoLimpa !== secaoSalva;

  async function salvar(nova: FichaDoFormulario, aviso: string) {
    try {
      await updateForm.mutateAsync({ ...form, config: encodeFormConfig({ ...config, ficha: nova }) });
      toast.success(aviso);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a regra.");
    }
  }

  function ligar(v: boolean) {
    if (v && !secaoLimpa) {
      toast.error("Escreva o título da seção antes de ligar.");
      return;
    }
    void salvar(
      { mostrar: v, secao: secaoLimpa, quemVe: ficha?.quemVe ?? "Gestao" },
      v ? "Formulário vinculado à ficha do aluno." : "Formulário fora da ficha do aluno."
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-4 shrink-0 text-primary" />
        <h3 className="font-heading text-sm font-semibold">Ficha do aluno</h3>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label className="text-sm">Mostrar na ficha do aluno</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A resposta mais recente de cada aluno aparece como uma seção da ficha, com as anteriores logo abaixo.
              Quem preenche precisa dizer de qual aluno é a resposta.
            </p>
          </div>
          <Switch checked={ligado} disabled={updateForm.isPending} onCheckedChange={ligar} aria-label="Mostrar na ficha do aluno" />
        </div>

        {ligado && (
          <>
            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <Label className="text-sm" htmlFor="ficha-secao">
                Título da seção na ficha
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="ficha-secao"
                  value={secao}
                  maxLength={LIMITE_DO_TITULO_DA_SECAO}
                  onChange={(e) => setSecao(e.target.value)}
                  placeholder="Ex.: Anamnese"
                  className="sm:max-w-xs"
                />
                <Button
                  variant="outline"
                  disabled={!mudouASecao || !secaoLimpa || updateForm.isPending}
                  onClick={() => void salvar({ mostrar: true, secao: secaoLimpa, quemVe: ficha?.quemVe ?? "Gestao" }, "Título salvo.")}
                >
                  Salvar título
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Até {LIMITE_DO_TITULO_DA_SECAO} caracteres ({secao.length}/{LIMITE_DO_TITULO_DA_SECAO}).
              </p>
            </div>

            <fieldset className="flex flex-col gap-2 border-t border-border pt-3">
              <legend className="mb-1 text-sm font-medium">Quem vê esta seção</legend>
              <div className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
                {QUEM_VE.map((o) => {
                  const marcado = (ficha?.quemVe ?? "Gestao") === o.valor;
                  return (
                    <button
                      key={o.valor}
                      type="button"
                      role="radio"
                      aria-checked={marcado}
                      disabled={updateForm.isPending}
                      onClick={() => {
                        if (!marcado) void salvar({ mostrar: true, secao: secaoSalva, quemVe: o.valor }, "Quem vê foi atualizado.");
                      }}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-colors",
                        marcado ? "border-primary bg-primary/10" : "border-input bg-card hover:bg-muted"
                      )}
                    >
                      <span className="block text-sm font-medium">{o.titulo}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{o.texto}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </>
        )}
      </div>
    </div>
  );
}
