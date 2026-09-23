"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Copy, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import type { CategoriaDoModelo, ContaWhatsApp, ModeloDeMensagem, SituacaoDoModelo } from "@/lib/matriculas/tipos";
import { dataHoraCurta } from "@/lib/matriculas/rotulos";
import {
  useConectarWhatsApp,
  useContaWhatsApp,
  useDesconectarWhatsApp,
  useEnviarModeloParaAprovacao,
  useModelosDeMensagem,
  useSalvarModelo,
  useSincronizarModelos,
} from "@/lib/matriculas/use-conversas";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/** O que pode ir em cada {{n}}. Espelha VariaveisDoModelo no backend. */
const VARIAVEIS: Record<string, string> = {
  familia: "Primeiro nome do responsável",
  crianca: "Nome da criança",
  hora_visita: "Hora da visita",
  data_visita: "Dia da visita",
  escola: "Nome da escola",
  texto: "Texto escrito na hora",
};

const SITUACAO: Record<SituacaoDoModelo, { rotulo: string; variante: "success" | "pending" | "waiting" | "overdue" | "outline" }> = {
  NaoEnviado: { rotulo: "Não enviado", variante: "outline" },
  EmAnalise: { rotulo: "Em análise na Meta", variante: "waiting" },
  Aprovado: { rotulo: "Aprovado", variante: "success" },
  Recusado: { rotulo: "Recusado", variante: "overdue" },
  Pausado: { rotulo: "Pausado pela Meta", variante: "pending" },
  Desativado: { rotulo: "Desativado", variante: "overdue" },
};

function erro(e: unknown, padrao: string) {
  return e instanceof Error ? e.message : padrao;
}

export default function WhatsAppDaEscolaPage() {
  const ehGestao = getSession()?.role === "Admin";
  const { data: conta, isLoading } = useContaWhatsApp();

  return (
    <div className="flex flex-col gap-5">
      <MatriculasNav />
      <div>
        <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Matrículas</p>
        <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em]">
          WhatsApp da escola
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          O número oficial da escola no WhatsApp e os modelos de mensagem, que são a única coisa que a escola pode mandar
          depois de 24 horas sem a família escrever.
        </p>
      </div>

      <div className="grid max-w-5xl gap-4">
        {isLoading ? <Skeleton className="h-48 rounded-[24px]" /> : <Numero conta={conta!} ehGestao={ehGestao} />}
        <Modelos conectada={!!conta?.conectada} ehGestao={ehGestao} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ número

function Numero({ conta, ehGestao }: { conta: ContaWhatsApp; ehGestao: boolean }) {
  const [editando, setEditando] = useState(!conta.conectada);
  const [confirmando, setConfirmando] = useState(false);
  const desconectar = useDesconectarWhatsApp();

  async function sair() {
    try {
      await desconectar.mutateAsync();
      toast.success("WhatsApp desconectado. As conversas continuam gravadas.");
      setConfirmando(false);
      setEditando(true);
    } catch (e) {
      toast.error(erro(e, "Não foi possível desconectar."));
    }
  }

  return (
    <Bloco titulo="Número">
      {conta.conectada && !editando ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">{conta.nomeVerificado ?? "Número conectado"}</p>
              <p className="font-mono text-sm tabular-nums text-muted-foreground">{conta.numeroExibido}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Conectado {conta.conectadaEm ? `em ${dataHoraCurta(conta.conectadaEm)}` : ""}
                {conta.usaAppProprio && " · com o app próprio da escola na Meta"}
              </p>
            </div>
          </div>
          {conta.ultimoErro && (
            <p className="flex items-start gap-2 rounded-2xl bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive-soft-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Último erro da Meta{conta.ultimoErroEm ? `, em ${dataHoraCurta(conta.ultimoErroEm)}` : ""}: {conta.ultimoErro}
              </span>
            </p>
          )}
          {ehGestao &&
            (confirmando ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>Desconectar? As famílias param de chegar no funil até conectar de novo.</span>
                <Button variant="outline" size="sm" onClick={() => setConfirmando(false)}>
                  Voltar
                </Button>
                <Button variant="destructive" size="sm" disabled={desconectar.isPending} onClick={sair}>
                  Desconectar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
                  Trocar os dados
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmando(true)}>
                  Desconectar
                </Button>
              </div>
            ))}
        </div>
      ) : ehGestao ? (
        <FormularioDeConexao onFeito={() => setEditando(false)} onCancelar={conta.conectada ? () => setEditando(false) : undefined} />
      ) : (
        <p className="text-sm text-muted-foreground">O WhatsApp ainda não foi conectado. Quem conecta é a gestão da escola.</p>
      )}
    </Bloco>
  );
}

