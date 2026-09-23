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
import { Trash2, Search, Inbox } from "lucide-react";
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
import { CampoDeDinheiro, emReais } from "@/components/finance/campo-de-dinheiro";
import { SeletorDeAluno } from "@/components/finance/seletor-de-aluno";
import { FinanceNav } from "@/components/finance/finance-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import {
  useTuitionPlans,
  useSaveTuitionPlan,
  useDeleteTuitionPlan,
  useGerarMensalidades,
  type TuitionPlanDto,
} from "@/lib/finance/use-tuition-plans";
import { useGuardians } from "@/lib/finance/use-guardians";
import { useAllStudents } from "@/lib/kernel/use-students";
import { hojeIsoBrasilia } from "@/lib/format/date";

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// defaultValue + salvar no blur: com value controlado, cada tecla dispararia uma re-renderização da
// lista inteira e o cursor pularia. Componente próprio porque a tabela e os cards do celular usam o
// mesmo campo.
function ReajusteInput({
  plano,
  placeholder,
  onSalvar,
  className,
}: {
  plano: TuitionPlanDto;
  placeholder: string;
  onSalvar: (plano: TuitionPlanDto, texto: string) => void;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Input
        type="number"
        step="0.01"
        className={className}
        defaultValue={plano.percentualReajuste ?? ""}
        placeholder={placeholder}
        onBlur={(e) => onSalvar(plano, e.target.value)}
      />
      <span className="text-xs text-muted-foreground">%</span>
    </div>
  );
}

