"use client";

import { useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatarSoData } from "@/lib/format/date";
import {
  ROTULO_DA_ADVERTENCIA,
  ROTULO_DO_MARCO,
  baixarArquivoDaAdvertencia,
  useAdvertencias,
  useExcluirAdvertencia,
  useExcluirMarco,
  useExcluirReconhecimento,
  useMarcos,
  useReconhecimentos,
} from "@/lib/rh/use-desempenho";

import { ErroDeCarga } from "../campo";
import { Confirmacao } from "../confirmacao";
import { BotaoDeIcone } from "../lista-movel";
import { DialogAdvertencia, DialogMarco, DialogReconhecimento } from "./dialogos-da-trajetoria";

type Dialogo =
  | { tipo: "advertencia" | "reconhecimento" | "marco" }
  | { tipo: "excluir"; de: "advertencias" | "reconhecimentos" | "marcos"; id: string; texto: string };

const gravidadeVariante = { Leve: "waiting", Moderada: "pending", Grave: "overdue" } as const;

function Linha({ data, children, acoes }: { data: string; children: React.ReactNode; acoes?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="w-20 shrink-0 pt-0.5 font-mono text-[12px] tabular-nums text-muted-foreground">{formatarSoData(data)}</span>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
      {acoes && <div className="flex shrink-0 gap-0.5">{acoes}</div>}
    </li>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{texto}</p>;
}

/**
 * Advertências, reconhecimentos e marcos de carreira do funcionário, num só quadro com abas (cadastro rápido em cada uma).
 * Só quem tem a área de desempenho chega aqui; o arquivo da advertência sai por download autenticado.
 */
export function PainelDeTrajetoria({ funcionarioId }: { funcionarioId: string }) {
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const advertencias = useAdvertencias(funcionarioId);
  const reconhecimentos = useReconhecimentos(funcionarioId);
  const marcos = useMarcos(funcionarioId);
  const excluirAdvertencia = useExcluirAdvertencia();
  const excluirReconhecimento = useExcluirReconhecimento();
  const excluirMarco = useExcluirMarco();

  async function confirmarExclusao(d: Extract<Dialogo, { tipo: "excluir" }>) {
    const acao = d.de === "advertencias" ? excluirAdvertencia : d.de === "reconhecimentos" ? excluirReconhecimento : excluirMarco;
    try {
      await acao.mutateAsync(d.id);
      toast.success("Registro excluído.");
      setDialogo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir.");
    }
  }

  const pendente = excluirAdvertencia.isPending || excluirReconhecimento.isPending || excluirMarco.isPending;

  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-label="Advertências, reconhecimentos e marcos">
      <Tabs defaultValue="advertencias">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="advertencias" className="px-3">
              Advertências{advertencias.data ? ` (${advertencias.data.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="reconhecimentos" className="px-3">
              Reconhecimentos{reconhecimentos.data ? ` (${reconhecimentos.data.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="marcos" className="px-3">
              Marcos{marcos.data ? ` (${marcos.data.length})` : ""}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="advertencias" className="pt-2">
          <div className="mb-1 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setDialogo({ tipo: "advertencia" })}>
              <Plus /> Registrar advertência
            </Button>
          </div>
          {advertencias.isError ? (
            <ErroDeCarga texto="Não foi possível carregar as advertências." onTentar={() => advertencias.refetch()} />
          ) : (advertencias.data ?? []).length === 0 ? (
            <Vazio texto="Nenhuma advertência registrada." />
          ) : (
            <ul className="divide-y divide-border">
              {advertencias.data!.map((a) => (
                <Linha
                  key={a.id}
                  data={a.data}
                  acoes={
                    <>
                      {a.temArquivo && (
                        <BotaoDeIcone
                          rotulo="Baixar o documento"
                          icone={<Download />}
                          onClick={() => baixarArquivoDaAdvertencia(a).catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível baixar."))}
                        />
                      )}
                      <BotaoDeIcone
                        rotulo="Excluir advertência"
                        icone={<Trash2 />}
                        perigo
                        onClick={() => setDialogo({ tipo: "excluir", de: "advertencias", id: a.id, texto: `Advertência de ${formatarSoData(a.data)}` })}
                      />
                    </>
                  }
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{ROTULO_DA_ADVERTENCIA[a.tipo] ?? a.tipo}</Badge>
                    <Badge variant={gravidadeVariante[a.gravidade as keyof typeof gravidadeVariante] ?? "secondary"}>{a.gravidade}</Badge>
                    {a.registradaPorNome && <span className="text-xs text-muted-foreground">por {a.registradaPorNome}</span>}
                  </div>
                  <p className="mt-1 break-words whitespace-pre-wrap">{a.motivo}</p>
                </Linha>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="reconhecimentos" className="pt-2">
          <div className="mb-1 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setDialogo({ tipo: "reconhecimento" })}>
              <Plus /> Registrar reconhecimento
            </Button>
          </div>
          {reconhecimentos.isError ? (
            <ErroDeCarga texto="Não foi possível carregar os reconhecimentos." onTentar={() => reconhecimentos.refetch()} />
          ) : (reconhecimentos.data ?? []).length === 0 ? (
            <Vazio texto="Nenhum reconhecimento registrado." />
          ) : (
            <ul className="divide-y divide-border">
              {reconhecimentos.data!.map((r) => (
                <Linha
                  key={r.id}
                  data={r.data}
                  acoes={
                    <BotaoDeIcone
                      rotulo="Excluir reconhecimento"
                      icone={<Trash2 />}
                      perigo
                      onClick={() => setDialogo({ tipo: "excluir", de: "reconhecimentos", id: r.id, texto: r.titulo })}
                    />
                  }
                >
                  <p className="font-medium break-words">
                    {r.titulo}{" "}
                    <Badge variant="success" className="ml-1">
                      +{(r.pontos ?? 1).toLocaleString("pt-BR")} pt
                    </Badge>
                  </p>
                  {r.descricao && <p className="break-words whitespace-pre-wrap text-muted-foreground">{r.descricao}</p>}
                </Linha>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="marcos" className="pt-2">
          <div className="mb-1 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setDialogo({ tipo: "marco" })}>
              <Plus /> Registrar marco
            </Button>
          </div>
          {marcos.isError ? (
            <ErroDeCarga texto="Não foi possível carregar os marcos." onTentar={() => marcos.refetch()} />
          ) : (marcos.data ?? []).length === 0 ? (
            <Vazio texto="Nenhum marco registrado." />
          ) : (
            <ul className="divide-y divide-border">
              {marcos.data!.map((m) => (
                <Linha
                  key={m.id}
                  data={m.data}
                  acoes={
                    <BotaoDeIcone
                      rotulo="Excluir marco"
                      icone={<Trash2 />}
                      perigo
                      onClick={() => setDialogo({ tipo: "excluir", de: "marcos", id: m.id, texto: m.descricao })}
                    />
                  }
                >
                  <Badge variant="secondary" className="mr-1.5">
                    {ROTULO_DO_MARCO[m.tipo] ?? m.tipo}
                  </Badge>
                  <span className="break-words">{m.descricao}</span>
                </Linha>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {dialogo?.tipo === "advertencia" && <DialogAdvertencia funcionarioId={funcionarioId} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "reconhecimento" && <DialogReconhecimento funcionarioId={funcionarioId} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "marco" && <DialogMarco funcionarioId={funcionarioId} onFechar={() => setDialogo(null)} />}
      {dialogo?.tipo === "excluir" && (
        <Confirmacao
          titulo="Excluir este registro?"
          descricao={`${dialogo.texto}. A nota é recalculada sem ele; o histórico já fechado não muda.`}
          rotuloConfirmar="Excluir"
          perigosa
          pendente={pendente}
          onConfirmar={() => confirmarExclusao(dialogo)}
          onFechar={() => setDialogo(null)}
        />
      )}
    </section>
  );
}
