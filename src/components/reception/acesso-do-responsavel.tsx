"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAcessoResponsavel, useGerarLinkDeAcesso } from "@/lib/reception/use-acesso-responsavel";

/**
 * Libera o site do responsável: gera o link para ele criar a senha.
 *
 * O link aparece na tela além de ir por e-mail porque muita escola não tem e-mail configurado, e
 * WhatsApp é por onde o recado chega de verdade.
 */
export function AcessoDoResponsavel({ guardianId }: { guardianId: string }) {
  const { data: acesso, isLoading, isError } = useAcessoResponsavel(guardianId);
  const gerar = useGerarLinkDeAcesso(guardianId);
  const gerado = gerar.data;

  async function gerarLink() {
    try {
      await gerar.mutateAsync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar o link.");
    }
  }

  async function copiar(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 md:flex-nowrap">
        <p className="text-sm font-medium">Acesso ao site do responsável</p>
        {acesso && <BadgeAcesso temAcesso={acesso.temAcesso} senhaDefinida={acesso.senhaDefinida} />}
      </div>

      {isLoading && <Skeleton className="h-8 w-full" />}
      {isError && <p className="text-sm text-destructive">Não foi possível consultar o acesso.</p>}

      {acesso && (
        <>
          <p className="text-xs text-muted-foreground">
            Pelo site, o responsável vê a chegada e a saída dos filhos e avisa a portaria quando está a caminho.
          </p>

          {!acesso.email && (
            <p className="text-xs text-warning-soft-foreground">
              Cadastre um e-mail para este responsável: é com ele que o responsável entra no site.
            </p>
          )}

          <Button
            size="sm"
            variant={acesso.temAcesso ? "outline" : "default"}
            className="self-start"
            onClick={gerarLink}
            disabled={gerar.isPending || !acesso.email}
          >
            {gerar.isPending ? "Gerando..." : acesso.temAcesso ? "Gerar novo link" : "Gerar link de acesso"}
          </Button>

          {gerado?.link && (
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-2">
                <Input readOnly value={gerado.link} onFocus={(e) => e.currentTarget.select()} className="text-xs" />
                <Button size="sm" variant="outline" onClick={() => copiar(gerado.link!)}>
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {gerado.emailEnviado
                  ? `Enviamos o link para ${gerado.email}.`
                  : "Não foi possível enviar por e-mail: copie e mande por WhatsApp."}{" "}
                O link vale 7 dias; gerar um novo invalida o anterior.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BadgeAcesso({ temAcesso, senhaDefinida }: { temAcesso: boolean; senhaDefinida: boolean }) {
  if (senhaDefinida) return <Badge className="bg-success-soft text-success-soft-foreground">Acesso ativo</Badge>;
  if (temAcesso) return <Badge className="bg-warning-soft text-warning-soft-foreground">Aguardando criar senha</Badge>;
  return <Badge variant="secondary">Sem acesso</Badge>;
}
