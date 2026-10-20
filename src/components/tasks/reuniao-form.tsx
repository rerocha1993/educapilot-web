"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ChipDeEnvolvido, ConfirmarFinalizacao, EscalasDeNota } from "@/components/tasks/reuniao-pecas";
import { Escolha } from "@/components/tasks/escolha";
import { novaChave, SeletorDeEnvolvidos, type EnvolvidoDoForm } from "@/components/tasks/seletor-de-envolvidos";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";
import { formatarData, hojeIsoBrasilia } from "@/lib/format/date";
import { useOccurrencesByStudent } from "@/lib/tasks/use-occurrences";
import {
  ehAdvertenciaVerbal,
  ROTULO_DE_QUEM_FAZ,
  useCondutoresPossiveis,
  useFinalizarReuniao,
  useOpcoesDeReuniao,
  useSalvarNotas,
  useSalvarReuniao,
  type AssuntoDeReuniao,
  type EnvolvidoEntrada,
  type QuemFaz,
  type ReuniaoDetalhada,
} from "@/lib/tasks/use-reunioes-e-atendimentos";

interface Combinado {
  chave: string;
  id?: string;
  descricao: string;
  responsavel: QuemFaz;
  prazo: string;
  cumprido: boolean;
  /** Funcionário que faz (só quando "De quem" é Funcionário). */
  funcionarioId: string;
  criarCard: boolean;
  cartaoId: string | null;
  cartaoConcluido: boolean;
  responsavelUserId: string | null;
}

interface FuncionarioEscolhavel {
  id: string;
  nome: string;
  temUsuario: boolean;
}

/** Transforma o que veio do servidor nos itens editáveis do formulário. */
export function envolvidosDoServidor(r: ReuniaoDetalhada): EnvolvidoDoForm[] {
  return r.envolvidos.map((e) => ({ ...e, chave: novaChave() }));
}

/** Grupos na ordem em que o servidor mandou; assuntos "só gestão" somem para quem não é gestão. */
function agruparAssuntos(assuntos: AssuntoDeReuniao[], souGestao: boolean, atual: string): { grupo: string; itens: AssuntoDeReuniao[] }[] {
  const grupos: { grupo: string; itens: AssuntoDeReuniao[] }[] = [];
  for (const a of assuntos) {
    if (a.soGestao && !souGestao && a.valor !== atual) continue;
    let g = grupos.find((x) => x.grupo === a.grupo);
    if (!g) grupos.push((g = { grupo: a.grupo, itens: [] }));
    g.itens.push(a);
  }
  // Reunião antiga com um assunto que saiu da lista (ex.: Desempenho) continua abrindo.
  if (atual && !assuntos.some((a) => a.valor === atual)) grupos.push({ grupo: "Antigo", itens: [{ valor: atual, grupo: "Antigo" }] });
  return grupos;
}

/** Para onde "Ver card" leva: o quadro de quem recebeu. Sem atalho para um card específico, abre o quadro. */
export function hrefDoCard(responsavelUserId: string | null | undefined, meuId: string | undefined): string {
  return responsavelUserId && meuId && responsavelUserId !== meuId ? "/flow/tarefas/equipe" : "/flow/tarefas";
}

/**
 * Formulário de reunião e atendimento, para criar e editar. Assunto agrupado, envolvidos por busca única,
 * quem conduz (padrão: eu), pauta, o que foi conversado, encaminhamentos (Escola, Família ou Funcionário, com
 * card opcional no quadro) e, só para a gestão, as duas notas. "Finalizar" leva a reunião para o histórico de
 * cada pessoa; antes disso ela fica agendada.
 */
