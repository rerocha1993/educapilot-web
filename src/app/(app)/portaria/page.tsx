"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, LogOut, Smartphone, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PortariaNav, ABAS_DA_PORTARIA } from "@/components/reception/portaria-nav";
import { descreverPeriodo } from "@/components/reception/periodo-do-aluno-campos";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerArea } from "@/lib/access/pode-ver";
import { useClasses } from "@/lib/kernel/use-classes";
import {
  useDesfazerRegistro,
  usePresencasDoDia,
  useRegistrarChegada,
  useRegistrarSaidaDoAluno,
  type PresencaDoAluno,
  type ResponsavelACaminho,
} from "@/lib/reception/use-portaria";
import { horaBrasilia } from "@/lib/reception/formatar";
import { formatarDistancia, formatarMoeda } from "@/lib/reception/numeros";

const TODAS = "0";

function mensagem(err: unknown, padrao: string) {
  return err instanceof Error ? err.message : padrao;
}

export default function PortariaHojePage() {
  const router = useRouter();
  const { data: meuAcesso, isLoading } = useMeuAcesso();
  const podeVerHoje = podeVerArea(meuAcesso, "reception", "presenca");

  // "/portaria" é a porta do módulo no menu. Quem não tem a área de chegada e saída vai para a
  // primeira área que tem, em vez de dar de cara com uma tela que não pode usar.
  useEffect(() => {
    if (isLoading || podeVerHoje) return;
    const destino = ABAS_DA_PORTARIA.find((aba) => aba.href !== "/portaria" && podeVerArea(meuAcesso, "reception", aba.area));
    if (destino) router.replace(destino.href);
  }, [isLoading, podeVerHoje, meuAcesso, router]);

  if (isLoading || !podeVerHoje) return null;

  return <PainelDoDia />;
}

function SeloDoResponsavel({ responsavel }: { responsavel: ResponsavelACaminho }) {
  const texto =
    responsavel.situacao === "Chegou" ? "chegou" : responsavel.situacao === "Chegando" ? "chegando" : "a caminho";
  const cor =
    responsavel.situacao === "Chegou"
      ? "bg-success-soft text-success-soft-foreground"
      : responsavel.situacao === "Chegando"
        ? "bg-warning-soft text-warning-soft-foreground"
        : "bg-muted text-muted-foreground";

  return (
    <Badge className={`gap-1 ${cor}`}>
      <Smartphone className="size-3" />
      {responsavel.nome} {texto}
      {responsavel.situacao !== "Chegou" && responsavel.distanciaMetros != null && ` · ${formatarDistancia(responsavel.distanciaMetros)}`}
    </Badge>
  );
}

