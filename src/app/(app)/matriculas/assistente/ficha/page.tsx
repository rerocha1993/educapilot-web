"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Eye, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Bloco, CabecalhoDaAssistente, Campo, erro } from "@/components/matriculas/assistente/partes";
import { getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import type { BlocoDaFicha, FichaDaEscola, TelaDaFicha, TurmaDaFicha } from "@/lib/matriculas/tipos";
import { dataHoraCurta } from "@/lib/matriculas/rotulos";
import { useFichaDaEscola, usePreviaDaFicha, useSalvarFicha } from "@/lib/matriculas/use-assistente";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export default function FichaDaEscolaPage() {
  const { data, isLoading, isError } = useFichaDaEscola();

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoDaAssistente
        titulo="Ficha da escola"
        descricao="Tudo o que a assistente sabe da escola sai daqui. O jeito de conversar já vem pronto do EducaPilot; o que é da sua escola, você escreve."
      />
      {isError && (
        <div className="rounded-2xl border border-destructive-border bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
          Não foi possível carregar a ficha.
        </div>
      )}
      {isLoading && <Skeleton className="h-[480px] w-full max-w-4xl rounded-[24px]" />}
      {data && <Formulario key={data.ficha?.atualizadoEm ?? "nova"} tela={data} />}
    </div>
  );
}