export function ReuniaoForm({
  reuniao,
  envolvidosIniciais,
  aoSalvar,
  aoCancelar,
  hrefDeVolta,
}: {
  reuniao?: ReuniaoDetalhada;
  envolvidosIniciais?: EnvolvidoDoForm[];
  aoSalvar: (reuniao: ReuniaoDetalhada) => void;
  aoCancelar?: () => void;
  hrefDeVolta: string;
}) {
  const editando = !!reuniao;
  const sessao = useSessaoLocal();
  const meuId = sessao?.userId;

  const { data: opcoes } = useOpcoesDeReuniao();
  const { data: condutoresPossiveis } = useCondutoresPossiveis();
  const souGestao = opcoes?.souGestao === true;
  const podeDarNota = opcoes?.podeDarNota === true;

  const [data, setData] = useState(reuniao?.data ?? hojeIsoBrasilia());
  const [hora, setHora] = useState(reuniao?.hora ?? "");
  const [assunto, setAssunto] = useState(reuniao?.assunto ?? "");
  const [envolvidos, setEnvolvidos] = useState<EnvolvidoDoForm[]>(() => (reuniao ? envolvidosDoServidor(reuniao) : (envolvidosIniciais ?? [])));
  // Nulo = ninguém mexeu ainda: vale "eu" (a sessão pode chegar depois do primeiro desenho).
  const [condutoresEscolhidos, setCondutoresEscolhidos] = useState<string[] | null>(() => (reuniao ? reuniao.condutores.map((c) => c.userId) : null));
  const [ocorrenciaId, setOcorrenciaId] = useState<number | null>(reuniao?.occurrenceId ?? null);
  const [pauta, setPauta] = useState(reuniao?.pauta ?? "");
  const [conversado, setConversado] = useState(reuniao?.conversado ?? "");
  const [proxima, setProxima] = useState(reuniao?.proximaReuniaoEm ?? "");
  const [notaDoAssunto, setNotaDoAssunto] = useState<number | null>(reuniao?.notaDoAssunto ?? null);
  const [notaDoDesfecho, setNotaDoDesfecho] = useState<number | null>(reuniao?.notaDoDesfecho ?? null);
  const [combinados, setCombinados] = useState<Combinado[]>(
    () =>
      reuniao?.encaminhamentos.map((e) => ({
        chave: novaChave(),
        id: e.id,
        descricao: e.descricao,
        responsavel: e.responsavel,
        prazo: e.prazo ?? "",
        cumprido: e.cumprido,
        funcionarioId: e.funcionarioId ?? "",
        criarCard: false,
        cartaoId: e.cartaoId ?? null,
        cartaoConcluido: e.cartaoConcluido === true,
        responsavelUserId: e.responsavelUserId ?? null,
      })) ?? []
  );
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [idAtual, setIdAtual] = useState<string | undefined>(reuniao?.id);

  const salvar = useSalvarReuniao();
  const salvarNotas = useSalvarNotas();
  const finalizar = useFinalizarReuniao();
  const ocupado = salvar.isPending || salvarNotas.isPending || finalizar.isPending;

  const primeiroAluno = envolvidos.find((e) => e.tipo === "Aluno" && e.studentId != null);
  const { data: ocorrencias } = useOccurrencesByStudent(primeiroAluno?.studentId ?? null);

  // ------------------------------------------------------------------ quem conduz
  const condutoresEfetivos = useMemo(() => condutoresEscolhidos ?? (meuId ? [meuId] : []), [condutoresEscolhidos, meuId]);
  const nomeDoCondutor = useMemo(() => {
    const mapa = new Map<string, { nome: string; funcionarioId: string | null }>();
    for (const c of reuniao?.condutores ?? []) mapa.set(c.userId, { nome: c.nome, funcionarioId: c.funcionarioId ?? null });
    for (const c of condutoresPossiveis ?? []) mapa.set(c.userId, { nome: c.nome, funcionarioId: c.funcionarioId ?? null });
    if (sessao && !mapa.has(sessao.userId)) mapa.set(sessao.userId, { nome: sessao.name, funcionarioId: null });
    return mapa;
  }, [reuniao, condutoresPossiveis, sessao]);

  const opcoesDeCondutor = (condutoresPossiveis ?? [])
    .filter((c) => !condutoresEfetivos.includes(c.userId))
    .map((c) => ({ valor: c.userId, rotulo: c.cargo ? `${c.nome} · ${c.cargo}` : c.nome }));

  // ------------------------------------------------------------------ funcionários que podem receber encaminhamento
  const funcionariosEscolhaveis = useMemo(() => {
    const comUsuario = new Set((condutoresPossiveis ?? []).filter((c) => c.funcionarioId).map((c) => c.funcionarioId!));
    const mapa = new Map<string, FuncionarioEscolhavel>();
    for (const e of envolvidos) {
      if (e.tipo !== "Funcionario" || !e.funcionarioId) continue;
      mapa.set(e.funcionarioId, { id: e.funcionarioId, nome: e.nome, temUsuario: e.temUsuario ?? comUsuario.has(e.funcionarioId) });
    }
    for (const userId of condutoresEfetivos) {
      const c = nomeDoCondutor.get(userId);
      if (c?.funcionarioId && !mapa.has(c.funcionarioId)) mapa.set(c.funcionarioId, { id: c.funcionarioId, nome: c.nome, temUsuario: true });
    }
    return [...mapa.values()];
  }, [envolvidos, condutoresEfetivos, condutoresPossiveis, nomeDoCondutor]);

  /** Com um só funcionário possível, a linha já nasce com ele (aplicado na leitura, como nas demandas da reunião de turma). */
  const funcionarioDe = (c: Combinado) => c.funcionarioId || (funcionariosEscolhaveis.length === 1 ? funcionariosEscolhaveis[0].id : "");

  const funcionariosEnvolvidos = envolvidos.filter((e) => e.tipo === "Funcionario");
  const grupos = agruparAssuntos(opcoes?.assuntos ?? [], souGestao, reuniao?.assunto ?? "");
  const exigeFuncionario = ehAdvertenciaVerbal(assunto);

  function atualizar(chave: string, campo: Partial<Combinado>) {
    setCombinados((l) => l.map((x) => (x.chave === chave ? { ...x, ...campo } : x)));
  }

  function validar(): string | null {
    if (!data) return "Informe o dia da reunião.";
    if (!assunto) return "Escolha o assunto.";
    if (envolvidos.length === 0) return "Inclua pelo menos uma pessoa na reunião.";
    if (condutoresEfetivos.length === 0) return "Diga quem conduz a reunião.";
    if (exigeFuncionario && funcionariosEnvolvidos.length === 0) return "Advertência verbal precisa de pelo menos um funcionário na reunião.";
    for (const c of combinados) {
      if (c.descricao.trim() && c.responsavel === "Funcionario" && !funcionarioDe(c)) return "Escolha qual funcionário faz o encaminhamento.";
    }
    return null;
  }

  async function persistir(): Promise<ReuniaoDetalhada> {
    const entrada = {
      data,
      hora: hora || null,
      assunto,
      envolvidos: envolvidos.map(
        (e): EnvolvidoEntrada => ({
          tipo: e.tipo,
          studentId: e.studentId ?? null,
          guardianId: e.guardianId ?? null,
          funcionarioId: e.funcionarioId ?? null,
          nome: e.nome,
          detalhe: e.detalhe ?? null,
        })
      ),
      condutores: condutoresEfetivos,
      pauta: pauta.trim() || null,
      conversado: conversado.trim() || null,
      proximaReuniaoEm: proxima || null,
      occurrenceId: ocorrenciaId,
      encaminhamentos: combinados
        .filter((c) => c.descricao.trim())
        .map((c) => {
          const funcionario = c.responsavel === "Funcionario" ? funcionarioDe(c) : "";
          const podeCriar = !!funcionario && !c.cartaoId && c.criarCard && (funcionariosEscolhaveis.find((f) => f.id === funcionario)?.temUsuario ?? false);
          return {
            id: c.id,
            descricao: c.descricao.trim(),
            responsavel: c.responsavel,
            prazo: c.prazo || null,
            cumprido: c.cumprido,
            funcionarioId: funcionario || null,
            criarCard: podeCriar,
          };
        }),
    };

    const salva = await salvar.mutateAsync({ id: idAtual, entrada });
    setIdAtual(salva.id);

    // A API só aceita nota em reunião realizada: numa agendada as notas esperam o "Finalizar".
    return salva.status === "Realizada" ? await gravarNotas(salva) : salva;
  }

  async function gravarNotas<T extends { id: string }>(salva: T) {
    const mudouNota = (reuniao?.notaDoAssunto ?? null) !== notaDoAssunto || (reuniao?.notaDoDesfecho ?? null) !== notaDoDesfecho;
    if (podeDarNota && mudouNota) {
      return await salvarNotas.mutateAsync({ id: salva.id, notaDoAssunto, notaDoDesfecho });
    }
    return salva;
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const problema = validar();
    if (problema) return setErro(problema);

    try {
      const salva = await persistir();
      toast.success(editando ? "Reunião atualizada." : "Reunião agendada.");
      aoSalvar(salva);
    } catch (err) {
      const texto = err instanceof Error ? err.message : "Não foi possível salvar a reunião.";
      setErro(texto);
      toast.error(texto);
    }
  }

  function pedirFinalizacao() {
    setErro(null);
    const problema = validar();
    if (problema) return setErro(problema);
    if (exigeFuncionario) return setConfirmando(true);
    void concluir();
  }

  async function concluir() {
    try {
      const salva = await persistir();
      const final = await gravarNotas(await finalizar.mutateAsync(salva.id));
      setConfirmando(false);
      toast.success("Reunião finalizada. Ela já está no histórico de quem participou.");
      aoSalvar(final);
    } catch (err) {
      setConfirmando(false);
      const texto = err instanceof Error ? err.message : "Não foi possível finalizar a reunião.";
      setErro(texto);
      toast.error(texto);
    }
  }

  const podeFinalizar = !editando || reuniao.status === "Agendada";

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      {/* Quando e sobre o quê */}
      <fieldset className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2 md:p-5">
        <legend className="px-1 font-heading text-[15px] font-semibold">Quando e sobre o quê</legend>

        <div className="grid content-start gap-1.5 md:col-span-2">
          <Label htmlFor="reuniao-assunto">Assunto</Label>
          <Select value={assunto} onValueChange={(v) => setAssunto(v ?? "")}>
            <SelectTrigger id="reuniao-assunto" className="h-10 w-full md:h-9">
              <SelectValue placeholder="Escolha o assunto">{() => assunto || "Escolha o assunto"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {grupos.map((g) => (
                <SelectGroup key={g.grupo}>
                  <SelectLabel>{g.grupo}</SelectLabel>
                  {g.itens.map((a) => (
                    <SelectItem key={a.valor} value={a.valor}>
                      {a.valor}
                      {a.soGestao ? " (só gestão)" : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          {exigeFuncionario && (
            <p className="text-[12.5px] text-muted-foreground">Advertência verbal precisa de pelo menos um funcionário e é registrada no Desempenho dele ao finalizar.</p>
          )}
        </div>

        <div className="grid content-start gap-1.5">
          <Label htmlFor="reuniao-data">Dia</Label>
          <Input id="reuniao-data" type="date" value={data} onChange={(e) => setData(e.target.value)} className="font-numeric" required />
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor="reuniao-hora">Hora (opcional)</Label>
          <Input id="reuniao-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="font-numeric" />
        </div>
      </fieldset>

      {/* Quem */}
      <fieldset className="grid gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
        <legend className="px-1 font-heading text-[15px] font-semibold">Quem participa e quem conduz</legend>

        <SeletorDeEnvolvidos valor={envolvidos} aoMudar={setEnvolvidos} mostrarFuncionarios={souGestao} />

        <div className="grid gap-2 border-t border-border pt-4">
          <p className="text-sm font-medium">Quem conduz</p>
          {condutoresEfetivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguém escolhido.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5" aria-label="Quem conduz">
              {condutoresEfetivos.map((id) => (
                <li key={id} className="max-w-full">
                  <ChipDeEnvolvido
                    tipo="Funcionario"
                    nome={nomeDoCondutor.get(id)?.nome ?? "Funcionário"}
                    detalhe={id === meuId ? "você" : null}
                    aoRemover={() => setCondutoresEscolhidos(condutoresEfetivos.filter((x) => x !== id))}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="md:max-w-sm">
            <Escolha
              rotuloAcessivel="Adicionar quem conduz"
              valor=""
              aoMudar={(v) => v && setCondutoresEscolhidos([...condutoresEfetivos, v])}
              opcoes={opcoesDeCondutor}
              desabilitado={opcoesDeCondutor.length === 0}
              placeholder="Adicionar quem conduz"
            />
          </div>
        </div>
      </fieldset>

      {/* Conteúdo */}
      <fieldset className="grid gap-4 rounded-xl border border-border bg-card p-4 md:p-5">
        <legend className="px-1 font-heading text-[15px] font-semibold">Pauta e conversa</legend>

        {primeiroAluno && (
          <div className="grid gap-1.5">
            <Label htmlFor="reuniao-ocorrencia">Ocorrência que motivou a reunião (opcional)</Label>
            <Escolha
              id="reuniao-ocorrencia"
              valor={ocorrenciaId === null ? "" : String(ocorrenciaId)}
              aoMudar={(v) => setOcorrenciaId(v && v !== "__nenhuma__" ? Number(v) : null)}
              placeholder="Nenhuma"
              opcoes={[
                { valor: "__nenhuma__", rotulo: "Nenhuma" },
                ...(ocorrencias ?? []).map((o) => ({ valor: String(o.id), rotulo: `${o.categoria} · ${formatarData(o.createdAt)}` })),
              ]}
            />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="reuniao-pauta">Pauta</Label>
          <Textarea id="reuniao-pauta" value={pauta} maxLength={2000} rows={3} onChange={(e) => setPauta(e.target.value)} placeholder="O que a escola quer tratar." />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="reuniao-conversado">O que foi conversado</Label>
          <Textarea
            id="reuniao-conversado"
            value={conversado}
            maxLength={8000}
            rows={6}
            onChange={(e) => setConversado(e.target.value)}
            aria-describedby="reuniao-conversado-dica"
          />
          <p id="reuniao-conversado-dica" className="text-xs text-muted-foreground">
            Registro interno da escola, pode ter dado de criança ou de funcionário. A família e a própria pessoa não leem a ata.
          </p>
        </div>
      </fieldset>

      {/* Encaminhamentos */}
      <fieldset className="grid gap-3 rounded-xl border border-border bg-card p-4 md:p-5">
        <legend className="px-1 font-heading text-[15px] font-semibold">Encaminhamentos</legend>
        <p className="text-[13px] text-muted-foreground">O que ficou combinado, de quem é a ação e até quando. O que está vencido e não foi feito aparece em destaque.</p>

        {combinados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum encaminhamento ainda.</p>}

        {combinados.map((c, i) => {
          const funcionario = c.responsavel === "Funcionario" ? funcionarioDe(c) : "";
          const pessoa = funcionariosEscolhaveis.find((f) => f.id === funcionario);
          const semUsuario = !!funcionario && !!pessoa && !pessoa.temUsuario;
          return (
            <div key={c.chave} className="grid gap-2 rounded-lg border border-border p-3">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_9rem_10.5rem_auto] md:items-end">
                <div className="grid gap-1.5">
                  <Label htmlFor={`comb-desc-${c.chave}`}>Encaminhamento {i + 1}</Label>
                  <Input
                    id={`comb-desc-${c.chave}`}
                    value={c.descricao}
                    maxLength={500}
                    placeholder="Ex.: levar o laudo da fonoaudióloga"
                    onChange={(e) => atualizar(c.chave, { descricao: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`comb-quem-${c.chave}`}>De quem</Label>
                  <Escolha
                    id={`comb-quem-${c.chave}`}
                    valor={c.responsavel}
                    aoMudar={(v) => atualizar(c.chave, { responsavel: v as QuemFaz, criarCard: v === "Funcionario" ? c.criarCard : false })}
                    opcoes={(Object.keys(ROTULO_DE_QUEM_FAZ) as QuemFaz[]).map((q) => ({ valor: q, rotulo: ROTULO_DE_QUEM_FAZ[q] }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`comb-prazo-${c.chave}`}>Prazo</Label>
                  <Input
                    id={`comb-prazo-${c.chave}`}
                    type="date"
                    value={c.prazo}
                    className="font-numeric"
                    onChange={(e) => atualizar(c.chave, { prazo: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 md:justify-end">
                  <label className="flex min-h-10 items-center gap-2 text-sm md:min-h-0">
                    <Checkbox
                      checked={c.cumprido}
                      disabled={!!c.cartaoId}
                      onCheckedChange={(v) => atualizar(c.chave, { cumprido: v === true })}
                    />
                    Cumprido
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover encaminhamento ${i + 1}`}
                    onClick={() => setCombinados((l) => l.filter((x) => x.chave !== c.chave))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {c.responsavel === "Funcionario" && (
                <div className="grid gap-2 border-t border-border pt-2 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:items-start">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`comb-func-${c.chave}`}>Qual funcionário</Label>
                    <Escolha
                      id={`comb-func-${c.chave}`}
                      valor={funcionario}
                      aoMudar={(v) => atualizar(c.chave, { funcionarioId: v, criarCard: false })}
                      opcoes={funcionariosEscolhaveis.map((f) => ({ valor: f.id, rotulo: f.nome }))}
                      desabilitado={funcionariosEscolhaveis.length === 0}
                      placeholder={funcionariosEscolhaveis.length === 0 ? "Inclua um funcionário na reunião" : "Escolha"}
                    />
                  </div>
                  <div className="grid content-start gap-1 text-sm">
                    {c.cartaoId ? (
                      <p className="flex flex-wrap items-center gap-2 pt-6 max-md:pt-0">
                        <Badge variant={c.cartaoConcluido ? "success" : "pending"}>{c.cartaoConcluido ? "Card concluído" : "Card no quadro"}</Badge>
                        <Link
                          href={hrefDoCard(c.responsavelUserId, meuId)}
                          className="inline-flex min-h-10 items-center gap-1 font-medium text-action hover:underline md:min-h-0"
                        >
                          Ver card <ExternalLink className="size-3.5" aria-hidden />
                        </Link>
                      </p>
                    ) : (
                      <>
                        <label className={`flex min-h-10 items-center gap-2 pt-6 max-md:pt-0 md:min-h-0 ${semUsuario || !funcionario ? "text-muted-foreground" : ""}`}>
                          <Checkbox
                            checked={c.criarCard && !semUsuario}
                            disabled={semUsuario || !funcionario}
                            onCheckedChange={(v) => atualizar(c.chave, { criarCard: v === true })}
                          />
                          <span className="min-w-0 break-words">Criar card no quadro{pessoa ? ` de ${pessoa.nome}` : ""}</span>
                        </label>
                        {semUsuario && (
                          <p className="text-[12.5px] text-muted-foreground">Esta pessoa não tem usuário no sistema, então não há quadro para receber o card.</p>
                        )}
                        {!funcionario && <p className="text-[12.5px] text-muted-foreground">Escolha o funcionário para poder criar o card.</p>}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setCombinados((l) => [
                ...l,
                {
                  chave: novaChave(),
                  descricao: "",
                  responsavel: "Escola",
                  prazo: "",
                  cumprido: false,
                  funcionarioId: "",
                  criarCard: false,
                  cartaoId: null,
                  cartaoConcluido: false,
                  responsavelUserId: null,
                },
              ])
            }
          >
            <Plus className="size-4" />
            Adicionar encaminhamento
          </Button>
        </div>

        <div className="grid gap-1.5 border-t border-border pt-4 md:max-w-xs">
          <Label htmlFor="reuniao-proxima">Próxima reunião (opcional)</Label>
          <Input id="reuniao-proxima" type="date" value={proxima} className="font-numeric" onChange={(e) => setProxima(e.target.value)} />
        </div>
      </fieldset>

      {/* Notas: só a gestão */}
      {podeDarNota && (
        <fieldset className="grid gap-3 rounded-xl border border-border bg-card p-4 md:p-5">
          <legend className="px-1 font-heading text-[15px] font-semibold">Notas (só a gestão)</legend>
          <p className="text-[13px] text-muted-foreground">
            Opcional. A família não vê as notas. Os funcionários que participaram veem as duas notas no Meu desempenho, e a média entra na nota de mérito deles.
          </p>
          <EscalasDeNota
            notaDoAssunto={notaDoAssunto}
            notaDoDesfecho={notaDoDesfecho}
            aoMudarAssunto={setNotaDoAssunto}
            aoMudarDesfecho={setNotaDoDesfecho}
            desabilitada={ocupado}
          />
          {exigeFuncionario && <p className="text-[12.5px] text-muted-foreground">Advertência verbal conta em Advertências, não nesta média.</p>}
        </fieldset>
      )}

      {erro && (
        <div role="alert" className="rounded-xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          {erro}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {aoCancelar ? (
          <Button type="button" variant="outline" onClick={aoCancelar} className="w-full sm:w-auto">
            Descartar alterações
          </Button>
        ) : (
          <Link href={hrefDeVolta} className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}>
            Cancelar
          </Link>
        )}
        <Button type="submit" variant={podeFinalizar ? "outline" : "action"} disabled={ocupado} className="w-full sm:w-auto">
          {salvar.isPending && !finalizar.isPending ? "Salvando…" : editando ? "Salvar alterações" : "Agendar reunião"}
        </Button>
        {podeFinalizar && (
          <Button type="button" variant="action" disabled={ocupado} onClick={pedirFinalizacao} className="w-full sm:w-auto">
            Finalizar
          </Button>
        )}
      </div>

      <ConfirmarFinalizacao
        aberto={confirmando}
        ehAdvertencia={exigeFuncionario}
        funcionarios={funcionariosEnvolvidos.map((f) => f.nome)}
        pendente={ocupado}
        aoConfirmar={() => void concluir()}
        aoFechar={() => setConfirmando(false)}
      />
    </form>
  );
}

