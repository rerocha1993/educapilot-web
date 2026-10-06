"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hojeIsoBrasilia } from "@/lib/format/date";
import {
  ROTULO_DO_AFASTAMENTO,
  TIPOS_DE_AFASTAMENTO,
  useSalvarAfastamento,
  type Afastamento,
  type TipoDeAfastamento,
} from "@/lib/rh/use-rh";

import { Campo } from "./campo";
import { SeletorDeFuncionario } from "./seletor-de-funcionario";

/**
 * Registrar ou editar um afastamento (férias, licença, folga, suspensão).
 *
 * Período que sobrepõe outro volta 409 do servidor, e a frase dele vai para o toast — é ele que
 * sabe qual afastamento está no caminho.
 */
export function DialogAfastamento({
  afastamento,
  funcionarioFixo,
  onFechar,
}: {
  afastamento: Afastamento | null;
  funcionarioFixo?: string;
  onFechar: () => void;
}) {
  const salvar = useSalvarAfastamento();
  const hoje = hojeIsoBrasilia();

  const [funcionarioId, setFuncionarioId] = useState(afastamento?.funcionarioId ?? funcionarioFixo ?? "");
  const [tipo, setTipo] = useState<TipoDeAfastamento>(afastamento?.tipo ?? "Ferias");
  const [inicio, setInicio] = useState(afastamento?.inicio ?? hoje);
  const [fim, setFim] = useState(afastamento?.fim ?? hoje);
  const [observacao, setObservacao] = useState(afastamento?.observacao ?? "");
  const [erro, setErro] = useState<string | null>(null);

  function mudarInicio(valor: string) {
    setInicio(valor);
    if (!fim || fim < valor) setFim(valor);
    setErro(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!funcionarioId) return setErro("Escolha o funcionário.");
    if (!inicio) return setErro("Informe o primeiro dia.");
    if (!fim) return setErro("Informe o último dia.");
    if (fim < inicio) return setErro("O último dia não pode ser antes do primeiro.");

    try {
      await salvar.mutateAsync({
        id: afastamento?.id,
        dados: { funcionarioId, tipo, inicio, fim, observacao: observacao.trim() || null },
      });
      toast.success(afastamento ? "Afastamento atualizado." : "Afastamento registrado.");
      onFechar();
    } catch (err) {
      // Inclui o 409 de período que sobrepõe outro.
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o afastamento.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !salvar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{afastamento ? "Editar afastamento" : "Novo afastamento"}</DialogTitle>
          <DialogDescription>
            Férias, licenças, folgas e suspensões. O período não pode sobrepor outro afastamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} noValidate className="grid gap-4">
          {!funcionarioFixo && (
            <Campo id="afastamento-funcionario" rotulo="Funcionário">
              <SeletorDeFuncionario
                id="afastamento-funcionario"
                valor={funcionarioId}
                onChange={(id) => {
                  setFuncionarioId(id);
                  setErro(null);
                }}
                apenasAtivos={!afastamento}
                className="md:w-full"
              />
            </Campo>
          )}

          <Campo id="afastamento-tipo" rotulo="Tipo">
            <Select value={tipo} onValueChange={(v) => v && setTipo(v as TipoDeAfastamento)}>
              <SelectTrigger id="afastamento-tipo" className="w-full">
                <SelectValue>{() => ROTULO_DO_AFASTAMENTO[tipo]}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {TIPOS_DE_AFASTAMENTO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ROTULO_DO_AFASTAMENTO[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo id="afastamento-inicio" rotulo="Primeiro dia">
              <Input
                id="afastamento-inicio"
                type="date"
                value={inicio}
                onChange={(e) => mudarInicio(e.target.value)}
                aria-invalid={erro !== null && !inicio}
              />
            </Campo>
            <Campo id="afastamento-fim" rotulo="Último dia">
              <Input
                id="afastamento-fim"
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
          </div>

          <Campo id="afastamento-observacao" rotulo="Observação">
            <Textarea
              id="afastamento-observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
            />
          </Campo>

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
