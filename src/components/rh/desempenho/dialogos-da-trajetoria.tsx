"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { hojeIsoBrasilia } from "@/lib/format/date";
import {
  GRAVIDADES,
  ROTULO_DA_ADVERTENCIA,
  ROTULO_DO_MARCO,
  TIPOS_DE_ADVERTENCIA,
  TIPOS_DE_MARCO,
  useRegistrarAdvertencia,
  useRegistrarMarco,
  useRegistrarReconhecimento,
} from "@/lib/rh/use-desempenho";
import { ACEITA_ARQUIVO, problemaDoArquivo } from "@/lib/rh/use-rh";

import { Campo } from "../campo";

function Erro({ texto }: { texto: string | null }) {
  return (
    texto && (
      <p role="alert" className="text-sm font-medium text-destructive">
        {texto}
      </p>
    )
  );
}

/** Cadastro rápido de uma advertência, com o documento assinado opcional (só a área de desempenho o abre depois). */
export function DialogAdvertencia({ funcionarioId, onFechar }: { funcionarioId: string; onFechar: () => void }) {
  const registrar = useRegistrarAdvertencia();
  const [data, setData] = useState(hojeIsoBrasilia);
  const [tipo, setTipo] = useState<string>("Verbal");
  const [gravidade, setGravidade] = useState<string>("Leve");
  const [motivo, setMotivo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return setErro("Informe a data.");
    if (!motivo.trim()) return setErro("Informe o motivo.");
    const problema = arquivo ? problemaDoArquivo(arquivo) : null;
    if (problema) return setErro(problema);

    try {
      await registrar.mutateAsync({ funcionarioId, data, tipo, gravidade, motivo: motivo.trim(), arquivo });
      toast.success("Advertência registrada.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar a advertência.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !registrar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar advertência</DialogTitle>
          <DialogDescription>
            Entra na linha do tempo e pesa na nota conforme a gravidade, perdendo força com o tempo. Descreva fatos, não
            julgamentos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} noValidate className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Campo id="adv-data" rotulo="Data">
              <Input id="adv-data" type="date" value={data} max={hojeIsoBrasilia()} onChange={(e) => setData(e.target.value)} />
            </Campo>
            <Campo id="adv-tipo" rotulo="Tipo">
              <Select value={tipo} onValueChange={(v) => v && setTipo(v)}>
                <SelectTrigger id="adv-tipo" className="w-full">
                  <SelectValue>{() => ROTULO_DA_ADVERTENCIA[tipo]}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {TIPOS_DE_ADVERTENCIA.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ROTULO_DA_ADVERTENCIA[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo id="adv-gravidade" rotulo="Gravidade">
              <Select value={gravidade} onValueChange={(v) => v && setGravidade(v)}>
                <SelectTrigger id="adv-gravidade" className="w-full">
                  <SelectValue>{() => gravidade}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {GRAVIDADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>
          <Campo id="adv-motivo" rotulo="Motivo">
            <Textarea id="adv-motivo" rows={3} maxLength={2000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Campo>
          <Campo id="adv-arquivo" rotulo="Documento assinado (opcional)" dica="PDF, JPG ou PNG, até 10 MB.">
            <Input id="adv-arquivo" type="file" accept={ACEITA_ARQUIVO} onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </Campo>
          <Erro texto={erro} />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={registrar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={registrar.isPending}>
              {registrar.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DialogReconhecimento({ funcionarioId, onFechar }: { funcionarioId: string; onFechar: () => void }) {
  const registrar = useRegistrarReconhecimento();
  const [data, setData] = useState(hojeIsoBrasilia);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pontos, setPontos] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return setErro("Informe a data.");
    if (!titulo.trim()) return setErro("Informe o título.");
    const p = pontos.trim() === "" ? null : Number(pontos.replace(",", "."));
    if (p !== null && (Number.isNaN(p) || p < 0 || p > 10)) return setErro("Os pontos devem ficar entre 0 e 10.");

    try {
      await registrar.mutateAsync({ funcionarioId, data, titulo: titulo.trim(), descricao: descricao.trim() || null, pontos: p });
      toast.success("Reconhecimento registrado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar o reconhecimento.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !registrar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar reconhecimento</DialogTitle>
          <DialogDescription>Elogio ou mérito. Soma bônus à nota, com teto definido na configuração.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} noValidate className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Campo id="rec-data" rotulo="Data">
              <Input id="rec-data" type="date" value={data} max={hojeIsoBrasilia()} onChange={(e) => setData(e.target.value)} />
            </Campo>
            <Campo id="rec-titulo" rotulo="Título" className="col-span-2">
              <Input id="rec-titulo" maxLength={200} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </Campo>
          </div>
          <Campo id="rec-descricao" rotulo="Descrição (opcional)">
            <Textarea id="rec-descricao" rows={2} maxLength={2000} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Campo>
          <Campo id="rec-pontos" rotulo="Pontos de bônus (opcional)" dica="Vazio vale 1 ponto." className="max-w-40">
            <Input id="rec-pontos" inputMode="decimal" value={pontos} onChange={(e) => setPontos(e.target.value)} />
          </Campo>
          <Erro texto={erro} />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={registrar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={registrar.isPending}>
              {registrar.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DialogMarco({ funcionarioId, onFechar }: { funcionarioId: string; onFechar: () => void }) {
  const registrar = useRegistrarMarco();
  const [data, setData] = useState(hojeIsoBrasilia);
  const [tipo, setTipo] = useState<string>("Curso");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return setErro("Informe a data.");
    if (!descricao.trim()) return setErro("Informe a descrição.");

    try {
      await registrar.mutateAsync({ funcionarioId, data, tipo, descricao: descricao.trim() });
      toast.success("Marco registrado.");
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar o marco.");
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && !registrar.isPending && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar marco de carreira</DialogTitle>
          <DialogDescription>Promoção, mudança de cargo, curso, certificação... Entra na linha do tempo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} noValidate className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Campo id="marco-data" rotulo="Data">
              <Input id="marco-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </Campo>
            <Campo id="marco-tipo" rotulo="Tipo">
              <Select value={tipo} onValueChange={(v) => v && setTipo(v)}>
                <SelectTrigger id="marco-tipo" className="w-full">
                  <SelectValue>{() => ROTULO_DO_MARCO[tipo]}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {TIPOS_DE_MARCO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ROTULO_DO_MARCO[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
          </div>
          <Campo id="marco-descricao" rotulo="Descrição">
            <Input id="marco-descricao" maxLength={500} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </Campo>
          <Erro texto={erro} />
          <DialogFooter>
            <Button type="button" variant="outline" disabled={registrar.isPending} onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" variant="action" disabled={registrar.isPending}>
              {registrar.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
