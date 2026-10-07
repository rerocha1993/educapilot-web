"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileSignature } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  decodeFieldConfig,
  useCreateFormField,
  useDeleteFormField,
} from "@/lib/flow/use-form-fields";
import { useFormResponses } from "@/lib/flow/use-form-responses";
import type { FormFieldDto } from "@/lib/flow/use-forms";

/**
 * "Este formulário gera contrato" — liga e desliga o contrato de um formulário.
 *
 * Não existe bandeira nova no backend, e não deve existir: quem decide é a presença de um campo
 * do tipo "contrato" (FormResponseService.GerarContratosAsync →
 * ContratosDoFormulario.CamposDeContrato). O interruptor cria e apaga esse campo pelos mesmos
 * endpoints de campo que o construtor já usa — duas fontes para a mesma verdade uma hora divergem.
 *
 * Ligar abre a configuração do campo na sequência: um contrato sem texto e sem quem assine é
 * gerado e não sai do lugar, e isso só apareceria quando a família reclamasse de não receber.
 */
const ROTULO_PADRAO = "Contrato";

/**
 * Marca no endereço que o construtor deve chegar com o contrato já ligado.
 *
 * É assim que a caixa "Este formulário gera contrato" do diálogo de criação chega até aqui: o
 * formulário só existe depois de criado, e quem sabe como o campo de contrato nasce é este
 * arquivo — a lista de formulários não precisa saber.
 */
export const HASH_LIGAR_CONTRATO = "#contrato";

export function InterruptorDeContrato({
  formId,
  campos,
  onConfigurar,
}: {
  formId: string;
  campos: FormFieldDto[];
  /** Abre o diálogo de edição do campo de contrato, o mesmo usado pela lista de campos. */
  onConfigurar: (campo: FormFieldDto) => void;
}) {
  const criarCampo = useCreateFormField(formId);
  const apagarCampo = useDeleteFormField(formId);
  const [confirmandoDesligar, setConfirmandoDesligar] = useState(false);

  const campoContrato = campos.find((c) => c.tipo === "contrato");
  const ocupado = criarCampo.isPending || apagarCampo.isPending;

  async function ligar() {
    try {
      const criado = await criarCampo.mutateAsync({
        label: ROTULO_PADRAO,
        tipo: "contrato",
        // Depois do maior número de ordem, igual ao construtor: o contrato é a última coisa que
        // a família lê, depois de já ter preenchido o que o texto usa.
        ordem: campos.reduce((maior, c) => Math.max(maior, c.ordem), 0) + 1,
        obrigatorio: true,
      });
      onConfigurar(criado);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o campo.");
    }
  }

  async function desligar() {
    if (!campoContrato) return;
    try {
      await apagarCampo.mutateAsync(campoContrato.id);
      setConfirmandoDesligar(false);
      toast.success("Campo removido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover campo.");
    }
  }

  const semTexto = campoContrato && !decodeFieldConfig(campoContrato.config).contratoTexto;

  // Chegada vinda de "Novo formulário" com a caixa marcada. Marca num ref, e não em estado: isto
  // não desenha nada, só impede que o gesto se repita. A marca sai do endereço para um F5 também
  // não repeti-lo.
  const chegadaTratada = useRef(false);
  useEffect(() => {
    if (chegadaTratada.current || window.location.hash !== HASH_LIGAR_CONTRATO) return;

    chegadaTratada.current = true;
    window.history.replaceState(null, "", window.location.pathname);

    if (campoContrato) onConfigurar(campoContrato);
    else ligar();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda uma vez, na chegada.
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <FileSignature className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <Label htmlFor="gera-contrato" className="text-sm font-medium">
              Este formulário gera contrato
            </Label>
            <p className="mt-1 text-xs leading-[1.55] text-muted-foreground">
              Ligado, o formulário mostra o contrato para a família ler e assinar ao enviar. Os
              contratos gerados ficam em Administração · Contratos.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          {campoContrato && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConfigurar(campoContrato)}
              disabled={ocupado}
            >
              Configurar contrato
            </Button>
          )}
          <Switch
            id="gera-contrato"
            checked={!!campoContrato}
            disabled={ocupado}
            onCheckedChange={(ligado) => (ligado ? ligar() : setConfirmandoDesligar(true))}
          />
        </div>
      </div>

      {semTexto && (
        <p className="mt-2.5 rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
          Falta o texto do contrato. Enquanto ele não for preenchido, a família não vê contrato
          nenhum ao enviar o formulário.
        </p>
      )}

      <Dialog
        open={confirmandoDesligar}
        onOpenChange={(aberto) => !aberto && setConfirmandoDesligar(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desligar o contrato deste formulário</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Remove o campo de contrato: o título, o texto e a escolha de quem assina saem com
              ele. Não dá para desfazer.
            </p>
            {confirmandoDesligar && <AvisoDeEnvios formId={formId} />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmandoDesligar(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={desligar} disabled={apagarCampo.isPending}>
              {apagarCampo.isPending ? "Desligando..." : "Desligar contrato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Quantos envios o formulário já recebeu.
 *
 * Só é montado com o diálogo aberto, para não custar uma consulta a cada abertura do construtor.
 * O que importa aqui não é o passado — contrato já gerado continua guardado — e sim que a partir
 * de agora os envios deixam de gerar contrato.
 */
function AvisoDeEnvios({ formId }: { formId: string }) {
  const { data: respostas } = useFormResponses(formId);
  const total = respostas?.length ?? 0;

  if (total === 0) return null;

  return (
    <div className="rounded-md border border-warning-border bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
      Este formulário já recebeu <span className="font-mono tabular-nums">{total}</span> envio
      {total === 1 ? "" : "s"}. Os contratos já gerados continuam guardados; o que muda é daqui
      para a frente — os próximos envios não geram mais contrato.
    </div>
  );
}
