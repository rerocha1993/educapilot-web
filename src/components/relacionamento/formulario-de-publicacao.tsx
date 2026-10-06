"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Campo } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSessaoLocal } from "@/lib/auth/use-sessao-local";
import { useClasses } from "@/lib/kernel/use-classes";
import { baixarAnexoDaEscola } from "@/lib/relacionamento/api";
import {
  ACEITA_ANEXO,
  problemaDoAnexo,
  tamanhoLegivel,
  useArquivar,
  useEnviarAnexo,
  useExcluirPublicacao,
  usePublicar,
  useRemoverAnexo,
  useSalvarPublicacao,
  type PublicacaoDetalhe,
  type SalvarPublicacao,
  type TipoDePublicacao,
} from "@/lib/relacionamento/use-relacionamento";

import { EtiquetaDoStatus } from "./etiquetas";
import { Segmentado } from "./segmentado";

interface Campos {
  tipo: TipoDePublicacao;
  titulo: string;
  texto: string;
  dataDoEvento: string;
  horaDoEvento: string;
  local: string;
  permiteConfirmarPresenca: boolean;
  exigeConfirmacaoDeLeitura: boolean;
  escolaToda: boolean;
  classIds: number[];
}

function camposDe(p: PublicacaoDetalhe | null): Campos {
  if (!p) {
    return {
      tipo: "Aviso",
      titulo: "",
      texto: "",
      dataDoEvento: "",
      horaDoEvento: "",
      local: "",
      permiteConfirmarPresenca: false,
      exigeConfirmacaoDeLeitura: false,
      escolaToda: false,
      classIds: [],
    };
  }

  return {
    tipo: p.tipo,
    titulo: p.titulo,
    texto: p.texto,
    dataDoEvento: p.dataDoEvento ?? "",
    horaDoEvento: p.horaDoEvento ?? "",
    local: p.local ?? "",
    permiteConfirmarPresenca: p.permiteConfirmarPresenca,
    exigeConfirmacaoDeLeitura: p.exigeConfirmacaoDeLeitura,
    escolaToda: p.escolaToda || p.turmas.length === 0,
    classIds: p.escolaToda ? [] : p.turmas.map((t) => t.classId),
  };
}

type Acao = "publicar" | "arquivar" | "excluir";

/**
 * Criar ou editar uma publicação (aviso ou evento).
 *
 * O estado do formulário nasce da publicação recebida e não é refeito quando o servidor
 * responde de novo: o pai usa `key` com o id. Só os anexos vêm direto da consulta, porque
 * enviar ou remover um arquivo é salvo na hora, sem passar pelo botão de salvar.
 *
 * Professor (perfil Teacher) nunca publica para a escola toda: o servidor recusa e a tela nem
 * oferece. Os botões seguem a situação: rascunho salva, publica e exclui; publicada salva as
 * alterações e arquiva; arquivada só se lê.
 */
