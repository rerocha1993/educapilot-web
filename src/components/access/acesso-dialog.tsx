"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SeletorDeAcesso } from "@/components/access/seletor-de-acesso";
import {
  useAcessoDoUsuario,
  useSalvarAcesso,
  type AcessoDoUsuario,
} from "@/lib/access/use-acessos";

/**
 * Edita o acesso de quem já está no sistema.
 *
 * Mesmo seletor do convite, de propósito: o que se decide é idêntico, e telas separadas
 * divergiriam — "convidei com um acesso e ficou outro".
 */
export function AcessoDialog({
  userId,
  userName,
  onClose,
}: {
  userId: string | null;
  userName?: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useAcessoDoUsuario(userId ?? undefined);
  const salvar = useSalvarAcesso();

  // null = ainda não mexeram; o valor exibido é derivado do servidor. Quem usa este diálogo passa
  // key={userId}, então trocar de usuário remonta e zera sozinho.
  const [editado, setEditado] = useState<AcessoDoUsuario | null>(null);
  const valor = editado ?? data ?? { userType: "Teacher", modulos: [], classIds: [] };

  async function handleSalvar() {
    if (!userId) return;
    try {
      await salvar.mutateAsync({ userId, acesso: valor });
      toast.success("Acesso atualizado.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o acesso.");
    }
  }

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="break-words">Acesso de {userName ?? "usuário"}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <SeletorDeAcesso valor={valor} onChange={setEditado} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending || isLoading}>
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