function PainelDoDia() {
  const { data: turmas } = useClasses();
  const listaDeTurmas = (turmas ?? []).filter((t) => t.id != null);
  const [classId, setClassId] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const { data, isLoading, isError } = usePresencasDoDia(classId);
  const registrarChegada = useRegistrarChegada();
  const desfazer = useDesfazerRegistro();
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [saindo, setSaindo] = useState<PresencaDoAluno | null>(null);

  const termo = busca.trim().toLowerCase();
  const alunos = (data?.alunos ?? []).filter((a) => !termo || a.alunoNome.toLowerCase().includes(termo));

  async function chegada(aluno: PresencaDoAluno) {
    setOcupado(aluno.studentId);
    try {
      const registrada = await registrarChegada.mutateAsync(aluno.studentId);
      toast.success(`Chegada de ${registrada.alunoNome} às ${horaBrasilia(registrada.chegadaEm!)}.`);
    } catch (err) {
      toast.error(mensagem(err, "Erro ao registrar a chegada."));
    } finally {
      setOcupado(null);
    }
  }

  async function desfazerRegistro(aluno: PresencaDoAluno, etapa: "chegada" | "saida") {
    setOcupado(aluno.studentId);
    try {
      await desfazer.mutateAsync({ studentId: aluno.studentId, etapa });
      toast.success(etapa === "saida" ? "Saída desfeita." : "Chegada desfeita.");
    } catch (err) {
      toast.error(mensagem(err, "Erro ao desfazer."));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PortariaNav />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-xl font-bold">Hoje</h1>
          <p className="text-sm text-muted-foreground">
            Chegada e saída dos alunos. Quem vem com o celular cadastrado tem a chegada marcada sozinha ao chegar perto.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-44 flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Turma</Label>
            <Select
              value={classId ? String(classId) : TODAS}
              onValueChange={(v) => setClassId(v && v !== TODAS ? Number(v) : null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{() => listaDeTurmas.find((t) => t.id === classId)?.className ?? "Todas"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todas</SelectItem>
                {listaDeTurmas.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-56 flex-col gap-[5px]">
            <Label className="text-xs text-muted-foreground">Aluno</Label>
            <Input placeholder="Buscar pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Resumo rotulo="Chegaram" valor={data ? `${data.chegaram} de ${data.total}` : undefined} carregando={isLoading} />
        <Resumo rotulo="Na escola agora" valor={data?.naEscola} carregando={isLoading} />
        <Resumo rotulo="Já saíram" valor={data?.sairam} carregando={isLoading} />
        <Resumo
          rotulo="Multas de hoje"
          valor={data ? (data.comMulta === 0 ? "—" : `${formatarMoeda(data.valorMultas)} (${data.comMulta})`) : undefined}
          carregando={isLoading}
        />
      </div>

      {isError && (
        <div className="rounded-md border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar a chegada e a saída dos alunos.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Chegada</TableHead>
              <TableHead>Saída</TableHead>
              <TableHead>Multa</TableHead>
              <TableHead className="w-48 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && alunos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {termo ? "Nenhum aluno com esse nome." : "Nenhum aluno nesta turma."}
                </TableCell>
              </TableRow>
            )}

            {alunos.map((a) => {
              const periodo = descreverPeriodo({ tipo: a.periodo, entradaPrevista: a.entradaPrevista, saidaPrevista: a.saidaPrevista });
              const temMulta = a.horasMulta + a.horasMultaDobrada > 0;

              return (
                <TableRow key={a.studentId}>
                  <TableCell>
                    <p className="font-medium">{a.alunoNome}</p>
                    <p className="text-xs text-muted-foreground">{a.turmaNome ?? "—"}</p>
                    {a.responsavelACaminho && (
                      <div className="mt-1">
                        <SeloDoResponsavel responsavel={a.responsavelACaminho} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {periodo ? (
                      <>
                        <p>{periodo.rotulo}</p>
                        {periodo.horarios && <p className="text-xs text-muted-foreground">{periodo.horarios}</p>}
                      </>
                    ) : (
                      <Link href="/admin/alunos" className="text-xs text-muted-foreground hover:underline">
                        Sem período
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.chegadaEm ? (
                      <div className="flex items-center gap-1.5">
                        {horaBrasilia(a.chegadaEm)}
                        {a.chegadaOrigem === "Automatica" && (
                          <Badge variant="secondary" className="gap-1">
                            <Smartphone className="size-3" /> celular
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.saidaEm ? (
                      <>
                        <p>{horaBrasilia(a.saidaEm)}</p>
                        {a.retiradoPor && <p className="text-xs text-muted-foreground">com {a.retiradoPor}</p>}
                      </>
                    ) : a.saidaPrevista ? (
                      <span className="text-muted-foreground">prevista {a.saidaPrevista}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {temMulta ? (
                      <>
                        <Badge className="bg-warning-soft text-warning-soft-foreground">{formatarMoeda(a.valorMulta)}</Badge>
                        <p className="text-xs text-muted-foreground">{a.minutosAtraso} min de atraso</p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {a.situacao === "aguardando" && (
                        <>
                          <Button size="sm" onClick={() => chegada(a)} disabled={ocupado === a.studentId}>
                            <LogIn /> Chegou
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSaindo(a)} disabled={ocupado === a.studentId}>
                            Saída
                          </Button>
                        </>
                      )}
                      {a.situacao === "na-escola" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Desfazer chegada"
                            onClick={() => desfazerRegistro(a, "chegada")}
                            disabled={ocupado === a.studentId}
                          >
                            <Undo2 />
                          </Button>
                          <Button size="sm" onClick={() => setSaindo(a)} disabled={ocupado === a.studentId}>
                            <LogOut /> Saída
                          </Button>
                        </>
                      )}
                      {a.situacao === "saiu" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => desfazerRegistro(a, "saida")}
                          disabled={ocupado === a.studentId}
                        >
                          <Undo2 /> Desfazer saída
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!saindo} onOpenChange={(aberto) => !aberto && setSaindo(null)}>
        <DialogContent>
          {saindo && <RegistrarSaida key={saindo.studentId} aluno={saindo} onFechar={() => setSaindo(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RegistrarSaida({ aluno, onFechar }: { aluno: PresencaDoAluno; onFechar: () => void }) {
  const registrar = useRegistrarSaidaDoAluno();
  const [retiradoPor, setRetiradoPor] = useState(aluno.responsavelACaminho?.nome ?? "");

  async function confirmar() {
    try {
      const saida = await registrar.mutateAsync({ studentId: aluno.studentId, retiradoPor: retiradoPor.trim() });
      const multa = saida.horasMulta + saida.horasMultaDobrada > 0;
      toast.success(
        multa
          ? `Saída às ${horaBrasilia(saida.saidaEm!)}, com ${saida.minutosAtraso} min de atraso: multa de ${formatarMoeda(saida.valorMulta)}.`
          : `Saída de ${saida.alunoNome} às ${horaBrasilia(saida.saidaEm!)}.`
      );
      onFechar();
    } catch (err) {
      toast.error(mensagem(err, "Erro ao registrar a saída."));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Saída de {aluno.alunoNome}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-[5px]">
          <Label className="text-xs text-muted-foreground">Quem buscou (opcional)</Label>
          <Input autoFocus placeholder="Ex.: mãe, avó Maria" value={retiradoPor} onChange={(e) => setRetiradoPor(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">
          {aluno.saidaPrevista
            ? `Saída prevista às ${aluno.saidaPrevista}. Atraso acima da tolerância gera multa, calculada ao confirmar.`
            : "O aluno não tem período cadastrado, então não há multa por atraso."}
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button onClick={confirmar} disabled={registrar.isPending}>
          {registrar.isPending ? "Registrando..." : "Confirmar saída"}
        </Button>
      </DialogFooter>
    </>
  );
}

function Resumo({ rotulo, valor, carregando }: { rotulo: string; valor: number | string | undefined; carregando: boolean }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{rotulo}</span>
        {carregando ? <Skeleton className="h-7 w-16" /> : <span className="font-heading text-2xl font-bold">{valor ?? "—"}</span>}
      </CardContent>
    </Card>
  );
}
