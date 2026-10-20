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
 * Entrada do Dossiê do aluno: a lista das crianças com busca por nome e filtro de turma. Antes o dossiê só abria a partir
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

export default function DossiePage() {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="md:hidden">
        <RotinaNav />
      </div>

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo="Dossiê do aluno"
        apoio="Ficha, frequência, ocorrências, reuniões, diário e portaria de cada criança. Escolha uma para abrir e imprimir."
      />

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_14rem]">
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
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
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
        <div className="flex flex-col gap-2">
          <p className="text-[12.5px] text-muted-foreground">
            <span className="font-numeric">{lista.length}</span> {lista.length === 1 ? "criança" : "crianças"}
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {lista.map((a) => {
              const anos = idade(a.birthDate);
              return (
                <li key={a.id}>
                  <Link
                    href={`/ocorrencias/aluno/${a.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.fullName}</span>
                      <span className="block truncate text-[12.5px] text-muted-foreground">
                        {[nomeDaTurma.get(a.classId), anos].filter(Boolean).join(" · ") || "Sem turma"}
                      </span>
                    </span>
                    <span className="hidden items-center gap-1 text-[12.5px] text-muted-foreground sm:inline-flex">
                      <FileText className="size-3.5" /> Abrir dossiê
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
