"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { Contact, Search, Trash2 } from "lucide-react";
import { iniciais } from "@/lib/matriculas/rotulos";
import { cn } from "@/lib/utils";
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
import {
  useGuardians,
  useSaveGuardian,
  useDeleteGuardian,
  useAddVinculo,
  useRemoveVinculo,
  type GuardianDto,
} from "@/lib/finance/use-guardians";
import { useAllStudents } from "@/lib/kernel/use-students";
import { EnderecosDoResponsavel } from "@/components/registry/enderecos-do-responsavel";
import { AcessoDoResponsavel } from "@/components/reception/acesso-do-responsavel";
import { formatarSoData } from "@/lib/format/date";

type Recorte = "sem-email" | "sem-aluno";

/** Sem acento e em minúsculas, para a busca achar "Jose" em "José". */
const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground"
    >
      {iniciais(nome)}
    </span>
  );
}

const EMPTY_FORM = { fullName: "", cpf: "", email: "", phone: "", dataDeNascimento: "" };
const EMPTY_VINCULO_FORM = { studentId: "", parentesco: "", responsavelFinanceiro: true };

/** Estado vazio no padrão do guia: cartão tracejado, ícone num quadrado e texto curto. */
function SemResponsaveis({ semBorda = false, filtrando = false }: { semBorda?: boolean; filtrando?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-5 py-9 text-center",
        !semBorda && "rounded-xl border border-dashed border-border-dashed bg-card"
      )}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Contact className="size-4" />
      </span>
      <p className="mt-3 max-w-[280px] font-heading text-[15px] font-semibold text-pretty">
        {filtrando ? "Nenhum responsável encontrado." : "Nenhum responsável cadastrado ainda."}
      </p>
    </div>
  );
}

/**
 * Data de nascimento no detalhe do responsável: mostra a data e deixa corrigir ou preencher.
 *
 * Esta tela não tinha edição nenhuma — um responsável já cadastrado só ganharia a data apagando e
 * recadastrando. O PUT troca o registro inteiro, então os demais campos vão como já estão.
 * A data é só texto "yyyy-MM-dd" ponta a ponta: nada passa por Date.
 */
