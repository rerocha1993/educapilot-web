"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CampoNumerico } from "@/components/finance/precificacao/campo-numerico";
import { SeletorDeTurmas } from "@/components/finance/projetos/seletor-de-turmas";
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
import { Textarea } from "@/components/ui/textarea";
import {
  baseDoProjeto,
  dadosDoProjeto,
  numeroDeParticipantes,
  useCriarProjeto,
  useParticipantesDasTurmas,
  useSalvarDados,
  type BaseDeParticipantes,
  type ProjetoDetalhe,
} from "@/lib/finance/use-projetos";
import { cn } from "@/lib/utils";

const MARGEM_PADRAO = 10;

/**
 * Novo projeto (sem `projeto`) ou edição dos dados gerais (com `projeto`).
 *
 * Criar já leva para o projeto. Editar manda o que a tela não mostra aqui (valor por participante
 * definido, conta financeira) do jeito que o servidor tem, porque o PUT troca o conjunto todo.
 *
 * O número de participantes não é digitado: sai da base escolhida (famílias ou alunos das turmas,
 * contados pelo servidor) ou de uma estimativa. Só o "Estimativa" pede um número.
 */
export function DialogProjeto({ projeto, onFechar }: { projeto?: ProjetoDetalhe; onFechar: () => void }) {
  const router = useRouter();
  const criar = useCriarProjeto();
  const salvar = useSalvarDados(projeto?.id ?? "");
  const pendente = criar.isPending || salvar.isPending;

  const baseInicial = projeto ? baseDoProjeto(projeto) : "Familias";

  const [nome, setNome] = useState(projeto?.nome ?? "");
  const [descricao, setDescricao] = useState(projeto?.descricao ?? "");
  const [inicio, setInicio] = useState((projeto?.dataInicio ?? projeto?.dataDoEvento)?.slice(0, 10) ?? "");
  const [fim, setFim] = useState(projeto?.dataFim?.slice(0, 10) ?? "");
  const [turmas, setTurmas] = useState<number[]>(projeto?.turmas.map((t) => t.classId) ?? []);
  const [base, setBase] = useState<BaseDeParticipantes>(baseInicial);
  const [estimativa, setEstimativa] = useState<number | null>(
    projeto && baseInicial === "Estimativa"
      ? (projeto.estimativaDeParticipantes ?? numeroDeParticipantes(projeto))
      : (projeto?.estimativaDeParticipantes ?? null)
  );
  const [margem, setMargem] = useState<number | null>(projeto?.margemDesejadaPercentual ?? MARGEM_PADRAO);
  const [erro, setErro] = useState<string | null>(null);

  const contagem = useParticipantesDasTurmas(turmas);
  const semCobranca = base === "SemCobranca";

  function mudarInicio(valor: string) {
    setInicio(valor);
    // Fim antes do início não existe: arrasta o fim junto, como uma agenda faz.
    if (fim && valor && fim < valor) setFim(valor);
    setErro(null);
  }

  function escolherBase(nova: BaseDeParticipantes) {
    setBase(nova);
    setErro(null);
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Dê um nome ao projeto.");
    if (fim && !inicio) return setErro("Informe o início, ou apague o fim.");
    // Datas em yyyy-MM-dd comparam certo como texto.
    if (fim && inicio && fim < inicio) return setErro("O fim não pode ser antes do início.");
    if (base === "Estimativa" && (estimativa === null || estimativa < 1)) {
      return setErro("Informe quantas pessoas você espera (pelo menos 1).");
    }
    if (!semCobranca && margem !== null && margem < 0) return setErro("A margem não pode ser negativa.");

    const comum = {
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      dataInicio: inicio || undefined,
      dataFim: fim && fim !== inicio ? fim : undefined,
      margemDesejadaPercentual: margem ?? 0,
      baseDeParticipantes: base,
      estimativaDeParticipantes: base === "Estimativa" && estimativa !== null ? Math.round(estimativa) : undefined,
    };

    try {
      if (projeto) {
        await salvar.mutateAsync({ ...dadosDoProjeto(projeto), ...comum, classIds: turmas });
        toast.success("Dados do projeto salvos.");
        onFechar();
      } else {
        const criado = await criar.mutateAsync({ ...comum, classIds: turmas.length > 0 ? turmas : undefined });
        toast.success("Projeto criado.");
        router.push(`/finance/projetos/${criado.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o projeto.");
    }
  }

  const familias = contagem.data?.familias;
  const alunos = contagem.data?.alunos;
  const emQuem = turmas.length > 0 ? "nas turmas marcadas" : "na escola toda";

  /** "38 famílias", "contando…" ou o aviso de que a contagem falhou. */
  function contagemDe(n: number | undefined, singular: string, plural: string): string {
    if (contagem.isError) return "Não foi possível contar";
    if (n === undefined || contagem.contando) return "contando…";
    return `${n} ${n === 1 ? singular : plural}`;
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !pendente && onFechar()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{projeto ? "Editar dados do projeto" : "Novo projeto"}</DialogTitle>
          <DialogDescription>
            {projeto
              ? "O orçamento é recalculado com o número de participantes e a margem."
              : "Comece pelo básico. Os itens do orçamento entram na tela do projeto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={confirmar} noValidate className="grid gap-5">
          <Bloco titulo="O quê">
            <Campo id="projeto-nome" rotulo="Nome">
              <Input
                id="projeto-nome"
                value={nome}
                maxLength={120}
                autoFocus
                placeholder="Ex.: Festa junina 2026"
                onChange={(e) => {
                  setNome(e.target.value);
                  setErro(null);
                }}
                aria-invalid={erro !== null && !nome.trim()}
              />
            </Campo>
            <Campo id="projeto-descricao" rotulo="Descrição (opcional)">
              <Textarea
                id="projeto-descricao"
                value={descricao}
                maxLength={500}
                rows={2}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </Campo>
          </Bloco>

          <Bloco titulo="Quando">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Campo id="projeto-inicio" rotulo="Início">
                <Input
                  id="projeto-inicio"
                  type="date"
                  value={inicio}
                  onChange={(e) => mudarInicio(e.target.value)}
                  aria-invalid={erro !== null && !!fim && !inicio}
                />
              </Campo>
              <Campo id="projeto-fim" rotulo="Fim (opcional)" dica="Deixe em branco se é um dia só.">
                <Input
                  id="projeto-fim"
                  type="date"
                  value={fim}
                  min={inicio || undefined}
                  onChange={(e) => {
                    setFim(e.target.value);
                    setErro(null);
                  }}
                  aria-invalid={erro !== null && !!fim && !!inicio && fim < inicio}
                />
              </Campo>
            </div>
          </Bloco>

          <Bloco titulo="Turmas">
            <SeletorDeTurmas valor={turmas} onChange={setTurmas} />
          </Bloco>

          <Bloco titulo="Quem participa">
            <p className="text-[13px] text-muted-foreground">
              Esse número é a base do valor por participante: o custo e a margem são divididos por ele.
            </p>

            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">Base do número de participantes</legend>
              <CartaoDeBase
                valor="Familias"
                escolhida={base}
                onEscolher={escolherBase}
                titulo="Famílias das turmas"
                detalhe={contagemDe(familias, "família", "famílias")}
                apoio={emQuem}
              />
              <CartaoDeBase
                valor="Alunos"
                escolhida={base}
                onEscolher={escolherBase}
                titulo="Alunos das turmas"
                detalhe={contagemDe(alunos, "aluno", "alunos")}
                apoio={emQuem}
              />
              <CartaoDeBase
                valor="Estimativa"
                escolhida={base}
                onEscolher={escolherBase}
                titulo="Estimativa"
                detalhe="Você diz quantos"
                apoio="Ex.: festa aberta à comunidade"
              />
              <CartaoDeBase
                valor="SemCobranca"
                escolhida={base}
                onEscolher={escolherBase}
                titulo="Só controle de gastos"
                detalhe="Sem cobrança"
                apoio="Sem cobrança por participante"
              />
            </fieldset>

            {base === "Estimativa" && (
              <Campo id="projeto-estimativa" rotulo="Quantas pessoas você espera?">
                <CampoNumerico
                  id="projeto-estimativa"
                  valor={estimativa}
                  onChange={(v) => {
                    setEstimativa(v);
                    setErro(null);
                  }}
                  min={0}
                  placeholder="Ex.: 80"
                  sufixo="pessoas"
                />
              </Campo>
            )}

            {semCobranca && (
              <p className="text-[13px] text-muted-foreground">
                O projeto só acompanha o orçamento e os gastos; não gera valor por participante.
              </p>
            )}
          </Bloco>

          <Bloco titulo="Margem desejada">
            <Campo
              id="projeto-margem"
              rotulo="Margem"
              dica={
                semCobranca
                  ? "Não se aplica: sem cobrança, não há valor a sugerir."
                  : "O quanto deve sobrar além do custo. Com ela o sistema sugere o valor por participante."
              }
            >
              <CampoNumerico
                id="projeto-margem"
                valor={margem}
                onChange={setMargem}
                sufixo="%"
                min={0}
                disabled={semCobranca}
              />
            </Campo>
          </Bloco>

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={pendente} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={pendente}>
              {pendente ? "Salvando..." : projeto ? "Salvar" : "Criar projeto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Um bloco do formulário, com título curto em cima. */
function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">{titulo}</h3>
      {children}
    </section>
  );
}

/**
 * Cartão de escolha única. O rádio de verdade fica escondido dentro do rótulo (teclado e leitor de
 * tela funcionam como num rádio comum); o cartão inteiro é a área de toque.
 */
function CartaoDeBase({
  valor,
  escolhida,
  onEscolher,
  titulo,
  detalhe,
  apoio,
}: {
  valor: BaseDeParticipantes;
  escolhida: BaseDeParticipantes;
  onEscolher: (valor: BaseDeParticipantes) => void;
  titulo: string;
  detalhe: string;
  apoio: string;
}) {
  const marcada = escolhida === valor;

  return (
    <label
      className={cn(
        "flex min-h-[76px] cursor-pointer flex-col gap-0.5 rounded-lg border bg-card px-3 py-2.5 transition-colors",
        "has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50",
        marcada ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      )}
    >
      <input
        type="radio"
        name="projeto-base"
        value={valor}
        checked={marcada}
        onChange={() => onEscolher(valor)}
        className="sr-only"
      />
      <span className="flex items-center gap-2 text-[13.5px] font-medium">
        <span
          aria-hidden
          className={cn(
            "grid size-4 shrink-0 place-items-center rounded-full border",
            marcada ? "border-primary" : "border-input"
          )}
        >
          {marcada && <span className="size-2 rounded-full bg-primary" />}
        </span>
        {titulo}
      </span>
      <span className="pl-6 font-heading text-[15px] font-semibold tabular-nums">{detalhe}</span>
      <span className="pl-6 text-xs text-muted-foreground">{apoio}</span>
    </label>
  );
}
