"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Campo } from "@/components/rh/campo";
import { Confirmacao } from "@/components/rh/confirmacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hojeIsoBrasilia } from "@/lib/format/date";
import { useClasses } from "@/lib/kernel/use-classes";
import { baixarFotoDaAtividade } from "@/lib/relacionamento/api";
import {
  LIMITES_DE_FOTOS,
  useEnvioDeFotos,
  useExcluirAtividade,
  usePublicarAtividade,
  useSalvarAtividade,
  type AtividadeDetalhe,
  type SalvarAtividade,
} from "@/lib/relacionamento/use-conteudo";

import { AvisoDeAutorizacaoDeImagem } from "./aviso-de-autorizacao";
import { EnvioDeFotos } from "./envio-de-fotos";
import { GerenciadorDeFotos } from "./gerenciador-de-fotos";
import { VisualizadorDeFotos } from "./visualizador-de-fotos";

type Acao = "publicar" | "excluir";

/**
 * Criar ou editar uma atividade de sala.
 *
 * Como o formulário de avisos, o estado nasce da atividade recebida e o pai usa `key` com o id para
 * não refazê-lo a cada resposta do servidor. As fotos vêm direto da consulta: enviar, legendar,
 * reordenar ou remover grava na hora, sem passar pelo botão de salvar.
 *
 * Na tela de nova atividade só há "Salvar rascunho": a foto precisa de uma atividade para se
 * prender, e publicar sem as fotos seria o erro mais comum. Publicar fica para depois de salvar.
 */