export function FormularioDePublicacao({ publicacao }: { publicacao: PublicacaoDetalhe | null }) {
  const router = useRouter();
  const sessao = useSessaoLocal();
  const ehProfessor = sessao?.role === "Teacher";

  const { data: classes } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` })),
    [classes]
  );

  const salvar = useSalvarPublicacao();
  const publicar = usePublicar();
  const arquivar = useArquivar();
  const excluir = useExcluirPublicacao();

  const [c, setC] = useState(() => camposDe(publicacao));
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Acao | null>(null);

  const status = publicacao?.status ?? "Rascunho";
  const somenteLeitura = status === "Arquivada";
  const ocupado = salvar.isPending || publicar.isPending || arquivar.isPending || excluir.isPending;
  const bloqueado = somenteLeitura || ocupado;
  const ehEvento = c.tipo === "Evento";

  function mudar(parte: Partial<Campos>) {
    setC((atual) => ({ ...atual, ...parte }));
    setErro(null);
  }

  function alternarTurma(classId: number, marcada: boolean) {
    mudar({ classIds: marcada ? [...c.classIds, classId] : c.classIds.filter((id) => id !== classId) });
  }

  /** O corpo que o servidor espera, ou a frase que diz o que falta. */
  function montar(publicarAgora: boolean): { erro: string } | { dados: SalvarPublicacao } {
    const titulo = c.titulo.trim();
    const texto = c.texto.trim();
    if (!titulo) return { erro: "Dê um título à publicação." };
    if (!texto) return { erro: "Escreva o texto da publicação." };
    if (ehEvento && !c.dataDoEvento) return { erro: "Informe a data do evento." };
    if (!c.escolaToda && c.classIds.length === 0) {
      return { erro: ehProfessor ? "Marque ao menos uma das suas turmas." : "Marque ao menos uma turma ou “Escola toda”." };
    }

    return {
      dados: {
        tipo: c.tipo,
        titulo,
        texto,
        dataDoEvento: ehEvento ? c.dataDoEvento || null : null,
        horaDoEvento: ehEvento ? c.horaDoEvento || null : null,
        local: ehEvento ? c.local.trim() || null : null,
        exigeConfirmacaoDeLeitura: c.exigeConfirmacaoDeLeitura,
        permiteConfirmarPresenca: ehEvento && c.permiteConfirmarPresenca,
        classIds: c.escolaToda ? [] : c.classIds,
        publicarAgora,
        eventoDoCalendarioId: publicacao?.eventoDoCalendarioId ?? null,
      },
    };
  }

  async function gravar(publicarAgora: boolean) {
    const r = montar(publicarAgora);
    if ("erro" in r) {
      setErro(r.erro);
      setConfirmando(null);
      return;
    }

    try {
      const salva = await salvar.mutateAsync({ id: publicacao?.id, dados: r.dados });

      if (!publicacao) {
        toast.success(publicarAgora ? "Publicação enviada às famílias." : "Rascunho salvo. Agora você pode anexar arquivos.");
        router.replace(`/relacionamento/avisos/${salva.id}`);
        return;
      }

      // Publicação já existente: salvar e publicar são duas chamadas (o PUT só grava o conteúdo).
      if (publicarAgora) await publicar.mutateAsync(publicacao.id);
      toast.success(publicarAgora ? "Publicação enviada às famílias." : "Alterações salvas.");
      setConfirmando(null);
    } catch (err) {
      setConfirmando(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a publicação.");
    }
  }

  async function arquivarAgora() {
    if (!publicacao) return;
    try {
      await arquivar.mutateAsync(publicacao.id);
      toast.success("Publicação arquivada.");
      router.replace("/relacionamento/avisos");
    } catch (err) {
      setConfirmando(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível arquivar.");
    }
  }

  async function excluirAgora() {
    if (!publicacao) return;
    try {
      await excluir.mutateAsync(publicacao.id);
      toast.success("Rascunho excluído.");
      router.replace("/relacionamento/avisos");
    } catch (err) {
      setConfirmando(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o rascunho.");
    }
  }

  function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!somenteLeitura) void gravar(false);
  }

  function pedirPublicacao() {
    const r = montar(true);
    if ("erro" in r) {
      setErro(r.erro);
      return;
    }
    setConfirmando("publicar");
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="flex flex-col gap-4">
      {somenteLeitura && (
        <p className="rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
          Esta publicação está arquivada: as famílias não a veem mais e ela não pode ser alterada.
        </p>
      )}
      {status === "Publicada" && (
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Já publicada: as mudanças aparecem para as famílias assim que você salvar.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <fieldset
          disabled={bloqueado}
          className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Segmentado
              rotulo="Tipo de publicação"
              opcoes={[
                { id: "Aviso", rotulo: "Aviso" },
                { id: "Evento", rotulo: "Evento" },
              ]}
              valor={c.tipo}
              onChange={(tipo) => mudar({ tipo })}
              className="max-md:w-full"
              cheio
            />
            {publicacao && <EtiquetaDoStatus status={status} />}
          </div>

          <Campo id="pub-titulo" rotulo="Título">
            <Input
              id="pub-titulo"
              value={c.titulo}
              maxLength={160}
              onChange={(e) => mudar({ titulo: e.target.value })}
              placeholder={ehEvento ? "Ex.: Festa da família" : "Ex.: Reunião de pais na sexta"}
              aria-invalid={erro !== null && !c.titulo.trim()}
            />
          </Campo>

          <Campo id="pub-texto" rotulo="Texto" dica="As quebras de linha são mantidas para as famílias.">
            <Textarea
              id="pub-texto"
              value={c.texto}
              onChange={(e) => mudar({ texto: e.target.value })}
              rows={10}
              className="min-h-56"
              placeholder="Escreva a mensagem para as famílias."
              aria-invalid={erro !== null && !c.texto.trim()}
            />
          </Campo>

          {ehEvento && (
            <div className="grid gap-3 rounded-lg bg-muted/60 p-3 sm:grid-cols-2">
              <Campo id="pub-data" rotulo="Data do evento">
                <Input
                  id="pub-data"
                  type="date"
                  value={c.dataDoEvento}
                  onChange={(e) => mudar({ dataDoEvento: e.target.value })}
                  aria-invalid={erro !== null && !c.dataDoEvento}
                />
              </Campo>
              <Campo id="pub-hora" rotulo="Hora">
                <Input
                  id="pub-hora"
                  type="time"
                  value={c.horaDoEvento}
                  onChange={(e) => mudar({ horaDoEvento: e.target.value })}
                />
              </Campo>
              <Campo id="pub-local" rotulo="Local" className="sm:col-span-2">
                <Input
                  id="pub-local"
                  value={c.local}
                  maxLength={160}
                  onChange={(e) => mudar({ local: e.target.value })}
                  placeholder="Ex.: Pátio da escola"
                />
              </Campo>
            </div>
          )}
        </fieldset>

        <div className="flex min-w-0 flex-col gap-4">
          <fieldset
            disabled={bloqueado}
            className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 md:p-5"
          >
            <legend className="sr-only">Para quem</legend>
            <h2 className="font-heading text-[15px] font-semibold">Para quem</h2>
            <div className="grid gap-1">

              <label
                className={`flex min-h-11 items-center gap-3 rounded-lg px-1 md:min-h-10 ${
                  ehProfessor ? "cursor-not-allowed opacity-60" : "cursor-pointer active:bg-muted"
                }`}
              >
                <Checkbox
                  checked={c.escolaToda}
                  disabled={ehProfessor || bloqueado}
                  // Marcar "Escola toda" limpa as turmas; desmarcar obriga a escolher turmas na validação.
                  onCheckedChange={(v) => mudar({ escolaToda: v, classIds: v ? [] : c.classIds })}
                />
                <span className="text-sm">Escola toda</span>
              </label>
              {ehProfessor && (
                <p className="px-1 text-xs text-muted-foreground">
                  Professores publicam só para as próprias turmas.
                </p>
              )}

              {turmas.length > 0 ? (
                <div className="grid max-h-56 gap-0.5 overflow-y-auto border-t border-border pt-1">
                  {turmas.map((t) => (
                    <label
                      key={t.id}
                      className={`flex min-h-11 items-center gap-3 rounded-lg px-1 md:min-h-10 ${
                        c.escolaToda ? "cursor-not-allowed opacity-50" : "cursor-pointer active:bg-muted"
                      }`}
                    >
                      <Checkbox
                        checked={c.classIds.includes(t.id)}
                        disabled={c.escolaToda || bloqueado}
                        onCheckedChange={(v) => alternarTurma(t.id, v)}
                      />
                      <span className="min-w-0 truncate text-sm">{t.nome}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="border-t border-border pt-2 text-sm text-muted-foreground">Nenhuma turma disponível.</p>
              )}
            </div>
          </fieldset>

          <fieldset
            disabled={bloqueado}
            className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-4 md:p-5"
          >
            <legend className="sr-only">Respostas das famílias</legend>
            <h2 className="mb-1 font-heading text-[15px] font-semibold">Respostas das famílias</h2>

            <div className="flex min-h-11 items-center gap-3">
              <Switch
                id="pub-leitura"
                checked={c.exigeConfirmacaoDeLeitura}
                disabled={bloqueado}
                onCheckedChange={(v) => mudar({ exigeConfirmacaoDeLeitura: v })}
              />
              <Label htmlFor="pub-leitura" className="cursor-pointer">
                Exigir confirmação de leitura
              </Label>
            </div>

            {ehEvento && (
              <div className="flex min-h-11 items-center gap-3">
                <Switch
                  id="pub-presenca"
                  checked={c.permiteConfirmarPresenca}
                  disabled={bloqueado}
                  onCheckedChange={(v) => mudar({ permiteConfirmarPresenca: v })}
                />
                <Label htmlFor="pub-presenca" className="cursor-pointer">
                  Permitir confirmar presença
                </Label>
              </div>
            )}
          </fieldset>

          <AnexosDaPublicacao publicacao={publicacao} desabilitado={bloqueado} />
        </div>
      </div>

      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      {!somenteLeitura && (
        <div className="flex flex-col-reverse gap-2 md:flex-row md:flex-wrap md:items-center">
          {status === "Rascunho" && publicacao && (
            <Button type="button" variant="destructive" disabled={ocupado} onClick={() => setConfirmando("excluir")}>
              <Trash2 /> Excluir rascunho
            </Button>
          )}
          {status === "Publicada" && (
            <Button type="button" variant="outline" disabled={ocupado} onClick={() => setConfirmando("arquivar")}>
              Arquivar
            </Button>
          )}

          <div className="flex flex-col-reverse gap-2 md:ml-auto md:flex-row">
            <Button type="submit" variant="outline" disabled={ocupado}>
              {salvar.isPending && !confirmando ? "Salvando..." : status === "Publicada" ? "Salvar alterações" : "Salvar rascunho"}
            </Button>
            {status === "Rascunho" && (
              <Button type="button" variant="action" disabled={ocupado} onClick={pedirPublicacao}>
                Publicar
              </Button>
            )}
          </div>
        </div>
      )}

      {confirmando === "publicar" && (
        <Confirmacao
          titulo="Publicar para as famílias?"
          descricao={`As famílias ${
            c.escolaToda ? "da escola toda" : "das turmas escolhidas"
          } passam a ver esta publicação no portal e recebem um e-mail avisando, conforme a configuração do módulo. Não dá para desfazer o envio do e-mail.`}
          rotuloConfirmar="Publicar agora"
          pendente={salvar.isPending || publicar.isPending}
          onConfirmar={() => void gravar(true)}
          onFechar={() => setConfirmando(null)}
        />
      )}
      {confirmando === "arquivar" && (
        <Confirmacao
          titulo="Arquivar esta publicação?"
          descricao="As famílias deixam de vê-la no portal. As leituras e confirmações continuam guardadas."
          rotuloConfirmar="Arquivar"
          pendente={arquivar.isPending}
          onConfirmar={() => void arquivarAgora()}
          onFechar={() => setConfirmando(null)}
        />
      )}
      {confirmando === "excluir" && (
        <Confirmacao
          titulo="Excluir este rascunho?"
          descricao="O rascunho e os anexos dele serão apagados. Isso não pode ser desfeito."
          rotuloConfirmar="Excluir"
          perigosa
          pendente={excluir.isPending}
          onConfirmar={() => void excluirAgora()}
          onFechar={() => setConfirmando(null)}
        />
      )}
    </form>
  );
}

/** Anexos: só depois de salvar o rascunho (o arquivo precisa de uma publicação para se prender). */
function AnexosDaPublicacao({
  publicacao,
  desabilitado,
}: {
  publicacao: PublicacaoDetalhe | null;
  desabilitado: boolean;
}) {
  const enviar = useEnviarAnexo();
  const remover = useRemoverAnexo();
  const entrada = useRef<HTMLInputElement>(null);
  const [baixando, setBaixando] = useState<string | null>(null);

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    // Limpa para poder escolher o mesmo arquivo de novo depois de removê-lo.
    e.target.value = "";
    if (!arquivo || !publicacao) return;

    const problema = problemaDoAnexo(arquivo);
    if (problema) {
      toast.error(problema);
      return;
    }

    try {
      await enviar.mutateAsync({ id: publicacao.id, arquivo });
      toast.success("Anexo enviado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o anexo.");
    }
  }

  async function baixar(id: string, nome: string) {
    setBaixando(id);
    try {
      await baixarAnexoDaEscola(id, nome);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível baixar o anexo.");
    } finally {
      setBaixando(null);
    }
  }

  async function tirar(id: string) {
    try {
      await remover.mutateAsync(id);
      toast.success("Anexo removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível remover o anexo.");
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 md:p-5">
      <h2 className="font-heading text-[15px] font-semibold">Anexos</h2>

      {!publicacao ? (
        <p className="text-sm text-muted-foreground">
          Salve o rascunho primeiro. Depois você anexa PDF, JPG ou PNG de até 10 MB.
        </p>
      ) : (
        <>
          {publicacao.anexos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum anexo.</p>}

          <ul className="flex flex-col gap-1.5">
            {publicacao.anexos.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
                <Paperclip aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.nome}</p>
                  <p className="text-xs text-muted-foreground">{tamanhoLegivel(a.tamanho)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Baixar ${a.nome}`}
                  title="Baixar"
                  disabled={baixando === a.id}
                  onClick={() => void baixar(a.id, a.nome)}
                >
                  <Download />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  aria-label={`Remover ${a.nome}`}
                  title="Remover"
                  disabled={desabilitado || remover.isPending}
                  onClick={() => void tirar(a.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>

          <input
            ref={entrada}
            type="file"
            accept={ACEITA_ANEXO}
            className="sr-only"
            tabIndex={-1}
            aria-label="Escolher arquivo para anexar"
            onChange={(e) => void aoEscolher(e)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={desabilitado || enviar.isPending}
            onClick={() => entrada.current?.click()}
            className="self-start"
          >
            <Upload /> {enviar.isPending ? "Enviando..." : "Anexar arquivo"}
          </Button>
        </>
      )}
    </section>
  );
}
