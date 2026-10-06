"use client";

import { useRef, useState } from "react";
import { Download, FileHeart, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EstadoVazio } from "@/components/padroes/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarSoData, hojeIsoBrasilia } from "@/lib/format/date";
import { usePodeEscreverNoRh } from "@/lib/rh/use-pode-escrever";
import {
  ACEITA_ARQUIVO,
  baixarArquivoDoAtestado,
  problemaDoArquivo,
  useAtestados,
  useEnviarArquivoDoAtestado,
  useExcluirAtestado,
  type Atestado,
} from "@/lib/rh/use-rh";

import { ErroDeCarga } from "./campo";
import { Confirmacao } from "./confirmacao";
import { DialogAtestado } from "./dialog-atestado";
import { BotaoDeIcone, CartaoDaLista } from "./lista-movel";
import { SeletorDeAno } from "./seletor-de-ano";
import { SeletorDeFuncionario, TODOS_OS_FUNCIONARIOS } from "./seletor-de-funcionario";

type Dialogo = { tipo: "atestado"; atestado: Atestado | null } | { tipo: "excluir"; atestado: Atestado };

const periodo = (a: Atestado) =>
  a.inicio === a.fim ? formatarSoData(a.inicio) : `${formatarSoData(a.inicio)} a ${formatarSoData(a.fim)}`;

/**
 * Atestados por funcionário e ano. Serve a página Atestados (com filtro de funcionário) e a aba da
 * ficha (`funcionarioFixo`). Sem o botão de escrita para quem só lê.
 */
