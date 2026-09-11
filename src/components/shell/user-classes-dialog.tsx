"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useClasses } from "@/lib/kernel/use-classes";
import { useUserClasses, useSaveUserClasses } from "@/lib/kernel/use-users";

/**
 * Escolhe em quais turmas um usuário atua.
 *
 * Lista de marcação, e não uma turma só: a regra antiga (uma professora, uma turma) não
 * corresponde à escola real, em que a mesma professora atende Berçário II de manhã e Mini
 * Maternal à tarde. O modelo do banco (UserClass) sempre foi N:N — só faltava onde mexer.
 */
export function UserClassesDialog({
  userId,
  userName,
  onClose,
}: {
  userId: string | null;
  userName?: string;
  onClose: () => void;
}) {
  const { data: turmas = [], isLoading: carregandoTurmas } = useClasses();
  const { data: atuais, isLoading: carregandoAtuais } = useUserClasses(userId ?? undefined);
  const salvar = useSaveUserClasses();

  // null = ainda não mexeram; a seleção é derivada do que veio do servidor.
  //
  // Derivar em vez de copiar num useEffect: copiar dava uma janela em que a lista aparecia
  // vazia antes do efeito rodar, e exigia lembrar de zerar o estado ao trocar de usuário. Quem
  // usa este diálogo passa key={userId}, então trocar de usuário remonta e zera sozinho.
  const [editadas, setEditadas] = useState<number[] | null>(null);

  const selecionadas =
    editadas ??
    (atuais ?? []).map((t) => t.id).filter((id): id is number => typeof id === "number");

  async function handleSalvar() {
    if (!userId) return;
    try {
      await salvar.mutateAsync({ userId, classIds: selecionadas });
      toast.success("Turmas atualizadas.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar as turmas.");
    }
  }

  const carregando = carregandoTurmas || carregandoAtuais;

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Turmas de {userName ?? "usuário"}</DialogTitle>
        </DialogHeader>

        {carregando && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        )}

        {!carregando && turmas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada ainda.</p>
        )}

        {!carregando && turmas.length > 0 && (
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {turmas.map((turma) => {
              const id = turma.id as number;
              const marcada = selecionadas.includes(id);
              return (
                <label key={id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={marcada}
                    onCheckedChange={(checked) =>
                      setEditadas(
                        checked ? [...selecionadas, id] : selecionadas.filter((x) => x !== id)
                      )
                    }
                  />
                  {turma.className}
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending || carregando}>
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
