"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  diaComSemana,
  diaDe,
  faixaDeHorario,
} from "@/lib/tasks/calendario-datas";
import {
  ROTULO_DO_TIPO,
  TIPOS_DE_EVENTO,
  tipoConhecido,
  useCriarEvento,
  useEditarEvento,
  useExcluirEvento,
  type EventoDto,
  type EventoInput,
  type TipoDeEvento,
} from "@/lib/tasks/use-calendario";

import { EtiquetaDoTipo } from "./etiqueta-do-tipo";
import { turmasDoEvento } from "./visao-lista";

export interface TurmaParaEscolher {
  id: number;
  nome: string;
}

interface Formulario {
  titulo: string;
  tipo: TipoDeEvento;
  inicio: string;
  fim: string;
  diaInteiro: boolean;
  horaInicio: string;
  horaFim: string;
  classIds: number[];
  visivelParaFamilias: boolean;
  descricao: string;
}

function formularioDe(evento: EventoDto | null, dataInicial: string): Formulario {
  if (!evento) {
    return {
      titulo: "",
      tipo: "Evento",
      inicio: dataInicial,
      fim: dataInicial,
      diaInteiro: true,
      horaInicio: "",
      horaFim: "",
      classIds: [],
      visivelParaFamilias: false,
      descricao: "",
    };
  }

  return {
    titulo: evento.titulo,
    tipo: evento.tipo,
    inicio: diaDe(evento.inicio),
    fim: diaDe(evento.fim),
    diaInteiro: evento.diaInteiro,
    horaInicio: evento.horaInicio ?? "",
    horaFim: evento.horaFim ?? "",
    classIds: evento.escolaToda ? [] : evento.turmas.map((t) => t.classId),
    visivelParaFamilias: evento.visivelParaFamilias,
    descricao: evento.descricao ?? "",
  };
}

/** O que o servidor espera a partir do que está na tela, ou a frase que diz o que falta. */
function validar(f: Formulario): { erro: string } | { entrada: EventoInput } {
  const titulo = f.titulo.trim();
  if (!titulo) return { erro: "Dê um título ao evento." };
  if (!f.inicio) return { erro: "Informe a data de início." };
  if (!f.fim) return { erro: "Informe a data de término." };
  // Datas em yyyy-MM-dd comparam certo como texto.
  if (f.fim < f.inicio) return { erro: "O término não pode ser antes do início." };

  if (!f.diaInteiro) {
    if (!f.horaInicio) return { erro: "Informe a hora de início ou marque “Dia inteiro”." };
    if (f.horaFim && f.fim === f.inicio && f.horaFim < f.horaInicio) {
      return { erro: "A hora de término não pode ser antes da hora de início." };
    }
  }

  return {
    entrada: {
      titulo,
      descricao: f.descricao.trim() || null,
      tipo: f.tipo,
      inicio: f.inicio,
      fim: f.fim,
      horaInicio: f.diaInteiro ? null : f.horaInicio,
      horaFim: f.diaInteiro ? null : f.horaFim || null,
      visivelParaFamilias: f.visivelParaFamilias,
      classIds: f.classIds,
    },
  };
}

/**
 * Criar, editar ou (para o professor) só ler um evento.
 *
 * O pai monta este diálogo quando abre e o desmonta ao fechar, então o formulário nasce do
 * evento recebido sem efeito de sincronização. `somenteLeitura` troca o formulário por um
 * detalhe: o professor lê tudo do calendário, mas não escreve — e se tentasse, o servidor
 * devolveria 403.
 */
export function DialogEvento({
  evento,
  dataInicial,
  turmas,
  somenteLeitura,
  onFechar,
}: {
  evento: EventoDto | null;
  dataInicial: string;
  turmas: TurmaParaEscolher[];
  somenteLeitura: boolean;
  onFechar: () => void;
}) {
  if (somenteLeitura && evento) {
    return <DetalheDoEvento evento={evento} onFechar={onFechar} />;
  }

  return <FormularioDoEvento evento={evento} dataInicial={dataInicial} turmas={turmas} onFechar={onFechar} />;
}

