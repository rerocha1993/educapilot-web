"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClasses } from "@/lib/kernel/use-classes";
import { useStudentsByClass } from "@/lib/kernel/use-students";
import {
  useBuscarVisitantes,
  useCadastrarVisitante,
  useEnviarFotoVisitante,
  useRegistrarEntrada,
  type Visitante,
} from "@/lib/reception/use-portaria";
import { formatarCpf, horaBrasilia } from "@/lib/reception/formatar";
import { useAtrasado } from "@/lib/reception/use-atrasado";
import { FotoVisitante } from "./foto-visitante";
import { CapturaDeFoto } from "./captura-de-foto";

type Etapa = "buscar" | "cadastrar" | "entrada";

const FORM_VAZIO = { nome: "", cpf: "", rg: "", telefone: "", email: "" };
const NENHUM = "0";

function mensagem(err: unknown, padrao: string) {
  return err instanceof Error ? err.message : padrao;
}

/**
 * Entrada de um visitante, em três passos: achar a pessoa (ou cadastrar, com foto), dizer o motivo
 * e quem ela vem ver, e registrar.
 *
 * Buscar antes de cadastrar é o que evita a mesma pessoa virar três fichas — quem volta à escola é
 * achado pelo nome ou CPF, com a foto ao lado para conferir.
 */