function Formulario({ tela }: { tela: TelaDaFicha }) {
  const ehGestao = getSession()?.role === "Admin";
  const salvar = useSalvarFicha();
  const [f, setF] = useState<FichaDaEscola>(() => tela.ficha ?? tela.sugestao);
  const [vendoPrevia, setVendoPrevia] = useState(false);
  const nova = tela.ficha == null;

  const mudar = <K extends keyof FichaDaEscola>(campo: K, valor: FichaDaEscola[K]) => setF((atual) => ({ ...atual, [campo]: valor }));
  const texto = (campo: keyof FichaDaEscola) => ({
    value: (f[campo] as string | null) ?? "",
    onChange: (e: { target: { value: string } }) => mudar(campo, e.target.value as never),
    disabled: !ehGestao,
  });

  async function gravar() {
    try {
      await salvar.mutateAsync(f);
      toast.success("Ficha salva. A assistente já usa a versão nova na próxima mensagem.");
    } catch (e) {
      toast.error(erro(e, "Não foi possível salvar a ficha."));
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      {nova && (
        <p className="rounded-2xl bg-action-soft px-4 py-3 text-[13.5px]">
          Deixamos um ponto de partida com as turmas mais comuns da educação infantil. Confira as idades, apague o que a
          escola não tem e escreva os fatos que a assistente pode contar.
        </p>
      )}

      <Bloco titulo="Quem ela é" descricao="Como ela se apresenta para a família.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="f-assistente" rotulo="Nome da assistente" dica="Um nome de gente: é assim que ela assina.">
            <Input id="f-assistente" placeholder="Ellen" maxLength={60} {...texto("nomeDaAssistente")} />
          </Campo>
          <Campo id="f-escola" rotulo="Nome da escola">
            <Input id="f-escola" maxLength={200} {...texto("nomeDaEscola")} />
          </Campo>
          <Campo id="f-curto" rotulo="Como a escola é chamada na conversa" dica="Opcional. Mais curto que o nome completo.">
            <Input id="f-curto" placeholder="Aprender e Saber" maxLength={120} {...texto("nomeCurto")} />
          </Campo>
          <Campo id="f-descricao" rotulo="O que a escola é, numa frase">
            <Input id="f-descricao" placeholder="escola particular de educação infantil em Osasco" maxLength={300} {...texto("descricao")} />
          </Campo>
        </div>
      </Bloco>

      <Bloco titulo="A escola" descricao="Espaços, proposta e o que ela tem de diferente. Nada que não exista: a assistente repete exatamente isto.">
        <div className="grid gap-3">
          <Campo id="f-sobre" rotulo="Sobre a escola">
            <Textarea id="f-sobre" rows={5} maxLength={4000} {...texto("sobreAEscola")} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo id="f-prova" rotulo="Avaliações e números" dica="Ela cita uma vez, sem aumentar.">
              <Textarea id="f-prova" rows={2} maxLength={600} placeholder="Nota 4,9 no Google, com mais de 200 avaliações." {...texto("provaSocial")} />
            </Campo>
            <Campo id="f-email" rotulo="E-mail para currículo e fornecedor" dica="Para onde ela manda o que não é matrícula.">
              <Input id="f-email" type="email" maxLength={255} {...texto("emailParaAssuntosDeFora")} />
            </Campo>
          </div>
        </div>
      </Bloco>

      <Bloco titulo="A visita" descricao="O convite para conhecer a escola é o que ela mais faz.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="f-endereco" rotulo="Endereço">
            <Input id="f-endereco" maxLength={300} {...texto("endereco")} />
          </Campo>
          <Campo id="f-recebe" rotulo="Por quem perguntar ao chegar">
            <Input id="f-recebe" maxLength={120} {...texto("quemRecebeNaVisita")} />
          </Campo>
          <Campo id="f-como" rotulo="Como a visita funciona" className="sm:col-span-2">
            <Textarea id="f-como" rows={3} maxLength={1500} placeholder="Dura uns 40 minutos, a coordenadora mostra as salas e tira as dúvidas." {...texto("comoEAVisita")} />
          </Campo>
        </div>
      </Bloco>

      <Turmas f={f} mudar={mudar} ehGestao={ehGestao} turmasDoCadastro={tela.turmasDoCadastro} />

      <Blocos
        titulo="Fatos confirmados"
        descricao="Horário, alimentação, uniforme, material, integral... Cada fato é algo que a assistente pode responder sem chamar a equipe."
        vazio="Sem fatos, toda pergunta sobre a escola vai para a equipe."
        exemploTitulo="Alimentação"
        exemploTexto="Café da manhã, almoço e lanche da tarde feitos na escola, com cardápio de nutricionista."
        blocos={f.fatos}
        mudar={(b) => mudar("fatos", b)}
        ehGestao={ehGestao}
      />

      <Blocos
        titulo="Respostas da casa"
        descricao="Como a escola responde ao que as famílias costumam contar. É o jeito da sua escola de acolher."
        vazio="Opcional. Sem isto, ela acolhe do jeito padrão."
        exemploTitulo="É a primeira escola dele"
        exemploTexto="A adaptação é aos poucos, com a família junto nos primeiros dias."
        blocos={f.respostas}
        mudar={(b) => mudar("respostas", b)}
        ehGestao={ehGestao}
      />

      <NaoSabe itens={f.naoSabe} mudar={(n) => mudar("naoSabe", n)} ehGestao={ehGestao} />

      {/* barra de salvar */}
      <div className="sticky bottom-3 z-20 rounded-[20px] border border-border bg-background/80 shadow-[0_8px_30px_rgba(42,37,48,.12)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p className="text-[12.5px] text-muted-foreground">
            {tela.ficha?.atualizadoEm ? `Salva em ${dataHoraCurta(tela.ficha.atualizadoEm)}` : "Ainda não salva"}
          </p>
          <div className="flex gap-2">
            {!nova && (
              <Button variant="outline" size="sm" onClick={() => setVendoPrevia(true)}>
                <Eye className="size-4" aria-hidden /> O que ela lê
              </Button>
            )}
            {ehGestao && (
              <Button size="sm" onClick={gravar} disabled={salvar.isPending}>
                {salvar.isPending ? "Salvando..." : "Salvar ficha"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Previa aberta={vendoPrevia} fechar={() => setVendoPrevia(false)} />
    </div>
  );
}

// ------------------------------------------------------------------ turmas

function Turmas({
  f,
  mudar,
  ehGestao,
  turmasDoCadastro,
}: {
  f: FichaDaEscola;
  mudar: <K extends keyof FichaDaEscola>(campo: K, valor: FichaDaEscola[K]) => void;
  ehGestao: boolean;
  turmasDoCadastro: TelaDaFicha["turmasDoCadastro"];
}) {
  const trocar = (i: number, t: Partial<TurmaDaFicha>) => mudar("turmas", f.turmas.map((x, j) => (j === i ? { ...x, ...t } : x)));
  const nova: TurmaDaFicha = { nome: "", criterio: "corte", mesesMinimo: null, mesesMaximo: null, idadeNoCorte: null, grupo: null, comoApresentar: null, classId: null };
  const dias = Array.from({ length: new Date(2001, f.mesDoCorte, 0).getDate() }, (_, i) => i + 1);

  return (
    <Bloco
      titulo="Turmas"
      descricao="A turma sai da data de nascimento, calculada pelo sistema. A assistente nunca faz a conta de cabeça."
      acao={
        ehGestao && (
          <Button variant="outline" size="sm" onClick={() => mudar("turmas", [...f.turmas, nova])}>
            <Plus className="size-4" aria-hidden /> Turma
          </Button>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl bg-muted/60 p-3.5">
        <Campo id="f-corte-dia" rotulo="Data de corte">
          <div className="flex gap-2">
            <Select value={String(f.diaDoCorte)} onValueChange={(x) => x != null && mudar("diaDoCorte", Number(x))} disabled={!ehGestao}>
              <SelectTrigger id="f-corte-dia" className="w-20">
                <SelectValue>{() => String(f.diaDoCorte)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {dias.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(f.mesDoCorte)}
              onValueChange={(x) => {
                if (x == null) return;
                const mes = Number(x);
                mudar("mesDoCorte", mes);
                mudar("diaDoCorte", Math.min(f.diaDoCorte, new Date(2001, mes, 0).getDate()));
              }}
              disabled={!ehGestao}
            >
              <SelectTrigger aria-label="Mês do corte" className="w-36">
                <SelectValue>{() => MESES[f.mesDoCorte - 1]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Campo>
        <p className="max-w-sm pb-1 text-[12.5px] text-muted-foreground">
          A idade que a criança completa até esta data decide a turma do ano. O padrão da educação infantil é 31 de março.
        </p>
      </div>

      {f.turmas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma turma. Sem turmas, a assistente não liga.</p>}

      <ol className="grid gap-3">
        {f.turmas.map((t, i) => (
          <li key={i} className="rounded-2xl border border-border p-4">
            <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_auto]">
              <Campo id={`t-nome-${i}`} rotulo="Nome">
                <Input id={`t-nome-${i}`} value={t.nome} maxLength={80} onChange={(e) => trocar(i, { nome: e.target.value })} disabled={!ehGestao} />
              </Campo>
              <Campo id={`t-criterio-${i}`} rotulo="Entra por">
                <div role="radiogroup" aria-label="Critério da turma" className="flex rounded-lg bg-muted p-[3px]">
                  {(["corte", "idade_em_meses"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={t.criterio === c}
                      disabled={!ehGestao}
                      onClick={() => trocar(i, { criterio: c })}
                      className={cn(
                        "min-h-8 flex-1 rounded-md px-2 text-[13px] font-medium transition-colors",
                        t.criterio === c ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c === "corte" ? "Idade no corte" : "Meses de vida"}
                    </button>
                  ))}
                </div>
              </Campo>
              {ehGestao && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="self-end"
                  aria-label={`Remover a turma ${t.nome}`}
                  onClick={() => mudar("turmas", f.turmas.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {t.criterio === "corte" ? (
                <Campo id={`t-idade-${i}`} rotulo="Anos completos no corte">
                  <Input
                    id={`t-idade-${i}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={18}
                    value={t.idadeNoCorte ?? ""}
                    onChange={(e) => trocar(i, { idadeNoCorte: e.target.value === "" ? null : Number(e.target.value) })}
                    disabled={!ehGestao}
                  />
                </Campo>
              ) : (
                <Campo id={`t-min-${i}`} rotulo="De / até (meses)">
                  <div className="flex items-center gap-2">
                    <Input
                      id={`t-min-${i}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={120}
                      value={t.mesesMinimo ?? ""}
                      onChange={(e) => trocar(i, { mesesMinimo: e.target.value === "" ? null : Number(e.target.value) })}
                      disabled={!ehGestao}
                    />
                    <span className="text-muted-foreground">a</span>
                    <Input
                      aria-label="Até quantos meses"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={120}
                      value={t.mesesMaximo ?? ""}
                      onChange={(e) => trocar(i, { mesesMaximo: e.target.value === "" ? null : Number(e.target.value) })}
                      disabled={!ehGestao}
                    />
                  </div>
                </Campo>
              )}
              <Campo id={`t-grupo-${i}`} rotulo="Grupo de preço" dica="Turmas do mesmo grupo usam a mesma tabela.">
                <Input id={`t-grupo-${i}`} value={t.grupo ?? ""} maxLength={60} onChange={(e) => trocar(i, { grupo: e.target.value || null })} disabled={!ehGestao} />
              </Campo>
              <Campo id={`t-classe-${i}`} rotulo="Turma no cadastro">
                <Select
                  value={t.classId != null ? String(t.classId) : "nenhuma"}
                  onValueChange={(x) => trocar(i, { classId: x == null || x === "nenhuma" ? null : Number(x) })}
                  disabled={!ehGestao}
                >
                  <SelectTrigger id={`t-classe-${i}`} className="w-full">
                    <SelectValue>{() => turmasDoCadastro.find((c) => c.id === t.classId)?.nome ?? "Nenhuma"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Nenhuma</SelectItem>
                    {turmasDoCadastro.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
            </div>

            <Campo id={`t-apresenta-${i}`} rotulo="Como ela apresenta a turma" className="mt-3" dica="Dois ou três balões de WhatsApp. Opcional.">
              <Textarea
                id={`t-apresenta-${i}`}
                rows={2}
                maxLength={1500}
                value={t.comoApresentar ?? ""}
                onChange={(e) => trocar(i, { comoApresentar: e.target.value || null })}
                disabled={!ehGestao}
              />
            </Campo>
          </li>
        ))}
      </ol>
    </Bloco>
  );
}

// ------------------------------------------------------------------ fatos e respostas

function Blocos({
  titulo,
  descricao,
  vazio,
  exemploTitulo,
  exemploTexto,
  blocos,
  mudar,
  ehGestao,
}: {
  titulo: string;
  descricao: string;
  vazio: string;
  exemploTitulo: string;
  exemploTexto: string;
  blocos: BlocoDaFicha[];
  mudar: (b: BlocoDaFicha[]) => void;
  ehGestao: boolean;
}) {
  const trocar = (i: number, b: Partial<BlocoDaFicha>) => mudar(blocos.map((x, j) => (j === i ? { ...x, ...b } : x)));
  const prefixo = titulo.toLowerCase().replace(/\W+/g, "-");

  return (
    <Bloco
      titulo={titulo}
      descricao={descricao}
      acao={
        ehGestao && (
          <Button variant="outline" size="sm" onClick={() => mudar([...blocos, { titulo: "", texto: "" }])}>
            <Plus className="size-4" aria-hidden /> Adicionar
          </Button>
        )
      }
    >
      {blocos.length === 0 && <p className="text-sm text-muted-foreground">{vazio}</p>}
      <ol className="grid gap-3">
        {blocos.map((b, i) => (
          <li key={i} className="grid gap-2 rounded-2xl border border-border p-3.5 sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
            <Input
              aria-label="Título"
              placeholder={exemploTitulo}
              value={b.titulo}
              maxLength={120}
              onChange={(e) => trocar(i, { titulo: e.target.value })}
              disabled={!ehGestao}
              className="font-medium"
              id={`${prefixo}-${i}`}
            />
            <Textarea
              aria-label={`Texto de ${b.titulo || "este item"}`}
              placeholder={exemploTexto}
              rows={2}
              maxLength={3000}
              value={b.texto}
              onChange={(e) => trocar(i, { texto: e.target.value })}
              disabled={!ehGestao}
            />
            {ehGestao && (
              <Button variant="ghost" size="icon" aria-label={`Remover ${b.titulo || "item"}`} onClick={() => mudar(blocos.filter((_, j) => j !== i))}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </li>
        ))}
      </ol>
    </Bloco>
  );
}

function NaoSabe({ itens, mudar, ehGestao }: { itens: string[]; mudar: (n: string[]) => void; ehGestao: boolean }) {
  const [novo, setNovo] = useState("");
  function adicionar() {
    const t = novo.trim();
    if (!t || itens.some((i) => i.toLowerCase() === t.toLowerCase())) return;
    mudar([...itens, t]);
    setNovo("");
  }

  return (
    <Bloco titulo="O que ela nunca responde" descricao="Assuntos que sempre vão para a equipe, mesmo que pareçam simples.">
      <div className="flex flex-wrap gap-2">
        {itens.map((i) => (
          <Chip key={i} remover={ehGestao ? () => mudar(itens.filter((x) => x !== i)) : undefined}>
            {i}
          </Chip>
        ))}
        {itens.length === 0 && <p className="text-sm text-muted-foreground">Nada por enquanto.</p>}
      </div>
      {ehGestao && (
        <div className="mt-3 flex max-w-md gap-2">
          <Input
            aria-label="Novo assunto"
            placeholder="desconto para irmãos"
            value={novo}
            maxLength={300}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionar();
              }
            }}
          />
          <Button variant="outline" onClick={adicionar}>
            Adicionar
          </Button>
        </div>
      )}
    </Bloco>
  );
}

function Chip({ children, remover }: { children: ReactNode; remover?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pr-1.5 pl-3 text-[13px]">
      {children}
      {remover && (
        <button type="button" onClick={remover} aria-label={`Remover ${String(children)}`} className="grid size-5 place-items-center rounded-full hover:bg-foreground/10">
          <X className="size-3" aria-hidden />
        </button>
      )}
    </span>
  );
}

// ------------------------------------------------------------------ prévia

function Previa({ aberta, fechar }: { aberta: boolean; fechar: () => void }) {
  const { data, isLoading } = usePreviaDaFicha(aberta);
  return (
    <Dialog open={aberta} onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>O que a assistente lê</DialogTitle>
          <DialogDescription>
            O manual inteiro, montado com a ficha salva. A parte de como conversar é igual para todas as escolas; o que é da
            sua escola entra no meio.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-80 rounded-2xl" />
        ) : (
          <pre className="max-h-[60vh] overflow-auto rounded-2xl bg-muted/60 p-4 font-sans text-[12.5px] leading-relaxed whitespace-pre-wrap">
            {data?.texto ?? "Salve a ficha para ver."}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}
