"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LeadResumo } from "@/lib/matriculas/tipos";

/** O texto do modelo reativacao da biblioteca. Se a escola mudou o modelo na Meta, o que sai é o dela. */
function textoDoModelo(nomeResponsavel: string) {
  const primeiro = nomeResponsavel.trim().split(" ")[0] ?? "";
  return `Oi, ${primeiro}! Tudo bem? Conseguiu ver a minha mensagem aqui em cima?`;
}

/**
 * Confirma a reativação: o modelo que chama de novo a família que a equipe acha que vale, fora das 24
 * horas. Diz o que sai e o que o modelo não faz, porque é pago e não reabre a conversa sozinho.
 */
export function FolhaDeReativacao({
  lead,
  enviando,
  onConfirmar,
  onCancelar,
}: {
  lead: LeadResumo | null;
  enviando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Dialog open={!!lead} onOpenChange={(aberto) => !aberto && onCancelar()}>
      {lead && (
        <DialogContent className="gap-5 rounded-[28px] p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Reativar a conversa</DialogTitle>
            <DialogDescription>
              {lead.nomeResponsavel}
              {lead.nomeCrianca && ` · ${lead.nomeCrianca}`}. Sai o modelo aprovado:
            </DialogDescription>
          </DialogHeader>

          <p className="rounded-2xl rounded-tr-md bg-[#DCF7C5] px-3.5 py-2.5 text-[14px] leading-snug text-[#1F2A1A] dark:bg-[#1F3A2A] dark:text-[#E3F2E3]">
            {textoDoModelo(lead.nomeResponsavel)}
          </p>

          <p className="text-[13px] text-muted-foreground">
            A conversa só reabre quando a família responder. A mensagem de antes precisa fazer sentido sozinha, porque é
            ela que a família vai ler. Quem atende continua o mesmo.
          </p>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>
            <Button className="flex-1" disabled={enviando} onClick={onConfirmar}>
              {enviando ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
