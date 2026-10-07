"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Images, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { comprimirImagem } from "@/lib/relacionamento/comprimir-imagem";
import { tamanhoLegivel } from "@/lib/relacionamento/use-relacionamento";

/** O servidor recusa arquivo acima disto; depois de reduzida a foto fica longe do limite. */
const LIMITE_POR_ARQUIVO = 15 * 1024 * 1024;

interface Item {
  chave: number;
  arquivo: File;
  /** Object URL da foto original, só para a prévia. */
  previa: string;
  legenda: string;
  erro: string | null;
}

interface Progresso {
  lote: number;
  lotes: number;
  processadas: number;
  total: number;
}

function ehImagemAceita(arquivo: File): boolean {
  return /^image\/(jpeg|png)$/.test(arquivo.type) || /\.(jpe?g|png)$/i.test(arquivo.name);
}

/**
 * Escolher fotos, conferir, legendar e enviar.
 *
 * Cada foto é reduzida no navegador (JPEG, lado maior de 1600 px) e enviada em lotes de
 * `limiteDoLote`, que é o que o servidor aceita por chamada. A barra anda a cada lote; a foto que
 * falha (ao reduzir ou ao enviar) fica na lista com o motivo, para tentar de novo ou remover, e as
 * que deram certo saem da lista.
 *
 * Dois botões porque, no celular, `capture` abre direto a câmera e some a galeria: um tira a foto, o
 * outro escolhe várias do aparelho.
 */
