"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Campo } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { useCriarEstudo, useEstudos } from "@/lib/finance/use-precificacao";

/**
 * Novo estudo: o ano que se quer precificar (do corrente a dois anos adiante), um nome se a pessoa
 * quiser e, havendo um estudo de ano anterior, a opção de partir dele.
 *
 * `baseInicial` abre o diálogo já pedindo para partir de um estudo (o botão "Novo estudo a partir
 * deste"). O servidor recusa um segundo rascunho do mesmo ano; a mensagem dele vai para a tela.
 */
export function DialogNovoEstudo({
  baseInicial,
  anoInicial,
  onFechar,
}: {
  baseInicial?: string;
  anoInicial?: number;
  onFechar: () => void;
}) {
  const router = useRouter();
  const { data: estudos } = useEstudos();
  const criar = useCriarEstudo();

  const anoCorrente = Number(hojeIsoBrasilia().slice(0, 4));
  const anos = [anoCorrente, anoCorrente + 1, anoCorrente + 2];
  const [ano, setAno] = useState(anoInicial && anos.includes(anoInicial) ? anoInicial : anoCorrente + 1);
  const [nome, setNome] = useState("");
  // null = a pessoa ainda não mexeu: vale o padrão (partir do anterior, se houver).
  const [partir, setPartir] = useState<boolean | null>(baseInicial ? true : null);

  // O estudo mais recente de um ano anterior ao escolhido; o aprovado ganha do rascunho no mesmo ano.
  const anterior = baseInicial
    ? estudos?.find((e) => e.id === baseInicial)
    : [...(estudos ?? [])]
        .filter((e) => e.anoAlvo < ano)
        .sort((a, b) => b.anoAlvo - a.anoAlvo || (a.status === "Aprovado" ? -1 : 1))[0];
  const partirDoAnterior = !!anterior && (partir ?? true);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    try {
      const criado = await criar.mutateAsync({
        anoAlvo: ano,
        nome: nome.trim() || undefined,
        baseadoEmEstudoId: partirDoAnterior ? anterior?.id : undefined,
      });
      toast.success("Estudo criado.");
      onFechar();
      router.push(`/finance/precificacao/${criado.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível criar o estudo.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !criar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo estudo</DialogTitle>
          <DialogDescription>
            A base de custos é carregada das despesas do financeiro. Você ajusta cada passo depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={confirmar} className="grid gap-3.5">
          <Campo id="novo-ano" rotulo="Ano alvo" dica="O ano em que as mensalidades novas valem.">
            <Select value={String(ano)} onValueChange={(v) => v && setAno(Number(v))}>
              <SelectTrigger id="novo-ano" className="w-full">
                <SelectValue>{() => String(ano)}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {anos.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo id="novo-nome" rotulo="Nome (opcional)" dica={`Sem nome, vira "Estudo ${ano}".`}>
            <Input id="novo-nome" value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} />
          </Campo>

          {anterior && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm">
              <Checkbox
                checked={partirDoAnterior}
                onCheckedChange={(v) => setPartir(v === true)}
                className="mt-0.5"
              />
              <span className="grid gap-0.5">
                <span className="font-medium">Partir do estudo de {anterior.anoAlvo}</span>
                <span className="text-[13px] text-muted-foreground">
                  Usa as premissas e os ajustes de &ldquo;{anterior.nome}&rdquo; como ponto de partida.
                </span>
              </span>
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={criar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={criar.isPending}>
              {criar.isPending ? "Criando..." : "Criar estudo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
