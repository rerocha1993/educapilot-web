"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, GraduationCap, Plus, Save, Trash2 } from "lucide-react";

import { Campo, CampoSelect } from "@/components/notas/campos";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ErroDeCarga } from "@/components/rh/campo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarNota, lerNota } from "@/lib/notas/calculos";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  ROTULO_DO_TIPO,
  useAnosLetivos,
  useConfiguracaoDaTurma,
  useMaterias,
  useProfessoresPossiveis,
  useSalvarConfiguracaoDaTurma,
  type ConfiguracaoDaTurma,
  type EscalaItem,
  type TipoDeAvaliacao,
} from "@/lib/notas/use-notas";
import { cn } from "@/lib/utils";

const TIPOS: TipoDeAvaliacao[] = ["Nota", "Conceito", "Descritivo"];
const SEM_PROFESSOR = "";

/** Configuração da avaliação por turma no ano: tipo, média mínima, escalas e as matérias com a professora de cada uma. */
export function TurmasPainel() {
  const anos = useAnosLetivos();
  const turmas = useClasses();
  const [anoEscolhido, setAnoEscolhido] = useState<string | null>(null);
  const [aberta, setAberta] = useState<number | null>(null);

  const lista = anos.data ?? [];
  const ano = lista.find((a) => a.id === anoEscolhido) ?? lista.find((a) => a.ativo) ?? lista[0] ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {anos.isError && <ErroDeCarga texto="Não foi possível carregar os anos letivos." onTentar={() => void anos.refetch()} />}
      {anos.isLoading && <Skeleton className="h-14 rounded-xl" />}

      {!anos.isLoading && !anos.isError && !ano && (
        <EstadoVazio icone={<GraduationCap />} titulo="Cadastre um ano letivo primeiro" texto="A configuração das turmas vale para um ano letivo. Crie o ano na aba Anos e períodos." />
      )}

      {ano && (
        <>
          <div className="grid gap-2 sm:grid-cols-[12rem]">
            <CampoSelect
              rotulo="Ano letivo"
              value={ano.id}
              onChange={(v) => {
                setAnoEscolhido(v);
                setAberta(null);
              }}
              opcoes={lista.map((a) => ({ valor: a.id, rotulo: String(a.ano) }))}
            />
          </div>

          {turmas.isLoading && <Skeleton className="h-14 rounded-xl" />}
          {turmas.isError && <ErroDeCarga texto="Não foi possível carregar as turmas." onTentar={() => void turmas.refetch()} />}
          {!turmas.isLoading && (turmas.data ?? []).length === 0 && <EstadoVazio icone={<GraduationCap />} titulo="Nenhuma turma cadastrada" texto="Crie as turmas em Administração → Turmas." />}

          <ul className="flex flex-col gap-2">
            {(turmas.data ?? []).map((t) => {
              const id = t.id ?? 0;
              return (
                <li key={id} className="rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setAberta(aberta === id ? null : id)}
                    aria-expanded={aberta === id}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                  >
                    <ChevronDown className={cn("size-4 shrink-0 transition-transform", aberta !== id && "-rotate-90")} />
                    <span className="min-w-0 flex-1 truncate font-heading text-[15px] font-semibold">{t.className}</span>
                  </button>
                  {aberta === id && <EditorDaTurma key={`${id}-${ano.ano}`} classId={id} ano={ano.ano} />}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function EditorDaTurma({ classId, ano }: { classId: number; ano: number }) {
  const { data, isLoading, isError, error, refetch } = useConfiguracaoDaTurma(classId, ano);

  return (
    <div className="border-t border-border px-3 py-3">
      {isLoading && <Skeleton className="h-40 rounded-lg" />}
      {isError && <ErroDeCarga texto={error instanceof Error ? error.message : "Não foi possível carregar a configuração."} onTentar={() => void refetch()} />}
      {data && <FormularioDaTurma key={`${data.classId}-${data.anoLetivoId}`} config={data} />}
    </div>
  );
}

interface LinhaDeMateria {
  chave: number;
  materiaId: string;
  professorUserId: string;
}

interface LinhaDeEscala {
  chave: number;
  sigla: string;
  nome: string;
  valor: string;
}

const paraLinhas = (escala: EscalaItem[]): LinhaDeEscala[] =>
  escala.map((e, i) => ({ chave: i, sigla: e.sigla, nome: e.nome, valor: formatarNota(e.valor) }));

function escalaValida(linhas: LinhaDeEscala[]): boolean {
  if (linhas.length === 0) return false;
  const siglas = new Set<string>();
  for (const l of linhas) {
    const v = lerNota(l.valor);
    if (!l.sigla.trim() || !l.nome.trim() || v == null || Number.isNaN(v) || v < 0 || v > 10) return false;
    const s = l.sigla.trim().toLowerCase();
    if (siglas.has(s)) return false;
    siglas.add(s);
  }
  return true;
}

const daEscala = (linhas: LinhaDeEscala[]): EscalaItem[] =>
  linhas.map((l) => ({ sigla: l.sigla.trim(), nome: l.nome.trim(), valor: lerNota(l.valor) ?? 0 }));

function FormularioDaTurma({ config }: { config: ConfiguracaoDaTurma }) {
  const salvar = useSalvarConfiguracaoDaTurma();
  const { data: materias } = useMaterias();
  // A lista vem do servidor (usuários ativos da equipe, não só o perfil Professor: coordenação também dá aula).
  const { data: professores = [] } = useProfessoresPossiveis();

  const [tipo, setTipo] = useState<TipoDeAvaliacao>(config.tipo);
  const [media, setMedia] = useState(formatarNota(config.mediaMinima ?? 6));
  const [conceitos, setConceitos] = useState(() => paraLinhas(config.conceitos));
  const [comportamento, setComportamento] = useState(() => paraLinhas(config.conceitosDeComportamento));
  const [linhas, setLinhas] = useState<LinhaDeMateria[]>(() =>
    config.materias.map((m, i) => ({ chave: i, materiaId: m.materiaId, professorUserId: m.professorUserId ?? SEM_PROFESSOR }))
  );
  const [proximaChave, setProximaChave] = useState(1000);

  const mediaNumero = lerNota(media);
  const mediaValida = tipo !== "Nota" || (mediaNumero != null && !Number.isNaN(mediaNumero) && mediaNumero >= 0 && mediaNumero <= 10);
  const materiasValidas = linhas.every((l) => l.materiaId) && new Set(linhas.map((l) => l.materiaId)).size === linhas.length;
  const conceitosValidos = tipo !== "Conceito" || escalaValida(conceitos);
  const pronto = mediaValida && materiasValidas && conceitosValidos && escalaValida(comportamento);

  const materiasAtivas = (materias ?? []).filter((m) => m.ativa || linhas.some((l) => l.materiaId === m.id));

  async function handleSalvar() {
    if (!pronto) return;
    try {
      await salvar.mutateAsync({
        classId: config.classId,
        ano: config.ano,
        entrada: {
          tipo,
          mediaMinima: tipo === "Nota" ? mediaNumero : null,
          ...(tipo === "Conceito" ? { conceitos: daEscala(conceitos) } : {}),
          conceitosDeComportamento: daEscala(comportamento),
          materias: linhas.map((l) => ({ materiaId: l.materiaId, professorUserId: l.professorUserId || null })),
        },
      });
      toast.success("Configuração da turma salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  function adicionarMateria() {
    const usadas = new Set(linhas.map((l) => l.materiaId));
    const livre = materiasAtivas.find((m) => !usadas.has(m.id));
    setLinhas((atual) => [...atual, { chave: proximaChave, materiaId: livre?.id ?? "", professorUserId: SEM_PROFESSOR }]);
    setProximaChave((c) => c + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      {!config.configurada && (
        <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-[12.5px] text-muted-foreground">
          Esta turma ainda não foi configurada em {config.ano}. Os valores abaixo são os padrões; ajuste e salve.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Campo rotulo="Tipo de avaliação">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoDeAvaliacao)}
            className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-sm font-normal normal-case tracking-normal text-foreground md:h-9"
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ROTULO_DO_TIPO[t]}
              </option>
            ))}
          </select>
        </Campo>
        {tipo === "Nota" && (
          <Campo rotulo="Média mínima">
            <Input inputMode="decimal" value={media} onChange={(e) => setMedia(e.target.value)} aria-invalid={!mediaValida || undefined} />
          </Campo>
        )}
      </div>

      {tipo === "Conceito" && <EditorDeEscala titulo="Conceitos da turma" linhas={conceitos} onChange={setConceitos} />}
      <EditorDeEscala titulo="Conceitos de comportamento" linhas={comportamento} onChange={setComportamento} />

      <section className="flex flex-col gap-2">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Matérias e professores</h3>
        {linhas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma matéria nesta turma ainda.</p>}
        <ul className="flex flex-col gap-2">
          {linhas.map((l) => {
            const repetida = l.materiaId !== "" && linhas.filter((o) => o.materiaId === l.materiaId).length > 1;
            return (
              <li key={l.chave} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <select
                  aria-label="Matéria"
                  value={l.materiaId}
                  aria-invalid={repetida || !l.materiaId || undefined}
                  onChange={(e) => setLinhas((atual) => atual.map((o) => (o.chave === l.chave ? { ...o, materiaId: e.target.value } : o)))}
                  className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-sm text-foreground md:h-9"
                >
                  <option value="">Escolha a matéria</option>
                  {materiasAtivas.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Professor"
                  value={l.professorUserId}
                  onChange={(e) => setLinhas((atual) => atual.map((o) => (o.chave === l.chave ? { ...o, professorUserId: e.target.value } : o)))}
                  className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-sm text-foreground md:h-9"
                >
                  <option value={SEM_PROFESSOR}>Sem professor definido</option>
                  {professores.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <Button variant="ghost" size="icon" aria-label="Tirar a matéria da turma" onClick={() => setLinhas((atual) => atual.filter((o) => o.chave !== l.chave))}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
        {!materiasValidas && <p className="text-[12.5px] text-destructive">Escolha a matéria em cada linha, sem repetir.</p>}
        <div>
          <Button variant="outline" onClick={adicionarMateria} disabled={(materias ?? []).length === 0}>
            <Plus className="size-4" />
            Adicionar matéria
          </Button>
          {(materias ?? []).length === 0 && <Badge variant="outline" className="ml-2">Cadastre matérias na aba Matérias</Badge>}
        </div>
      </section>

      <div className="flex justify-end">
        <Button variant="action" onClick={handleSalvar} disabled={!pronto || salvar.isPending}>
          <Save className="size-4" />
          {salvar.isPending ? "Salvando..." : "Salvar turma"}
        </Button>
      </div>
    </div>
  );
}

function EditorDeEscala({ titulo, linhas, onChange }: { titulo: string; linhas: LinhaDeEscala[]; onChange: (l: LinhaDeEscala[]) => void }) {
  const valida = escalaValida(linhas);

  function mudar(chave: number, campo: "sigla" | "nome" | "valor", valor: string) {
    onChange(linhas.map((l) => (l.chave === chave ? { ...l, [campo]: valor } : l)));
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">{titulo}</h3>
      <ul className="flex flex-col gap-2">
        {linhas.map((l) => (
          <li key={l.chave} className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem_auto] items-center gap-2">
            <Input aria-label="Sigla" value={l.sigla} maxLength={4} placeholder="Sigla" onChange={(e) => mudar(l.chave, "sigla", e.target.value)} />
            <Input aria-label="Nome" value={l.nome} maxLength={40} placeholder="Nome" onChange={(e) => mudar(l.chave, "nome", e.target.value)} />
            <Input aria-label="Valor de 0 a 10" inputMode="decimal" value={l.valor} placeholder="0 a 10" onChange={(e) => mudar(l.chave, "valor", e.target.value)} />
            <Button variant="ghost" size="icon" aria-label={`Remover ${l.sigla || "item"}`} onClick={() => onChange(linhas.filter((o) => o.chave !== l.chave))}>
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      {!valida && <p className="text-[12.5px] text-destructive">Cada item precisa de sigla (sem repetir), nome e valor de 0 a 10.</p>}
      <p className="text-[12px] text-muted-foreground">O valor entra na média e nos gráficos. Deixe do melhor para o pior.</p>
      <div>
        <Button
          variant="outline"
          onClick={() => onChange([...linhas, { chave: Math.max(-1, ...linhas.map((l) => l.chave)) + 1, sigla: "", nome: "", valor: "" }])}
        >
          <Plus className="size-4" />
          Adicionar
        </Button>
      </div>
    </section>
  );
}
