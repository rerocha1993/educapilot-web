"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Link2Off, Plug, RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAlternarSincronizacao,
  useConectarConta,
  useConexoes,
  useDesconectarConta,
  useProvedoresDeExtrato,
  useSincronizarAgora,
} from "@/lib/finance/use-conexoes";
import type { SaldoDaConta } from "@/lib/finance/use-tesouraria";

function quando(iso?: string | null) {
  if (!iso) return "nunca";
  const data = new Date(iso);
  const dias = Math.floor((Date.now() - data.getTime()) / 86_400_000);
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

/**
 * Ligar uma conta a uma origem que entrega o extrato sozinha — fase 4.
 *
 * Fica junto das contas, e não numa tela própria, porque conexão não é um assunto: é um atributo
 * da conta. Quem abre Contas para ver o saldo é quem repara que uma delas ainda depende de alguém
 * lembrar de baixar o OFX.
 */
export function ConexoesDasContas({ contas }: { contas: SaldoDaConta[] }) {
  const { data: conexoes } = useConexoes();
  const { data: provedores } = useProvedoresDeExtrato();
  const conectar = useConectarConta();
  const desconectar = useDesconectarConta();
  const sincronizar = useSincronizarAgora();
  const alternar = useAlternarSincronizacao();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [contaId, setContaId] = useState("");
  const [provedor, setProvedor] = useState("");

  const ligadas = new Set((conexoes ?? []).map((c) => c.contaId));
  const semConexao = contas.filter((c) => c.ativa && !ligadas.has(c.id));
  const disponiveis = (provedores ?? []).filter((p) => p.disponivel);
  const indisponiveis = (provedores ?? []).filter((p) => !p.disponivel);

  async function confirmar() {
    if (!contaId || !provedor) {
      toast.error("Escolha a conta e a origem.");
      return;
    }
    try {
      await conectar.mutateAsync({ contaId, provedor });
      toast.success("Conta ligada. Use “Buscar agora” para trazer o extrato dos últimos dias.");
      setDialogAberto(false);
      setContaId("");
      setProvedor("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível ligar a conta.");
    }
  }

  async function buscar(id: string) {
    try {
      const r = await sincronizar.mutateAsync(id);
      toast.success(
        r.linhasNovas === 0
          ? "Nada novo no extrato."
          : `${r.linhasNovas} linha(s) nova(s)${r.conciliadasSozinhas > 0 ? `, ${r.conciliadasSozinhas} conciliadas sozinhas` : ""}.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível buscar o extrato.");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-[15.5px] font-semibold">Extrato automático</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Conta ligada a uma origem recebe o extrato sozinha, todo dia de madrugada. Sem ligar,
            alguém precisa baixar o OFX e subir na conciliação.
          </p>
        </div>
        {semConexao.length > 0 && disponiveis.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setDialogAberto(true)}>
            <Plug className="size-4" />
            Ligar conta
          </Button>
        )}
      </div>

      {(conexoes ?? []).length === 0 && (
        <p className="mt-3.5 text-sm text-muted-foreground">
          {disponiveis.length === 0
            ? "Nenhuma origem disponível ainda."
            : "Nenhuma conta ligada — o extrato ainda depende de alguém subir o arquivo."}
        </p>
      )}

      <div className="mt-3.5 flex flex-col gap-2.5">
        {(conexoes ?? []).map((conexao) => (
          <div key={conexao.id} className="rounded-lg border border-border px-3.5 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <Link2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="break-words">{conexao.contaNome}</span>
                  <Badge variant="secondary">{conexao.provedorNome}</Badge>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Última busca {quando(conexao.ultimaSincronizacao)}
                  {conexao.ultimasLinhas > 0 && ` · ${conexao.ultimasLinhas} linha(s)`}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={sincronizar.isPending}
                  onClick={() => buscar(conexao.id)}
                >
                  <RefreshCw className="size-4" />
                  Buscar agora
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Desligar conta"
                  onClick={() => desconectar.mutate(conexao.id)}
                >
                  <Link2Off className="size-4" />
                </Button>
              </div>
            </div>

            {conexao.ultimoErro && (
              <p className="mt-2 flex gap-2 rounded-lg border border-destructive-border bg-destructive-soft px-3 py-2 text-xs text-destructive-soft-foreground">
                <TriangleAlert className="size-4 shrink-0" />
                <span className="break-words">{conexao.ultimoErro}</span>
              </p>
            )}

            <label className="mt-2 flex items-center gap-2.5 text-xs text-muted-foreground">
              <Checkbox
                checked={conexao.sincronizarAutomaticamente}
                onCheckedChange={(v) =>
                  alternar.mutate({ id: conexao.id, automatico: v === true })
                }
              />
              Buscar sozinho todo dia
            </label>
          </div>
        ))}
      </div>

      {indisponiveis.length > 0 && (
        <div className="mt-3.5 border-t border-border pt-3.5">
          {indisponiveis.map((p) => (
            <p key={p.codigo} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{p.nome}</span> — {p.explicacao}{" "}
              {p.motivoDaIndisponibilidade}
            </p>
          ))}
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ligar conta a uma origem</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Conta</Label>
              <Select value={contaId || undefined} onValueChange={(v) => v && setContaId(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => semConexao.find((c) => c.id === contaId)?.nome ?? "Selecione"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {semConexao.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Origem do extrato</Label>
              <Select value={provedor || undefined} onValueChange={(v) => v && setProvedor(String(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => disponiveis.find((p) => p.codigo === provedor)?.nome ?? "Selecione"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {disponiveis.map((p) => (
                    <SelectItem key={p.codigo} value={p.codigo}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {provedor && (
                <p className="text-xs text-muted-foreground">
                  {disponiveis.find((p) => p.codigo === provedor)?.explicacao}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={conectar.isPending}>
              {conectar.isPending ? "Ligando…" : "Ligar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