export function PainelDeAtestados({ funcionarioFixo }: { funcionarioFixo?: string }) {
  const podeEscrever = usePodeEscreverNoRh();
  const [filtro, setFiltro] = useState(TODOS_OS_FUNCIONARIOS);
  const [ano, setAno] = useState(() => Number(hojeIsoBrasilia().slice(0, 4)));
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const funcionarioId = funcionarioFixo ?? (filtro === TODOS_OS_FUNCIONARIOS ? null : filtro);
  const { data, isLoading, isError, refetch } = useAtestados(funcionarioId, ano);
  const excluir = useExcluirAtestado();

  const lista = data ?? [];
  const mostraNome = !funcionarioFixo;

  async function confirmarExclusao(a: Atestado) {
    try {
      await excluir.mutateAsync(a.id);
      toast.success("Atestado excluído.");
      setDialogo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o atestado.");
    }
  }

  const acoes = (a: Atestado) =>
    podeEscrever ? (
      <>
        <ArquivoDoAtestado atestado={a} />
        <BotaoDeIcone
          rotulo="Editar atestado"
          icone={<Pencil />}
          onClick={() => setDialogo({ tipo: "atestado", atestado: a })}
        />
        <BotaoDeIcone
          rotulo="Excluir atestado"
          icone={<Trash2 />}
          perigo
          onClick={() => setDialogo({ tipo: "excluir", atestado: a })}
        />
      </>
    ) : (
      <ArquivoDoAtestado atestado={a} somenteBaixar />
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {!funcionarioFixo && (
            <SeletorDeFuncionario
              valor={filtro}
              onChange={setFiltro}
              apenasAtivos={false}
              rotuloDeTodos="Todos os funcionários"
            />
          )}
          <SeletorDeAno valor={ano} onChange={setAno} />
        </div>
        {podeEscrever && (
          <Button variant="action" onClick={() => setDialogo({ tipo: "atestado", atestado: null })}>
            <Plus />
            Novo atestado
          </Button>
        )}
      </div>

      {isError ? (
        <ErroDeCarga texto="Não foi possível carregar os atestados." onTentar={() => refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <EstadoVazio
          icone={<FileHeart />}
          titulo={`Nenhum atestado em ${ano}`}
          texto="Os atestados registrados aparecem aqui, com o arquivo para baixar."
          acao={
            podeEscrever && (
              <Button variant="outline" onClick={() => setDialogo({ tipo: "atestado", atestado: null })}>
                <Plus />
                Novo atestado
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-2 md:hidden">
            {lista.map((a) => (
              <CartaoDaLista
                key={a.id}
                titulo={mostraNome ? a.funcionarioNome : periodo(a)}
                subtitulo={mostraNome ? periodo(a) : undefined}
                etiquetas={
                  <>
                    <Badge variant="secondary">
                      {a.dias} {a.dias === 1 ? "dia" : "dias"}
                    </Badge>
                    {a.abonado && <Badge variant="success">Abonado</Badge>}
                  </>
                }
                detalhes={
                  <>
                    {a.cid && <span>CID {a.cid}</span>}
                    {a.profissional && <span>{a.profissional}</span>}
                    {a.observacao && <span>{a.observacao}</span>}
                  </>
                }
                acoes={acoes(a)}
              />
            ))}
          </div>

          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {mostraNome && <TableHead>Funcionário</TableHead>}
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Dias</TableHead>
                  <TableHead>CID</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Falta</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((a) => (
                  <TableRow key={a.id}>
                    {mostraNome && <TableCell className="font-medium">{a.funcionarioNome}</TableCell>}
                    <TableCell className="font-mono text-sm tabular-nums">{periodo(a)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{a.dias}</TableCell>
                    <TableCell>{a.cid ?? "—"}</TableCell>
                    <TableCell className="max-w-48 truncate">{a.profissional ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={a.abonado ? "success" : "waiting"}>{a.abonado ? "Abonada" : "Não abonada"}</Badge>
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-sm text-muted-foreground">
                      {a.temArquivo ? (a.arquivoNome ?? "Anexado") : "Sem arquivo"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">{acoes(a)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {dialogo?.tipo === "atestado" && (
        <DialogAtestado
          atestado={dialogo.atestado}
          funcionarioFixo={funcionarioFixo}
          onFechar={() => setDialogo(null)}
        />
      )}
      {dialogo?.tipo === "excluir" && (
        <Confirmacao
          titulo="Excluir este atestado?"
          descricao={`${dialogo.atestado.funcionarioNome}, ${periodo(dialogo.atestado)}. O arquivo anexado também é apagado.`}
          rotuloConfirmar="Excluir"
          perigosa
          pendente={excluir.isPending}
          onConfirmar={() => confirmarExclusao(dialogo.atestado)}
          onFechar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}

/**
 * Baixar e (para quem escreve) enviar ou substituir o arquivo do atestado.
 *
 * O envio sai assim que o arquivo é escolhido: não há o que preencher além dele.
 */
function ArquivoDoAtestado({ atestado, somenteBaixar = false }: { atestado: Atestado; somenteBaixar?: boolean }) {
  const entrada = useRef<HTMLInputElement>(null);
  const enviar = useEnviarArquivoDoAtestado();
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      await baixarArquivoDoAtestado(atestado);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível baixar o arquivo.");
    } finally {
      setBaixando(false);
    }
  }

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    const problema = problemaDoArquivo(arquivo);
    if (problema) {
      toast.error(problema);
      return;
    }

    try {
      await enviar.mutateAsync({ id: atestado.id, arquivo });
      toast.success(atestado.temArquivo ? "Arquivo substituído." : "Arquivo enviado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o arquivo.");
    }
  }

  return (
    <>
      {atestado.temArquivo && (
        <BotaoDeIcone rotulo="Baixar arquivo" icone={<Download />} disabled={baixando} onClick={baixar} />
      )}
      {!somenteBaixar && (
        <>
          <input
            ref={entrada}
            type="file"
            accept={ACEITA_ARQUIVO}
            onChange={aoEscolher}
            className="hidden"
            tabIndex={-1}
            aria-hidden
          />
          <BotaoDeIcone
            rotulo={atestado.temArquivo ? "Substituir arquivo" : "Enviar arquivo"}
            icone={<Paperclip />}
            disabled={enviar.isPending}
            onClick={() => entrada.current?.click()}
          />
        </>
      )}
    </>
  );
}
