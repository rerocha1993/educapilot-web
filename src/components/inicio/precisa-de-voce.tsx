"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { EtiquetaDoCartao } from "@/components/padroes/estatistica";
import { formatarData } from "@/lib/format/date";
import type { ItemDoInicio } from "@/lib/inicio/catalogo";
import type { PainelInicio } from "@/lib/kernel/use-painel";
import type { Quadro } from "@/lib/flow/use-tarefas";
import type { ResumoDosComprovantes } from "@/lib/finance/use-comprovantes";
import type { PendenciasDoPonto } from "@/lib/rh/use-marcacoes";

/**
 * "Precisa de você": o que pede decisão agora.
 *
 * Quais tipos de pendência entram e em que ordem é escolha da pessoa (ver o diálogo de
 * personalizar); dentro de um tipo, o mais atrasado vem primeiro. Tipo sem nada pendente não
 * ocupa linha: a lista é do que falta fazer, não do que existe.
 */

const dinheiro = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export interface Pendencia {
  id: string;
  href: string;
  icon: LucideIcon;
  titulo: string;
  sub: string;
  acao: string;
  urgente?: boolean;
}

/**
 * As pendências reais, na ordem escolhida.
 *
 * `itens` já chega filtrado pela permissão: um tipo que a pessoa não pode abrir não vira linha.
 */
export function montarPendencias(
  itens: ItemDoInicio[],
  painel: PainelInicio | undefined,
  quadro: Quadro | undefined,
  ponto?: PendenciasDoPonto,
  comprovantes?: ResumoDosComprovantes
): Pendencia[] {
  return itens
    .map((item) => {
      // O ponto vem do RH, e não do painel: um painel que falhou não esconde a fila de aprovação.
      if (item.id === "ponto-pendente") return construirDoPonto(item, ponto);
      // Os comprovantes também vêm do próprio módulo: a caixa a lançar não depende do painel.
      if (item.id === "comprovantes-a-lancar") return construirDosComprovantes(item, comprovantes);
      return painel ? construir(item, painel, quadro) : null;
    })
    .filter((p): p is Pendencia => p !== null);
}

function construirDosComprovantes(
  item: ItemDoInicio,
  resumo: ResumoDosComprovantes | undefined
): Pendencia | null {
  if (!resumo || resumo.aLancar === 0) return null;
  const n = resumo.aLancar;
  const sem = resumo.semLeitura;

  return {
    id: item.id,
    href: item.rota,
    icon: item.icone,
    titulo: `${n} ${n === 1 ? "comprovante a lançar" : "comprovantes a lançar"}`,
    sub:
      sem > 0
        ? `${sem} ${sem === 1 ? "não deu para ler" : "não deram para ler"}: confira à mão`
        : "Chegaram pelo WhatsApp ou pela tela",
    acao: "Lançar",
  };
}

function construirDoPonto(item: ItemDoInicio, ponto: PendenciasDoPonto | undefined): Pendencia | null {
  if (!ponto) return null;
  const { marcacoes, aparelhos } = ponto;
  if (marcacoes + aparelhos === 0) return null;

  const partes = [
    marcacoes > 0 ? `${marcacoes} ${marcacoes === 1 ? "batida" : "batidas"}` : null,
    aparelhos > 0 ? `${aparelhos} ${aparelhos === 1 ? "celular novo" : "celulares novos"}` : null,
  ].filter(Boolean);

  return {
    id: item.id,
    // Cai direto na fila de aprovação, e não no espelho do mês.
    href: `${item.rota}?aba=pendencias`,
    icon: item.icone,
    titulo: marcacoes > 0 ? `${marcacoes} ${marcacoes === 1 ? "batida de ponto" : "batidas de ponto"} para aprovar` : `${aparelhos} ${aparelhos === 1 ? "celular novo" : "celulares novos"} para aprovar`,
    sub: marcacoes > 0 && aparelhos > 0 ? `${partes.join(" e ")} esperando a gestão` : "Ponto pelo celular",
    acao: "Aprovar",
  };
}

