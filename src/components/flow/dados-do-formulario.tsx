"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateForm, type FormDto } from "@/lib/flow/use-forms";
import { decodeFormConfig, encodeFormConfig, type TipoDeFormulario } from "@/lib/flow/form-config";
import { ROTULO_DO_TIPO, tipoDoFormulario } from "@/lib/flow/tipo-do-formulario";

type Escolha = TipoDeFormulario | "auto";

/**
 * Nome, descrição e tipo do formulário. Conteúdo de um Dialog: quem abre monta o componente só
 * enquanto ele está aberto, então o estado sempre começa do formulário atual.
 */
export function DadosDoFormulario({ form, onFechar }: { form: FormDto; onFechar: () => void }) {
  const updateForm = useUpdateForm();
  const config = decodeFormConfig(form.config);

  const [nome, setNome] = useState(form.nome);
  const [descricao, setDescricao] = useState(form.descricao ?? "");
  const [tipo, setTipo] = useState<Escolha>(config.tipo ?? "auto");

  const deduzido = tipoDoFormulario({ ...form, config: encodeFormConfig({ ...config, tipo: undefined }) });
  const rotuloAutomatico = `Automático (${deduzido && deduzido !== "outro" ? ROTULO_DO_TIPO[deduzido] : "sem tag"})`;

  const opcoes: { valor: Escolha; rotulo: string }[] = [
    { valor: "auto", rotulo: rotuloAutomatico },
    { valor: "matricula", rotulo: "Matrícula" },
    { valor: "rematricula", rotulo: "Rematrícula" },
    { valor: "outro", rotulo: "Outro (sem tag)" },
  ];

  async function salvar() {
    if (!nome.trim()) return;
    try {
      await updateForm.mutateAsync({
        ...form,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        config: encodeFormConfig({ ...config, tipo: tipo === "auto" ? undefined : tipo }),
      });
      toast.success("Formulário atualizado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar o formulário.");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Dados do formulário</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Descrição</Label>
          <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <p className="text-xs text-muted-foreground">Aparece no topo do formulário que a família abre.</p>
        </div>
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select value={tipo} onValueChange={(v) => v && setTipo(v as Escolha)}>
            <SelectTrigger className="w-full">
              <SelectValue>{() => opcoes.find((o) => o.valor === tipo)?.rotulo}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.rotulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Vira a tag de cada envio na caixa de envios.</p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button onClick={salvar} disabled={updateForm.isPending || !nome.trim()}>
          {updateForm.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </>
  );
}
