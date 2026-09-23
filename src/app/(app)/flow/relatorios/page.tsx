"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileSpreadsheet, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagDoTipo } from "@/components/flow/tag-do-tipo";
import { EditorDeRelatorio } from "@/components/flow/editor-de-relatorio";
import { AbasDeFormularios } from "@/components/flow/abas-de-formularios";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { ehGestao } from "@/lib/access/perfis";
import { podeVerArea } from "@/lib/access/pode-ver";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { useSession } from "@/lib/auth/use-session";
import { useForms } from "@/lib/flow/use-forms";
import { useBaixarExcel } from "@/lib/flow/use-form-responses";
import { tipoDoFormulario } from "@/lib/flow/tipo-do-formulario";
import {
  BASE_FORMULARIO,
  useBasesDeRelatorio,
  useExcluirRelatorio,
  useRelatoriosDeFormulario,
  type RelatorioDeFormulario,
} from "@/lib/flow/use-relatorios";

/**
 * Central de relatórios de Formulários.
 *
 * A escola monta quantos relatórios quiser: cada linha pode ser um envio de formulário ou uma pessoa
 * do cadastro (aluno, responsável, equipe), com as respostas do formulário ao lado. O de matrículas
 * x rematrículas continua ao lado, como relatório pronto — é a mesma ideia com as contagens do ano
 * já somadas, sem precisar montar nada.
 */