function FormularioDeConexao({ onFeito, onCancelar }: { onFeito: () => void; onCancelar?: () => void }) {
  const [v, setV] = useState({ phoneNumberId: "", wabaId: "", token: "", segredoDoApp: "" });
  const conectar = useConectarWhatsApp();
  const webhook = `${API}/api/matriculas/whatsapp/webhook`;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    try {
      const conta = await conectar.mutateAsync({ ...v, segredoDoApp: v.segredoDoApp || null });
      toast.success(`Conectado: ${conta.nomeVerificado ?? conta.numeroExibido}. Agora sincronize os modelos.`);
      onFeito();
    } catch (err) {
      toast.error(erro(err, "Não foi possível conectar."));
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(webhook);
      toast.success("Endereço copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o endereço e copie à mão.");
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Os três dados ficam no Gerenciador do WhatsApp, na Meta (WhatsApp › Configuração da API). O EducaPilot confere com a
        Meta antes de gravar, e o token fica cifrado. Quando o cadastro guiado da Meta estiver liberado, este passo vira um
        botão só.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="wa-phone" rotulo="Identificação do número (Phone number ID)">
          <Input id="wa-phone" required inputMode="numeric" value={v.phoneNumberId} onChange={(e) => setV({ ...v, phoneNumberId: e.target.value })} />
        </Campo>
        <Campo id="wa-waba" rotulo="Identificação da conta (WABA ID)">
          <Input id="wa-waba" required inputMode="numeric" value={v.wabaId} onChange={(e) => setV({ ...v, wabaId: e.target.value })} />
        </Campo>
        <Campo id="wa-token" rotulo="Token de acesso permanente" className="sm:col-span-2">
          <Input id="wa-token" required type="password" autoComplete="off" value={v.token} onChange={(e) => setV({ ...v, token: e.target.value })} />
        </Campo>
        <Campo id="wa-segredo" rotulo="Segredo do app (só se a escola tem app próprio na Meta)" className="sm:col-span-2">
          <Input id="wa-segredo" type="password" autoComplete="off" value={v.segredoDoApp} onChange={(e) => setV({ ...v, segredoDoApp: e.target.value })} />
        </Campo>
      </div>

      <div className="rounded-2xl bg-muted px-3.5 py-3 text-sm">
        <p className="font-semibold">Com app próprio na Meta</p>
        <p className="mt-0.5 text-muted-foreground">Cadastre este endereço como webhook do app, com o campo “messages” assinado:</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 select-all truncate rounded-lg bg-card px-2.5 py-1.5 font-mono text-xs">{webhook}</code>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Copiar endereço" onClick={copiar}>
            <Copy />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {onCancelar && (
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="action" disabled={conectar.isPending}>
          {conectar.isPending ? "Conferindo com a Meta..." : "Conectar"}
        </Button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ modelos

function Modelos({ conectada, ehGestao }: { conectada: boolean; ehGestao: boolean }) {
  const { data: modelos, isLoading } = useModelosDeMensagem();
  const sincronizar = useSincronizarModelos();
  const [editando, setEditando] = useState<ModeloDeMensagem | null>(null);

  async function rodar() {
    try {
      const r = await sincronizar.mutateAsync();
      const partes = [
        r.jaExistiamNaMeta > 0 && `${r.jaExistiamNaMeta} já estavam na Meta`,
        r.enviadosParaAprovacao > 0 && `${r.enviadosParaAprovacao} enviados para aprovação`,
      ].filter(Boolean);
      toast.success(partes.length ? partes.join(" · ") : "Tudo em dia com a Meta.");
      if (r.falhas.length) toast.error(`A Meta recusou: ${r.falhas.join(" | ")}`);
    } catch (e) {
      toast.error(erro(e, "Não foi possível falar com a Meta."));
    }
  }

  return (
    <Bloco
      titulo="Modelos de mensagem"
      acao={
        ehGestao && (
          <Button variant="outline" size="sm" disabled={!conectada || sincronizar.isPending} onClick={rodar}>
            <RefreshCw data-icon="inline-start" className={cn(sincronizar.isPending && "animate-spin")} />
            Sincronizar com a Meta
          </Button>
        )
      }
    >
      <p className="-mt-1 mb-4 max-w-2xl text-sm text-muted-foreground">
        A biblioteca vem pronta. Sincronizar lê o que a escola já tem aprovado na Meta e manda para aprovação só o que falta.
        Utilidade (lembretes) custa menos que Marketing (retomadas), e a Meta pode mudar a categoria sozinha.
        {!conectada && " Conecte o número antes."}
      </p>

      {isLoading && <Skeleton className="h-40 rounded-2xl" />}
      <ul className="grid gap-2.5 md:grid-cols-2">
        {modelos?.map((m) => (
          <li key={m.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-background/50 p-3.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.uso ?? m.nome}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {m.nome} · {m.idioma} · {m.categoria}
                </p>
              </div>
              <Badge variant={SITUACAO[m.situacao].variante}>{SITUACAO[m.situacao].rotulo}</Badge>
            </div>
            <p className="line-clamp-4 whitespace-pre-wrap text-[13px] leading-snug text-muted-foreground">{m.previa}</p>
            {m.motivoDaMeta && <p className="text-xs text-destructive">Motivo da Meta: {m.motivoDaMeta}</p>}
            {!m.mapeado && (
              <p className="text-xs font-medium text-action">Diga o que vai em cada variável para a escola poder usar este modelo.</p>
            )}
            {ehGestao && (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setEditando(m)}>
                  {m.situacao === "NaoEnviado" || m.situacao === "Recusado" ? "Editar" : "Variáveis"}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <EdicaoDoModelo modelo={editando} conectada={conectada} onFechar={() => setEditando(null)} />
    </Bloco>
  );
}

function EdicaoDoModelo({ modelo, conectada, onFechar }: { modelo: ModeloDeMensagem | null; conectada: boolean; onFechar: () => void }) {
  return (
    <Dialog open={!!modelo} onOpenChange={(a) => !a && onFechar()}>
      {modelo && <ConteudoDaEdicao key={modelo.id} modelo={modelo} conectada={conectada} onFechar={onFechar} />}
    </Dialog>
  );
}

function ConteudoDaEdicao({ modelo, conectada, onFechar }: { modelo: ModeloDeMensagem; conectada: boolean; onFechar: () => void }) {
  const editavel = modelo.situacao === "NaoEnviado" || modelo.situacao === "Recusado";
  const [corpo, setCorpo] = useState(modelo.corpo);
  const [categoria, setCategoria] = useState<CategoriaDoModelo>(modelo.categoria);
  const total = new Set([...corpo.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1])).size;
  const [mapa, setMapa] = useState<string[]>(modelo.variaveis);
  const salvar = useSalvarModelo();
  const enviar = useEnviarModeloParaAprovacao();
  const variaveis = Array.from({ length: total }, (_, i) => mapa[i] ?? "");

  async function gravar(depoisEnviar: boolean) {
    try {
      await salvar.mutateAsync({ id: modelo.id, dto: { corpo, categoria, variaveis } });
      if (depoisEnviar) {
        await enviar.mutateAsync(modelo.id);
        toast.success("Enviado para aprovação. A Meta costuma responder em minutos, às vezes em horas.");
      } else {
        toast.success("Modelo salvo.");
      }
      onFechar();
    } catch (e) {
      toast.error(erro(e, "Não foi possível salvar."));
    }
  }

  const ocupado = salvar.isPending || enviar.isPending;

  return (
    <DialogContent className="gap-5 rounded-[28px] p-5 sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-heading text-lg">{modelo.uso ?? modelo.nome}</DialogTitle>
        <DialogDescription>
          {editavel
            ? "O texto pode mudar até a Meta aprovar. Não comece nem termine com uma variável, e não cole duas variáveis."
            : "Aprovado ou em análise, o texto é o que está na Meta. Aqui você só diz o que vai em cada variável."}
        </DialogDescription>
      </DialogHeader>

      {modelo.motivoDaMeta && <p className="text-sm text-destructive">Motivo da recusa: {modelo.motivoDaMeta}</p>}

      <div className="flex flex-col gap-4">
        <Campo id="modelo-corpo" rotulo="Texto">
          <Textarea id="modelo-corpo" rows={6} maxLength={1024} disabled={!editavel} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
        </Campo>

        {editavel && (
          <Campo id="modelo-categoria" rotulo="Categoria">
            <Select value={categoria} onValueChange={(x) => x && setCategoria(x as CategoriaDoModelo)}>
              <SelectTrigger id="modelo-categoria" className="w-full">
                <SelectValue>{() => (categoria === "Utilidade" ? "Utilidade (lembrete, confirmação)" : "Marketing (retomada, oferta)")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Utilidade">Utilidade (lembrete, confirmação)</SelectItem>
                <SelectItem value="Marketing">Marketing (retomada, oferta)</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
        )}

        {variaveis.map((valor, i) => (
          <Campo key={i} id={`modelo-var-${i}`} rotulo={`O que vai em {{${i + 1}}}`}>
            <Select
              value={valor || undefined}
              onValueChange={(x) => {
                const novo = [...variaveis];
                novo[i] = String(x ?? "");
                setMapa(novo);
              }}
            >
              <SelectTrigger id={`modelo-var-${i}`} className="w-full">
                <SelectValue>{() => (valor ? VARIAVEIS[valor] : "Escolha")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VARIAVEIS).map(([chave, rotulo]) => (
                  <SelectItem key={chave} value={chave}>
                    {rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onFechar} disabled={ocupado}>
          Cancelar
        </Button>
        <Button variant={editavel && conectada ? "outline" : "action"} onClick={() => gravar(false)} disabled={ocupado || variaveis.some((x) => !x)}>
          Salvar
        </Button>
        {editavel && conectada && (
          <Button variant="action" onClick={() => gravar(true)} disabled={ocupado || variaveis.some((x) => !x)}>
            Salvar e enviar para aprovação
          </Button>
        )}
      </div>
    </DialogContent>
  );
}

// ------------------------------------------------------------------ apoio

function Bloco({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

function Campo({ id, rotulo, className, children }: { id: string; rotulo: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-[5px]", className)}>
      <Label htmlFor={id} className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
        {rotulo}
      </Label>
      {children}
    </div>
  );
}
