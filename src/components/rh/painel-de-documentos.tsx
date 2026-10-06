"use client";

import { useRef, useState } from "react";
import { Download, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarData } from "@/lib/format/date";
import { formatarTamanho } from "@/lib/rh/formatar";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";
import {
  ACEITA_ARQUIVO,
  baixarDocumento,
  problemaDoArquivo,
  ROTULO_DO_DOCUMENTO,
  TIPOS_DE_DOCUMENTO,
  useDocumentos,
  useEnviarDocumento,
  useExcluirDocumento,
  type DocumentoDoFuncionario,
  type TipoDeDocumento,
} from "@/lib/rh/use-rh";

import { Campo, ErroDeCarga } from "./campo";
import { Confirmacao } from "./confirmacao";
import { BotaoDeIcone } from "./lista-movel";
import { SeletorDeFuncionario } from "./seletor-de-funcionario";

type Dialogo = { tipo: "enviar" } | { tipo: "excluir"; documento: DocumentoDoFuncionario };

/**
 * Documentos arquivados de um funcionário, agrupados por tipo. Serve a página Documentos (com o
 * seletor de funcionário) e a aba da ficha (`funcionarioFixo`).
 *
 * Os arquivos ficam atrás de endpoint autenticado: "baixar" busca com o token e salva o blob.
 */
export function PainelDeDocumentos({ funcionarioFixo }: { funcionarioFixo?: string }) {
  const podeEscrever = usePodeEscreverNoRh();
  const [escolhido, setEscolhido] = useState("");
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  const funcionarioId = funcionarioFixo ?? escolhido;
  const { data, isLoading, isError, refetch } = useDocumentos(funcionarioId);
  const excluir = useExcluirDocumento();

  const lista = data ?? [];
  const grupos = TIPOS_DE_DOCUMENTO.map((tipo) => ({
    tipo,
    itens: lista.filter((d) => d.tipo === tipo),
  })).filter((g) => g.itens.length > 0);

  async function baixar(d: DocumentoDoFuncionario) {
    setBaixandoId(d.id);
    try {
      await baixarDocumento(d);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível baixar o documento.");
    } finally {
      setBaixandoId(null);
    }
  }

  async function confirmarExclusao(d: DocumentoDoFuncionario) {
    try {
      await excluir.mutateAsync(d.id);
      toast.success("Documento excluído.");
      setDialogo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o documento.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        {!funcionarioFixo ? <SeletorDeFuncionario valor={escolhido} onChange={setEscolhido} apenasAtivos={false} /> : <span />}
        {podeEscrever && (
          <Button variant="action" disabled={!funcionarioId} onClick={() => setDialogo({ tipo: "enviar" })}>
            <Plus />
            Enviar documento
          </Button>
        )}
      </div>

      {!funcionarioId ? (
        <EstadoVazio
          icone={<FileText />}
          titulo="Escolha um funcionário"
          texto="Selecione quem você quer ver para abrir os documentos da pasta."
        />
      ) : isError ? (
        <ErroDeCarga texto="Não foi possível carregar os documentos." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<FileText />}
          titulo="Nenhum documento na pasta"
          texto="RG, CPF, carteira de trabalho, contrato e certificados ficam guardados aqui."
          acao={
            podeEscrever && (
              <Button variant="outline" onClick={() => setDialogo({ tipo: "enviar" })}>
                <Plus />
                Enviar documento
              </Button>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {grupos.map((g) => (
            <section key={g.tipo} className="overflow-hidden rounded-xl border border-border bg-card">
              <h3 className="border-b border-muted px-4 py-2.5 text-[10.5px] font-bold tracking-[.14em] text-muted-foreground uppercase">
                {ROTULO_DO_DOCUMENTO[g.tipo]}
                <span className="ml-1.5 font-mono tabular-nums">{g.itens.length}</span>
              </h3>
              <ul className="divide-y divide-border">
                {g.itens.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-medium md:text-[13.5px]">{d.nome}</p>
                      <p className="text-[12.5px] text-muted-foreground">
                        {formatarTamanho(d.tamanho)} · enviado em {formatarData(d.enviadoEm)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="hidden sm:inline-flex">
                      {ROTULO_DO_DOCUMENTO[d.tipo]}
                    </Badge>
                    <div className="flex shrink-0 gap-1">
                      <BotaoDeIcone
                        rotulo="Baixar documento"
                        icone={<Download />}
                        disabled={baixandoId === d.id}
                        onClick={() => baixar(d)}
                      />
                      {podeEscrever && (
                        <BotaoDeIcone
                          rotulo="Excluir documento"
                          icone={<Trash2 />}
                          perigo
                          onClick={() => setDialogo({ tipo: "excluir", documento: d })}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {dialogo?.tipo === "enviar" && funcionarioId && (
        <DialogEnviarDocumento funcionarioId={funcionarioId} onFechar={() => setDialogo(null)} />
      )}
      {dialogo?.tipo === "excluir" && (
        <Confirmacao
          titulo="Excluir este documento?"
          descricao={`${dialogo.documento.nome} será apagado da pasta e não poderá ser recuperado.`}
          rotuloConfirmar="Excluir"
          perigosa
          pendente={excluir.isPending}
          onConfirmar={() => confirmarExclusao(dialogo.documento)}
          onFechar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}

function DialogEnviarDocumento({ funcionarioId, onFechar }: { funcionarioId: string; onFechar: () => void }) {
  const enviar = useEnviarDocumento();
  const entradaDeArquivo = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<TipoDeDocumento>("RG");
  const [nome, setNome] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const escolhido = e.target.files?.[0] ?? null;
    if (!escolhido) {
      setArquivo(null);
      return;
    }
    const problema = problemaDoArquivo(escolhido);
    if (problema) {
      setArquivo(null);
      setErro(problema);
      if (entradaDeArquivo.current) entradaDeArquivo.current.value = "";
      return;
    }
    setArquivo(escolhido);
    setErro(null);
    // Sem nome digitado, o do arquivo (sem a extensão) já serve de sugestão.
    if (!nome.trim()) setNome(escolhido.name.replace(/\.[^.]+$/, ""));
  }

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return setErro("Dê um nome ao documento.");
    if (!arquivo) return setErro("Escolha o arquivo.");

    try {
      await enviar.mutateAsync({ funcionarioId, tipo, nome: nome.trim(), arquivo });
      toast.success("Documento enviado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o documento.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !enviar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar documento</DialogTitle>
          <DialogDescription>PDF, JPG ou PNG, até 10 MB.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submeter} noValidate className="grid gap-4">
          <Campo id="documento-tipo" rotulo="Tipo">
            <Select value={tipo} onValueChange={(v) => v && setTipo(v as TipoDeDocumento)}>
              <SelectTrigger id="documento-tipo" className="w-full">
                <SelectValue>{() => ROTULO_DO_DOCUMENTO[tipo]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {TIPOS_DE_DOCUMENTO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ROTULO_DO_DOCUMENTO[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo id="documento-nome" rotulo="Nome">
            <Input
              id="documento-nome"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                setErro(null);
              }}
              placeholder="Ex.: RG (frente e verso)"
              autoComplete="off"
              aria-invalid={erro !== null && !nome.trim()}
            />
          </Campo>

          <Campo id="documento-arquivo" rotulo="Arquivo">
            <Input
              id="documento-arquivo"
              ref={entradaDeArquivo}
              type="file"
              accept={ACEITA_ARQUIVO}
              onChange={escolherArquivo}
              className="h-auto py-1.5 max-md:h-auto"
            />
          </Campo>

          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={enviar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={enviar.isPending}>
              {enviar.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
