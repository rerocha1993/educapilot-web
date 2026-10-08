"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { hojeIsoBrasilia } from "@/lib/format/date";
import {
  ACEITA_ARQUIVO,
  problemaDoArquivo,
  useSalvarAtestado,
  type Atestado,
} from "@/lib/rh/use-rh";

import { Campo } from "./campo";
import { SeletorDeFuncionario } from "./seletor-de-funcionario";

/**
 * Registrar ou editar um atestado.
 *
 * O arquivo só entra ao registrar: trocar o arquivo de um atestado já existente é outra ação (o
 * clipe na lista), que não mexe nos dados. Com `funcionarioFixo` (a aba da ficha) a pessoa não
 * escolhe o funcionário.
 */
export function DialogAtestado({
  atestado,
  funcionarioFixo,
  onFechar,
}: {
  atestado: Atestado | null;
  funcionarioFixo?: string;
  onFechar: () => void;
}) {
  const salvar = useSalvarAtestado();
  const entradaDeArquivo = useRef<HTMLInputElement>(null);
  const hoje = hojeIsoBrasilia();

  const [funcionarioId, setFuncionarioId] = useState(atestado?.funcionarioId ?? funcionarioFixo ?? "");
  const [inicio, setInicio] = useState(atestado?.inicio ?? hoje);
  const [fim, setFim] = useState(atestado?.fim ?? hoje);
  const [cid, setCid] = useState(atestado?.cid ?? "");
  const [profissional, setProfissional] = useState(atestado?.profissional ?? "");
  const [abonado, setAbonado] = useState(atestado?.abonado ?? false);
  const [observacao, setObservacao] = useState(atestado?.observacao ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function mudarInicio(valor: string) {
    setInicio(valor);
    // Término antes do início não existe: arrasta o término junto.
    if (!fim || fim < valor) setFim(valor);
    setErro(null);
  }

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
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!funcionarioId) return setErro("Escolha o funcionário.");
    if (!inicio) return setErro("Informe o primeiro dia do atestado.");
    if (!fim) return setErro("Informe o último dia do atestado.");
    // Datas em yyyy-MM-dd comparam certo como texto.
    if (fim < inicio) return setErro("O último dia não pode ser antes do primeiro.");

    try {
      await salvar.mutateAsync({
        id: atestado?.id,
        arquivo,
        dados: {
          funcionarioId,
          inicio,
          fim,
          cid: cid.trim() || null,
          profissional: profissional.trim() || null,
          abonado,
          observacao: observacao.trim() || null,
        },
      });
      toast.success(atestado ? "Atestado atualizado." : "Atestado registrado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o atestado.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !salvar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{atestado ? "Editar atestado" : "Novo atestado"}</DialogTitle>
          <DialogDescription>
            O CID é opcional e só aparece para quem tem acesso ao RH.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} noValidate className="grid gap-4">
          {!funcionarioFixo && (
            <Campo id="atestado-funcionario" rotulo="Funcionário">
              <SeletorDeFuncionario
                id="atestado-funcionario"
                valor={funcionarioId}
                onChange={(id) => {
                  setFuncionarioId(id);
                  setErro(null);
                }}
                // Ao editar, quem já saiu da escola continua aparecendo.
                apenasAtivos={!atestado}
                className="md:w-full"
              />
            </Campo>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Campo id="atestado-inicio" rotulo="Primeiro dia">
              <Input
                id="atestado-inicio"
                type="date"
                value={inicio}
                onChange={(e) => mudarInicio(e.target.value)}
                aria-invalid={erro !== null && !inicio}
              />
            </Campo>
            <Campo id="atestado-fim" rotulo="Último dia">
              <Input
                id="atestado-fim"
                type="date"
                value={fim}
                min={inicio || undefined}
                onChange={(e) => {
                  setFim(e.target.value);
                  setErro(null);
                }}
                aria-invalid={erro !== null && (!fim || fim < inicio)}
              />
            </Campo>
            <Campo id="atestado-cid" rotulo="CID (opcional)">
              <Input id="atestado-cid" value={cid} onChange={(e) => setCid(e.target.value)} autoComplete="off" />
            </Campo>
            <Campo id="atestado-profissional" rotulo="Profissional">
              <Input
                id="atestado-profissional"
                value={profissional}
                onChange={(e) => setProfissional(e.target.value)}
                placeholder="Médico ou clínica"
                autoComplete="off"
              />
            </Campo>
          </div>

          <div className="flex min-h-10 items-center gap-3">
            <Switch id="atestado-abonado" checked={abonado} onCheckedChange={setAbonado} />
            <Label htmlFor="atestado-abonado" className="cursor-pointer">
              Falta abonada
            </Label>
          </div>

          <Campo id="atestado-observacao" rotulo="Observação">
            <Textarea
              id="atestado-observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
            />
          </Campo>

          {!atestado && (
            <Campo id="atestado-arquivo" rotulo="Arquivo do atestado" dica="PDF, JPG ou PNG, até 10 MB.">
              <Input
                id="atestado-arquivo"
                ref={entradaDeArquivo}
                type="file"
                accept={ACEITA_ARQUIVO}
                onChange={escolherArquivo}
                className="h-auto py-1.5 max-md:h-auto"
              />
            </Campo>
          )}

          {erro && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={salvar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={salvar.isPending}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
