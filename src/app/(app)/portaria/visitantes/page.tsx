"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PortariaNav } from "@/components/reception/portaria-nav";
import { FotoVisitante } from "@/components/reception/foto-visitante";
import { RegistrarEntradaDialog } from "@/components/reception/registrar-entrada-dialog";
import { useRegistrarSaida, useVisitasEmAndamento, type Visita } from "@/lib/reception/use-portaria";
import { formatarCpf, formatarDuracao, horaBrasilia, minutosDesde } from "@/lib/reception/formatar";

export default function VisitantesPage() {
  return <PainelDeVisitantes />;
}

function PainelDeVisitantes() {
  const { data: visitas, isLoading, isError } = useVisitasEmAndamento();
  const registrarSaida = useRegistrarSaida();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [saindoId, setSaindoId] = useState<string | null>(null);

  // O tempo na escola anda sozinho na tela, sem esperar a próxima leitura do servidor.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  async function saida(visita: Visita) {
    setSaindoId(visita.id);
    try {
      const fechada = await registrarSaida.mutateAsync(visita.id);
      toast.success(`Saída de ${fechada.visitanteNome} registrada às ${horaBrasilia(fechada.saidaEm!)}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar a saída.");
    } finally {
      setSaindoId(null);
    }
  }

  const lista = visitas ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PortariaNav />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold">Visitantes</h1>
          <p className="text-sm text-muted-foreground">
            Quem está na escola agora. Registre a entrada na chegada e a saída quando a pessoa for embora.
          </p>
        </div>
        <Button onClick={() => setDialogAberto(true)}>+ Registrar entrada</Button>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar quem está na escola.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitante</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Visitando</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Tempo na escola</TableHead>
              <TableHead className="w-40 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && lista.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum visitante na escola agora.
                </TableCell>
              </TableRow>
            )}

            {lista.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <FotoVisitante visitanteId={v.visitanteId} nome={v.visitanteNome} temFoto={v.visitanteTemFoto} />
                    <div>
                      <p className="font-medium">{v.visitanteNome}</p>
                      <p className="text-xs text-muted-foreground">{formatarCpf(v.visitanteCpf)}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.motivo ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {v.alunoNome ?? v.turmaNome ?? <span className="text-muted-foreground">—</span>}
                  {v.alunoNome && v.turmaNome && (
                    <span className="block text-xs text-muted-foreground">{v.turmaNome}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{horaBrasilia(v.entradaEm)}</TableCell>
                <TableCell className="text-sm">{formatarDuracao(minutosDesde(v.entradaEm, agora))}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => saida(v)} disabled={saindoId === v.id}>
                    <LogOut /> {saindoId === v.id ? "Registrando..." : "Registrar saída"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RegistrarEntradaDialog open={dialogAberto} onOpenChange={setDialogAberto} />
    </div>
  );
}