export function FormularioDeAtividade({ atividade }: { atividade: AtividadeDetalhe | null }) {
  const router = useRouter();
  const { data: classes } = useClasses();
  const turmas = useMemo(
    () =>
      (classes ?? [])
        .filter((c): c is typeof c & { id: number } => typeof c.id === "number")
        .map((c) => ({ id: c.id, nome: c.className ?? `Turma ${c.id}` })),
    [classes]
  );

  const salvar = useSalvarAtividade();
  const publicar = usePublicarAtividade();
  const excluir = useExcluirAtividade();

  // Professor com uma única turma já a tem escolhida.
  const [escolhida, setEscolhida] = useState<number | null>(atividade?.classId ?? null);
  const classId = escolhida ?? (turmas.length === 1 ? turmas[0].id : null);
  const [data, setData] = useState(() => atividade?.data || hojeIsoBrasilia());
  const [titulo, setTitulo] = useState(atividade?.titulo ?? "");
  const [texto, setTexto] = useState(atividade?.texto ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Acao | null>(null);

  const status = atividade?.status ?? "Rascunho";
  const ocupado = salvar.isPending || publicar.isPending || excluir.isPending;
  const turmaDaAtividade = turmas.find((t) => t.id === classId)?.nome ?? atividade?.turma ?? null;

  function editar<T>(definir: (v: T) => void) {
    return (v: T) => {
      definir(v);
      setErro(null);
    };
  }

  function montar(): { erro: string } | { dados: SalvarAtividade } {
    if (classId === null) return { erro: "Escolha a turma da atividade." };
    if (!data) return { erro: "Informe o dia da atividade." };
    if (!titulo.trim()) return { erro: "Dê um título à atividade." };
    if (!texto.trim()) return { erro: "Conte como foi a atividade." };
    return { dados: { classId, data, titulo: titulo.trim(), texto: texto.trim() } };
  }

  async function gravar(depoisPublicar: boolean) {
    const r = montar();
    if ("erro" in r) {
      setErro(r.erro);
      setConfirmando(null);
      return;
    }

    try {
      const salva = await salvar.mutateAsync({ id: atividade?.id, dados: r.dados });

      if (!atividade) {
        toast.success("Rascunho salvo. Agora você pode adicionar as fotos.");
        router.replace(`/relacionamento/atividades/${salva.id}`);
        return;
      }

      // O PUT só grava o conteúdo: publicar é uma chamada à parte.
      if (depoisPublicar) await publicar.mutateAsync(atividade.id);
      toast.success(depoisPublicar ? "Atividade publicada para as famílias." : "Alterações salvas.");
      setConfirmando(null);
    } catch (err) {
      setConfirmando(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar a atividade.");
    }
  }

  async function excluirAgora() {
    if (!atividade) return;
    try {
      await excluir.mutateAsync(atividade.id);
      toast.success("Atividade excluída.");
      router.replace("/relacionamento/atividades");
    } catch (err) {
      setConfirmando(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir a atividade.");
    }
  }

  function pedirPublicacao() {
    const r = montar();
    if ("erro" in r) {
      setErro(r.erro);
      return;
    }
    setConfirmando("publicar");
  }

  return (
    <div className="flex flex-col gap-4">
      {status === "Publicada" && (
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Já publicada: as mudanças aparecem para as famílias assim que você salvar.
        </p>
      )}

      {/* O <form> cobre só os campos: as legendas das fotos, mais abaixo, não podem enviá-lo com o Enter. */}
      <form
        id="form-atividade"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void gravar(false);
        }}
      >
      <fieldset
        disabled={ocupado}
        className="grid min-w-0 gap-4 rounded-xl border border-border bg-card p-4 md:p-5 lg:grid-cols-2"
      >
        <legend className="sr-only">Dados da atividade</legend>

        <Campo id="ativ-turma" rotulo="Turma">
          <Select
            value={classId === null ? undefined : String(classId)}
            onValueChange={(v) => v && editar(setEscolhida)(Number(v))}
          >
            <SelectTrigger id="ativ-turma" className="w-full" aria-invalid={erro !== null && classId === null}>
              <SelectValue>{() => turmaDaAtividade ?? "Escolha a turma"}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="max-h-72">
              {turmas.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo id="ativ-data" rotulo="Dia da atividade">
          <Input
            id="ativ-data"
            type="date"
            value={data}
            onChange={(e) => editar(setData)(e.target.value)}
            aria-invalid={erro !== null && !data}
          />
        </Campo>

        <Campo id="ativ-titulo" rotulo="Título" className="lg:col-span-2">
          <Input
            id="ativ-titulo"
            value={titulo}
            maxLength={160}
            onChange={(e) => editar(setTitulo)(e.target.value)}
            placeholder="Ex.: Pintura com guache"
            aria-invalid={erro !== null && !titulo.trim()}
          />
        </Campo>

        <Campo
          id="ativ-texto"
          rotulo="O que foi feito"
          className="lg:col-span-2"
          dica="As famílias leem este texto junto com as fotos. As quebras de linha são mantidas."
        >
          <Textarea
            id="ativ-texto"
            value={texto}
            onChange={(e) => editar(setTexto)(e.target.value)}
            rows={8}
            className="min-h-40"
            placeholder="Conte como foi a atividade."
            aria-invalid={erro !== null && !texto.trim()}
          />
        </Campo>
      </fieldset>
      </form>

      <AvisoDeAutorizacaoDeImagem classId={classId} />

      {atividade ? (
        <FotosDaAtividade atividade={atividade} />
      ) : (
        <section className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 md:p-5">
          <h2 className="font-heading text-[15px] font-semibold">Fotos</h2>
          <p className="text-sm text-muted-foreground">
            Salve o rascunho primeiro. Depois você tira ou escolhe as fotos (até {LIMITES_DE_FOTOS.atividades.porConteudo}) e
            publica.
          </p>
        </section>
      )}

      {erro && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 md:flex-row md:flex-wrap md:items-center">
        {atividade && (
          <Button type="button" variant="destructive" disabled={ocupado} onClick={() => setConfirmando("excluir")}>
            <Trash2 /> Excluir
          </Button>
        )}

        <div className="flex flex-col-reverse gap-2 md:ml-auto md:flex-row">
          <Button type="submit" form="form-atividade" variant="outline" disabled={ocupado}>
            {salvar.isPending && !confirmando ? "Salvando..." : status === "Publicada" ? "Salvar alterações" : "Salvar rascunho"}
          </Button>
          {atividade && status === "Rascunho" && (
            <Button type="button" variant="action" disabled={ocupado} onClick={pedirPublicacao}>
              Publicar
            </Button>
          )}
        </div>
      </div>

      {confirmando === "publicar" && (
        <Confirmacao
          titulo="Publicar para as famílias?"
          descricao={`As famílias dos alunos${
            turmaDaAtividade ? ` da turma ${turmaDaAtividade}` : ""
          } passam a ver esta atividade${
            atividade && atividade.fotos.length > 0
              ? ` com ${atividade.fotos.length} ${atividade.fotos.length === 1 ? "foto" : "fotos"}`
              : ", sem fotos"
          } no portal. Confira a autorização de imagem antes.`}
          rotuloConfirmar="Publicar agora"
          pendente={salvar.isPending || publicar.isPending}
          onConfirmar={() => void gravar(true)}
          onFechar={() => setConfirmando(null)}
        />
      )}
      {confirmando === "excluir" && (
        <Confirmacao
          titulo="Excluir esta atividade?"
          descricao={
            status === "Publicada"
              ? "A atividade e as fotos saem do portal das famílias e são apagadas. Isso não pode ser desfeito."
              : "O rascunho e as fotos dele serão apagados. Isso não pode ser desfeito."
          }
          rotuloConfirmar="Excluir"
          perigosa
          pendente={excluir.isPending}
          onConfirmar={() => void excluirAgora()}
          onFechar={() => setConfirmando(null)}
        />
      )}
    </div>
  );
}

function FotosDaAtividade({ atividade }: { atividade: AtividadeDetalhe }) {
  const { porLote, porConteudo } = LIMITES_DE_FOTOS.atividades;
  const idsAtuais = useMemo(() => atividade.fotos.map((f) => f.id), [atividade.fotos]);
  const enviarLote = useEnvioDeFotos("atividades", atividade.id, idsAtuais);
  const [aberta, setAberta] = useState<number | null>(null);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-[15px] font-semibold">Fotos</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {atividade.fotos.length} de {porConteudo}
        </p>
      </div>

      <EnvioDeFotos limiteDoLote={porLote} restante={porConteudo - atividade.fotos.length} enviarLote={enviarLote} />

      <GerenciadorDeFotos
        tipo="atividades"
        fotos={atividade.fotos}
        baixar={baixarFotoDaAtividade}
        onAbrir={setAberta}
      />

      <VisualizadorDeFotos
        fotos={atividade.fotos}
        indice={aberta}
        baixar={baixarFotoDaAtividade}
        onMudar={setAberta}
        onFechar={() => setAberta(null)}
      />
    </section>
  );
}