export function RegistrarEntradaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
}) {
  const [etapa, setEtapa] = useState<Etapa>("buscar");
  const [busca, setBusca] = useState("");
  const buscaAtrasada = useAtrasado(busca, 300);
  const [visitante, setVisitante] = useState<Visitante | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [foto, setFoto] = useState<File | null>(null);
  const [trocandoFoto, setTrocandoFoto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [classId, setClassId] = useState(NENHUM);
  const [studentId, setStudentId] = useState(NENHUM);

  const { data: achados, isFetching: buscando } = useBuscarVisitantes(buscaAtrasada, open && etapa === "buscar");
  const { data: turmas } = useClasses();
  const { data: alunos } = useStudentsByClass(classId !== NENHUM ? Number(classId) : null);
  const cadastrarVisitante = useCadastrarVisitante();
  const enviarFoto = useEnviarFotoVisitante();
  const registrarEntrada = useRegistrarEntrada();

  function reiniciar() {
    setEtapa("buscar");
    setBusca("");
    setVisitante(null);
    setForm(FORM_VAZIO);
    setFoto(null);
    setTrocandoFoto(false);
    setMotivo("");
    setClassId(NENHUM);
    setStudentId(NENHUM);
  }

  function mudarAbertura(aberto: boolean) {
    if (!aberto) reiniciar();
    onOpenChange(aberto);
  }

  function novoVisitante() {
    // O que já foi digitado na busca aproveita no cadastro: número vai para o CPF, texto para o nome.
    const texto = busca.trim();
    const pareceCpf = /^[\d.\-\s]+$/.test(texto);
    setForm({ ...FORM_VAZIO, nome: pareceCpf ? "" : texto, cpf: pareceCpf ? texto : "" });
    setFoto(null);
    setEtapa("cadastrar");
  }

  async function cadastrar() {
    try {
      const criado = await cadastrarVisitante.mutateAsync({
        nome: form.nome.trim(),
        cpf: form.cpf.trim() || null,
        rg: form.rg.trim() || null,
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
      });

      let pronto = criado;
      if (foto) {
        try {
          await enviarFoto.mutateAsync({ id: criado.id, arquivo: foto });
          pronto = { ...criado, temFoto: true };
        } catch (err) {
          // O cadastro já existe: segue para a entrada e a foto pode ser tirada de novo lá.
          toast.error(`Visitante cadastrado, mas a foto não foi salva: ${mensagem(err, "erro no envio")}`);
        }
      }

      setVisitante(pronto);
      setEtapa("entrada");
    } catch (err) {
      toast.error(mensagem(err, "Erro ao cadastrar o visitante."));
    }
  }

  async function trocarFoto(arquivo: File | null) {
    if (!arquivo || !visitante) return;
    try {
      await enviarFoto.mutateAsync({ id: visitante.id, arquivo });
      setVisitante({ ...visitante, temFoto: true });
      setTrocandoFoto(false);
      toast.success("Foto atualizada.");
    } catch (err) {
      toast.error(mensagem(err, "Erro ao enviar a foto."));
    }
  }

  async function registrar() {
    if (!visitante) return;
    try {
      const visita = await registrarEntrada.mutateAsync({
        visitanteId: visitante.id,
        motivo: motivo.trim() || null,
        classId: classId !== NENHUM ? Number(classId) : null,
        studentId: studentId !== NENHUM ? Number(studentId) : null,
      });
      toast.success(`Entrada de ${visita.visitanteNome} registrada às ${horaBrasilia(visita.entradaEm)}.`);
      mudarAbertura(false);
    } catch (err) {
      toast.error(mensagem(err, "Erro ao registrar a entrada."));
    }
  }

  const listaDeTurmas = (turmas ?? []).filter((t) => t.id != null);

  return (
    <Dialog open={open} onOpenChange={mudarAbertura}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {etapa === "buscar" && "Registrar entrada"}
            {etapa === "cadastrar" && "Novo visitante"}
            {etapa === "entrada" && "Confirmar entrada"}
          </DialogTitle>
        </DialogHeader>

        {etapa === "buscar" && (
          <>
            <div className="flex flex-col gap-2">
              <Input
                autoFocus
                placeholder="Buscar por nome ou CPF"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              {!busca.trim() && <p className="text-xs text-muted-foreground">Visitantes recentes</p>}

              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                {(achados ?? []).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={!!v.visitaAbertaId}
                    onClick={() => {
                      setVisitante(v);
                      setEtapa("entrada");
                    }}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FotoVisitante visitanteId={v.id} nome={v.nome} temFoto={v.temFoto} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{v.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatarCpf(v.cpf)}
                        {v.telefone ? ` · ${v.telefone}` : ""}
                      </p>
                    </div>
                    {v.visitaAbertaId && (
                      <Badge className="bg-success-soft text-success-soft-foreground">Na escola</Badge>
                    )}
                  </button>
                ))}

                {!buscando && achados?.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {busca.trim() ? "Nenhum visitante encontrado." : "Nenhum visitante cadastrado ainda."}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={novoVisitante}>
                + Cadastrar novo visitante
              </Button>
            </DialogFooter>
          </>
        )}

        {etapa === "cadastrar" && (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Nome completo</Label>
                <Input autoFocus value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">CPF</Label>
                  <Input
                    inputMode="numeric"
                    value={form.cpf}
                    onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">RG</Label>
                  <Input value={form.rg} onChange={(e) => setForm((f) => ({ ...f, rg: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <Input
                    inputMode="tel"
                    value={form.telefone}
                    onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
              <CapturaDeFoto onFotoPronta={setFoto} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEtapa("buscar")}>
                Voltar
              </Button>
              <Button
                onClick={cadastrar}
                disabled={!form.nome.trim() || cadastrarVisitante.isPending || enviarFoto.isPending}
              >
                {cadastrarVisitante.isPending || enviarFoto.isPending ? "Salvando..." : "Cadastrar e continuar"}
              </Button>
            </DialogFooter>
          </>
        )}

        {etapa === "entrada" && visitante && (
          <>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 rounded-md border border-border p-3">
                <FotoVisitante visitanteId={visitante.id} nome={visitante.nome} temFoto={visitante.temFoto} tamanho="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{visitante.nome}</p>
                  <p className="text-xs text-muted-foreground">CPF {formatarCpf(visitante.cpf)}</p>
                  <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setTrocandoFoto((t) => !t)}>
                    {visitante.temFoto ? "Trocar foto" : "Adicionar foto"}
                  </Button>
                </div>
              </div>

              {trocandoFoto && <CapturaDeFoto onFotoPronta={trocarFoto} />}

              <div className="flex flex-col gap-[5px]">
                <Label className="text-xs text-muted-foreground">Motivo da visita</Label>
                <Input
                  placeholder="Ex.: reunião com a coordenação"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Turma (opcional)</Label>
                  <Select
                    value={classId}
                    onValueChange={(v) => {
                      setClassId(v ? String(v) : NENHUM);
                      setStudentId(NENHUM);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {() => listaDeTurmas.find((t) => String(t.id) === classId)?.className ?? "Nenhuma"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NENHUM}>Nenhuma</SelectItem>
                      {listaDeTurmas.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-[5px]">
                  <Label className="text-xs text-muted-foreground">Aluno visitado (opcional)</Label>
                  <Select
                    value={studentId}
                    onValueChange={(v) => setStudentId(v ? String(v) : NENHUM)}
                    disabled={classId === NENHUM}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {() => alunos?.find((a) => String(a.id) === studentId)?.fullName ?? "Nenhum"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NENHUM}>Nenhum</SelectItem>
                      {(alunos ?? []).map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setVisitante(null);
                  setTrocandoFoto(false);
                  setEtapa("buscar");
                }}
              >
                Voltar
              </Button>
              <Button onClick={registrar} disabled={registrarEntrada.isPending}>
                {registrarEntrada.isPending ? "Registrando..." : "Registrar entrada"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
