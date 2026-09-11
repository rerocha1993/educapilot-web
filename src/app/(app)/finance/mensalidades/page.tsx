"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContractSettings } from "@/lib/flow/use-contract-settings";
import { useClasses } from "@/lib/kernel/use-classes";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Search } from "lucide-react";
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
  useTuitionPlans,
  useSaveTuitionPlan,
  useDeleteTuitionPlan,
  useGerarMensalidades,
  type TuitionPlanDto,
} from "@/lib/finance/use-tuition-plans";
import { useGuardians } from "@/lib/finance/use-guardians";
import { useAllStudents } from "@/lib/kernel/use-students";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function todayIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  studentId: "",
  guardianId: "",
  valorMensal: "",
  diaVencimento: "10",
  dataInicio: todayIso(),
  gerarCobrancaAsaas: false,
  percentualReajuste: "",
};

export default function MensalidadesPage() {
  const { data: plans, isLoading, isError } = useTuitionPlans();
  const { data: guardians } = useGuardians();
  const { data: students } = useAllStudents();
  const savePlan = useSaveTuitionPlan();
  const deletePlan = useDeleteTuitionPlan();
  const gerar = useGerarMensalidades();
  const { data: contractSettings } = useContractSettings();
  const { data: classes } = useClasses();

  const [turmaFiltro, setTurmaFiltro] = useState<string>("__todas__");
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const now = new Date();
  const [mes] = useState(now.getMonth() + 1);
  const [ano] = useState(now.getFullYear());

  // Turma de cada aluno, para filtrar e para a coluna.
  //
  // Vem da lista de alunos, e não do plano: TuitionPlan não guarda turma de propósito — a turma
  // muda todo ano (progressão) e o plano seguiria valendo, então duplicá-la aqui criaria dois
  // lugares para a mesma informação, com um deles envelhecendo em silêncio.
  const turmaPorAluno = new Map<number, number>(
    (students ?? []).map((a) => [a.id, a.classId])
  );
  const nomeDaTurma = new Map<number, string>(
    (classes ?? []).map((c) => [c.id as number, c.className ?? ""])
  );

  const list = (plans ?? []).filter((p) => {
    if (turmaFiltro !== "__todas__" && String(turmaPorAluno.get(p.studentId)) !== turmaFiltro) {
      return false;
    }

    const termo = busca.trim().toLowerCase();
    if (!termo) return true;

    return (
      (p.studentName ?? "").toLowerCase().includes(termo) ||
      (p.guardianName ?? "").toLowerCase().includes(termo)
    );
  });

  // Soma do que está à vista: com o filtro ligado, é o total daquela turma. É o número que a
  // escola procura ao revisar valores por turma, e somar 102 linhas na mão não é opção.
  const totalFiltrado = list.reduce((soma, p) => soma + p.valorMensal, 0);

  // Percentual da escola só como placeholder: deixa claro o que vale quando o campo do aluno
  // está vazio, sem gravar esse número em cada plano (o que congelaria o valor de hoje).
  const percentualEscola = contractSettings?.percentualReajuste ?? null;

  // Salva só o reajuste, direto na linha da tabela.
  //
  // Editar na linha em vez de abrir um diálogo: ajustar o reajuste é uma passada pela lista
  // inteira, aluno por aluno, na virada do ano. Abrir e fechar um diálogo por aluno tornaria a
  // tarefa longa o bastante para a escola desistir e deixar todo mundo no percentual geral.
  //
  // O PUT substitui o plano inteiro, então os outros campos vão junto, como estão.
  async function salvarReajuste(plano: TuitionPlanDto, texto: string) {
    const limpo = texto.trim().replace(",", ".");
    const valor = limpo === "" ? null : Number(limpo);

    if (valor !== null && Number.isNaN(valor)) return;
    if (valor === plano.percentualReajuste) return;

    try {
      await savePlan.mutateAsync({
        id: plano.id,
        studentId: plano.studentId,
        guardianId: plano.guardianId,
        valorMensal: plano.valorMensal,
        diaVencimento: plano.diaVencimento,
        dataInicio: plano.dataInicio,
        dataFim: plano.dataFim,
        ativo: plano.ativo,
        gerarCobrancaAsaas: plano.gerarCobrancaAsaas,
        percentualReajuste: valor,
      });
      toast.success("Reajuste salvo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o reajuste.");
    }
  }

  async function handleCreate() {
    const valor = Number(form.valorMensal.replace(",", "."));
    if (!form.studentId || !form.guardianId || !valor || !form.dataInicio) return;
    try {
      await savePlan.mutateAsync({
        studentId: Number(form.studentId),
        guardianId: form.guardianId,
        valorMensal: valor,
        diaVencimento: Number(form.diaVencimento) || 10,
        dataInicio: form.dataInicio,
        gerarCobrancaAsaas: form.gerarCobrancaAsaas,
        percentualReajuste:
          form.percentualReajuste.trim() === ""
            ? null
            : Number(form.percentualReajuste.replace(",", ".")),
      });
      toast.success("Plano de mensalidade criado.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar plano.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePlan.mutateAsync(id);
      toast.success("Plano removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover plano.");
    }
  }

  async function handleGerar() {
    try {
      const result = await gerar.mutateAsync({ mes, ano });
      toast.success(
        result.gerados > 0
          ? `${result.gerados} mensalidade(s) gerada(s) em Receitas.`
          : "Nenhuma mensalidade nova — já geradas ou nenhum plano vigente nesta competência."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar mensalidades.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <FinanceNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Mensalidades</h1>
          <p className="text-sm text-muted-foreground">
            Planos de cobrança recorrente — geram automaticamente uma Receita
            (categoria Mensalidade) todo mês.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGerar} disabled={gerar.isPending}>
            {gerar.isPending
              ? "Gerando..."
              : `Gerar ${String(mes).padStart(2, "0")}/${ano} agora`}
          </Button>
          <Button onClick={() => setDialogOpen(true)}>+ Novo plano</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar aluno ou responsável"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <Select value={turmaFiltro} onValueChange={(v) => v && setTurmaFiltro(String(v))}>
          <SelectTrigger className="w-56">
            <SelectValue>
              {() =>
                turmaFiltro === "__todas__"
                  ? "Todas as turmas"
                  : (nomeDaTurma.get(Number(turmaFiltro)) ?? "Todas as turmas")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas__">Todas as turmas</SelectItem>
            {(classes ?? []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="ml-auto text-sm text-muted-foreground">
          {list.length} plano(s) · <span className="font-mono tabular-nums">{formatCurrency(totalFiltrado)}</span>/mês
        </p>
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os planos de mensalidade.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="w-32 text-right">Reajuste 2027</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && list.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum plano de mensalidade cadastrado ainda.
                </TableCell>
              </TableRow>
            )}

            {list.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.studentName ?? p.studentId}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {nomeDaTurma.get(turmaPorAluno.get(p.studentId) ?? -1) ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.guardianName ?? "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {formatCurrency(p.valorMensal)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">Dia {p.diaVencimento}</TableCell>
                <TableCell>
                  {/* defaultValue + salvar no blur: com value controlado, cada tecla dispararia
                      uma re-renderização da lista inteira e o cursor pularia. */}
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 w-20 text-right font-mono text-sm tabular-nums"
                      defaultValue={p.percentualReajuste ?? ""}
                      placeholder={percentualEscola == null ? "—" : String(percentualEscola)}
                      onBlur={(e) => salvarReajuste(p, e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                    {p.gerarCobrancaAsaas && <Badge variant="secondary">Cobrança Asaas</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Um job diário (Hangfire) gera essas mensalidades automaticamente pra todos os
        tenants — o botão &quot;Gerar agora&quot; acima roda a mesma lógica sob demanda, só
        pra esta escola. Nunca gera a mesma competência duas vezes pro mesmo plano.
        &quot;Cobrança Asaas&quot; só funciona se a escola já tiver configurado sua própria
        conta Asaas (fora desta tela) — sem isso, a mensalidade continua sendo gerada
        normalmente em Receitas, só sem cobrança automática.
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo plano de mensalidade</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Aluno</Label>
              <Select
                value={form.studentId || undefined}
                onValueChange={(v) => v && setForm((f) => ({ ...f, studentId: String(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => students?.find((s) => String(s.id) === form.studentId)?.fullName ?? "Selecione"}
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
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Responsável (quem paga)</Label>
              <Select
                value={form.guardianId || undefined}
                onValueChange={(v) => v && setForm((f) => ({ ...f, guardianId: String(v) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => guardians?.find((g) => g.id === form.guardianId)?.fullName ?? "Selecione"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {guardians?.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {guardians?.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum responsável cadastrado — crie um na aba Responsáveis primeiro.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Valor mensal</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valorMensal}
                  onChange={(e) => setForm((f) => ({ ...f, valorMensal: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Reajuste 2027 (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={
                    percentualEscola == null ? "Usa o da escola" : `${percentualEscola} (da escola)`
                  }
                  value={form.percentualReajuste}
                  onChange={(e) => setForm((f) => ({ ...f, percentualReajuste: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Dia de vencimento</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.diaVencimento}
                  onChange={(e) => setForm((f) => ({ ...f, diaVencimento: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Início da cobrança</Label>
              <Input
                type="date"
                value={form.dataInicio}
                onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-dashed border-border p-2.5">
              <div>
                <Label className="text-xs text-muted-foreground">Gerar cobrança real (Asaas)</Label>
                <p className="text-xs text-muted-foreground">
                  Exige CPF do responsável e Asaas configurado pra esta escola.
                </p>
              </div>
              <Switch
                checked={form.gerarCobrancaAsaas}
                onCheckedChange={(v) => setForm((f) => ({ ...f, gerarCobrancaAsaas: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={savePlan.isPending || !form.studentId || !form.guardianId || !form.valorMensal}
            >
              {savePlan.isPending ? "Salvando..." : "Criar plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