function FormularioDoEvento({
  evento,
  dataInicial,
  turmas,
  onFechar,
}: {
  evento: EventoDto | null;
  dataInicial: string;
  turmas: TurmaParaEscolher[];
  onFechar: () => void;
}) {
  const criar = useCriarEvento();
  const editar = useEditarEvento();
  const excluir = useExcluirEvento();
  const [f, setF] = useState(() => formularioDe(evento, dataInicial));
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const ocupado = criar.isPending || editar.isPending || excluir.isPending;

  function mudar(parte: Partial<Formulario>) {
    setF((atual) => ({ ...atual, ...parte }));
    setErro(null);
  }

  function mudarInicio(inicio: string) {
    // Término antes do início não existe: arrasta o término junto, como qualquer agenda faz.
    mudar({ inicio, fim: !f.fim || f.fim < inicio ? inicio : f.fim });
  }

  function alternarTurma(classId: number, marcada: boolean) {
    mudar({
      classIds: marcada ? [...f.classIds, classId] : f.classIds.filter((id) => id !== classId),
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const resultado = validar(f);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }

    try {
      if (evento) {
        await editar.mutateAsync({ id: evento.id, ...resultado.entrada });
        toast.success("Evento atualizado.");
      } else {
        await criar.mutateAsync(resultado.entrada);
        toast.success("Evento criado.");
      }
      onFechar();
    } catch (err) {
      // A mensagem do servidor diz o que impediu (permissão, validação) e vai direto para a tela.
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o evento.");
    }
  }

  async function confirmarExclusao() {
    if (!evento) return;
    try {
      await excluir.mutateAsync(evento.id);
      toast.success("Evento excluído.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o evento.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !ocupado && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{evento ? "Editar evento" : "Novo evento"}</DialogTitle>
          <DialogDescription>
            {evento
              ? "Mudanças avisam os professores das turmas atingidas."
              : "Sem turma marcada, o evento vale para a escola toda."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={salvar} noValidate className="grid gap-4">
          <Campo id="evento-titulo" rotulo="Título">
            <Input
              id="evento-titulo"
              value={f.titulo}
              onChange={(e) => mudar({ titulo: e.target.value })}
              placeholder="Ex.: Reunião de pais"
              autoFocus
              aria-invalid={erro !== null && !f.titulo.trim()}
            />
          </Campo>

          <Campo id="evento-tipo" rotulo="Tipo">
            <Select value={f.tipo} onValueChange={(v) => v && mudar({ tipo: tipoConhecido(v) })}>
              <SelectTrigger id="evento-tipo" className="w-full">
                <SelectValue>{() => ROTULO_DO_TIPO[f.tipo]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {TIPOS_DE_EVENTO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ROTULO_DO_TIPO[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo id="evento-inicio" rotulo="Início">
              <Input
                id="evento-inicio"
                type="date"
                value={f.inicio}
                onChange={(e) => mudarInicio(e.target.value)}
                aria-invalid={erro !== null && !f.inicio}
              />
            </Campo>
            <Campo id="evento-fim" rotulo="Término">
              <Input
                id="evento-fim"
                type="date"
                value={f.fim}
                min={f.inicio || undefined}
                onChange={(e) => mudar({ fim: e.target.value })}
                aria-invalid={erro !== null && (!f.fim || f.fim < f.inicio)}
              />
            </Campo>
          </div>

          <div className="flex min-h-10 items-center gap-3">
            <Switch
              id="evento-dia-inteiro"
              checked={f.diaInteiro}
              onCheckedChange={(v) => mudar({ diaInteiro: v })}
            />
            <Label htmlFor="evento-dia-inteiro" className="cursor-pointer">
              Dia inteiro
            </Label>
          </div>

          {!f.diaInteiro && (
            <div className="grid grid-cols-2 gap-3">
              <Campo id="evento-hora-inicio" rotulo="Hora de início">
                <Input
                  id="evento-hora-inicio"
                  type="time"
                  value={f.horaInicio}
                  onChange={(e) => mudar({ horaInicio: e.target.value })}
                  aria-invalid={erro !== null && !f.horaInicio}
                />
              </Campo>
              <Campo id="evento-hora-fim" rotulo="Hora de término">
                <Input
                  id="evento-hora-fim"
                  type="time"
                  value={f.horaFim}
                  onChange={(e) => mudar({ horaFim: e.target.value })}
                />
              </Campo>
            </div>
          )}

          <fieldset className="grid gap-1">
            <legend className="mb-1 text-sm font-medium">Turmas</legend>
            <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-1 active:bg-muted">
              <Checkbox
                checked={f.classIds.length === 0}
                // Marcar "Escola toda" limpa as turmas; desmarcar sem escolher outra não faz
                // sentido (sem turma é escola toda), então fica como está.
                onCheckedChange={(v) => v && mudar({ classIds: [] })}
              />
              <span className="text-sm">Escola toda</span>
            </label>
            {turmas.length > 0 && (
              <div className="grid max-h-40 gap-0.5 overflow-y-auto border-t border-border pt-1 sm:grid-cols-2">
                {turmas.map((t) => (
                  <label
                    key={t.id}
                    className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-1 active:bg-muted"
                  >
                    <Checkbox
                      checked={f.classIds.includes(t.id)}
                      onCheckedChange={(v) => alternarTurma(t.id, v)}
                    />
                    <span className="min-w-0 truncate text-sm">{t.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div className="flex min-h-10 items-center gap-3">
            <Switch
              id="evento-familias"
              checked={f.visivelParaFamilias}
              onCheckedChange={(v) => mudar({ visivelParaFamilias: v })}
            />
            <Label htmlFor="evento-familias" className="cursor-pointer">
              Visível para as famílias
            </Label>
          </div>

          <Campo id="evento-descricao" rotulo="Descrição">
            <Textarea
              id="evento-descricao"
              value={f.descricao}
              onChange={(e) => mudar({ descricao: e.target.value })}
              rows={3}
              placeholder="Detalhes, local, o que levar…"
            />
          </Campo>

          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}

          {confirmandoExclusao ? (
            <DialogFooter className="items-center sm:justify-between">
              <p className="text-sm font-medium">Excluir este evento?</p>
              <div className="flex gap-2 max-sm:flex-col-reverse">
                <Button
                  type="button"
                  variant="outline"
                  disabled={ocupado}
                  onClick={() => setConfirmandoExclusao(false)}
                >
                  Manter
                </Button>
                <Button type="button" variant="destructive" disabled={ocupado} onClick={confirmarExclusao}>
                  {excluir.isPending ? "Excluindo..." : "Sim, excluir"}
                </Button>
              </div>
            </DialogFooter>
          ) : (
            <DialogFooter className="sm:justify-between">
              {evento ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={ocupado}
                  onClick={() => setConfirmandoExclusao(true)}
                >
                  Excluir
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2 max-sm:flex-col-reverse sm:justify-end">
                <Button type="button" variant="outline" disabled={ocupado} onClick={onFechar}>
                  Cancelar
                </Button>
                <Button type="submit" variant="action" disabled={ocupado}>
                  {criar.isPending || editar.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  id,
  rotulo,
  children,
}: {
  id: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
    </div>
  );
}

/** O evento como o professor o vê: tudo legível, nada editável. */
function DetalheDoEvento({ evento, onFechar }: { evento: EventoDto; onFechar: () => void }) {
  const mesmoDia = diaDe(evento.inicio) === diaDe(evento.fim);
  const horario = evento.diaInteiro ? "Dia inteiro" : faixaDeHorario(evento.horaInicio, evento.horaFim);

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div>
            <EtiquetaDoTipo tipo={evento.tipo} />
          </div>
          <DialogTitle className="text-lg leading-snug break-words">{evento.titulo}</DialogTitle>
          <DialogDescription>
            {mesmoDia
              ? diaComSemana(diaDe(evento.inicio))
              : `${diaComSemana(diaDe(evento.inicio))} a ${diaComSemana(diaDe(evento.fim))}`}
            {horario && ` · ${horario}`}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">
              Turmas
            </dt>
            <dd className="mt-0.5">{turmasDoEvento(evento)}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">
              Famílias
            </dt>
            <dd className="mt-0.5 flex items-center gap-1.5">
              {evento.visivelParaFamilias ? (
                <>
                  <Eye aria-hidden className="size-4 text-muted-foreground" />
                  Visível para as famílias
                </>
              ) : (
                <>
                  <EyeOff aria-hidden className="size-4 text-muted-foreground" />
                  Só a equipe vê
                </>
              )}
            </dd>
          </div>
          {evento.descricao && (
            <div>
              <dt className="text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">
                Descrição
              </dt>
              <dd className="mt-0.5 break-words whitespace-pre-line">{evento.descricao}</dd>
            </div>
          )}
        </dl>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
