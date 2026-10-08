"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Campo } from "@/components/rh/campo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useClasses } from "@/lib/kernel/use-classes";
import { useAllStudents } from "@/lib/kernel/use-students";
import { useIniciarConversa } from "@/lib/relacionamento/use-chat";
import { cn } from "@/lib/utils";

const TODAS = "__todas__";
/** A lista é rolável, mas centenas de linhas pesam: passou disto, pede para refinar a busca. */
const MAXIMO_NA_LISTA = 60;

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Começar uma conversa com a família de um aluno: escolhe a turma, busca pelo nome e marca o
 * aluno. O professor só vê as turmas dele (`useClasses`), então só consegue iniciar conversa com
 * as famílias delas.
 */
export function DialogIniciarConversa({ onFechar }: { onFechar: () => void }) {
  const router = useRouter();
  const iniciar = useIniciarConversa();
  const { data: alunos, isLoading, isError } = useAllStudents();
  const { data: classes } = useClasses();

  const [turma, setTurma] = useState(TODAS);
  const [busca, setBusca] = useState("");
  const [alunoId, setAlunoId] = useState<number | null>(null);
  const [assunto, setAssunto] = useState("");

  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [classes]
  );
  const nomeDaTurma = useMemo(() => new Map(turmas.map((t) => [t.id, t.nome])), [turmas]);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    // Para o professor, só os alunos das turmas dele; para a gestão, a escola toda.
    return (alunos ?? [])
      .filter(
        (a) =>
          nomeDaTurma.has(a.classId) &&
          (turma === TODAS || String(a.classId) === turma) &&
          (termo === "" || normalizar(a.fullName ?? "").includes(termo))
      )
      .sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? "", "pt-BR"));
  }, [alunos, turma, busca, nomeDaTurma]);
  const visiveis = filtrados.slice(0, MAXIMO_NA_LISTA);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (alunoId === null) return void toast.error("Escolha o aluno.");
    try {
      const conversa = await iniciar.mutateAsync({ studentId: alunoId, assunto });
      onFechar();
      router.push(`/relacionamento/chat/${conversa.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível iniciar a conversa.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !iniciar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar conversa</DialogTitle>
          <DialogDescription>Escolha o aluno. A conversa é com os responsáveis dele.</DialogDescription>
        </DialogHeader>

        <form onSubmit={confirmar} noValidate className="grid gap-3.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={turma} onValueChange={(v) => v && setTurma(String(v))}>
              <SelectTrigger aria-label="Filtrar alunos por turma" className="w-full">
                <SelectValue>{() => (turma === TODAS ? "Todas as turmas" : (nomeDaTurma.get(Number(turma)) ?? "Turma"))}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value={TODAS}>Todas as turmas</SelectItem>
                {turmas.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Buscar aluno pelo nome"
                placeholder="Buscar pelo nome"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-lg" />
          ) : isError ? (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível carregar os alunos.
            </p>
          ) : visiveis.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-dashed px-3 py-4 text-center text-[13px] text-muted-foreground">
              Nenhum aluno encontrado.
            </p>
          ) : (
            <fieldset className="min-w-0">
              <legend className="sr-only">Aluno</legend>
              <ul className="grid max-h-60 gap-0.5 overflow-y-auto rounded-lg border border-border p-1.5">
                {visiveis.map((a) => (
                  <li key={a.id}>
                    <label
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted md:min-h-9",
                        alunoId === a.id && "bg-accent text-accent-foreground"
                      )}
                    >
                      <input
                        type="radio"
                        name="aluno-da-conversa"
                        value={a.id}
                        checked={alunoId === a.id}
                        onChange={() => setAlunoId(a.id)}
                        className="size-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 flex-1 break-words">{a.fullName}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{nomeDaTurma.get(a.classId) ?? ""}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {filtrados.length > visiveis.length && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Mostrando {visiveis.length} de {filtrados.length}. Busque pelo nome para achar os outros.
                </p>
              )}
            </fieldset>
          )}

          <Campo id="assunto-da-conversa" rotulo="Assunto (opcional)">
            <Input
              id="assunto-da-conversa"
              maxLength={120}
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Ex.: Reunião de pais, adaptação"
            />
          </Campo>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFechar} disabled={iniciar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={alunoId === null || iniciar.isPending}>
              {iniciar.isPending ? "Abrindo…" : "Iniciar conversa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
