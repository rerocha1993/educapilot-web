"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Eye, FileText, Film, Image as ImageIcon, Link2, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MatriculasNav } from "@/components/matriculas/matriculas-nav";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import type { GatilhoDoMaterial, Material, TipoDeMaterial } from "@/lib/matriculas/tipos";
import { useFichaDaEscola } from "@/lib/matriculas/use-assistente";
import { abrirArquivoDoMaterial, useAlternarMaterial, useCriarMaterial, useExcluirMaterial, useMateriais } from "@/lib/matriculas/use-agenda";

const TIPOS: Record<TipoDeMaterial, { rotulo: string; dica: string }> = {
  TabelaDePreco: { rotulo: "Tabela de preços", dica: "Uma por ano letivo. A assistente manda só a do ano e da turma da criança." },
  Apresentacao: { rotulo: "Apresentação", dica: "Vai sempre junto da tabela: o preço sozinho vira comparação de número." },
  Video: { rotulo: "Vídeo", dica: "Link do YouTube, ou MP4 até 16 MB." },
  Fotos: { rotulo: "Fotos", dica: "Espaços, salas, parque." },
  Atividades: { rotulo: "Atividades", dica: "Rotina, projetos, eventos." },
  Adaptacao: { rotulo: "Adaptação", dica: "Para a família insegura com a primeira escola." },
  Outro: { rotulo: "Outro", dica: "" },
};

const GATILHOS: Record<GatilhoDoMaterial | "nunca", string> = {
  nunca: "Só quando a família pedir",
  Sempre: "Sempre que fizer sentido",
  PediuPrecos: "Quando pedir preço",
  Inseguranca: "Quando estiver insegura",
  DuvidaDeRotina: "Quando perguntar da rotina",
  DuvidaDeAdaptacao: "Quando perguntar da adaptação",
};

function tamanho(bytes?: number | null) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

export default function MateriaisPage() {
  const ehGestao = getSession()?.role === "Admin";
  const { data, isLoading, isError } = useMateriais();
  const ativos = data?.filter((m) => m.ativo).length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <MatriculasNav />
      <div>
        <p className="text-[11.5px] font-bold uppercase tracking-[.16em] text-action">Matrículas</p>
        <h1 className="mt-1 font-heading text-[clamp(24px,3vw,32px)] font-semibold leading-[1.1] tracking-[-.03em]">Materiais</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          O que a assistente pode mandar para as famílias. Ela só oferece o que está aqui
          {data ? `: ${ativos} ${ativos === 1 ? "material ativo" : "materiais ativos"}` : ""}.
        </p>
      </div>

      <div className="grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">
        {ehGestao && <NovoMaterial />}
        <section className={cn("flex flex-col gap-2", !ehGestao && "lg:col-span-2")}>
          {isError && <p className="text-sm text-destructive">Não foi possível carregar os materiais.</p>}
          {isLoading && <Skeleton className="h-64 rounded-[24px]" />}
          {data?.length === 0 && (
            <p className="rounded-[24px] border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhum material ainda. Comece pela apresentação e pela tabela de preços do ano.
            </p>
          )}
          {data?.map((m) => <Linha key={m.id} m={m} ehGestao={ehGestao} />)}
        </section>
      </div>
    </div>
  );
}

