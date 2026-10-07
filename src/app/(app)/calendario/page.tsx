"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, Copy, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoDaPagina } from "@/components/padroes/cabecalho-da-pagina";
import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { RotinaNav } from "@/components/tasks/rotina-nav";
import {
  BarraDoCalendario,
  TODAS_AS_TURMAS,
  TODOS_OS_TIPOS,
  type VisaoDoCalendario,
} from "@/components/tasks/calendario/barra-do-calendario";
import { Confirmacao } from "@/components/tasks/calendario/confirmacao";
import { DialogDoDia } from "@/components/tasks/calendario/dialog-do-dia";
import { DialogEvento } from "@/components/tasks/calendario/dialog-evento";
import { VisaoLista } from "@/components/tasks/calendario/visao-lista";
import { VisaoMes } from "@/components/tasks/calendario/visao-mes";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";
import { competenciaDeIso, hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { cobreODia, deslocarMes, montarIso, NOMES_DOS_MESES } from "@/lib/tasks/calendario-datas";
import {
  useCopiarAno,
  useEventosDoCalendario,
  useImportarFeriados,
  type EventoDto,
} from "@/lib/tasks/use-calendario";

/**
 * Calendário escolar (Rotina).
 *
 * Professor lê e não escreve: sem os botões de criar, editar, importar e copiar. É só a tela — o
 * servidor devolve 403 para escrita de professor, e a mensagem dele aparece em toast se algo
 * escapar. O filtro por turma é do cliente, sobre o que o servidor já recortou (professor só
 * recebe o calendário das turmas dele e o da escola toda).
 */

type Dialogo =
  | { tipo: "evento"; evento: EventoDto | null; dataInicial: string }
  | { tipo: "dia"; dia: string }
  | { tipo: "importar" }
  | { tipo: "copiar" };

export default function CalendarioPage() {
  const sessao = useSessaoLocal();
  const podeEditar = !!sessao && sessao.role !== "Teacher";

  const hoje = hojeIsoBrasilia();
  const [{ ano, mes }, setMesAberto] = useState(() => competenciaDeIso(hojeIsoBrasilia()));
  const [visao, setVisao] = useState<VisaoDoCalendario>("mes");
  const [filtroTurma, setFiltroTurma] = useState(TODAS_AS_TURMAS);
  const [filtroTipo, setFiltroTipo] = useState(TODOS_OS_TIPOS);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const { data: classes } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` })),
    [classes]
  );

  const { data: eventos, isLoading, isError, refetch } = useEventosDoCalendario(ano, mes);
  const importar = useImportarFeriados();
  const copiar = useCopiarAno();

  const filtrados = useMemo(
    () =>
      (eventos ?? []).filter((e) => {
        if (filtroTipo !== TODOS_OS_TIPOS && e.tipo !== filtroTipo) return false;
        if (filtroTurma === TODAS_AS_TURMAS) return true;
        // Evento da escola toda vale para qualquer turma; os demais, só para as marcadas.
        return e.escolaToda || e.turmas.some((t) => String(t.classId) === filtroTurma);
      }),
    [eventos, filtroTipo, filtroTurma]
  );

  const nomeDoMes = NOMES_DOS_MESES[mes - 1];
  // "Novo evento" sem dia escolhido abre em hoje, quando hoje está no mês aberto; senão, no dia 1.
  const dataParaNovo = hoje.startsWith(`${ano}-${String(mes).padStart(2, "0")}`)
    ? hoje
    : montarIso(ano, mes, 1);

  function irPara(passo: -1 | 1) {
    setMesAberto((atual) => deslocarMes(atual.ano, atual.mes, passo));
  }

  function irParaHoje() {
    setMesAberto(competenciaDeIso(hoje));
  }

  function abrirEvento(evento: EventoDto) {
    setDialogo({ tipo: "evento", evento, dataInicial: evento.inicio });
  }

  function novoEvento(dia: string) {
    setDialogo({ tipo: "evento", evento: null, dataInicial: dia });
  }

  async function confirmarImportacao() {
    try {
      const r = await importar.mutateAsync(ano);
      toast.success(
        r.criados === 0
          ? `Os feriados de ${ano} já estavam no calendário.`
          : `${r.criados} ${r.criados === 1 ? "feriado importado" : "feriados importados"}${
              r.existentes > 0 ? `; ${r.existentes} já existiam` : ""
            }.`
      );
      setDialogo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível importar os feriados.");
    }
  }

  async function confirmarCopia() {
    try {
      const r = await copiar.mutateAsync({ de: ano, para: ano + 1 });
      toast.success(
        `${r.copiados} ${r.copiados === 1 ? "evento copiado" : "eventos copiados"} para ${ano + 1}.`
      );
      setDialogo(null);
    } catch (err) {
      // Inclui o 409 de "o ano de destino já tem eventos": o servidor explica, a tela repete.
      toast.error(err instanceof Error ? err.message : "Não foi possível copiar o calendário.");
    }
  }

  const eventosDoDialogoDoDia =
    dialogo?.tipo === "dia" ? filtrados.filter((e) => cobreODia(e, dialogo.dia)) : [];

  return (
    <div className="flex flex-col gap-4">
      <RotinaNav />

      <CabecalhoDaPagina
        eyebrow="Rotina"
        titulo="Calendário"
        apoio="Feriados, reuniões, avaliações e eventos da escola, mês a mês."
        acoesClassName="w-full md:w-auto"
        acoes={
          podeEditar && (
            <Button
              variant="action"
              className="flex-1 md:flex-none"
              onClick={() => novoEvento(dataParaNovo)}
            >
              <CalendarPlus className="size-4" />
              Novo evento
            </Button>
          )
        }
      />

      <BarraDoCalendario
        ano={ano}
        mes={mes}
        onAnterior={() => irPara(-1)}
        onProximo={() => irPara(1)}
        onHoje={irParaHoje}
        visao={visao}
        onVisao={setVisao}
        turmas={turmas}
        filtroTurma={filtroTurma}
        onFiltroTurma={setFiltroTurma}
        filtroTipo={filtroTipo}
        onFiltroTipo={setFiltroTipo}
      />

      {podeEditar && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialogo({ tipo: "importar" })}>
            <Download className="size-4" />
            Importar feriados nacionais de {ano}
          </Button>
          <Button variant="outline" onClick={() => setDialogo({ tipo: "copiar" })}>
            <Copy className="size-4" />
            Copiar para {ano + 1}
          </Button>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-[480px] w-full rounded-xl" />
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground"
        >
          Não foi possível carregar o calendário de {nomeDoMes}.
          <Button variant="outline" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <>
          {/* A grade só cabe a partir de md; no celular a lista por dia ocupa o lugar dela. */}
          {visao === "mes" && (
            <>
              <VisaoMes
                ano={ano}
                mes={mes}
                eventos={filtrados}
                hoje={hoje}
                podeCriar={podeEditar}
                onNovo={novoEvento}
                onAbrir={abrirEvento}
                onVerDia={(dia) => setDialogo({ tipo: "dia", dia })}
              />
              <div className="md:hidden">
                <VisaoLista
                  ano={ano}
                  mes={mes}
                  eventos={filtrados}
                  hoje={hoje}
                  onAbrir={abrirEvento}
                />
              </div>
            </>
          )}
          {visao === "lista" && (
            <VisaoLista ano={ano} mes={mes} eventos={filtrados} hoje={hoje} onAbrir={abrirEvento} />
          )}

          {filtrados.length === 0 && (
            <EstadoVazio
              icone={<CalendarDays />}
              titulo={`Nenhum evento em ${nomeDoMes}`}
              texto={
                (eventos ?? []).length > 0
                  ? "Nenhum evento combina com os filtros escolhidos."
                  : podeEditar
                    ? "Crie um evento ou importe os feriados nacionais do ano."
                    : "Quando a escola cadastrar eventos, eles aparecem aqui."
              }
              textoClassName="max-w-[340px]"
              acao={
                podeEditar && (
                  <Button variant="action" onClick={() => novoEvento(dataParaNovo)}>
                    <CalendarPlus className="size-4" />
                    Novo evento
                  </Button>
                )
              }
            />
          )}
        </>
      )}

      {dialogo?.tipo === "evento" && (
        <DialogEvento
          // Sem a chave, abrir outro evento reaproveitaria o estado do formulário do anterior.
          key={dialogo.evento?.id ?? `novo-${dialogo.dataInicial}`}
          evento={dialogo.evento}
          dataInicial={dialogo.dataInicial}
          turmas={turmas}
          somenteLeitura={!podeEditar}
          onFechar={() => setDialogo(null)}
        />
      )}

      {dialogo?.tipo === "dia" && (
        <DialogDoDia
          dia={dialogo.dia}
          eventos={eventosDoDialogoDoDia}
          podeCriar={podeEditar}
          onAbrir={abrirEvento}
          onNovo={novoEvento}
          onFechar={() => setDialogo(null)}
        />
      )}

      {dialogo?.tipo === "importar" && (
        <Confirmacao
          titulo={`Importar feriados nacionais de ${ano}?`}
          descricao="Os feriados que já estiverem no calendário não são duplicados."
          rotuloConfirmar="Importar"
          pendente={importar.isPending}
          onConfirmar={confirmarImportacao}
          onFechar={() => setDialogo(null)}
        />
      )}

      {dialogo?.tipo === "copiar" && (
        <Confirmacao
          titulo={`Copiar o calendário de ${ano} para ${ano + 1}?`}
          descricao={`Os eventos de ${ano} são levados para ${ano + 1}. Só funciona se ${ano + 1} ainda não tiver eventos.`}
          rotuloConfirmar="Copiar"
          pendente={copiar.isPending}
          onConfirmar={confirmarCopia}
          onFechar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}
