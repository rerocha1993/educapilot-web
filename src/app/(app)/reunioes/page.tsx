"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useMeetings,
  useStartMeeting,
  useUpdateMeeting,
  useCloseMeeting,
  type MeetingDto,
} from "@/lib/tasks/use-meetings";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function ReunioesPage() {
  const { data: meetings, isLoading, isError } = useMeetings();
  const { data: classes } = useClasses();
  const startMeeting = useStartMeeting();
  const updateMeeting = useUpdateMeeting();
  const closeMeeting = useCloseMeeting();

  const className = (classId: number) => classes?.find((c) => c.id === classId)?.className ?? `Turma #${classId}`;

  const open = meetings?.find((m) => m.status === "Aberto") ?? null;

  const [newClassId, setNewClassId] = useState<number | null>(null);
  const [ataOpen, setAtaOpen] = useState(false);
  const [discussion, setDiscussion] = useState("");
  const [summary, setSummary] = useState("");
  const [editing, setEditing] = useState<MeetingDto | null>(null);

  useEffect(() => {
    if (editing) {
      setDiscussion(editing.discussion ?? "");
      setSummary(editing.summary ?? "");
    }
  }, [editing]);

  async function handleStart() {
    if (newClassId === null) return;
    try {
      await startMeeting.mutateAsync(newClassId);
      toast.success("Reunião iniciada.");
      setNewClassId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar reunião.");
    }
  }

  function openAta(meeting: MeetingDto) {
    setEditing(meeting);
    setAtaOpen(true);
  }

  async function handleSaveAta() {
    if (!editing) return;
    try {
      await updateMeeting.mutateAsync({
        id: editing.id,
        classId: editing.classId,
        status: editing.status,
        discussion: discussion || null,
        summary: summary || null,
      });
      toast.success("Ata salva.");
      setAtaOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar ata.");
    }
  }

  async function handleClose(meeting: MeetingDto) {
    try {
      await closeMeeting.mutateAsync({
        id: meeting.id,
        classId: meeting.classId,
        status: "Finalizado",
        discussion: meeting.discussion,
        summary: meeting.summary,
      });
      toast.success("Reunião encerrada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao encerrar reunião.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Reuniões</h1>
          <p className="text-sm text-muted-foreground">Atas de reunião por turma.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={newClassId?.toString() ?? ""} onValueChange={(v) => v && setNewClassId(Number(v))}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Turma">
                {() => classes?.find((c) => c.id === newClassId)?.className ?? "Turma"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {classes?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Sem conceito de agendamento futuro no backend (só abrir/encerrar
              imediatamente) — botão inicia a reunião agora, não agenda pra depois. */}
          <Button onClick={handleStart} disabled={newClassId === null || startMeeting.isPending}>
            Nova reunião
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar as reuniões.
        </div>
      )}

      {open && (
        <div className="flex items-center justify-between rounded-lg border border-[#D9D4E6] bg-[#F7F5FB] px-4 py-3">
          <div>
            <p className="font-heading text-sm font-semibold">
              Reunião em andamento · {className(open.classId)}
            </p>
            <p className="text-xs text-muted-foreground">Iniciada em {formatDate(open.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => openAta(open)}>
              Abrir ata
            </Button>
            <Button
              size="sm"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleClose(open)}
              disabled={closeMeeting.isPending}
            >
              Encerrar
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Turma</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && (meetings?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma reunião registrada.
                </TableCell>
              </TableRow>
            )}

            {meetings
              ?.slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{className(m.classId)}</TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">{formatDate(m.createdAt)}</TableCell>
                  <TableCell>
                    {m.status === "Aberto" ? (
                      <Badge className="bg-warning-soft text-warning-soft-foreground">Aberto</Badge>
                    ) : (
                      <Badge className="bg-success-soft text-success-soft-foreground">Finalizado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openAta(m)}>
                      Ver ata
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Pauta e participantes fazem parte do wireframe R7, mas o backend não tem
          esses campos em Meeting — só ClassId/Status/Discussion/summary/CreatedAt. */}
      <p className="text-xs text-muted-foreground">
        Pauta e lista de participantes ainda não são suportadas pelo backend —
        próxima etapa.
      </p>

      <Dialog open={ataOpen} onOpenChange={setAtaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ata · {editing ? className(editing.classId) : ""}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[5px]">
              <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Discussão
              </Label>
              <Textarea value={discussion} onChange={(e) => setDiscussion(e.target.value)} rows={4} />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="font-mono text-[9.5px] uppercase tracking-wide text-muted-foreground">
                Resumo
              </Label>
              <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAtaOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleSaveAta} disabled={updateMeeting.isPending}>
              {updateMeeting.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