function Linha({ m, ehGestao }: { m: Material; ehGestao: boolean }) {
  const alternar = useAlternarMaterial();
  const excluir = useExcluirMaterial();
  const [confirmando, setConfirmando] = useState(false);
  const Icone = m.url ? Link2 : m.tipoDoArquivo?.startsWith("image/") ? ImageIcon : m.tipoDoArquivo?.startsWith("video/") ? Film : FileText;

  async function abrir() {
    if (m.url) {
      window.open(m.url, "_blank", "noopener");
      return;
    }
    try {
      await abrirArquivoDoMaterial(m.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir.");
    }
  }

  return (
    <article className={cn("flex items-start gap-3 rounded-[20px] border border-border bg-card p-4", !m.ativo && "opacity-60")}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icone className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{TIPOS[m.tipo].rotulo}</Badge>
          {m.ano && <Badge variant="outline">{m.ano}</Badge>}
          {!m.ativo && <Badge variant="outline">inativo</Badge>}
        </div>
        <p className="mt-1 font-semibold leading-snug">{m.titulo}</p>
        {m.legenda && <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{m.legenda}</p>}
        <p className="mt-1 text-[12px] text-muted-foreground">
          {m.turmas.length === 0 ? "Todas as turmas" : m.turmas.join(", ")}
          {m.pasta && ` · pasta ${m.pasta}`}
          {` · ${GATILHOS[m.gatilho ?? "nunca"].toLowerCase()}`}
          {m.url ? " · YouTube" : ` · ${tamanho(m.tamanhoBytes)}`}
          {m.enviosFeitos > 0 && ` · enviado ${m.enviosFeitos}×`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" aria-label={`Ver ${m.titulo}`} onClick={abrir}>
          <Eye className="size-4" aria-hidden />
        </Button>
        {ehGestao && (
          <>
            <Switch
              aria-label={m.ativo ? `Desativar ${m.titulo}` : `Ativar ${m.titulo}`}
              checked={m.ativo}
              disabled={alternar.isPending}
              onCheckedChange={(ativo) => alternar.mutate({ id: m.id, ativo }, { onError: (e) => toast.error(e.message) })}
            />
            {m.enviosFeitos === 0 &&
              (confirmando ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={excluir.isPending}
                  onClick={() => excluir.mutate(m.id, { onError: (e) => toast.error(e.message), onSettled: () => setConfirmando(false) })}
                >
                  Excluir
                </Button>
              ) : (
                <Button variant="ghost" size="icon" aria-label={`Excluir ${m.titulo}`} onClick={() => setConfirmando(true)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              ))}
          </>
        )}
      </div>
    </article>
  );
}

function NovoMaterial() {
  const criar = useCriarMaterial();
  const { data: tela } = useFichaDaEscola();
  const turmasDaFicha = (tela?.ficha?.turmas ?? []).map((t) => t.nome);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const [tipo, setTipo] = useState<TipoDeMaterial>("Apresentacao");
  const [titulo, setTitulo] = useState("");
  const [ano, setAno] = useState(String(new Date().getFullYear() + 1));
  const [fonte, setFonte] = useState<"arquivo" | "link">("arquivo");
  const [url, setUrl] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [legenda, setLegenda] = useState("");
  const [turmas, setTurmas] = useState<string[]>([]);
  const [pasta, setPasta] = useState("");
  const [gatilho, setGatilho] = useState<GatilhoDoMaterial | "nunca">("nunca");
  const [substituir, setSubstituir] = useState(false);

  function limpar() {
    setTitulo("");
    setUrl("");
    setArquivo(null);
    setLegenda("");
    if (arquivoRef.current) arquivoRef.current.value = "";
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const f = new FormData();
    f.set("tipo", tipo);
    f.set("titulo", titulo);
    if (legenda.trim()) f.set("legenda", legenda);
    turmas.forEach((t) => f.append("turmas", t));
    if (pasta.trim()) f.set("pasta", pasta);
    if (gatilho !== "nunca") f.set("gatilho", gatilho);
    if (tipo === "TabelaDePreco") f.set("ano", ano);
    if (fonte === "link") f.set("url", url);
    else if (arquivo) f.set("arquivo", arquivo);
    f.set("substituir", String(substituir));
    try {
      const r = await criar.mutateAsync(f);
      toast.success(r.substituidos > 0 ? `Material salvo. ${r.substituidos} anterior desativado.` : "Material salvo.");
      if (r.aviso) toast.message(r.aviso);
      limpar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 self-start rounded-[24px] border border-border bg-card p-5">
      <h2 className="font-heading text-base font-semibold">Novo material</h2>

      <Campo id="m-tipo" rotulo="Tipo" dica={TIPOS[tipo].dica}>
        <Select value={tipo} onValueChange={(x) => x && setTipo(x as TipoDeMaterial)}>
          <SelectTrigger id="m-tipo" className="w-full">
            <SelectValue>{() => TIPOS[tipo].rotulo}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TIPOS) as TipoDeMaterial[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TIPOS[t].rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>

      <div className={cn("grid gap-3", tipo === "TabelaDePreco" && "grid-cols-[1fr_6rem]")}>
        <Campo id="m-titulo" rotulo="Título" dica="Como a assistente reconhece e anuncia.">
          <Input id="m-titulo" required maxLength={120} placeholder="Apresentação da escola" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
        {tipo === "TabelaDePreco" && (
          <Campo id="m-ano" rotulo="Ano letivo">
            <Input id="m-ano" type="number" inputMode="numeric" className="font-mono tabular-nums" value={ano} onChange={(e) => setAno(e.target.value)} />
          </Campo>
        )}
      </div>

      <div role="radiogroup" aria-label="De onde vem" className="flex rounded-lg bg-muted p-[3px]">
        {(["arquivo", "link"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={fonte === f}
            onClick={() => setFonte(f)}
            className={cn("min-h-8 flex-1 rounded-md text-[13px] font-medium", fonte === f ? "bg-card shadow-sm" : "text-muted-foreground")}
          >
            {f === "arquivo" ? "Arquivo" : "Link do YouTube"}
          </button>
        ))}
      </div>
      {fonte === "arquivo" ? (
        <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50">
          <Upload className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{arquivo ? `${arquivo.name} · ${tamanho(arquivo.size)}` : "PDF, JPG, PNG, WEBP ou MP4"}</span>
          <input
            ref={arquivoRef}
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <Input aria-label="Link do YouTube" placeholder="https://youtu.be/..." value={url} onChange={(e) => setUrl(e.target.value)} />
      )}

      <Campo id="m-legenda" rotulo="Legenda" dica="Vai junto no WhatsApp. Opcional.">
        <Textarea id="m-legenda" rows={2} maxLength={800} value={legenda} onChange={(e) => setLegenda(e.target.value)} />
      </Campo>

      <Campo id="m-turmas" rotulo="Para quem serve">
        <div className="flex flex-wrap gap-1.5">
          <Opcao ligada={turmas.length === 0} onClick={() => setTurmas([])}>
            Todas as turmas
          </Opcao>
          {turmasDaFicha.map((t) => (
            <Opcao key={t} ligada={turmas.includes(t)} onClick={() => setTurmas(turmas.includes(t) ? turmas.filter((x) => x !== t) : [...turmas, t])}>
              {t}
            </Opcao>
          ))}
        </div>
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo id="m-pasta" rotulo="Pasta">
          <Input id="m-pasta" maxLength={60} placeholder="Opcional" value={pasta} onChange={(e) => setPasta(e.target.value)} />
        </Campo>
        <Campo id="m-gatilho" rotulo="Quando oferecer">
          <Select value={gatilho} onValueChange={(x) => x && setGatilho(x as GatilhoDoMaterial | "nunca")}>
            <SelectTrigger id="m-gatilho" className="w-full">
              <SelectValue>{() => GATILHOS[gatilho]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(GATILHOS) as (GatilhoDoMaterial | "nunca")[]).map((g) => (
                <SelectItem key={g} value={g}>
                  {GATILHOS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </div>

      <label className="flex items-start gap-2.5 text-sm">
        <Switch checked={substituir} onCheckedChange={setSubstituir} className="mt-0.5" />
        <span>
          <span className="font-semibold">Substituir o anterior</span>
          <span className="block text-[12.5px] text-muted-foreground">
            Desativa o material equivalente (mesmo tipo, turmas, pasta{tipo === "TabelaDePreco" ? " e ano" : ""}). Use ao atualizar a tabela.
          </span>
        </span>
      </label>

      <Button type="submit" variant="action" disabled={criar.isPending || !titulo.trim() || (fonte === "arquivo" ? !arquivo : !url.trim())}>
        {criar.isPending ? "Enviando..." : "Salvar material"}
      </Button>
    </form>
  );
}

function Opcao({ ligada, onClick, children }: { ligada: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ligada}
      onClick={onClick}
      className={cn(
        "min-h-8 rounded-full px-3 text-[13px] font-medium transition-colors",
        ligada ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Campo({ id, rotulo, dica, children }: { id: string; rotulo: string; dica?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <Label htmlFor={id} className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
        {rotulo}
      </Label>
      {children}
      {dica && <p className="text-[12px] text-muted-foreground">{dica}</p>}
    </div>
  );
}