export function EnvioDeFotos({
  limiteDoLote,
  restante,
  enviarLote,
  desabilitado = false,
}: {
  /** Fotos por chamada: 10 nas atividades, 20 no mural. */
  limiteDoLote: number;
  /** Quantas fotos ainda cabem no conteúdo (o máximo menos as que ele já tem). */
  restante: number;
  /** Envia um lote (já reduzido) com as legendas na mesma ordem. Rejeita com a frase do erro. */
  enviarLote: (arquivos: File[], legendas: string[]) => Promise<{ legendasNaoGravadas: number }>;
  desabilitado?: boolean;
}) {
  const [itens, setItens] = useState<Item[]>([]);
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const contador = useRef(0);
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  // As prévias são object URLs: soltam-se todas ao sair da tela.
  const itensRef = useRef<Item[]>([]);
  useEffect(() => {
    itensRef.current = itens;
  }, [itens]);
  useEffect(
    () => () => {
      for (const i of itensRef.current) URL.revokeObjectURL(i.previa);
    },
    []
  );

  const enviando = progresso !== null;
  const vaga = Math.max(0, restante - itens.length);
  const bloqueado = desabilitado || enviando;

  function adicionar(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;

    const todos = Array.from(arquivos);
    const aceitos = todos.filter(ehImagemAceita);
    const naoImagens = todos.length - aceitos.length;
    const cabem = aceitos.slice(0, vaga);
    const sobraram = aceitos.length - cabem.length;

    const avisos: string[] = [];
    if (naoImagens > 0) avisos.push(`${naoImagens} arquivo${naoImagens === 1 ? "" : "s"} ignorado${naoImagens === 1 ? "" : "s"}: só JPG e PNG.`);
    if (sobraram > 0) avisos.push(`${sobraram} foto${sobraram === 1 ? "" : "s"} não entrou: o limite é de ${restante} a mais.`);
    setAviso(avisos.length > 0 ? avisos.join(" ") : null);

    if (cabem.length === 0) return;
    setItens((atuais) => [
      ...atuais,
      ...cabem.map((arquivo) => ({
        chave: ++contador.current,
        arquivo,
        previa: URL.createObjectURL(arquivo),
        legenda: "",
        erro: null,
      })),
    ]);
  }

  function remover(chave: number) {
    setItens((atuais) => {
      const item = atuais.find((i) => i.chave === chave);
      if (item) URL.revokeObjectURL(item.previa);
      return atuais.filter((i) => i.chave !== chave);
    });
  }

  function limpar() {
    for (const i of itens) URL.revokeObjectURL(i.previa);
    setItens([]);
    setAviso(null);
  }

  function mudarLegenda(chave: number, legenda: string) {
    setItens((atuais) => atuais.map((i) => (i.chave === chave ? { ...i, legenda } : i)));
  }

  async function enviarTudo() {
    const fila = itens;
    if (fila.length === 0 || enviando) return;

    const lotes = Math.ceil(fila.length / limiteDoLote);
    let processadas = 0;
    let enviadas = 0;
    let falhas = 0;
    let legendasNaoGravadas = 0;
    setAviso(null);
    setItens((atuais) => atuais.map((i) => ({ ...i, erro: null })));

    for (let n = 0; n < lotes; n++) {
      setProgresso({ lote: n + 1, lotes, processadas, total: fila.length });
      const doLote = fila.slice(n * limiteDoLote, (n + 1) * limiteDoLote);

      // Reduz uma a uma: a decodificação de várias fotos de 12 MP juntas estoura a memória do celular.
      const prontos: { item: Item; arquivo: File }[] = [];
      for (const item of doLote) {
        try {
          const reduzido = await comprimirImagem(item.arquivo);
          if (reduzido.size > LIMITE_POR_ARQUIVO) {
            throw new Error(`A foto continua com ${tamanhoLegivel(reduzido.size)} depois de reduzida.`);
          }
          prontos.push({ item, arquivo: reduzido });
        } catch (err) {
          falhas += 1;
          const motivo = err instanceof Error ? err.message : "Não foi possível preparar a foto.";
          setItens((atuais) => atuais.map((i) => (i.chave === item.chave ? { ...i, erro: motivo } : i)));
        }
      }

      if (prontos.length > 0) {
        try {
          const r = await enviarLote(
            prontos.map((p) => p.arquivo),
            prontos.map((p) => p.item.legenda)
          );
          enviadas += prontos.length;
          legendasNaoGravadas += r.legendasNaoGravadas;
          const chaves = new Set(prontos.map((p) => p.item.chave));
          setItens((atuais) => {
            for (const i of atuais) if (chaves.has(i.chave)) URL.revokeObjectURL(i.previa);
            return atuais.filter((i) => !chaves.has(i.chave));
          });
        } catch (err) {
          falhas += prontos.length;
          const motivo = err instanceof Error ? err.message : "Não foi possível enviar as fotos.";
          const chaves = new Set(prontos.map((p) => p.item.chave));
          setItens((atuais) => atuais.map((i) => (chaves.has(i.chave) ? { ...i, erro: motivo } : i)));
        }
      }

      processadas += doLote.length;
    }

    setProgresso(null);
    if (enviadas > 0) toast.success(enviadas === 1 ? "Foto enviada." : `${enviadas} fotos enviadas.`);
    if (falhas > 0) {
      toast.error(
        falhas === 1 ? "Uma foto não foi enviada. Veja o motivo na lista." : `${falhas} fotos não foram enviadas. Veja o motivo na lista.`
      );
    }
    if (legendasNaoGravadas > 0) {
      toast.warning(
        legendasNaoGravadas === 1
          ? "Uma legenda não foi gravada. Escreva-a de novo na foto."
          : `${legendasNaoGravadas} legendas não foram gravadas. Escreva-as de novo nas fotos.`
      );
    }
  }

  const porcentagem = progresso ? Math.round((progresso.processadas / progresso.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {/* `capture` fica só neste: em vários celulares ele impede de escolher da galeria. */}
        <input
          ref={camera}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Tirar foto com a câmera"
          onChange={(e) => {
            adicionar(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galeria}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Escolher fotos do aparelho"
          onChange={(e) => {
            adicionar(e.target.files);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" disabled={bloqueado || vaga === 0} onClick={() => camera.current?.click()}>
          <Camera /> Tirar foto
        </Button>
        <Button type="button" variant="outline" disabled={bloqueado || vaga === 0} onClick={() => galeria.current?.click()}>
          <Images /> Escolher da galeria
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {vaga === 0
          ? "O limite de fotos foi atingido."
          : `JPG ou PNG. Cabem mais ${vaga} ${vaga === 1 ? "foto" : "fotos"}; elas são reduzidas antes do envio.`}
      </p>

      {aviso && (
        <p role="status" className="text-sm text-warning-soft-foreground">
          {aviso}
        </p>
      )}

      {itens.length > 0 && (
        <>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {itens.map((item) => (
              <li key={item.chave} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-1.5">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- prévia local de um arquivo ainda não enviado */}
                  <img src={item.previa} alt={`Prévia de ${item.arquivo.name}`} className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Remover ${item.arquivo.name} da lista`}
                    disabled={enviando}
                    onClick={() => remover(item.chave)}
                    className="absolute top-1 right-1 grid size-9 place-items-center rounded-full bg-black/60 text-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-40"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
                <Input
                  value={item.legenda}
                  maxLength={200}
                  disabled={enviando}
                  aria-label={`Legenda de ${item.arquivo.name}`}
                  placeholder="Legenda (opcional)"
                  onChange={(e) => mudarLegenda(item.chave, e.target.value)}
                />
                {item.erro && (
                  <p role="alert" className="px-0.5 text-xs text-destructive">
                    {item.erro}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {progresso && (
            <div className="flex flex-col gap-1.5" aria-live="polite">
              <div
                role="progressbar"
                aria-label="Progresso do envio"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={porcentagem}
                className="h-1.5 overflow-hidden rounded-[4px] bg-muted"
              >
                <div
                  className="h-full rounded-[4px] bg-primary transition-[width] duration-300"
                  style={{ width: `${porcentagem}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground tabular-nums">
                Enviando lote {progresso.lote} de {progresso.lotes} ({progresso.processadas} de {progresso.total}{" "}
                {progresso.total === 1 ? "foto" : "fotos"})
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={desabilitado || enviando} onClick={() => void enviarTudo()}>
              <Upload />
              {enviando
                ? "Enviando..."
                : itens.some((i) => i.erro)
                  ? "Tentar de novo"
                  : `Enviar ${itens.length} ${itens.length === 1 ? "foto" : "fotos"}`}
            </Button>
            <Button type="button" variant="ghost" disabled={enviando} onClick={limpar}>
              Limpar lista
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
