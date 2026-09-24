"use client";

import { Fragment, useState, type ReactNode } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import {
  CarrosselDeFormularios,
  ordenarPelaEscolha,
} from "@/components/flow/carrossel-de-formularios";
import { AtalhosDoInicio } from "@/components/inicio/atalhos-do-inicio";
import { CartaoDeTarefas } from "@/components/inicio/cartao-de-tarefas";
import {
  DialogPersonalizarInicio,
  type SecaoComItens,
  type SecaoParaPersonalizar,
} from "@/components/inicio/dialog-personalizar";
import { EsqueletoDosNumeros, NumerosDoDia } from "@/components/inicio/numeros-do-dia";
import { PrecisaDeVoce, montarPendencias } from "@/components/inicio/precisa-de-voce";
import { useRequireSession } from "@/lib/auth/use-session";
import { useVisibilidade } from "@/lib/access/use-visibilidade";
import { useMeuQuadro } from "@/lib/flow/use-tarefas";
import {
  ATALHOS,
  BLOCOS,
  NUMEROS,
  PENDENCIAS,
  escolherItens,
  padraoDoPapel,
  type IdDeBloco,
  type ItemDoInicio,
} from "@/lib/inicio/catalogo";
import { usePainelInicio } from "@/lib/kernel/use-painel";
import { arranjarBlocos, usePreferenciasDoInicio } from "@/lib/kernel/use-painel-preferencias";

// Tela Início da direção visual nova (ver docs/direcao-visual.md): o dia da escola em números, o
// que pede decisão agora e os atalhos.
//
// Tudo aqui é escolhido item a item pela pessoa e guardado na conta dela (ver
// use-painel-preferencias); enquanto ela não escolhe, vale o padrão do papel dela (ver
// lib/inicio/catalogo). A permissão vem antes da preferência em qualquer caso: item que a pessoa
// não pode abrir não aparece na tela nem na lista de personalização, mesmo que esteja salvo.