function NascimentoDoResponsavel({ guardian }: { guardian: GuardianDto }) {
  const saveGuardian = useSaveGuardian();
  const atual = guardian.dataDeNascimento?.slice(0, 10) ?? "";
  const [valor, setValor] = useState(atual);

  async function salvar() {
    try {
      await saveGuardian.mutateAsync({
        id: guardian.id,
        fullName: guardian.fullName,
        cpf: guardian.cpf,
        email: guardian.email,
        phone: guardian.phone,
        dataDeNascimento: valor || null,
      });
      toast.success("Data de nascimento salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a data de nascimento.");
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p className="text-sm font-medium">
        Nascimento:{" "}
        <span className="font-mono font-normal tabular-nums text-muted-foreground">
          {atual ? formatarSoData(atual) : "não informado"}
        </span>
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label="Data de nascimento"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={salvar}
          disabled={saveGuardian.isPending || valor === atual}
        >
          {saveGuardian.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

export default function ResponsaveisPage() {
  const { data: guardians, isLoading, isError } = useGuardians();
  const { data: students } = useAllStudents();
  const saveGuardian = useSaveGuardian();
  const deleteGuardian = useDeleteGuardian();
  const addVinculo = useAddVinculo();
  const removeVinculo = useRemoveVinculo();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // ?responsavel=<id> abre o cadastro já no responsável certo.
  //
  // É o que permite chegar aqui a partir da ficha do aluno: o link leva direto à pessoa, em vez
  // de largar quem clicou numa lista de 133 nomes para procurar de novo.
  const searchParams = useSearchParams();
  const idDaUrl = searchParams.get("responsavel");

  const [detailIdManual, setDetailIdManual] = useState<string | null>(null);
  const [fechouDaUrl, setFechouDaUrl] = useState(false);

  // O id da URL vale até a pessoa fechar o diálogo; daí em diante manda o clique na lista.
  const detailId = detailIdManual ?? (fechouDaUrl ? null : idDaUrl);

  function setDetailId(id: string | null) {
    setDetailIdManual(id);
    if (id === null) setFechouDaUrl(true);
  }
  const [vinculoForm, setVinculoForm] = useState(EMPTY_VINCULO_FORM);

  const todos = guardians ?? [];
  const [busca, setBusca] = useState("");
  const [recorte, setRecorte] = useState<Recorte | null>(null);
  const termo = normalizar(busca.trim());
  const digitos = busca.replace(/\D/g, "");
  const semEmail = (g: GuardianDto) => !g.email?.trim();
  const semAluno = (g: GuardianDto) => (g.vinculos?.length ?? 0) === 0;
  // A busca vale para nome, e-mail, telefone e CPF; os totais seguem a busca.
  const daBusca = todos.filter(
    (g) =>
      !termo ||
      normalizar([g.fullName, g.email, g.phone].filter(Boolean).join(" ")).includes(termo) ||
      (digitos.length > 2 && (g.cpf ?? "").replace(/\D/g, "").includes(digitos))
  );
  const totalSemEmail = daBusca.filter(semEmail).length;
  const totalSemAluno = daBusca.filter(semAluno).length;
  const list = daBusca.filter(
    (g) => recorte === null || (recorte === "sem-email" ? semEmail(g) : semAluno(g))
  );
  const detail = todos.find((g) => g.id === detailId) ?? null;

  async function handleCreate() {
    if (!form.fullName.trim()) return;
    try {
      await saveGuardian.mutateAsync({
        fullName: form.fullName.trim(),
        cpf: form.cpf.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        dataDeNascimento: form.dataDeNascimento || null,
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
      <CabecalhoDaPagina
        className="md:items-center md:gap-0"
        eyebrow="Administração"
        titulo="Responsáveis"
        apoio="Quem paga a mensalidade de cada aluno — base do módulo de mensalidade recorrente e assinam o contrato."
        acoes={
          <Button variant="action" onClick={() => setDialogOpen(true)} className="w-full md:w-auto">
            + Novo responsável
          </Button>
        }
      />

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os responsáveis.
        </div>
      )}

      {!isLoading && todos.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="font-numeric font-medium text-foreground">{daBusca.length}</span>{" "}
            {daBusca.length === 1 ? "responsável" : "responsáveis"}
          </span>
          {([
            ["sem-email", totalSemEmail, "sem e-mail"],
            ["sem-aluno", totalSemAluno, "sem aluno vinculado"],
          ] as const).map(
            ([chave, n, rotulo]) =>
              n > 0 && (
                <span key={chave} className="inline-flex items-center gap-x-2">
                  <span aria-hidden>·</span>
                  <button
                    type="button"
                    aria-pressed={recorte === chave}
                    onClick={() => setRecorte((r) => (r === chave ? null : chave))}
                    className={cn(
                      "inline-flex min-h-8 items-center rounded-md px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      recorte === chave ? "font-semibold text-foreground underline" : "hover:text-foreground hover:underline"
                    )}
                  >
                    <span className="font-numeric mr-1 font-medium text-foreground">{n}</span>
                    {rotulo}
                    {recorte === chave && " (só estes)"}
                  </button>
                </span>
              )
          )}
        </p>
      )}

      {todos.length > 10 && (
        <div className="relative w-full md:w-72">
          <Search aria-hidden className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar responsável"
            placeholder="Buscar por nome, e-mail, telefone ou CPF"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-10 pl-8 md:h-9"
          />
        </div>
      )}

      <div className="flex flex-col gap-2 md:hidden">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}

        {!isLoading && list.length === 0 && <SemResponsaveis filtrando={todos.length > 0} />}

        {list.map((g) => (
          <div
            key={g.id}
            className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-card p-3"
            onClick={() => setDetailId(g.id)}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="flex items-center gap-2.5 font-medium break-words">
                <Avatar nome={g.fullName} />
                <span className="min-w-0">{g.fullName}</span>
              </p>
              <p className="text-sm break-words text-muted-foreground">
                <span className="font-mono tabular-nums">{g.cpf ?? "—"}</span> · {g.email ?? g.phone ?? "—"}
              </p>
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
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(g);
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="hidden rounded-xl border border-border bg-card md:block">
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
                <TableCell colSpan={5} className="p-0">
                  <SemResponsaveis semBorda filtrando={todos.length > 0} />
                </TableCell>
              </TableRow>
            )}

            {list.map((g) => (
              <TableRow key={g.id} className="cursor-pointer [&>td]:py-1.5" onClick={() => setDetailId(g.id)}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2.5">
                    <Avatar nome={g.fullName} />
                    {g.fullName}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">{g.cpf ?? "—"}</TableCell>
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
              <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Nome completo</Label>
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">CPF</Label>
                <Input value={form.cpf} onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-[5px]">
                <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">E-mail</Label>
              <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-[5px]">
              <Label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                Data de nascimento (opcional)
              </Label>
              <Input
                type="date"
                value={form.dataDeNascimento}
                onChange={(e) => setForm((f) => ({ ...f, dataDeNascimento: e.target.value }))}
              />
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
              <div className="text-sm break-words text-muted-foreground">
                <span className="font-mono tabular-nums">{detail.cpf ?? "CPF não cadastrado"}</span> ·{" "}
                {detail.email ?? "—"} · <span className="font-mono tabular-nums">{detail.phone ?? "—"}</span>
              </div>

              <NascimentoDoResponsavel key={`${detail.id}-${detail.dataDeNascimento ?? ""}`} guardian={detail} />

              <EnderecosDoResponsavel guardianId={detail.id} />

              <AcessoDoResponsavel key={detail.id} guardianId={detail.id} />

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Alunos vinculados</p>
                {(!detail.vinculos || detail.vinculos.length === 0) && (
                  <p className="text-sm text-muted-foreground">Nenhum aluno vinculado ainda.</p>
                )}
                {detail.vinculos?.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 md:gap-0"
                  >
                    <div className="min-w-0 text-sm break-words">
                      {/* Leva para a ficha do aluno: o vínculo precisa andar nos dois sentidos, ou
                          quem está conferindo uma família tem de voltar ao menu a cada troca. */}
                      <Link
                        href={`/admin/alunos/${v.studentId}`}
                        className="font-medium hover:underline"
                      >
                        {v.studentName ?? v.studentId}
                      </Link>
                      {v.parentesco && <span className="text-muted-foreground"> · {v.parentesco}</span>}
                      {v.responsavelFinanceiro && (
                        <Badge className="ml-2" variant="secondary">
                          Financeiro
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={() => handleRemoveVinculo(v.id)}>
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
