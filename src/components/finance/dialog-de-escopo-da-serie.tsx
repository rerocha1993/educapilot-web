"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EscopoDaSerie, ExpenseDto } from "@/lib/finance/use-expenses";

const TEXTOS = {
  editar: {
    titulo: "Editar só esta parcela ou as seguintes também?",
    esta: "Só esta",
    estaApoio: "Muda apenas esta parcela. As outras ficam como estão.",
    seguintes: "Esta e as seguintes",
    seguintesApoio:
      "Leva o nome, o valor, a categoria, a conta, o centro de custo e o fornecedor para as próximas parcelas que ainda não foram pagas. Os vencimentos e as parcelas pagas não mudam.",
  },
  excluir: {
    titulo: "Excluir só esta parcela ou as seguintes também?",
    esta: "Só esta",
    estaApoio: "Apaga apenas esta parcela. As outras continuam.",
    seguintes: "Esta e as seguintes",
    seguintesApoio: "Apaga esta e todas as próximas que ainda não foram pagas. As parcelas pagas ficam.",
  },
} as const;

/**
 * A pergunta de uma parcela de série: o que fazer só com ela, ou também com as seguintes.
 * Cada opção já executa a ação; fechar não faz nada.
 */
export function DialogDeEscopoDaSerie({
  acao,
  despesa,
  pendente,
  onEscolher,
  onFechar,
}: {
  acao: "editar" | "excluir";
  despesa: ExpenseDto;
  pendente: boolean;
  onEscolher: (escopo: EscopoDaSerie) => void;
  onFechar: () => void;
}) {
  const t = TEXTOS[acao];

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.titulo}</DialogTitle>
          <DialogDescription className="break-words">
            {despesa.nome} é a parcela {despesa.numeroDaParcela} de {despesa.totalDeParcelas} de uma despesa que se repete
            todo mês.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2.5">
          {(["esta", "seguintes"] as const).map((escopo) => (
            <Button
              key={escopo}
              type="button"
              variant="outline"
              disabled={pendente}
              onClick={() => onEscolher(escopo)}
              className="h-auto flex-col items-start gap-1 whitespace-normal px-3.5 py-3 text-left"
            >
              <span className="text-sm font-semibold">{t[escopo]}</span>
              <span className="text-xs font-normal text-muted-foreground">{t[`${escopo}Apoio`]}</span>
            </Button>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" disabled={pendente} onClick={onFechar}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