const EMPTY_FORM = {
  studentId: "",
  guardianId: "",
  // Centavos, e não texto: é o campo de dinheiro em real que monta a vírgula (ver CampoDeDinheiro).
  valorMensal: null as number | null,
  diaVencimento: "10",
  dataInicio: hojeIsoBrasilia(),
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

  // Quem já está vinculado à criança no cadastro. Um só vinculado é o caso comum, e ele entra
  // escolhido sozinho — a secretaria não precisa decidir nada.
  const responsaveisDoAluno = (guardians ?? []).filter((g) =>
    (g.vinculos ?? []).some((v) => String(v.studentId) === form.studentId)
  );

  const unicoResponsavel = responsaveisDoAluno.length === 1 ? responsaveisDoAluno[0].id : null;
  if (unicoResponsavel && form.guardianId !== unicoResponsavel && form.studentId) {
    // Ajuste durante o render, e não num efeito: o valor derivado da escolha do aluno precisa
    // valer já na mesma renderização, senão o botão de salvar pisca desabilitado.
    setForm((f) => ({ ...f, guardianId: unicoResponsavel }));
  }

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
    const valor = emReais(form.valorMensal);
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
    <div className="flex flex-col gap-[18px]">
      <FinanceNav />

      <CabecalhoDaPagina
        eyebrow="Financeiro"
        titulo="Mensalidades"
        apoio="Planos de cobrança recorrente — geram automaticamente uma Receita (categoria Mensalidade) todo mês."
        acoes={
          <>
            <Button variant="outline" className="flex-1 md:flex-none" onClick={handleGerar} disabled={gerar.isPending}>
              {gerar.isPending ? (
                "Gerando..."
              ) : (
                <>
                  Gerar{" "}
                  <span className="font-mono tabular-nums">
                    {String(mes).padStart(2, "0")}/{ano}
                  </span>{" "}
                  agora
                </>
              )}
            </Button>
            <Button variant="action" className="flex-1 md:flex-none" onClick={() => setDialogOpen(true)}>
              + Novo plano
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full md:w-auto md:min-w-56 md:flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar aluno ou responsável"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <Select value={turmaFiltro} onValueChange={(v) => v && setTurmaFiltro(String(v))}>
          <SelectTrigger className="w-full md:w-56">
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
          <span className="font-mono tabular-nums">{list.length}</span> plano(s) ·{" "}
          <span className="font-mono whitespace-nowrap tabular-nums">{formatCurrency(totalFiltrado)}</span>/mês
        </p>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os planos de mensalidade.
        </div>
      )}

      {/* Celular: cards no lugar da tabela de 8 colunas, com o mesmo campo de reajuste editável. */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}

        {!isLoading && list.length === 0 && (
          <EstadoVazio icone={<Inbox />} titulo="Nenhum plano de mensalidade cadastrado ainda." />
        )}

        {list.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium break-words">{p.studentName ?? p.studentId}</p>
                <p className="text-muted-foreground break-words">
                  {nomeDaTurma.get(turmaPorAluno.get(p.studentId) ?? -1) ?? "—"} · {p.guardianName ?? "—"}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(p.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono font-semibold whitespace-nowrap tabular-nums">
                {formatCurrency(p.valorMensal)}
              </span>
              <span className="text-muted-foreground">
                Dia <span className="font-mono tabular-nums">{p.diaVencimento}</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Reajuste 2027</span>
              <ReajusteInput
                plano={p}
                placeholder={percentualEscola == null ? "—" : String(percentualEscola)}
                onSalvar={salvarReajuste}
                className="w-24 text-right font-mono tabular-nums"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
              {p.gerarCobrancaAsaas && <Badge variant="secondary">Cobrança Asaas</Badge>}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
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
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-10 text-center">
                  <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Inbox className="size-[18px]" />
                  </span>
                  <p className="mt-3 font-heading text-[15px] font-semibold">
                    Nenhum plano de mensalidade cadastrado ainda.
                  </p>
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
                <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">
                  {formatCurrency(p.valorMensal)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  Dia <span className="font-mono tabular-nums">{p.diaVencimento}</span>
                </TableCell>
                <TableCell>
                  <ReajusteInput
                    plano={p}
                    placeholder={percentualEscola == null ? "—" : String(percentualEscola)}
                    onSalvar={salvarReajuste}
                    className="h-8 w-20 text-right font-mono text-sm tabular-nums"
                  />
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
              <SeletorDeAluno
                valor={form.studentId}
                onChange={(studentId) =>
                  setForm((f) => ({
                    ...f,
                    studentId,
                    // Trocar de aluno limpa o responsável: o de antes é de outra família.
                    guardianId: "",
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-[5px]">
              <Label className="text-xs text-muted-foreground">Responsável (quem paga)</Label>

              {/* A criança já tem responsável vinculado no cadastro: procurar de novo numa lista
                  de centenas era pedir duas vezes a mesma informação — e abria espaço para
                  vincular a mensalidade ao pai de outra família. Com um único vinculado, ele já
                  vem escolhido; com dois, escolhe-se entre os dois. */}
              {responsaveisDoAluno.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {responsaveisDoAluno.map((g) => {
                    const escolhido = form.guardianId === g.id;
                    const vinculo = (g.vinculos ?? []).find((v) => String(v.studentId) === form.studentId);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, guardianId: g.id }))}
                        className={`flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-colors ${
                          escolhido ? "border-primary bg-primary/5 font-medium" : "border-input hover:border-primary/60"
                        }`}
                      >
                        <span className="min-w-0 break-words">{g.fullName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {vinculo?.responsavelFinanceiro ? "Financeiro" : (vinculo?.parentesco ?? "")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
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
                  <p className="text-xs text-muted-foreground">
                    {form.studentId
                      ? "Este aluno ainda não tem responsável vinculado. Escolha na lista ou faça o vínculo na aba Responsáveis."
                      : "Escolha o aluno primeiro: o responsável vinculado a ele já vem selecionado."}
                  </p>
                </>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Valor mensal</Label>
                <CampoDeDinheiro
                  valorEmCentavos={form.valorMensal}
                  onChange={(centavos) => setForm((f) => ({ ...f, valorMensal: centavos }))}
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
            <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border p-2.5 md:gap-0">
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
