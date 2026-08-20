"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";
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
import { FinanceNav } from "@/components/finance/finance-nav";
import {
  useGuardians,
  useSaveGuardian,
  useDeleteGuardian,
  useAddVinculo,
  useRemoveVinculo,
  type GuardianDto,
} from "@/lib/finance/use-guardians";
import { useAllStudents } from "@/lib/kernel/use-students";

const EMPTY_FORM = { fullName: "", cpf: "", email: "", phone: "" };
const EMPTY_VINCULO_FORM = { studentId: "", parentesco: "", responsavelFinanceiro: true };

export default function ResponsaveisPage() {
  const { data: guardians, isLoading, isError } = useGuardians();
  const { data: students } = useAllStudents();
  const saveGuardian = useSaveGuardian();
  const deleteGuardian = useDeleteGuardian();
  const addVinculo = useAddVinculo();
  const removeVinculo = useRemoveVinculo();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [vinculoForm, setVinculoForm] = useState(EMPTY_VINCULO_FORM);

  const list = guardians ?? [];
  const detail = list.find((g) => g.id === detailId) ?? null;

  async function handleCreate() {
    if (!form.fullName.trim()) return;
    try {
      await saveGuardian.mutateAsync({
        fullName: form.fullName.trim(),
        cpf: form.cpf.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      toast.success("Responsável cadastrado.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar responsável.");
    }
  }

  async function handleDelete(g: GuardianDto) {
    try {
      await deleteGuardian.mutateAsync(g.id);
      toast.success("Responsável removido.");
      if (detailId === g.id) setDetailId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover responsável.");
    }
  }

  async function handleAddVinculo() {
    if (!detail || !vinculoForm.studentId) return;
    try {
      await addVinculo.mutateAsync({
        guardianId: detail.id,
        studentId: Number(vinculoForm.studentId),
        parentesco: vinculoForm.parentesco.trim() || undefined,
        responsavelFinanceiro: vinculoForm.responsavelFinanceiro,
      });
      toast.success("Aluno vinculado.");
      setVinculoForm(EMPTY_VINCULO_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao vincular aluno.");
    }
  }

  async function handleRemoveVinculo(id: string) {
    try {
      await removeVinculo.mutateAsync(id);
      toast.success("Vínculo removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover vínculo.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <FinanceNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Responsáveis</h1>
          <p className="text-sm text-muted-foreground">
            Quem paga a mensalidade de cada aluno — base do módulo de mensalidade
            recorrente.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>+ Novo responsável</Button>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os responsáveis.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Alunos vinculados</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && list.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum responsável cadastrado ainda.
                </TableCell>
              </TableRow>
            )}

            {list.map((g) => (
              <TableRow key={g.id} className="cursor-pointer" onClick={() => setDetailId(g.id)}>
                <TableCell className="font-medium">{g.fullName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{g.cpf ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {g.email ?? g.phone ?? "—"}
                </TableCell>
                <TableCell>
                  {g.vinculos && g.vinculos.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {g.vinculos.map((v) => (
                        <Badge key={v.id} variant="secondary">
                          {v.studentName ?? v.studentId}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhum</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(g);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo responsável</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Nome completo</Label>
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">CPF</Label>
                <Input value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">E-mail</Label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">
              CPF é necessário só se for gerar cobrança real (Asaas) pra este
              responsável — sem CPF o plano de mensalidade continua funcionando
              normalmente, só sem cobrança automática.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saveGuardian.isPending || !form.fullName.trim()}>
              {saveGuardian.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.fullName}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-3">
              <div className="text-sm text-muted-foreground">
                {detail.cpf ?? "CPF não cadastrado"} · {detail.email ?? "—"} · {detail.phone ?? "—"}
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Alunos vinculados</p>
                {(!detail.vinculos || detail.vinculos.length === 0) && (
                  <p className="text-sm text-muted-foreground">Nenhum aluno vinculado ainda.</p>
                )}
                {detail.vinculos?.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div className="text-sm">
                      <span className="font-medium">{v.studentName ?? v.studentId}</span>
                      {v.parentesco && <span className="text-muted-foreground"> · {v.parentesco}</span>}
                      {v.responsavelFinanceiro && (
                        <Badge className="ml-2" variant="secondary">
                          Financeiro
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleRemoveVinculo(v.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
                <p className="text-xs text-muted-foreground">Vincular novo aluno</p>
                <Select
                  value={vinculoForm.studentId || undefined}
                  onValueChange={(v) => v && setVinculoForm((f) => ({ ...f, studentId: String(v) }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {() => students?.find((s) => String(s.id) === vinculoForm.studentId)?.fullName ?? "Selecione o aluno"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Parentesco (ex.: Mãe, Pai, Avó)"
                  value={vinculoForm.parentesco}
                  onChange={(e) => setVinculoForm((f) => ({ ...f, parentesco: e.target.value }))}
                />
                <Button
                  size="sm"
                  onClick={handleAddVinculo}
                  disabled={addVinculo.isPending || !vinculoForm.studentId}
                >
                  {addVinculo.isPending ? "Vinculando..." : "Vincular"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
