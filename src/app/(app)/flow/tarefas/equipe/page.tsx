"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AbasDeFormularios } from "@/components/flow/abas-de-formularios";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { formatarData, hojeIsoBrasilia } from "@/lib/format/date";
import { useQuadroDe, useResumoDaEquipe, type Cartao, type ResumoDoQuadro } from "@/lib/flow/use-tarefas";

/**
 * Visão da gestão sobre os quadros da equipe.
 *
 * A pergunta que esta tela responde é sempre a mesma: quem está com tarefa atrasada agora. Por
 * isso o atraso vem antes de tudo — nos totais da escola, na ordem da lista e na cor do número.
 * O quadro de cada pessoa abre só para leitura: quem move cartão é o dono do quadro, e uma gestão
 * arrastando cartão alheio faz a pessoa perder de vista o próprio trabalho.
 */

/** Estatística do guia: número grande em mono, rótulo pequeno acima. */
const ESTATISTICA =
  "font-heading text-[30px] leading-none font-semibold tracking-[-.03em] font-mono tabular-nums";

/** Acima disso a lista vira parede de texto — o resto está no quadro da pessoa, a um clique. */
const MAX_URGENTES = 5;

export default function EquipeDeTarefasPage() {
  const { data, isLoading, isError, error } = useResumoDaEquipe();

  // Quadro aberto para leitura. Guarda a linha inteira (e não só o id) para o título do Dialog
  // aparecer na hora, antes do quadro terminar de carregar.
  const [lendo, setLendo] = useState<ResumoDoQuadro | null>(null);

  const equipe = data ?? [];

  // Os totais da escola são a soma das linhas: o backend já devolve o resumo por pessoa, e somar
  // aqui evita uma segunda chamada que poderia discordar da lista logo abaixo.
  const totais = equipe.reduce(
    (acc, l) => ({
      pessoasComAtraso: acc.pessoasComAtraso + (l.atrasados > 0 ? 1 : 0),
      atrasados: acc.atrasados + l.atrasados,
      paraHoje: acc.paraHoje + l.paraHoje,
      concluidosNaSemana: acc.concluidosNaSemana + l.concluidosNaSemana,
    }),
    { pessoasComAtraso: 0, atrasados: 0, paraHoje: 0, concluidosNaSemana: 0 }
  );

  // Quem está atrasado primeiro, depois quem tem mais para hoje. Ordem alfabética esconderia o
  // problema no fim da lista.
  const linhas = [...equipe].sort(
    (a, b) =>
      b.atrasados - a.atrasados || b.paraHoje - a.paraHoje || a.nome.localeCompare(b.nome, "pt-BR")
  );

  return (
    <div className="flex flex-col gap-6">
      <AbasDeFormularios />

      <CabecalhoDaPagina
        titulo="Tarefas da equipe"
        apoio="O que cada pessoa da escola tem em mãos: o que passou do prazo, o que vence hoje e o que já foi concluído nesta semana. Clique em alguém para ver o quadro dela."
      />

      {isError && (
        <div className="rounded-xl border border-destructive-border bg-destructive-soft p-4 text-sm text-destructive-soft-foreground">
          {error instanceof Error ? error.message : "Não foi possível carregar os quadros da equipe."}
        </div>
      )}

      {isLoading && (
        <>
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </>
      )}

      {!isLoading && !isError && equipe.length === 0 && (
        <EstadoVazio
          icone={<Users />}
          titulo="Ninguém tem quadro de tarefas ainda."
          texto="Assim que a equipe começar a usar o quadro, o andamento de cada pessoa aparece aqui."
          textoClassName="max-w-[340px]"
        />
      )}

      {!isLoading && equipe.length > 0 && (
        <>
          {/* Dois por linha no celular: os quatro números cabem na primeira tela, sem rolar. */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border border-border bg-card px-4 py-4 md:flex md:flex-wrap md:gap-x-10">
            <Total
              rotulo="Pessoas com atraso"
              valor={totais.pessoasComAtraso}
              alerta={totais.pessoasComAtraso > 0}
            />
            <Total rotulo="Tarefas atrasadas" valor={totais.atrasados} alerta={totais.atrasados > 0} />
            <Total rotulo="Para hoje" valor={totais.paraHoje} />
            <Total rotulo="Concluídas na semana" valor={totais.concluidosNaSemana} />
          </div>

          <div className="flex flex-col gap-3">
            {linhas.map((linha) => (
              <LinhaDaPessoa key={linha.userId} linha={linha} onAbrir={() => setLendo(linha)} />
            ))}
          </div>
        </>
      )}

      <Dialog open={!!lendo} onOpenChange={(aberto) => !aberto && setLendo(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Quadro de {lendo?.nome}</DialogTitle>
          </DialogHeader>
          {lendo && <QuadroEmLeitura userId={lendo.userId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Total({ rotulo, valor, alerta = false }: { rotulo: string; valor: number; alerta?: boolean }) {
  return (
    <div>
      <p className={`text-xs ${alerta ? "text-destructive" : "text-muted-foreground"}`}>{rotulo}</p>
      <p className={`mt-1 ${ESTATISTICA} ${alerta ? "text-destructive" : ""}`}>{valor}</p>
    </div>
  );
}

function LinhaDaPessoa({ linha, onAbrir }: { linha: ResumoDoQuadro; onAbrir: () => void }) {
  const urgentes = linha.urgentes.slice(0, MAX_URGENTES);
  const escondidos = linha.urgentes.length - urgentes.length;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      {/* O cabeçalho inteiro é o botão: no celular o alvo de toque passa a ser a faixa toda, e não
          só o nome. */}
      <button
        type="button"
        onClick={onAbrir}
        title={`Ver o quadro de ${linha.nome}`}
        className="-m-2 flex flex-col gap-2 rounded-lg p-2 text-left transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
      >
        <p className="font-heading text-[15.5px] font-semibold break-words">{linha.nome}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Numero rotulo="atrasadas" valor={linha.atrasados} alerta={linha.atrasados > 0} />
          <Numero rotulo="para hoje" valor={linha.paraHoje} />
          <Numero rotulo="abertas" valor={linha.abertos} />
          <Numero rotulo="feitas na semana" valor={linha.concluidosNaSemana} />
        </div>
      </button>

      {urgentes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {urgentes.map((cartao) => (
            <CartaoUrgente key={cartao.id} cartao={cartao} />
          ))}
          {escondidos > 0 && (
            <button
              type="button"
              onClick={onAbrir}
              className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              e mais <span className="font-mono tabular-nums">{escondidos}</span> no quadro de {linha.nome}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Numero({ rotulo, valor, alerta = false }: { rotulo: string; valor: number; alerta?: boolean }) {
  return (
    <span className={alerta ? "text-destructive" : undefined}>
      <span className={`font-mono font-semibold tabular-nums ${alerta ? "" : "text-foreground"}`}>
        {valor}
      </span>{" "}
      {rotulo}
    </span>
  );
}

/**
 * Prazo vencido = dia anterior a hoje no fuso da escola.
 *
 * A comparação passa pelo texto que a tela já mostra em vez do `Date` cru: o prazo chega em UTC e
 * comparar instantes marcaria como atrasado o cartão que vence hoje mesmo.
 */
function venceuAntesDeHoje(prazo?: string | null) {
  if (!prazo) return false;
  const [dia, mes, ano] = formatarData(prazo).split("/");
  if (!ano) return false;
  return `${ano}-${mes}-${dia}` < hojeIsoBrasilia();
}

function CartaoUrgente({ cartao }: { cartao: Cartao }) {
  const atrasado = venceuAntesDeHoje(cartao.prazo);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border px-3 py-2 text-sm">
      <span className="min-w-0 break-words">{cartao.titulo}</span>
      {cartao.prazo && (
        <span
          className={`font-mono text-xs tabular-nums ${atrasado ? "text-destructive" : "text-muted-foreground"}`}
        >
          {atrasado ? "venceu " : "vence "}
          {formatarData(cartao.prazo)}
        </span>
      )}
      {cartao.etiquetas.map((etiqueta) => (
        <EtiquetaDoCartao key={etiqueta.id} nome={etiqueta.nome} cor={etiqueta.cor} />
      ))}
    </div>
  );
}

/**
 * A cor da etiqueta é escolhida pela escola e pode ser clara ou escura: ela fica num ponto ao lado
 * do nome, e não no fundo, para o texto nunca sumir.
 */
function EtiquetaDoCartao({ nome, cor }: { nome: string; cor: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
      {nome}
    </span>
  );
}

/**
 * Quadro de outra pessoa, só para ler.
 *
 * As colunas viram uma faixa rolável na horizontal em tela larga e empilham no celular — mesma
 * informação do quadro real, sem arrastar nada.
 */
function QuadroEmLeitura({ userId }: { userId: string }) {
  const { data: quadro, isLoading, isError, error } = useQuadroDe(userId);

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive-border bg-destructive-soft p-4 text-sm text-destructive-soft-foreground">
        {error instanceof Error ? error.message : "Não foi possível abrir o quadro."}
      </div>
    );
  }

  const listas = [...(quadro?.listas ?? [])].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Só leitura. Quem move, edita ou conclui um cartão é a própria pessoa, no quadro dela.
      </p>

      {listas.length === 0 && (
        <p className="text-sm text-muted-foreground">Este quadro ainda não tem listas.</p>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:overflow-x-auto md:pb-1">
        {listas.map((lista) => {
          const cartoes = [...lista.cartoes].sort((a, b) => a.ordem - b.ordem);
          return (
            <div
              key={lista.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3 md:w-60 md:shrink-0"
            >
              <p className="flex items-center justify-between gap-2 text-[11px] font-bold tracking-[.1em] text-muted-foreground uppercase">
                <span className="truncate">{lista.nome}</span>
                <span className="font-mono tabular-nums">{cartoes.length}</span>
              </p>
              {cartoes.length === 0 && <p className="text-xs text-muted-foreground">Vazia.</p>}
              {cartoes.map((cartao) => (
                <div
                  key={cartao.id}
                  className="flex flex-col gap-1 rounded-lg border border-border bg-card p-2.5"
                >
                  <p className="text-sm break-words">{cartao.titulo}</p>
                  {cartao.prazo && (
                    <p
                      className={`font-mono text-xs tabular-nums ${
                        venceuAntesDeHoje(cartao.prazo) && !cartao.concluidoEm
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatarData(cartao.prazo)}
                    </p>
                  )}
                  {cartao.etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {cartao.etiquetas.map((etiqueta) => (
                        <EtiquetaDoCartao key={etiqueta.id} nome={etiqueta.nome} cor={etiqueta.cor} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
