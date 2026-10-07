"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Lock, LockOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import {
  baixarPlanilhaDoMes,
  useFechamentos,
  useFecharMes,
  usePreviaDoFechamento,
  useReabrirMes,
} from "@/lib/finance/use-tesouraria";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function dinheiro(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FechamentoPage() {
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());

  const { data: fechamentos, isLoading } = useFechamentos(ano);
  const fecharMes = useFecharMes();
  const reabrirMes = useReabrirMes();

  const [mesEscolhido, setMesEscolhido] = useState<number | null>(null);
  const [observacao, setObservacao] = useState("");

  // Um mês só pode ser fechado depois de terminar — o botão nem aparece antes disso.
  const ultimoMesFechavel = ano < agora.getFullYear() ? 12 : agora.getMonth();

  const fechadoPorMes = new Map((fechamentos ?? []).map((f) => [f.mes, f]));

  async function baixar(mes: number) {
    try {
      await baixarPlanilhaDoMes(ano, mes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar a planilha.");
    }
  }

  async function reabrir(mes: number) {
    try {
      await reabrirMes.mutateAsync({ ano, mes });
      toast.success(`${MESES[mes - 1]} reaberto. Lembre de fechar de novo depois de corrigir.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível reabrir o mês.");
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Fechamento do mês"
        apoio="Depois de fechado, o mês não recebe mais lançamento — e o saldo de cada conta fica guardado como estava."
        acoes={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Ano anterior" onClick={() => setAno((a) => a - 1)}>
              −
            </Button>
            <span className="font-mono text-sm tabular-nums">{ano}</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Próximo ano"
              disabled={ano >= agora.getFullYear()}
              onClick={() => setAno((a) => a + 1)}
            >
              +
            </Button>
          </div>
        }
      />

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {MESES.map((nome, indice) => {
            const mes = indice + 1;
            const fechado = fechadoPorMes.get(mes);
            const podeFechar = mes <= ultimoMesFechavel;

            return (
              <div
                key={mes}
                className={`rounded-xl border p-[18px] ${
                  fechado ? "border-border bg-muted/40" : "border-border bg-card"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-heading text-[15px] font-semibold">{nome}</h3>
                  {fechado ? (
                    <Badge variant="secondary">
                      <Lock className="size-3" />
                      Fechado
                    </Badge>
                  ) : podeFechar ? (
                    <Badge variant="outline">Aberto</Badge>
                  ) : (
                    <Badge variant="outline">Em andamento</Badge>
                  )}
                </div>

                {fechado && (
                  <>
                    <div className="mt-3 flex flex-col gap-1 text-[12.5px]">
                      <span className="flex justify-between">
                        <span className="text-muted-foreground">Entrou</span>
                        <span className="font-mono tabular-nums">{dinheiro(fechado.totalReceitas)}</span>
                      </span>
                      <span className="flex justify-between">
                        <span className="text-muted-foreground">Saiu</span>
                        <span className="font-mono tabular-nums">{dinheiro(fechado.totalDespesas)}</span>
                      </span>
                      <span className="flex justify-between border-t border-border pt-1 font-medium">
                        <span>Resultado</span>
                        <span
                          className={`font-mono tabular-nums ${
                            fechado.resultado < 0 ? "text-destructive-soft-foreground" : "text-success-soft-foreground"
                          }`}
                        >
                          {dinheiro(fechado.resultado)}
                        </span>
                      </span>
                    </div>

                    {fechado.saldos.length > 0 && (
                      <div className="mt-2.5 border-t border-border pt-2.5">
                        <p className="text-[11.5px] font-medium text-muted-foreground">
                          Saldo em {new Date(ano, mes, 0).toLocaleDateString("pt-BR")}
                        </p>
                        {fechado.saldos.map((s) => (
                          <span key={s.contaId} className="flex justify-between text-[12.5px]">
                            <span className="min-w-0 truncate text-muted-foreground">{s.nome}</span>
                            <span className="font-mono tabular-nums">{dinheiro(s.saldo)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div className="mt-3.5 flex flex-wrap gap-2">
                  {podeFechar && (
                    <Button variant="outline" size="sm" onClick={() => baixar(mes)}>
                      <Download className="size-4" />
                      Planilha
                    </Button>
                  )}
                  {fechado ? (
                    <Button variant="ghost" size="sm" onClick={() => reabrir(mes)}>
                      <LockOpen className="size-4" />
                      Reabrir
                    </Button>
                  ) : (
                    podeFechar && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setMesEscolhido(mes);
                          setObservacao("");
                        }}
                      >
                        <Lock className="size-4" />
                        Fechar
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mesEscolhido != null && (
        <DialogDeFechamento
          ano={ano}
          mes={mesEscolhido}
          observacao={observacao}
          onObservacao={setObservacao}
          fechando={fecharMes.isPending}
          onFechar={async () => {
            try {
              await fecharMes.mutateAsync({ ano, mes: mesEscolhido, observacao: observacao || null });
              toast.success(`${MESES[mesEscolhido - 1]} fechado.`);
              setMesEscolhido(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Não foi possível fechar o mês.");
            }
          }}
          onCancelar={() => setMesEscolhido(null)}
        />
      )}
    </div>
  );
}

function DialogDeFechamento({
  ano,
  mes,
  observacao,
  onObservacao,
  fechando,
  onFechar,
  onCancelar,
}: {
  ano: number;
  mes: number;
  observacao: string;
  onObservacao: (v: string) => void;
  fechando: boolean;
  onFechar: () => void;
  onCancelar: () => void;
}) {
  // A prévia é buscada só quando o diálogo abre: é uma varredura do mês inteiro e não vale a
  // pena rodar doze vezes para desenhar a grade de meses.
  const { data: previa, isLoading } = usePreviaDoFechamento(ano, mes);

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onCancelar()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Fechar {MESES[mes - 1]} de {ano}
          </DialogTitle>
        </DialogHeader>

        {isLoading && <Skeleton className="h-40 w-full" />}

        {previa && (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1 text-sm">
              <span className="flex justify-between">
                <span className="text-muted-foreground">Entrou</span>
                <span className="font-mono tabular-nums">{dinheiro(previa.totalReceitas)}</span>
              </span>
              <span className="flex justify-between">
                <span className="text-muted-foreground">Saiu</span>
                <span className="font-mono tabular-nums">{dinheiro(previa.totalDespesas)}</span>
              </span>
              <span className="flex justify-between border-t border-border pt-1 font-medium">
                <span>Resultado</span>
                <span
                  className={`font-mono tabular-nums ${
                    previa.resultado < 0 ? "text-destructive-soft-foreground" : "text-success-soft-foreground"
                  }`}
                >
                  {dinheiro(previa.resultado)}
                </span>
              </span>
            </div>

            {(previa.receitasEmAberto > 0 || previa.despesasEmAberto > 0) && (
              <div className="flex gap-2.5 rounded-lg border border-border bg-muted px-3.5 py-3 text-[12.5px]">
                <AlertTriangle className="size-4 shrink-0 text-muted-foreground" />
                <p>
                  {previa.receitasEmAberto + previa.despesasEmAberto} lançamento(s) do mês ainda estão sem
                  pagamento, somando {dinheiro(previa.valorEmAberto)}. Fechar não apaga nada — eles
                  continuam lá e podem ser pagos depois, só não mudam mais o resultado deste mês.
                </p>
              </div>
            )}

            {(previa.semConta > 0 || previa.semCategoria > 0) && (
              <div className="flex gap-2.5 rounded-lg border border-border bg-muted px-3.5 py-3 text-[12.5px]">
                <AlertTriangle className="size-4 shrink-0 text-muted-foreground" />
                <p>
                  {previa.semConta > 0 && `${previa.semConta} lançamento(s) sem conta`}
                  {previa.semConta > 0 && previa.semCategoria > 0 && " e "}
                  {previa.semCategoria > 0 && `${previa.semCategoria} sem categoria`}. Eles saem na
                  planilha com a coluna em branco.
                </p>
              </div>
            )}

            {previa.saldos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Saldo que vai ficar guardado
                </p>
                <div className="mt-1 flex flex-col gap-0.5">
                  {previa.saldos.map((s) => (
                    <span key={s.contaId} className="flex justify-between text-[12.5px]">
                      <span className="min-w-0 truncate">{s.nome}</span>
                      <span className="font-mono tabular-nums">{dinheiro(s.saldo)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Observação (opcional)</Label>
              <Input
                value={observacao}
                placeholder="Enviado ao contador em 05/04"
                onChange={(e) => onObservacao(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button onClick={onFechar} disabled={fechando || isLoading}>
            {fechando ? "Fechando…" : "Fechar o mês"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
