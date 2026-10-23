"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link2, Search, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useBuscaDeAlunos,
  useDesvincularResposta,
  useSugestoesDeVinculo,
  useVincularResposta,
  type AlunoParaVinculo,
} from "@/lib/flow/use-vinculo-de-resposta";
import { cn } from "@/lib/utils";

/**
 * Bloco da ficha do envio: a quem o envio está ligado (e o botão para ligar ou trocar).
 * O nome do aluno e da criança é dado de saúde: só aparece aqui, para quem já abriu o envio.
 */
export function BlocoDoAluno({ formId, responseId, onVincular }: { formId: string; responseId: string; onVincular: () => void }) {
  const { data, isLoading, isError } = useSugestoesDeVinculo(formId, responseId);
  const desvincular = useDesvincularResposta(formId);
  const atual = data?.alunoAtual;

  async function desfazer() {
    try {
      await desvincular.mutateAsync(responseId);
      toast.success("Vínculo desfeito. O envio saiu da ficha do aluno.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível desfazer o vínculo.");
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">Aluno deste envio (ficha do aluno)</p>
        {isLoading && <p className="mt-0.5 text-sm text-muted-foreground">Carregando…</p>}
        {isError && <p className="mt-0.5 text-sm text-muted-foreground">Não foi possível ver o vínculo.</p>}
        {!isLoading && !isError && (
          <p className="mt-0.5 break-words text-sm font-medium">
            {atual ? (
              <>
                {atual.nome}
                {atual.turma ? <span className="font-normal text-muted-foreground"> · {atual.turma}</span> : null}
              </>
            ) : (
              <span className="font-normal text-muted-foreground">Nenhum. Este envio não aparece na ficha de nenhum aluno.</span>
            )}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant={atual ? "outline" : "action"} onClick={onVincular}>
          <Link2 className="size-4" />
          {atual ? "Trocar aluno" : "Vincular a um aluno"}
        </Button>
        {atual && (
          <Button variant="ghost" onClick={() => void desfazer()} disabled={desvincular.isPending}>
            Desfazer
          </Button>
        )}
      </div>
    </div>
  );
}

function LinhaDeAluno({ aluno, marcado, destaque, onEscolher }: { aluno: AlunoParaVinculo; marcado: boolean; destaque?: string; onEscolher: () => void }) {
  return (
    <li>
      <button
        type="button"
        role="radio"
        aria-checked={marcado}
        onClick={onEscolher}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
          marcado ? "border-primary bg-primary/10" : "border-input bg-card hover:bg-muted"
        )}
      >
        <UserRound aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-medium">{aluno.nome}</span>
          {aluno.turma && <span className="block text-xs text-muted-foreground">{aluno.turma}</span>}
        </span>
        {destaque && <span className="shrink-0 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">{destaque}</span>}
      </button>
    </li>
  );
}

/**
 * "Vincular a um aluno". Sugere alunos pelo nome escrito no envio (só sugere: a pessoa escolhe e confirma),
 * e deixa buscar qualquer aluno da escola. Uma resposta por vez, sem ação em lote.
 */
export function VincularAlunoDialog({ formId, responseId, onFechar }: { formId: string; responseId: string | null; onFechar: () => void }) {
  const aberto = responseId !== null;
  const { data, isLoading } = useSugestoesDeVinculo(formId, responseId ?? undefined, aberto);
  const [termo, setTermo] = useState("");
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const busca = useBuscaDeAlunos(formId, termo);
  const vincular = useVincularResposta(formId);

  function fechar() {
    setTermo("");
    setEscolhido(null);
    onFechar();
  }

  async function confirmar() {
    if (!responseId || escolhido === null) return;
    try {
      const r = await vincular.mutateAsync({ responseId, alunoId: escolhido });
      toast.success(r.jaEstavaVinculada ? "Este envio já estava ligado a esse aluno." : `Envio ligado a ${r.alunoNome ?? "o aluno"}. Ele já aparece na ficha.`);
      fechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível vincular.");
    }
  }

  const sugestoes = data?.sugestoes ?? [];
  const resultados = busca.data ?? [];

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular a um aluno</DialogTitle>
          <DialogDescription>
            O envio passa a aparecer na ficha do aluno que você escolher. Confira o nome: quem decide é você.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          {isLoading && <p className="text-sm text-muted-foreground">Procurando alunos parecidos…</p>}

          {data?.nomeInformado && (
            <div>
              <p className="text-xs text-muted-foreground">
                Nome escrito no envio{data.campoDeNome ? ` (${data.campoDeNome})` : ""}:{" "}
                <span className="font-medium text-foreground">{data.nomeInformado}</span>
              </p>
              {sugestoes.length > 0 ? (
                <ul role="radiogroup" aria-label="Alunos sugeridos" className="mt-2 flex flex-col gap-2">
                  {sugestoes.map((s) => (
                    <LinhaDeAluno
                      key={s.alunoId}
                      aluno={{ id: s.alunoId, nome: s.nome, turma: s.turma }}
                      marcado={escolhido === s.alunoId}
                      destaque={s.correspondencia === "Exata" ? "Mesmo nome" : "Nome parecido"}
                      onEscolher={() => setEscolhido(s.alunoId)}
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Nenhum aluno da escola tem esse nome. Use a busca abaixo.</p>
              )}
            </div>
          )}
          {data && !data.nomeInformado && (
            <p className="text-sm text-muted-foreground">
              Este formulário não tem um campo de nome da criança preenchido, então não há sugestão. Procure o aluno abaixo.
            </p>
          )}

          <div>
            <label htmlFor="busca-de-aluno" className="text-xs font-medium text-muted-foreground">
              Buscar aluno pelo nome
            </label>
            <div className="relative mt-1">
              <Search aria-hidden className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="busca-de-aluno" className="pl-8" placeholder="Digite ao menos 2 letras" value={termo} onChange={(e) => setTermo(e.target.value)} />
            </div>
            {termo.trim().length >= 2 && !busca.isLoading && resultados.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
            )}
            {resultados.length > 0 && (
              <ul role="radiogroup" aria-label="Resultado da busca" className="mt-2 flex flex-col gap-2">
                {resultados.map((a) => (
                  <LinhaDeAluno key={a.id} aluno={a} marcado={escolhido === a.id} onEscolher={() => setEscolhido(a.id)} />
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button variant="action" onClick={() => void confirmar()} disabled={escolhido === null || vincular.isPending}>
            {vincular.isPending ? "Vinculando…" : "Vincular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