function saudacao(hora: number) {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/** Qual lista de itens cada bloco escolhe. Bloco fora daqui só liga e desliga. */
const SECAO_DO_BLOCO: Partial<Record<IdDeBloco, SecaoComItens>> = {
  numeros: "numeros",
  precisa: "pendencias",
  atalhos: "atalhos",
};

export default function InicioPage() {
  const session = useRequireSession();
  const { rotaVisivel } = useVisibilidade();
  const { data, isLoading, isError } = usePainelInicio();
  const { data: preferencias } = usePreferenciasDoInicio();
  const [personalizando, setPersonalizando] = useState(false);
  // Resposta fora do formato (API antiga ainda no ar, por exemplo) não derruba a tela: os
  // atalhos continuam valendo e o aviso de falha aparece.
  const painel = data?.presencas && data?.formularios && data?.contratos ? data : undefined;

  const padrao = padraoDoPapel(session?.role);

  // Permissão primeiro, depois o que o financeiro consegue responder: sem o módulo, os valores
  // vêm ausentes, e ausente não é R$ 0,00 — o item some em vez de mentir um zero.
  const financeiroResponde = painel === undefined || painel.financeiro.disponivel === true;
  const podeVer = (itens: ItemDoInicio[]) =>
    itens.filter((i) => rotaVisivel(i.rota) && (!i.exigeFinanceiro || financeiroResponde));

  const catalogoDeNumeros = podeVer(NUMEROS);
  const catalogoDeAtalhos = podeVer(ATALHOS);
  const catalogoDePendencias = podeVer(PENDENCIAS);

  const numeros = escolherItens(catalogoDeNumeros, preferencias?.numeros, padrao.numeros);
  const atalhos = escolherItens(catalogoDeAtalhos, preferencias?.atalhos, padrao.atalhos);
  const tiposDePendencia = escolherItens(
    catalogoDePendencias,
    preferencias?.pendencias,
    padrao.pendencias
  );

  // O quadro só é pedido quando alguma pendência escolhida depende dele.
  const { data: quadro } = useMeuQuadro({
    enabled: tiposDePendencia.some((t) => t.id === "tarefas-atrasadas"),
  });
  const pendencias = montarPendencias(tiposDePendencia, painel, quadro);

  const primeiroNome = session?.name.split(" ").find(Boolean) ?? "";
  const hoje = new Date();
  const semana = hoje.toLocaleDateString("pt-BR", { weekday: "long" });
  const dataLonga = `${semana.charAt(0).toUpperCase()}${semana.slice(1)} · ${hoje.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`;

  const conteudo: Record<IdDeBloco, () => ReactNode> = {
    numeros: () =>
      isLoading ? (
        <EsqueletoDosNumeros quantidade={numeros.length} />
      ) : (
        painel && <NumerosDoDia itens={numeros} painel={painel} />
      ),
    precisa: () => <PrecisaDeVoce pendencias={pendencias} />,
    tarefas: () => <CartaoDeTarefas />,
    formularios: () =>
      painel && (
        // Um cartão por formulário escolhido, e não um cartão fixo de rematrícula: o que aparece
        // em cada um depende dos campos que aquele formulário tem.
        <CarrosselDeFormularios
          resumos={ordenarPelaEscolha(painel.formularios.formularios, preferencias?.formularios)}
          podeEscolher={rotaVisivel("/flow")}
        />
      ),
    atalhos: () => <AtalhosDoInicio itens={atalhos} />,
  };

  const permitido: Record<IdDeBloco, boolean> = {
    numeros: catalogoDeNumeros.length > 0,
    precisa: catalogoDePendencias.length > 0,
    tarefas: rotaVisivel("/flow/tarefas"),
    formularios: rotaVisivel("/flow/respostas"),
    atalhos: catalogoDeAtalhos.length > 0,
  };

  // A ordem de fábrica é a do papel da pessoa: é ela que decide onde um bloco novo entra para
  // quem já personalizou a tela — ver arranjarBlocos.
  const catalogoDeBlocos = [
    ...padrao.blocos,
    ...BLOCOS.map((b) => b.id).filter((id) => !padrao.blocos.includes(id)),
  ].map((id) => ({ id, rotulo: BLOCOS.find((b) => b.id === id)?.rotulo ?? id }));

  // Blocos que a permissão tira saem do arranjo salvo e, se a permissão voltar um dia,
  // reaparecem na posição de fábrica como qualquer bloco novo.
  const arranjo = arranjarBlocos(catalogoDeBlocos, preferencias?.blocos).filter(
    (p) => permitido[p.id as IdDeBloco]
  );

  const secoes: SecaoParaPersonalizar[] = arranjo.map((p) => {
    const chave = SECAO_DO_BLOCO[p.id as IdDeBloco];
    const catalogo =
      chave === "numeros"
        ? catalogoDeNumeros
        : chave === "atalhos"
          ? catalogoDeAtalhos
          : chave === "pendencias"
            ? catalogoDePendencias
            : [];
    const escolhidos =
      chave === "numeros"
        ? numeros
        : chave === "atalhos"
          ? atalhos
          : chave === "pendencias"
            ? tiposDePendencia
            : [];

    return {
      id: p.id,
      rotulo: catalogoDeBlocos.find((b) => b.id === p.id)?.rotulo ?? p.id,
      visivel: p.visivel,
      chave,
      catalogo,
      escolhidos: escolhidos.map((i) => i.id),
    };
  });

  // O botão laranja do cabeçalho vem do padrão do papel, não da tela: a gestão não quer
  // "Registrar ocorrência" fixo aqui — se quiser, escolhe o atalho.
  const acao = padrao.acaoPrincipal
    ? catalogoDeAtalhos.find((a) => a.id === padrao.acaoPrincipal)
    : undefined;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <CabecalhoDaPagina
        eyebrow={dataLonga}
        titulo={
          <>
            {saudacao(hoje.getHours())}
            {primeiroNome && `, ${primeiroNome}`}
            <span className="text-action-brand">.</span>
          </>
        }
        apoio={
          isLoading
            ? "Carregando o dia da escola…"
            : pendencias.length > 0
              ? `${pendencias.length} ${pendencias.length === 1 ? "coisa pede" : "coisas pedem"} sua atenção hoje — comece por elas.`
              : "Nada pendente por aqui. Bom dia de trabalho."
        }
        acoesClassName="w-full md:w-auto"
        acoes={
          <>
            <Button
              variant="outline"
              className="flex-1 md:flex-none"
              onClick={() => setPersonalizando(true)}
            >
              <SlidersHorizontal className="size-4" />
              Personalizar
            </Button>
            {acao && (
              <Link
                href={acao.rota}
                className={buttonVariants({ variant: "action", className: "flex-1 md:flex-none" })}
              >
                {acao.rotulo}
              </Link>
            )}
          </>
        }
      />

      {(isError || (!isLoading && !painel)) && (
        <p className="rounded-xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar os números do dia. Os atalhos continuam funcionando.
        </p>
      )}

      {arranjo
        .filter((p) => p.visivel)
        .map((p) => (
          <Fragment key={p.id}>{conteudo[p.id as IdDeBloco]()}</Fragment>
        ))}

      {personalizando && (
        <DialogPersonalizarInicio
          secoes={secoes}
          formularios={preferencias?.formularios ?? []}
          onFechar={() => setPersonalizando(false)}
        />
      )}
    </div>
  );
}