function construir(
  item: ItemDoInicio,
  painel: PainelInicio,
  quadro: Quadro | undefined
): Pendencia | null {
  const { presencas, formularios, contratos, financeiro, faltas } = painel;
  const base = { id: item.id, href: item.rota, icon: item.icone };

  switch (item.id) {
    case "chamada-aberta": {
      const n = presencas.turmasSemChamada;
      if (n === 0) return null;
      return {
        ...base,
        titulo: n === 1 ? "Chamada em aberto" : `${n} chamadas em aberto`,
        sub: presencas.turmas.map((t) => t.turma).join(", ") || "Ninguém marcou presença hoje",
        acao: "Fazer agora",
        urgente: true,
      };
    }

    case "faltas-sem-justificativa": {
      const n = faltas.semJustificativa;
      if (n === 0) return null;
      return {
        ...base,
        titulo: `${n} ${n === 1 ? "falta sem justificativa" : "faltas sem justificativa"}`,
        sub: `${faltas.turmas.map((t) => t.turma).join(", ") || "Últimos dias"} · ${faltas.dias} dias`,
        acao: "Justificar",
      };
    }

    case "tarefas-atrasadas": {
      // O quadro chega inteiro numa requisição só; a conta do atraso é a mesma do cartão de
      // tarefas — prazo gravado no fim do dia, então atrasado é o instante já ter passado.
      const atrasadas = (quadro?.listas ?? [])
        .flatMap((l) => l.cartoes)
        .filter((c) => c.concluidoEm == null && c.prazo && new Date(c.prazo).getTime() < Date.now())
        .sort((a, b) => new Date(a.prazo as string).getTime() - new Date(b.prazo as string).getTime());

      if (atrasadas.length === 0) return null;
      const pior = atrasadas[0];
      return {
        ...base,
        titulo: `${atrasadas.length} ${atrasadas.length === 1 ? "tarefa atrasada" : "tarefas atrasadas"}`,
        sub: `${pior.titulo} · venceu ${formatarData(pior.prazo, { day: "2-digit", month: "2-digit" })}`,
        acao: "Abrir quadro",
        urgente: true,
      };
    }

    case "contratos-conferencia": {
      const n = contratos.aguardandoConferencia;
      if (n === 0) return null;
      return {
        ...base,
        titulo: `${n} ${n === 1 ? "contrato assinado aguardando" : "contratos assinados aguardando"} conferência`,
        sub: "Assinados pelas famílias, ainda sem aprovação da gestão",
        acao: "Conferir",
      };
    }

    case "mensalidades-vencidas": {
      const n = financeiro.cobrancasVencidas;
      if (n === 0) return null;
      return {
        ...base,
        titulo: `${n} ${n === 1 ? "mensalidade vencida" : "mensalidades vencidas"}`,
        sub: `${dinheiro(financeiro.totalEmAberto)} · contatos prontos para cobrança`,
        acao: "Abrir lista",
      };
    }

    case "envios-aguardando": {
      const n = formularios.combinado.aguardando;
      if (n === 0) return null;
      // Quais formulários estão esperando, para a linha dizer de onde vêm os envios.
      const nomes = formularios.formularios
        .filter((f) => f.aguardando > 0)
        .map((f) => f.nome)
        .slice(0, 2)
        .join(", ");
      return {
        ...base,
        titulo: `${n} ${n === 1 ? "envio aguardando" : "envios aguardando"} aprovação`,
        sub: nomes || "Enviados pelas famílias",
        acao: "Revisar",
      };
    }

    default:
      return null;
  }
}

export function PrecisaDeVoce({ pendencias }: { pendencias: Pendencia[] }) {
  if (pendencias.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-muted px-4.5 py-4">
        <span className="font-heading text-[17px] font-semibold md:text-[15.5px]">
          Precisa de você
        </span>
        <EtiquetaDoCartao tom="action">{pendencias.length}</EtiquetaDoCartao>
      </div>
      <ul>
        {pendencias.map(({ id, href, icon: Icon, titulo, sub, acao, urgente }) => (
          <li key={id} className="border-b border-muted last:border-0">
            <Link
              href={href}
              className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3.5 px-4.5 py-3.5 transition-colors hover:bg-muted/60"
            >
              <span
                className={`grid size-[34px] place-items-center rounded-lg ${urgente ? "bg-action-soft text-action" : "bg-accent text-primary"}`}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-snug md:text-sm">
                  {titulo}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-muted-foreground md:text-[12.5px]">
                  {sub}
                </span>
              </span>
              <span className="whitespace-nowrap text-[13px] font-semibold text-primary md:text-[12.5px]">
                {acao}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
