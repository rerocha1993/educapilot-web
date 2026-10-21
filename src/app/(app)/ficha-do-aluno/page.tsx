"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { useClasses } from "@/lib/kernel/use-classes";
import { useAllStudents } from "@/lib/kernel/use-students";

/**
 * Entrada do Ficha do aluno: a lista das crianças com busca por nome e filtro de turma. Antes o dossiê só abria a partir
 * de Ocorrências (escolher o aluno num seletor) ou de uma reunião, e a direção não achava onde ficava.
 *
 * A lista vem de GET /api/Student, que já devolve só os alunos das turmas do professor; o dossiê em si continua em
 * /ocorrencias/aluno/[id] para não quebrar os atalhos que já existem.
 */

/** Sem acento e minúsculo, para "joao" achar "João". */
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function idade(nascimento: string | null | undefined): string | null {
  if (!nascimento) return null;
  const data = new Date(nascimento);
  if (Number.isNaN(data.getTime())) return null;
  const hoje = new Date();
  let meses = (hoje.getFullYear() - data.getFullYear()) * 12 + (hoje.getMonth() - data.getMonth());
  if (hoje.getDate() < data.getDate()) meses -= 1;
  if (meses < 0) return null;
  if (meses < 24) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  return `${anos} anos`;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export default function FichaDoAlunoPage() {
  const { data: alunos, isLoading, isError } = useAllStudents();
  const { data: turmas } = useClasses();
  const [busca, setBusca] = useState("");
  const [turmaId, setTurmaId] = useState<number | null>(null);

  const nomeDaTurma = useMemo(() => new Map((turmas ?? []).map((t) => [t.id, t.className])), [turmas]);

  const lista = useMemo(() => {
    const termo = normalizar(busca.trim());
    return (alunos ?? [])
      .filter((a) => turmaId == null || a.classId === turmaId)
      .filter((a) => !termo || normalizar(a.fullName).includes(termo))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  }, [alunos, busca, turmaId]);

  // Uma faixa por turma, na ordem das turmas da escola: 60 nomes soltos numa coluna só não se leem.
  const grupos = useMemo(() => {
    const ordem = new Map((turmas ?? []).map((t, i) => [t.id, i]));
    const porTurma = new Map<number, typeof lista>();
    for (const a of lista) porTurma.set(a.classId, [...(porTurma.get(a.classId) ?? []), a]);
    return [...porTurma.entries()]
      .sort(([x], [y]) => (ordem.get(x) ?? 999) - (ordem.get(y) ?? 999))
      .map(([classId, criancas]) => ({ classId, nome: nomeDaTurma.get(classId) ?? "Sem turma", criancas }));
  }, [lista, turmas, nomeDaTurma]);

  return (
    <div className="flex flex-col gap-4">
      <div className="md:hidden">
        <RotinaNav />
      </div>

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo="Ficha do aluno"
        apoio="Ficha, frequência, ocorrências, reuniões, diário e portaria de cada criança. Escolha uma para abrir e imprimir."
      />

      <div className="grid max-w-3xl gap-2 md:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar criança pelo nome"
            placeholder="Buscar pelo nome da criança"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-10 pl-9 md:h-9"
            autoFocus
          />
        </div>
        <Select value={turmaId?.toString() ?? "__todas__"} onValueChange={(v) => setTurmaId(v === "__todas__" ? null : Number(v))}>
          <SelectTrigger aria-label="Turma" className="h-10 w-full md:h-9">
            <SelectValue>{() => (turmaId == null ? "Todas as turmas" : nomeDaTurma.get(turmaId) ?? "Turma")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas__">Todas as turmas</SelectItem>
            {(turmas ?? []).map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.className}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EstadoVazio icone={<FileText />} titulo="Não foi possível carregar as crianças" texto="Tente recarregar a página." />
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<Search />}
          titulo={busca || turmaId != null ? "Nenhuma criança encontrada" : "Nenhuma criança cadastrada"}
          texto={busca || turmaId != null ? "Confira o nome ou troque a turma." : undefined}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-[12.5px] text-muted-foreground">
            <span className="font-numeric">{lista.length}</span> {lista.length === 1 ? "criança" : "crianças"}
          </p>
          {grupos.map((g) => (
            <section key={g.classId} aria-label={g.nome} className="flex flex-col gap-2">
              <h2 className="flex items-baseline gap-2 text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
                {g.nome} <span className="font-numeric font-normal normal-case tracking-normal">{g.criancas.length}</span>
              </h2>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-2">
                {g.criancas.map((a) => (
                  <li key={a.id} className="min-w-0">
                    <Link
                      href={`/ocorrencias/aluno/${a.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:border-primary focus-visible:outline-none"
                    >
                      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-muted font-heading text-[12.5px] font-semibold text-muted-foreground">
                        {iniciais(a.fullName)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{a.fullName}</span>
                        <span className="block truncate text-[12px] text-muted-foreground">{idade(a.birthDate) ?? "Idade não informada"}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
