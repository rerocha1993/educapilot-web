"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Escolha } from "@/components/tasks/escolha";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarData, hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { useStudentsByClass } from "@/lib/kernel/use-students";
import { useOccurrencesByStudent } from "@/lib/tasks/use-occurrences";
import {
  ROTULO_DE_QUEM_FAZ,
  ROTULO_DO_STATUS,
  STATUS_DO_FORMULARIO,
  TIPOS_DE_REUNIAO,
  useResponsaveisDoAluno,
  useSalvarReuniaoComPais,
  type QuemFaz,
  type ReuniaoComPais,
  type StatusDaReuniao,
} from "@/lib/tasks/use-reunioes-com-pais";

interface Combinado {
  chave: string;
  id?: string;
  descricao: string;
  responsavel: QuemFaz;
  prazo: string;
  cumprido: boolean;
}

interface OutraPessoa {
  chave: string;
  nome: string;
  parentesco: string;
}

let contador = 0;
const novaChave = () => `k${++contador}`;

const ROTULO_DA_SITUACAO: Record<string, string> = {
  Agendada: "Agendada (vai acontecer)",
  Realizada: "Realizada (já aconteceu)",
  ResponsavelNaoCompareceu: ROTULO_DO_STATUS.ResponsavelNaoCompareceu,
};

/**
 * Formulário da reunião com os pais, para criar e para editar. O aluno só se escolhe ao criar (turma e
 * depois aluno); na edição ele é fixo. A ata é interna da escola — o aviso fica à vista no campo.
 */
