"use client";

import { SignaturePad } from "@/components/flow/signature-pad";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import {
  useContractSettings,
  useSaveContractSettings,
  type ContractSettings,
  useUploadAssinaturaEscola,
} from "@/lib/flow/use-contract-settings";

// Configuração de contratos (2026-09). O percentual de reajuste morava só no banco, sem tela
// nenhuma: ficava sempre em 0, e a rematrícula oferecia à família o mesmo valor do ano corrente.

export default function ConfiguracaoContratosPage() {
  const { data, isLoading, isError } = useContractSettings();
  const salvar = useSaveContractSettings();
  const enviarAssinatura = useUploadAssinaturaEscola();

  // null = ainda não mexeram; o formulário exibe o que veio do servidor.
  const [edicao, setEdicao] = useState<ContractSettings | null>(null);
  const form = edicao ?? data;

  function alterar(campos: Partial<ContractSettings>) {
    if (!form) return;
    setEdicao({ ...form, ...campos });
  }

  async function handleSalvar() {
    if (!form) return;
    try {
      await salvar.mutateAsync(form);
      setEdicao(null);
      toast.success("Configuração salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <CabecalhoDaPagina
        eyebrow="← Contratos"
        eyebrowHref="/admin/contratos"
        titulo="Configuração de contratos"
        apoio="Vale para todos os contratos gerados pelos formulários da escola."
      />

      {isLoading && <Skeleton className="h-64 w-full" />}

      {isError && (
        <p className="rounded-xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar a configuração. Recarregue a página.
        </p>
      )}

      {form && (
        <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-[5px]">
            <Label className="text-sm">Reajuste da rematrícula (%)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={String(form.percentualReajuste ?? 0)}
              onChange={(e) => alterar({ percentualReajuste: Number(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              Aplicado sobre a mensalidade atual de cada aluno para calcular o valor do próximo ano.
              Aluno com valor negociado (irmão, bolsa, acordo) tem o valor dele registrado na
              mensalidade e não recebe este percentual.
            </p>
          </div>

          <div className="flex flex-col gap-[5px]">
            <Label className="text-sm">Prazo para assinar (dias)</Label>
            <Input
              type="number"
              min={1}
              value={form.prazoAssinaturaDias == null ? "" : String(form.prazoAssinaturaDias)}
              placeholder="Sem prazo"
              onChange={(e) =>
                alterar({
                  prazoAssinaturaDias: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label className="text-sm">Exigir contra-assinatura</Label>
              <p className="text-xs text-muted-foreground">
                Alguém da escola também assina eletronicamente cada contrato. Dobra o custo por
                documento.
              </p>
            </div>
            <Switch
              checked={form.exigirContraAssinatura}
              onCheckedChange={(v) => alterar({ exigirContraAssinatura: v })}
            />
          </div>

          {/* Fora da condicional de propósito: este nome vale também para o carimbo na via da
              família, que acontece mesmo sem contra-assinatura no provedor. */}
          <div className="flex flex-col gap-[5px]">
            <Label className="text-sm">Nome de quem assina pela escola</Label>
            <Input
              value={form.nomeSignatarioEscola ?? ""}
              onChange={(e) => alterar({ nomeSignatarioEscola: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-[5px] rounded-md border border-dashed border-border p-3">
            <Label className="text-sm">Assinatura da escola</Label>
            <p className="text-xs text-muted-foreground">
              Imagem PNG ou JPG. É ela que é carimbada na via que a família recebe por e-mail
              depois da aprovação. Sem ela, o documento sai assinado só pela família.
            </p>

            {data?.temAssinaturaEscola && (
              <p className="text-xs text-success-soft-foreground">Assinatura cadastrada.</p>
            )}

            {/* Desenhar vem primeiro porque e o que produz um resultado bom: foto de papel entra
                com fundo cinza e mancha de luz sobre o texto do contrato. O upload fica como
                alternativa para quem ja tem a assinatura em PNG limpo. */}
            <SignaturePad
              enviando={enviarAssinatura.isPending}
              onConfirmar={async (arquivo) => {
                try {
                  await enviarAssinatura.mutateAsync(arquivo);
                  toast.success("Assinatura da escola salva.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
                }
              }}
            />

            <p className="mt-1 text-xs text-muted-foreground">ou envie um arquivo pronto:</p>

            <label className="mt-1 inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent/50">
              {enviarAssinatura.isPending
                ? "Enviando..."
                : data?.temAssinaturaEscola
                  ? "Trocar assinatura"
                  : "Escolher imagem"}
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                disabled={enviarAssinatura.isPending}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    await enviarAssinatura.mutateAsync(file);
                    toast.success("Assinatura da escola salva.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Erro ao enviar.");
                  }
                }}
              />
            </label>
          </div>

          {form.exigirContraAssinatura && (
            <>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-sm">E-mail de quem assina pela escola</Label>
                <Input
                  type="email"
                  value={form.emailSignatarioEscola ?? ""}
                  onChange={(e) => alterar({ emailSignatarioEscola: e.target.value })}
                />
              </div>
            </>
          )}

          <Button variant="action" onClick={handleSalvar} disabled={salvar.isPending || !edicao}>
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      )}
    </div>
  );
}
