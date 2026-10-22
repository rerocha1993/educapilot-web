"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";

import { Campo, CLASSE_DO_CONTROLE } from "@/components/notas/campos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { abaixoDaMedia, formatarNota, lerNota, mediaDoAluno, textoDaCelula } from "@/lib/notas/calculos";
import {
  useExcluirInstrumento,
  useSalvarInstrumento,
  useSalvarLancamento,
  type Instrumento,
  type Lancamento,
  type NotaEntrada,
} from "@/lib/notas/use-notas";
import { cn } from "@/lib/utils";

const LIMITE_DO_DESCRITIVO = 4000;

const chaveDaCelula = (studentId: number, instrumentoId: string) => `${studentId}|${instrumentoId}`;

/**
 * A grade de lançamento: um aluno por linha, uma coluna por avaliação (com o peso no cabeçalho) e a
 * média do período no fim. Digita-se direto: Enter/seta para baixo descem, Tab vai para a direita, a
 * vírgula vale. No tipo Conceito a célula aceita a sigla da escala; no Descritivo cada aluno tem um texto.
 *
 * Só as células mexidas viajam no salvar. O estado "não salvo" avisa a tela de cima (trocar de turma
 * ou de período pergunta antes) e o navegador (fechar a aba).
 */
export function GradeDeLancamento({
  lancamento,
  onSujo,
}: {
  lancamento: Lancamento;
  onSujo: (sujo: boolean) => void;
}) {
  const { tipo, conceitos, instrumentos, alunos, podeEditar, mediaMinima } = lancamento;
  const salvar = useSalvarLancamento();

  const [edicoes, setEdicoes] = useState<Record<string, string>>({});
  const [descritivos, setDescritivos] = useState<Record<number, string>>({});
  const [instrumentoAberto, setInstrumentoAberto] = useState<Instrumento | "novo" | null>(null);

  const sujo = Object.keys(edicoes).length > 0 || Object.keys(descritivos).length > 0;
  useEffect(() => {
    onSujo(sujo);
  }, [sujo, onSujo]);
  useEffect(() => () => onSujo(false), [onSujo]);

  useEffect(() => {
    if (!sujo) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  /** O que a célula mostra: o que a pessoa digitou, ou o que está gravado. */
  function textoDe(studentId: number, inst: Instrumento): string {
    const chave = chaveDaCelula(studentId, inst.id);
    if (chave in edicoes) return edicoes[chave];
    const aluno = alunos.find((a) => a.studentId === studentId);
    return textoDaCelula(aluno?.notas[inst.id], tipo);
  }

  /** null = vazio; "invalido" = fora de 0–10 ou fora da escala. */
  function interpretar(texto: string): number | string | null | "invalido" {
    const t = texto.trim();
    if (t === "") return null;
    if (tipo === "Nota") {
      const n = lerNota(t);
      if (n == null || Number.isNaN(n) || n < 0 || n > 10) return "invalido";
      return Math.round(n * 10) / 10;
    }
    const item = conceitos.find((c) => c.sigla.toLowerCase() === t.toLowerCase());
    return item ? item.sigla : "invalido";
  }

  const textosPorAluno = useMemo(() => {
    const mapa = new Map<number, Record<string, string>>();
    for (const a of alunos) {
      const linha: Record<string, string> = {};
      for (const inst of instrumentos) {
        const chave = chaveDaCelula(a.studentId, inst.id);
        linha[inst.id] = chave in edicoes ? edicoes[chave] : textoDaCelula(a.notas[inst.id], tipo);
      }
      mapa.set(a.studentId, linha);
    }
    return mapa;
  }, [alunos, instrumentos, edicoes, tipo]);

  const invalidas = Object.entries(edicoes).filter(([, t]) => interpretar(t) === "invalido").length;

  function mudar(studentId: number, inst: Instrumento, texto: string) {
    const chave = chaveDaCelula(studentId, inst.id);
    const aluno = alunos.find((a) => a.studentId === studentId);
    const original = textoDaCelula(aluno?.notas[inst.id], tipo);
    setEdicoes((atual) => {
      const proximo = { ...atual };
      if (texto === original) delete proximo[chave];
      else proximo[chave] = texto;
      return proximo;
    });
  }

  function mudarDescritivo(studentId: number, texto: string) {
    const original = alunos.find((a) => a.studentId === studentId)?.descritivo ?? "";
    setDescritivos((atual) => {
      const proximo = { ...atual };
      if (texto === original) delete proximo[studentId];
      else proximo[studentId] = texto;
      return proximo;
    });
  }

  /** Enter e seta para baixo/cima andam na coluna; ao fim da coluna, Enter passa para a próxima. */
  function teclar(e: React.KeyboardEvent<HTMLInputElement>, linha: number, coluna: number) {
    const ir = (l: number, c: number) => {
      const alvo = document.querySelector<HTMLInputElement>(`[data-celula="${l}-${c}"]`);
      if (alvo) {
        e.preventDefault();
        alvo.focus();
        alvo.select();
        return true;
      }
      return false;
    };
    if (e.key === "Enter" || e.key === "ArrowDown") {
      if (!ir(linha + 1, coluna) && e.key === "Enter") ir(0, coluna + 1);
    } else if (e.key === "ArrowUp") {
      ir(linha - 1, coluna);
    }
  }

  async function handleSalvar() {
    const notas: NotaEntrada[] = [];
    for (const [chave, texto] of Object.entries(edicoes)) {
      const [studentId, instrumentoId] = chave.split("|");
      const valor = interpretar(texto);
      if (valor === "invalido") return;
      notas.push({
        instrumentoId,
        studentId: Number(studentId),
        valor: tipo === "Nota" ? (valor as number | null) : null,
        conceito: tipo === "Conceito" ? (valor as string | null) : null,
      });
    }
    const textos = Object.entries(descritivos).map(([studentId, texto]) => ({ studentId: Number(studentId), texto: texto.trim() }));

    try {
      await salvar.mutateAsync({
        materiaDaTurmaId: lancamento.materiaDaTurmaId,
        periodoId: lancamento.periodoId,
        ...(notas.length > 0 ? { notas } : {}),
        ...(textos.length > 0 ? { descritivos: textos } : {}),
      });
      setEdicoes({});
      setDescritivos({});
      toast.success("Salvo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  const barraDeSalvar = podeEditar && (
    <div className="sticky bottom-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
      <p className={cn("text-[12.5px]", sujo ? "font-semibold text-action" : "text-muted-foreground")}>
        {invalidas > 0
          ? tipo === "Nota"
            ? `${invalidas} ${invalidas === 1 ? "valor inválido" : "valores inválidos"}: use de 0 a 10.`
            : `${invalidas} ${invalidas === 1 ? "valor fora da escala" : "valores fora da escala"}.`
          : sujo
            ? "Há alterações não salvas."
            : "Tudo salvo."}
      </p>
      <Button variant="action" disabled={!sujo || invalidas > 0 || salvar.isPending} onClick={handleSalvar}>
        <Save className="size-4" />
        {salvar.isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );

  if (tipo === "Descritivo") {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        {alunos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma criança nesta turma.</p>}
        <ul className="flex flex-col gap-2">
          {alunos.map((a) => {
            const texto = a.studentId in descritivos ? descritivos[a.studentId] : (a.descritivo ?? "");
            return (
              <li key={a.studentId} className="rounded-xl border border-border bg-card p-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <Link href={`/notas/boletim/${a.studentId}`} className="truncate font-medium hover:underline">
                    {a.nome}
                  </Link>
                  <span className="font-numeric text-[11.5px] text-muted-foreground">
                    {texto.length}/{LIMITE_DO_DESCRITIVO}
                  </span>
                </div>
                <Textarea
                  aria-label={`Parecer descritivo de ${a.nome}`}
                  value={texto}
                  disabled={!podeEditar}
                  maxLength={LIMITE_DO_DESCRITIVO}
                  rows={3}
                  placeholder="Como a criança se desenvolveu neste período"
                  onChange={(e) => mudarDescritivo(a.studentId, e.target.value)}
                />
              </li>
            );
          })}
        </ul>
        {barraDeSalvar}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-muted-foreground">
          {instrumentos.length === 0
            ? "Nenhuma avaliação neste período. Adicione a primeira (prova, trabalho, participação…)."
            : tipo === "Nota"
              ? "Digite de 0 a 10 (a vírgula vale). Enter desce; Tab vai para a direita."
              : `Digite a sigla: ${conceitos.map((c) => c.sigla).join(", ")}. Enter desce; Tab vai para a direita.`}
        </p>
        {podeEditar && (
          <Button variant="outline" onClick={() => setInstrumentoAberto("novo")}>
            <Plus className="size-4" />
            Nova avaliação
          </Button>
        )}
      </div>

      {instrumentos.length > 0 && (
        // A grade rola dentro do contêiner; a página nunca rola de lado.
        <div className="max-w-full overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="sticky left-0 z-[1] min-w-40 bg-muted px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Aluno
                </th>
                {instrumentos.map((inst) => (
                  <th key={inst.id} className="min-w-24 px-2 py-1.5 text-center align-bottom">
                    <button
                      type="button"
                      disabled={!podeEditar}
                      onClick={() => setInstrumentoAberto(inst)}
                      className="group inline-flex max-w-32 flex-col items-center gap-0 rounded px-1 enabled:hover:bg-muted"
                      title={podeEditar ? "Editar avaliação" : undefined}
                    >
                      <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold">
                        <span className="truncate">{inst.nome}</span>
                        {podeEditar && <Pencil aria-hidden className="size-3 shrink-0 opacity-40 group-hover:opacity-100" />}
                      </span>
                      <span className="font-numeric text-[11px] font-normal text-muted-foreground">peso {formatarNota(inst.peso)}</span>
                    </button>
                  </th>
                ))}
                <th className="min-w-20 px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Média
                </th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((a, linha) => {
                const textos = textosPorAluno.get(a.studentId) ?? {};
                const { media, conceito } = mediaDoAluno(textos, instrumentos, tipo, conceitos);
                const baixa = tipo === "Nota" && abaixoDaMedia(media, mediaMinima);
                return (
                  <tr key={a.studentId} className="border-b border-border last:border-b-0">
                    <th scope="row" className="sticky left-0 z-[1] bg-card px-3 py-1 text-left font-medium">
                      <Link href={`/notas/boletim/${a.studentId}`} className="block max-w-48 truncate hover:underline" title="Abrir o boletim">
                        {a.nome}
                      </Link>
                    </th>
                    {instrumentos.map((inst, coluna) => {
                      const texto = textoDe(a.studentId, inst);
                      const invalido = interpretar(texto) === "invalido";
                      const mexida = chaveDaCelula(a.studentId, inst.id) in edicoes;
                      return (
                        <td key={inst.id} className="px-1.5 py-1 text-center">
                          <Input
                            data-celula={`${linha}-${coluna}`}
                            aria-label={`${inst.nome} de ${a.nome}`}
                            aria-invalid={invalido || undefined}
                            inputMode={tipo === "Nota" ? "decimal" : "text"}
                            autoComplete="off"
                            value={texto}
                            disabled={!podeEditar}
                            maxLength={tipo === "Nota" ? 5 : 6}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) => mudar(a.studentId, inst, e.target.value)}
                            onBlur={() => {
                              // Conceito digitado em minúscula vira a sigla da escala.
                              if (tipo !== "Conceito") return;
                              const v = interpretar(texto);
                              if (typeof v === "string" && v !== "invalido" && v !== texto) mudar(a.studentId, inst, v);
                            }}
                            onKeyDown={(e) => teclar(e, linha, coluna)}
                            className={cn(
                              "font-numeric mx-auto h-9 w-20 px-1 text-center md:h-8",
                              mexida && !invalido && "border-action bg-action-soft"
                            )}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-center">
                      {media == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <Badge variant={baixa ? "overdue" : "success"} className="font-numeric">
                          {formatarNota(media)}
                          {conceito ? ` · ${conceito}` : ""}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              {alunos.length === 0 && (
                <tr>
                  <td colSpan={instrumentos.length + 2} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhuma criança nesta turma.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {mediaMinima != null && tipo === "Nota" && (
        <p className="text-[12px] text-muted-foreground">
          Média mínima da turma: <span className="font-numeric">{formatarNota(mediaMinima)}</span>. Abaixo dela, a média fica em vermelho.
        </p>
      )}

      {barraDeSalvar}

      <InstrumentoDialog
        aberto={instrumentoAberto}
        lancamento={lancamento}
        onFechar={() => setInstrumentoAberto(null)}
      />
    </div>
  );
}

function InstrumentoDialog({
  aberto,
  lancamento,
  onFechar,
}: {
  aberto: Instrumento | "novo" | null;
  lancamento: Lancamento;
  onFechar: () => void;
}) {
  // O formulário só existe com o diálogo aberto: a key recomeça os campos a cada abertura.
  return (
    <Dialog open={aberto != null} onOpenChange={(aberta) => !aberta && onFechar()}>
      <DialogContent>
        {aberto != null && (
          <FormularioDoInstrumento
            key={aberto === "novo" ? "novo" : aberto.id}
            instrumento={aberto === "novo" ? null : aberto}
            lancamento={lancamento}
            onFechar={onFechar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormularioDoInstrumento({
  instrumento,
  lancamento,
  onFechar,
}: {
  instrumento: Instrumento | null;
  lancamento: Lancamento;
  onFechar: () => void;
}) {
  const salvar = useSalvarInstrumento();
  const excluir = useExcluirInstrumento();
  const [confirmando, setConfirmando] = useState(false);
  const [nome, setNome] = useState(instrumento?.nome ?? "");
  const [peso, setPeso] = useState(instrumento ? formatarNota(instrumento.peso) : "1");
  const [data, setData] = useState(instrumento?.data ?? "");

  const pesoNumero = lerNota(peso);
  const pesoValido = pesoNumero != null && !Number.isNaN(pesoNumero) && pesoNumero > 0;
  const pronto = nome.trim().length > 0 && pesoValido;

  async function handleSalvar() {
    if (!pronto || pesoNumero == null) return;
    try {
      await salvar.mutateAsync({
        id: instrumento?.id,
        entrada: {
          materiaDaTurmaId: lancamento.materiaDaTurmaId,
          periodoId: lancamento.periodoId,
          nome: nome.trim(),
          peso: pesoNumero,
          data: data || null,
        },
      });
      toast.success(instrumento ? "Avaliação atualizada." : "Avaliação criada.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleExcluir() {
    if (!instrumento) return;
    try {
      await excluir.mutateAsync(instrumento.id);
      toast.success("Avaliação removida.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{instrumento ? "Editar avaliação" : "Nova avaliação"}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem]">
        <Campo rotulo="Nome">
          <Input value={nome} maxLength={80} placeholder="Prova, trabalho, participação…" onChange={(e) => setNome(e.target.value)} autoFocus />
        </Campo>
        <Campo rotulo="Peso">
          <Input inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} aria-invalid={!pesoValido || undefined} />
        </Campo>
        <Campo rotulo="Data (opcional)" className="sm:col-span-2">
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={CLASSE_DO_CONTROLE} />
        </Campo>
      </div>
      <p className="text-[12px] text-muted-foreground">
        O peso diz quanto a avaliação conta na média do período. Avaliação sem nota para o aluno não entra na conta dele.
      </p>

      {confirmando && instrumento && (
        <p className="rounded-md border border-destructive-border bg-destructive-soft px-3 py-2 text-xs text-destructive-soft-foreground">
          Remover &ldquo;{instrumento.nome}&rdquo; apaga as notas lançadas nela. Isso não pode ser desfeito.
        </p>
      )}

      <DialogFooter>
        {instrumento &&
          (confirmando ? (
            <Button variant="destructive" onClick={handleExcluir} disabled={excluir.isPending}>
              <Trash2 className="size-4" />
              {excluir.isPending ? "Removendo..." : "Sim, remover"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setConfirmando(true)}>
              <Trash2 className="size-4" />
              Remover
            </Button>
          ))}
        <Button variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button onClick={handleSalvar} disabled={!pronto || salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}
