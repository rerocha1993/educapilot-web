"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAlterarSenha, TAMANHO_MINIMO_DA_SENHA } from "@/lib/kernel/use-alterar-senha";

/**
 * Troca da própria senha, aberta pelo menu do usuário.
 *
 * Pede a senha atual (o servidor exige) e a nova duas vezes. A repetição fica só aqui: ela pega
 * erro de digitação, e o servidor não tem como saber o que a pessoa quis digitar.
 */
export function AlterarSenhaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const alterar = useAlterarSenha();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  // Senha não pode ficar nos campos depois de fechar: quem abrir o diálogo de novo, no mesmo
  // computador, veria a anterior preenchida.
  function fechar() {
    setAtual("");
    setNova("");
    setConfirmacao("");
    onOpenChange(false);
  }

  const curta = nova.length > 0 && nova.length < TAMANHO_MINIMO_DA_SENHA;
  const naoConfere = confirmacao.length > 0 && confirmacao !== nova;
  const podeEnviar =
    atual.length > 0 &&
    nova.length >= TAMANHO_MINIMO_DA_SENHA &&
    confirmacao === nova &&
    !alterar.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;
    try {
      await alterar.mutateAsync({ senhaAtual: atual, novaSenha: nova });
      toast.success("Senha alterada. Use a nova no próximo login.");
      fechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar a senha.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(aberto) => (aberto ? onOpenChange(true) : fechar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar senha</DialogTitle>
          <DialogDescription>
            Confirme a senha atual e escolha uma nova com pelo menos {TAMANHO_MINIMO_DA_SENHA}{" "}
            caracteres.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha-atual">Senha atual</Label>
            <Input
              id="senha-atual"
              type="password"
              autoComplete="current-password"
              value={atual}
              onChange={(e) => setAtual(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha-nova">Nova senha</Label>
            <Input
              id="senha-nova"
              type="password"
              autoComplete="new-password"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
            />
            {curta && (
              <p className="text-xs text-destructive">
                Faltam {TAMANHO_MINIMO_DA_SENHA - nova.length} caractere(s).
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha-confirmacao">Repita a nova senha</Label>
            <Input
              id="senha-confirmacao"
              type="password"
              autoComplete="new-password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
            {naoConfere && <p className="text-xs text-destructive">As duas não são iguais.</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!podeEnviar}>
              {alterar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