export function ReuniaoComPaisForm({
  reuniao,
  turmaInicial,
  alunoInicial,
  aoSalvar,
  aoCancelar,
  hrefDeVolta,
}: {
  reuniao?: ReuniaoComPais;
  turmaInicial?: number | null;
  alunoInicial?: number | null;
  aoSalvar: (reuniao: ReuniaoComPais) => void;
  aoCancelar?: () => void;
  hrefDeVolta: string;
}) {
  const editando = !!reuniao;
  const { data: turmas } = useClasses();

  const [turmaId, setTurmaId] = useState<number | null>(reuniao?.classId ?? turmaInicial ?? null);
  const [alunoId, setAlunoId] = useState<number | null>(reuniao?.studentId ?? alunoInicial ?? null);
  const [status, setStatus] = useState<StatusDaReuniao>(reuniao && reuniao.status !== "Cancelada" ? reuniao.status : "Agendada");
  const [data, setData] = useState(reuniao?.data ?? hojeIsoBrasilia());
  const [hora, setHora] = useState(reuniao?.hora ?? "");
  const [tipo, setTipo] = useState(reuniao?.tipo ?? TIPOS_DE_REUNIAO[0]);
  const [ocorrenciaId, setOcorrenciaId] = useState<number | null>(reuniao?.occurrenceId ?? null);
  const [pauta, setPauta] = useState(reuniao?.pauta ?? "");
  const [conversado, setConversado] = useState(reuniao?.conversado ?? "");
  const [proxima, setProxima] = useState(reuniao?.proximaReuniaoEm ?? "");
  const [cadastrados, setCadastrados] = useState<string[]>(
    () => reuniao?.responsaveis.filter((r) => r.guardianId).map((r) => r.guardianId!) ?? []
  );
  const [outras, setOutras] = useState<OutraPessoa[]>(
    () =>
      reuniao?.responsaveis
        .filter((r) => !r.guardianId)
        .map((r) => ({ chave: novaChave(), nome: r.nome, parentesco: r.parentesco ?? "" })) ?? []
  );
  const [combinados, setCombinados] = useState<Combinado[]>(
    () =>
      reuniao?.encaminhamentos.map((e) => ({
        chave: novaChave(),
        id: e.id,
        descricao: e.descricao,
        responsavel: e.responsavel,
        prazo: e.prazo ?? "",
        cumprido: e.cumprido,
      })) ?? []
  );
  const [erro, setErro] = useState<string | null>(null);

  const { data: alunos, isLoading: carregandoAlunos } = useStudentsByClass(editando ? null : turmaId);
  const { data: responsaveis, isLoading: carregandoResponsaveis } = useResponsaveisDoAluno(alunoId);
  const { data: ocorrencias } = useOccurrencesByStudent(alunoId);
  const salvar = useSalvarReuniaoComPais();

  const idsCadastrados = useMemo(() => new Set((responsaveis ?? []).map((r) => r.guardianId ?? r.id)), [responsaveis]);

  function alternarResponsavel(id: string, marcado: boolean) {
    setCadastrados((atual) => (marcado ? [...atual, id] : atual.filter((x) => x !== id)));
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (alunoId === null) return setErro("Escolha a turma e o aluno.");
    if (!data) return setErro("Informe o dia da reunião.");

    const nomes = outras.filter((o) => o.nome.trim());
    const entrada = {
      studentId: alunoId,
      data,
      hora: hora || null,
      tipo,
      status,
      pauta: pauta.trim() || null,
      conversado: conversado.trim() || null,
      proximaReuniaoEm: proxima || null,
      occurrenceId: ocorrenciaId,
      responsaveis: [
        // Responsável que deixou de ser do aluno vai como nome, para a ata antiga continuar salva.
        ...cadastrados.map((id) => {
          const c = responsaveis?.find((r) => (r.guardianId ?? r.id) === id);
          return idsCadastrados.has(id) ? { guardianId: id, parentesco: c?.parentesco ?? null } : { nome: reuniao?.responsaveis.find((r) => r.guardianId === id)?.nome ?? "Responsável", parentesco: null };
        }),
        ...nomes.map((o) => ({ nome: o.nome.trim(), parentesco: o.parentesco.trim() || null })),
      ],
      encaminhamentos: combinados
        .filter((c) => c.descricao.trim())
        .map((c) => ({
          id: c.id,
          descricao: c.descricao.trim(),
          responsavel: c.responsavel,
          prazo: c.prazo || null,
          cumprido: c.cumprido,
        })),
    };

    salvar.mutate(
      { id: reuniao?.id, entrada },
      {
        onSuccess: (salva) => {
          toast.success(editando ? "Reunião atualizada." : status === "Agendada" ? "Reunião agendada." : "Reunião registrada.");
          aoSalvar(salva);
        },
        onError: (err) => {
          const texto = err instanceof Error ? err.message : "Não foi possível salvar a reunião.";
          setErro(texto);
          toast.error(texto);
        },
      }
    );
  }

  const opcoesDeTurma = (turmas ?? []).map((t) => ({ valor: String(t.id), rotulo: t.className ?? `Turma ${t.id}` }));
  const opcoesDeAluno = (alunos ?? []).map((a) => ({ valor: String(a.id), rotulo: a.fullName }));
  const textoDoDia = status === "Agendada" ? "Dia da reunião" : "Dia em que aconteceu";

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
      {/* Quem */}
      <fieldset className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2 md:p-5">
        <legend className="px-1 font-heading text-[15px] font-semibold">Aluno e situação</legend>

        {editando ? (
          <div className="md:col-span-2">
            <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Aluno</p>
            <p className="mt-1 text-sm font-medium">
              {reuniao.aluno}
              {reuniao.turma && <span className="font-normal text-muted-foreground"> · {reuniao.turma}</span>}
            </p>
          </div>
        ) : (
          <>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="reuniao-turma">Turma</Label>
              <Escolha
                id="reuniao-turma"
                valor={turmaId === null ? "" : String(turmaId)}
                aoMudar={(v) => {
                  setTurmaId(v ? Number(v) : null);
                  setAlunoId(null);
                  setCadastrados([]);
                  setOcorrenciaId(null);
                }}
                opcoes={opcoesDeTurma}
              />
            </div>
            <div className="grid content-start gap-1.5">
              <Label htmlFor="reuniao-aluno">Aluno</Label>
              <Escolha
                id="reuniao-aluno"
                valor={alunoId === null ? "" : String(alunoId)}
                aoMudar={(v) => {
                  setAlunoId(v ? Number(v) : null);
                  setCadastrados([]);
                  setOcorrenciaId(null);
                }}
                opcoes={opcoesDeAluno}
                desabilitado={turmaId === null || carregandoAlunos}
                placeholder={turmaId === null ? "Escolha a turma primeiro" : carregandoAlunos ? "Carregando…" : "Selecione"}
              />
            </div>
          </>
        )}

        <div className="grid content-start gap-1.5">
          <Label htmlFor="reuniao-situacao">Situação</Label>
          <Escolha
            id="reuniao-situacao"
            valor={status}
            aoMudar={(v) => setStatus(v as StatusDaReuniao)}
            opcoes={STATUS_DO_FORMULARIO.filter((s) => !editando || reuniao.status === "Agendada" || s !== "Agendada").map((s) => ({
              valor: s,
              rotulo: ROTULO_DA_SITUACAO[s],
            }))}
          />
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="reuniao-tipo">Tipo</Label>
          <Escolha id="reuniao-tipo" valor={tipo} aoMudar={setTipo} opcoes={TIPOS_DE_REUNIAO.map((t) => ({ valor: t, rotulo: t }))} />
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="reuniao-data">{textoDoDia}</Label>
          <Input id="reuniao-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className="font-numeric" required />
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="reuniao-hora">Hora (opcional)</Label>
          <Input id="reuniao-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="font-numeric" />
        </div>
      </fieldset>

      {/* Participantes */}
      <fieldset className="grid gap-3 rounded-xl border border-border bg-card p-4 md:p-5">
        <legend className="px-1 font-heading text-[15px] font-semibold">Quem da família participa</legend>

        {alunoId === null ? (
          <p className="text-sm text-muted-foreground">Escolha o aluno para ver os responsáveis cadastrados.</p>
        ) : carregandoResponsaveis ? (
          <p className="text-sm text-muted-foreground" role="status">Carregando responsáveis…</p>
        ) : (responsaveis ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Este aluno não tem responsável cadastrado. Informe o nome abaixo.</p>
        ) : (
          <ul className="grid gap-1 sm:grid-cols-2">
            {(responsaveis ?? []).map((r) => {
              const id = r.guardianId ?? r.id;
              return (
                <li key={id}>
                  <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm md:min-h-0">
                    <Checkbox checked={cadastrados.includes(id)} onCheckedChange={(v) => alternarResponsavel(id, v === true)} />
                    <span className="min-w-0 break-words">
                      <span className="font-medium">{r.nome}</span>
                      {r.parentesco && <span className="text-muted-foreground"> ({r.parentesco})</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {outras.map((o, i) => (
          <div key={o.chave} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor={`outra-nome-${o.chave}`}>Outra pessoa {i + 1}</Label>
              <Input
                id={`outra-nome-${o.chave}`}
                value={o.nome}
                maxLength={200}
                placeholder="Nome"
                onChange={(e) => setOutras((l) => l.map((x) => (x.chave === o.chave ? { ...x, nome: e.target.value } : x)))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`outra-parentesco-${o.chave}`}>Parentesco</Label>
              <Input
                id={`outra-parentesco-${o.chave}`}
                value={o.parentesco}
                maxLength={60}
                placeholder="Avó, tio…"
                onChange={(e) => setOutras((l) => l.map((x) => (x.chave === o.chave ? { ...x, parentesco: e.target.value } : x)))}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remover outra pessoa ${i + 1}`}
              onClick={() => setOutras((l) => l.filter((x) => x.chave !== o.chave))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        <div>
          <Button type="button" variant="outline" onClick={() => setOutras((l) => [...l, { chave: novaChave(), nome: "", parentesco: "" }])}>
            <Plus className="size-4" />
            Outra pessoa (que não está no cadastro)
          </Button>
        </div>
      </fieldset>

      {/* Conteúdo */}
      <fieldset className="grid gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
        <legend className="px-1 font-heading text-[15px] font-semibold">Pauta e ata</legend>

        <div className="grid gap-1.5">
          <Label htmlFor="reuniao-ocorrencia">Ocorrência que motivou a reunião (opcional)</Label>
          <Escolha
            id="reuniao-ocorrencia"
            valor={ocorrenciaId === null ? "" : String(ocorrenciaId)}
            aoMudar={(v) => setOcorrenciaId(v && v !== "__nenhuma__" ? Number(v) : null)}
            desabilitado={alunoId === null}
            placeholder={alunoId === null ? "Escolha o aluno primeiro" : "Nenhuma"}
            opcoes={[
              { valor: "__nenhuma__", rotulo: "Nenhuma" },
              ...(ocorrencias ?? []).map((o) => ({
                valor: String(o.id),
                rotulo: `${o.categoria} · ${formatarData(o.createdAt)}`,
              })),
            ]}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="reuniao-pauta">Pauta</Label>
          <Textarea id="reuniao-pauta" value={pauta} maxLength={2000} rows={3} onChange={(e) => setPauta(e.target.value)} placeholder="O que a escola quer tratar." />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="reuniao-conversado">O que foi conversado</Label>
          <Textarea
            id="reuniao-conversado"
            value={conversado}
            maxLength={8000}
            rows={6}
            onChange={(e) => setConversado(e.target.value)}
            aria-describedby="reuniao-conversado-dica"
          />
          <p id="reuniao-conversado-dica" className="text-xs text-muted-foreground">
            Registro interno da escola, com dados de criança. A família não vê.
          </p>
        </div>
      </fieldset>

      {/* Combinados */}
      <fieldset className="grid gap-3 rounded-xl border border-border bg-card p-4 md:p-5">
        <legend className="px-1 font-heading text-[15px] font-semibold">Combinados</legend>
        <p className="text-[13px] text-muted-foreground">
          O que ficou combinado, de quem é a ação e até quando. Combinado vencido e não cumprido aparece em destaque.
        </p>

        {combinados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum combinado ainda.</p>}

        {combinados.map((c, i) => (
          <div key={c.chave} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[minmax(0,1fr)_9rem_10.5rem_auto] md:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor={`comb-desc-${c.chave}`}>Combinado {i + 1}</Label>
              <Input
                id={`comb-desc-${c.chave}`}
                value={c.descricao}
                maxLength={500}
                placeholder="Ex.: levar o laudo da fonoaudióloga"
                onChange={(e) => setCombinados((l) => l.map((x) => (x.chave === c.chave ? { ...x, descricao: e.target.value } : x)))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`comb-quem-${c.chave}`}>De quem</Label>
              <Escolha
                id={`comb-quem-${c.chave}`}
                valor={c.responsavel}
                aoMudar={(v) => setCombinados((l) => l.map((x) => (x.chave === c.chave ? { ...x, responsavel: v as QuemFaz } : x)))}
                opcoes={(Object.keys(ROTULO_DE_QUEM_FAZ) as QuemFaz[]).map((q) => ({ valor: q, rotulo: ROTULO_DE_QUEM_FAZ[q] }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`comb-prazo-${c.chave}`}>Prazo</Label>
              <Input
                id={`comb-prazo-${c.chave}`}
                type="date"
                value={c.prazo}
                className="font-numeric"
                onChange={(e) => setCombinados((l) => l.map((x) => (x.chave === c.chave ? { ...x, prazo: e.target.value } : x)))}
              />
            </div>
            <div className="flex items-center justify-between gap-2 md:justify-end">
              <label className="flex min-h-10 items-center gap-2 text-sm md:min-h-0">
                <Checkbox
                  checked={c.cumprido}
                  onCheckedChange={(v) => setCombinados((l) => l.map((x) => (x.chave === c.chave ? { ...x, cumprido: v === true } : x)))}
                />
                Cumprido
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remover combinado ${i + 1}`}
                onClick={() => setCombinados((l) => l.filter((x) => x.chave !== c.chave))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}

        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setCombinados((l) => [...l, { chave: novaChave(), descricao: "", responsavel: "Escola", prazo: "", cumprido: false }])
            }
          >
            <Plus className="size-4" />
            Adicionar combinado
          </Button>
        </div>

        <div className="grid gap-1.5 border-t border-border pt-4 md:max-w-xs">
          <Label htmlFor="reuniao-proxima">Próxima reunião (opcional)</Label>
          <Input id="reuniao-proxima" type="date" value={proxima} className="font-numeric" onChange={(e) => setProxima(e.target.value)} />
        </div>
      </fieldset>

      {erro && (
        <div role="alert" className="rounded-xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {erro}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {aoCancelar ? (
          <Button type="button" variant="outline" onClick={aoCancelar} className="w-full sm:w-auto">
            Descartar alterações
          </Button>
        ) : (
          <Link href={hrefDeVolta} className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}>
            Voltar
          </Link>
        )}
        <Button type="submit" variant="action" disabled={salvar.isPending || carregandoResponsaveis} className="w-full sm:w-auto">
          {salvar.isPending ? "Salvando…" : editando ? "Salvar alterações" : status === "Agendada" ? "Agendar reunião" : "Registrar reunião"}
        </Button>
      </div>
    </form>
  );
}
