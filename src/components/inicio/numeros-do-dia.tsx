"use client";

import { Estatistica, EtiquetaDoCartao } from "@/components/padroes/estatistica";
import { getSession } from "@/lib/auth/session";
import { formatarSoData } from "@/lib/format/date";
import type { ItemDoInicio } from "@/lib/inicio/catalogo";
import type { PainelInicio } from "@/lib/kernel/use-painel";

/**
 * Os cartões do alto, na ordem que a pessoa escolheu.
 *
 * Cada cartão sabe desenhar um número do catálogo e mais nada: o que aparece aqui já foi decidido
 * pela escolha da pessoa, filtrada pela permissão dela (ver inicio/page.tsx).
 */

const dinheiro = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const cobrancas = (n: number) => `${n} ${n === 1 ? "cobrança" : "cobranças"}`;

export function NumerosDoDia({ itens, painel }: { itens: ItemDoInicio[]; painel: PainelInicio }) {
  if (itens.length === 0) return null;

  return (
    /* No celular dois por linha: é o que faz a tela parecer um painel, e não uma pilha de cartões. */
    <div className="grid grid-cols-2 gap-3 sm:gap-3.5 xl:grid-cols-3">
      {itens.map((item) => (
        <CartaoDoNumero key={item.id} id={item.id} painel={painel} />
      ))}
    </div>
  );
}

export function EsqueletoDosNumeros({ quantidade }: { quantidade: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-3.5 xl:grid-cols-3">
      {Array.from({ length: Math.max(1, quantidade) }).map((_, i) => (
        <div
          key={i}
          className="h-[136px] animate-pulse rounded-xl border border-border bg-card sm:h-[148px]"
        />
      ))}
    </div>
  );
}

function CartaoDoNumero({ id, painel }: { id: string; painel: PainelInicio }) {
  switch (id) {
    case "vence-hoje":
      return <CartaoVenceHoje painel={painel} />;
    case "a-receber":
      return <CartaoAReceber painel={painel} />;
    case "em-atraso":
      return <CartaoEmAtraso painel={painel} />;
    case "presencas":
      return <CartaoPresencas painel={painel} />;
    case "contratos-assinados":
      return <CartaoContratos painel={painel} />;
    case "envios-aguardando":
      return <CartaoEnvios painel={painel} />;
    default:
      return null;
  }
}

function CartaoVenceHoje({ painel }: { painel: PainelInicio }) {
  const venceHoje = painel.financeiro.venceHoje;
  // Sem o valor não existe cartão: calar é mais honesto que escrever R$ 0,00 sobre o que não se leu.
  if (!venceHoje) return null;

  return (
    <Estatistica
      rotulo="Vence hoje"
      etiqueta={
        <EtiquetaDoCartao tom={venceHoje.cobrancas > 0 ? "action" : "neutro"}>
          {venceHoje.cobrancas}
        </EtiquetaDoCartao>
      }
      valor={dinheiro(venceHoje.total)}
      rodape={
        venceHoje.cobrancas > 0
          ? `${cobrancas(venceHoje.cobrancas)} com vencimento hoje`
          : "nada vence hoje"
      }
    />
  );
}

function CartaoAReceber({ painel }: { painel: PainelInicio }) {
  const { aReceber, aReceberAte } = painel.financeiro;
  if (!aReceber) return null;

  return (
    <Estatistica
      rotulo="A receber"
      etiqueta={<EtiquetaDoCartao tom="neutro">{aReceber.cobrancas}</EtiquetaDoCartao>}
      valor={dinheiro(aReceber.total)}
      rodape={
        <>
          {cobrancas(aReceber.cobrancas)} de hoje até{" "}
          {/* A janela fica escrita no rodapé: "a receber" sem prazo não quer dizer nada. */}
          <span className="font-mono tabular-nums">
            {aReceberAte ? formatarSoData(aReceberAte) : "o fim do mês"}
          </span>
          {" · o atrasado não entra"}
        </>
      }
    />
  );
}