export default function RelatoriosFormulariosPage() {
  // Relatório com valor é da gestão. O backend já esconde os marcados e recusa o download; aqui a
  // tela deixa de oferecer o que ia voltar negado, que é pior do que não aparecer.
  const gestao = ehGestao(useSession()?.role);
  const router = useRouter();
  const { data: relatorios, isLoading } = useRelatoriosDeFormulario();
  const { data: bases } = useBasesDeRelatorio();
  const excluir = useExcluirRelatorio();

  // Montar relatório é área à parte de abrir relatório: a secretaria usa e baixa o que a gestão
  // montou, sem mexer na montagem. Botão que só ia voltar negado não aparece.
  const { data: meuAcesso } = useMeuAcesso();
  const podeMontar = podeVerArea(meuAcesso, "flow", "relatorios-criar");

  /** "Alunos × Ficha de Rematrícula 2027" — de onde saem as linhas, quando não é o formulário. */
  function baseDoRelatorio(r: RelatorioDeFormulario) {
    if (!r.baseDados || r.baseDados === BASE_FORMULARIO) return null;
    const rotulo = (bases ?? []).find((b) => b.slug === r.baseDados)?.rotulo ?? r.baseDados;
    return r.cruzamentoFormNome ? `${rotulo} × ${r.cruzamentoFormNome}` : rotulo;
  }

  const [editando, setEditando] = useState<RelatorioDeFormulario | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<RelatorioDeFormulario | null>(null);

  async function handleExcluir() {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync(excluindo.id);
      toast.success(`"${excluindo.nome}" excluído.`);
      setExcluindo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir o relatório.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AbasDeFormularios />

      <CabecalhoDaPagina
        titulo="Relatórios"
        apoio="Uma linha por envio de um formulário, ou uma linha por aluno, responsável ou pessoa da equipe — com as respostas ao lado, inclusive de quem não enviou."
        acoes={
          podeMontar ? (
            <Button variant="action" onClick={() => setEditando("novo")}>
              <Plus className="size-4" /> Novo relatório
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {/* Traz a mensalidade acordada de cada aluno: mesma regra dos relatórios marcados. */}
        {gestao && (
        <Link
          href="/flow/relatorios/matriculas"
          className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/60"
        >
          <div className="flex flex-wrap items-center gap-2">
            <GraduationCap className="size-4 text-muted-foreground" />
            <p className="font-medium">Matrículas x Rematrículas</p>
            <Badge variant="secondary">Pronto</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Alunos ativos no ano e quem já está rematriculado para o próximo, mais as matrículas novas.
          </p>
        </Link>
        )}

        {isLoading && <Skeleton className="h-24 w-full rounded-lg" />}

        {(relatorios ?? []).map((r) => {
          const daBase = baseDoRelatorio(r);
          return (
            <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
              <Link href={`/flow/relatorios/${r.id}`} className="flex flex-col gap-1 hover:underline-offset-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
                  <p className="truncate font-medium">{r.nome}</p>
                  {r.somenteGestao && <Badge variant="secondary">Só gestão</Badge>}
                </div>
                {/* Base de cadastro sem cruzamento não tem pergunta que vire coluna: aí a linha de
                    apoio é só a base, e "todas as perguntas" seria mentira. */}
                <p className="truncate text-sm text-muted-foreground">
                  {daBase ?? r.formNome ?? "Formulário excluído"}
                  {(!daBase || r.cruzamentoFormNome) && (
                    <>
                      {" · "}
                      {r.camposIds.length === 0 ? (
                        "todas as perguntas"
                      ) : (
                        <>
                          <span className="font-mono tabular-nums">{r.camposIds.length}</span> coluna(s)
                        </>
                      )}
                    </>
                  )}
                  {r.statusFiltro ? ` · só ${r.statusFiltro}` : ""}
                </p>
                {r.descricao && <p className="line-clamp-2 text-xs text-muted-foreground">{r.descricao}</p>}
              </Link>
              <div className="mt-auto flex gap-1">
                <Button variant="outline" size="sm" onClick={() => router.push(`/flow/relatorios/${r.id}`)}>
                  Abrir
                </Button>
                {podeMontar && (
                  <>
                    <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => setEditando(r)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Excluir" onClick={() => setExcluindo(r)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && (relatorios ?? []).length === 0 && (
        <EstadoVazio
          icone={<FileSpreadsheet />}
          titulo="Nenhum relatório montado ainda."
          texto={
            podeMontar ? (
              <>
                Clique em <strong>Novo relatório</strong> e escolha o que vira linha: cada envio de um
                formulário, ou cada aluno, responsável ou pessoa da equipe.
              </>
            ) : (
              "Quem monta relatórios na escola ainda não criou nenhum."
            )
          }
          acao={
            podeMontar ? (
              <Button onClick={() => setEditando("novo")}>
                <Plus className="size-4" /> Novo relatório
              </Button>
            ) : undefined
          }
        />
      )}

      {/* A planilha sai com TODAS as respostas da ficha, mensalidade inclusive. */}
      {gestao && <PlanilhasDosFormularios />}

      <Dialog open={editando !== null} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[90vh] overflow-x-hidden overflow-y-auto sm:max-w-xl">
          {editando !== null && (
            <EditorDeRelatorio
              relatorio={editando === "novo" ? undefined : editando}
              onFechar={() => setEditando(null)}
              onSalvo={(salvo) => {
                if (editando === "novo") router.push(`/flow/relatorios/${salvo.id}`);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!excluindo} onOpenChange={(aberto) => !aberto && setExcluindo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir relatório</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Excluir <strong>{excluindo?.nome}</strong> apaga só a montagem do relatório. Os envios do formulário
            continuam todos guardados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir} disabled={excluir.isPending}>
              {excluir.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanilhasDosFormularios() {
  const { data: forms, isLoading } = useForms();
  const baixar = useBaixarExcel();
  const [baixando, setBaixando] = useState<string | null>(null);

  const formularios = forms ?? [];

  async function handleBaixar(lista: { id: string; nome: string }[], chave: string) {
    setBaixando(chave);
    try {
      await baixar.mutateAsync(lista);
      if (lista.length > 1) toast.success(`${lista.length} planilhas baixadas, uma por formulário.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível baixar a planilha.");
    } finally {
      setBaixando(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-[15.5px] font-semibold">Respostas completas dos formulários</h2>
          <p className="text-sm text-muted-foreground">
            Uma planilha por formulário, com todas as perguntas e todos os envios, sem montar relatório.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => handleBaixar(formularios.map((f) => ({ id: f.id, nome: f.nome })), "todos")}
          disabled={baixar.isPending || formularios.length === 0}
        >
          <Download className="size-4" />
          {baixando === "todos" ? "Gerando..." : "Baixar todos"}
        </Button>
      </div>

      {isLoading && <Skeleton className="h-24 w-full" />}

      <div className="flex flex-col overflow-hidden rounded-xl border border-border">
        {formularios.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-medium">{f.nome}</span>
              <TagDoTipo tipo={tipoDoFormulario(f)} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBaixar([{ id: f.id, nome: f.nome }], f.id)}
              disabled={baixar.isPending}
            >
              <Download className="size-4" />
              {baixando === f.id ? "Gerando..." : "Excel"}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