function CartaoEmAtraso({ painel }: { painel: PainelInicio }) {
  const { totalEmAberto, cobrancasVencidas, origem, erro, atualizadoEm } = painel.financeiro;
  const hora = atualizadoEm
    ? new Date(atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Estatistica
      rotulo="Em atraso"
      etiqueta={
        <EtiquetaDoCartao tom={cobrancasVencidas > 0 ? "danger" : "neutro"}>
          {cobrancasVencidas} {cobrancasVencidas === 1 ? "título" : "títulos"}
        </EtiquetaDoCartao>
      }
      valor={dinheiro(totalEmAberto)}
      tom={totalEmAberto > 0 ? "danger" : undefined}
      rodape={
        // Erro na leitura vai para a tela: zero com falha não é "ninguém deve".
        erro ? (
          <span className="text-destructive">Leitura falhou: {erro}</span>
        ) : origem === "agendaedu" ? (
          <>Sincronizado com o EduPay{hora && ` · ${hora}`}</>
        ) : (
          <>Mensalidades do sistema{hora && ` · ${hora}`}</>
        )
      }
    />
  );
}

/**
 * Chamada do dia.
 *
 * O backend já recorta por turma quando quem abre é professora (PainelService: EhProfessor →
 * ClassIds), então o número dela é o das turmas dela. O rótulo diz isso: "108 de 115" sem dono é
 * a primeira coisa que faz a professora achar que está vendo a escola inteira.
 */
function CartaoPresencas({ painel }: { painel: PainelInicio }) {
  const session = getSession();
  const ehProfessora = session?.role === "Teacher";
  const { presentes, atrasados, alunosAtivos, turmasSemChamada, turmas } = painel.presencas;
  // Atrasado esteve na escola: conta como presente na barra, e aparece separado no rodapé.
  const naEscola = presentes + atrasados;
  const pct = alunosAtivos > 0 ? Math.round((naEscola / alunosAtivos) * 100) : 0;

  return (
    <Estatistica
      rotulo={ehProfessora ? "Chamada de hoje · suas turmas" : "Chamada de hoje"}
      etiqueta={<EtiquetaDoCartao tom={pct >= 90 ? "success" : "neutro"}>{pct}%</EtiquetaDoCartao>}
      valor={naEscola}
      total={alunosAtivos}
      proporcao={pct}
      alertarAbaixoDe={75}
      rodape={
        <>
          {atrasados > 0 && (
            <>
              <span className="font-mono tabular-nums">{atrasados}</span> com atraso ·{" "}
            </>
          )}
          {turmasSemChamada > 0 ? (
            <>
              <span className="font-mono tabular-nums">{turmasSemChamada}</span>{" "}
              {turmasSemChamada === 1 ? "turma sem chamada" : "turmas sem chamada"}
              {turmas.length > 0 && `: ${turmas.map((t) => t.turma).join(", ")}`}
            </>
          ) : (
            "chamada fechada em todas as turmas"
          )}
        </>
      }
    />
  );
}

function CartaoContratos({ painel }: { painel: PainelInicio }) {
  const { assinadosNoMes, aguardandoConferencia, mes, ano } = painel.contratos;

  return (
    <Estatistica
      rotulo="Contratos assinados"
      etiqueta={
        <EtiquetaDoCartao tom="neutro">
          {MESES[mes - 1]}/{ano}
        </EtiquetaDoCartao>
      }
      valor={assinadosNoMes}
      rodape={
        aguardandoConferencia > 0 ? (
          <>
            <span className="font-mono tabular-nums">{aguardandoConferencia}</span> aguardando
            conferência da gestão
          </>
        ) : (
          "nada aguardando conferência"
        )
      }
    />
  );
}

function CartaoEnvios({ painel }: { painel: PainelInicio }) {
  const { aguardando, totalEnvios, concluidos } = painel.formularios.combinado;

  return (
    <Estatistica
      rotulo="Envios aguardando"
      etiqueta={
        <EtiquetaDoCartao tom={aguardando > 0 ? "action" : "neutro"}>
          {totalEnvios} no total
        </EtiquetaDoCartao>
      }
      valor={aguardando}
      rodape={
        <>
          <span className="font-mono tabular-nums">{concluidos}</span> já aprovados nos formulários
          do seu painel
        </>
      }
    />
  );
}
