"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useMeuAcesso } from "@/lib/access/use-acessos";
import { podeVerArea } from "@/lib/access/pode-ver";
import { useVisibilidade } from "@/lib/access/use-visibilidade";
import { ADMIN_HREF, INICIO_HREF, NAV_ITEMS, slugDeAcesso } from "@/lib/kernel/nav-items";
import { SECOES_DO_MODULO } from "@/lib/kernel/secoes-do-modulo";
import { buscarTelas, type TelaBuscavel } from "@/lib/kernel/busca-de-telas";
import { cn } from "@/lib/utils";

/**
 * Busca do topo: a pessoa digita o que procura ("contratos", "chamadas", "ponto") e vai direto à tela.
 *
 * O índice é o mesmo catálogo da barra lateral (SECOES_DO_MODULO), filtrado pela mesma regra do
 * menu: a escola contratou o módulo e a pessoa tem a área. Tela que levaria a "Sem acesso" nunca
 * aparece. Enquanto o acesso carrega a lista fica vazia, pelo motivo de useSecoesVisiveis: acesso
 * ausente conta como "vê tudo", e telas proibidas piscariam.
 *
 * Só telas, não registros (alunos, contratos de uma família): buscar dado pessoal pede uma rota
 * própria no servidor, com permissão e tenant, e não cabe num índice montado no navegador.
 */
export function BuscaGlobal({ variante }: { variante: "campo" | "icone" }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [ativo, setAtivo] = useState(0);
  const lista = useRef<HTMLUListElement>(null);

  const { data: meuAcesso } = useMeuAcesso();
  const { rotaVisivel, carregando } = useVisibilidade();

  const telas = useMemo<TelaBuscavel[]>(() => {
    if (carregando) return [];

    const visiveis: TelaBuscavel[] = [];
    const vistas = new Set<string>();
    const incluir = (tela: TelaBuscavel) => {
      if (vistas.has(tela.href)) return;
      vistas.add(tela.href);
      visiveis.push(tela);
    };

    const ferramentas = [
      ...NAV_ITEMS.map((n) => ({ href: n.href as string, label: n.label })),
      { href: ADMIN_HREF, label: "Administração" },
    ];

    for (const ferramenta of ferramentas) {
      const modulo = slugDeAcesso(ferramenta.href);
      for (const secao of SECOES_DO_MODULO[ferramenta.href] ?? []) {
        if (secao.emBreve) continue;
        if (!rotaVisivel(secao.href)) continue;
        if (secao.area !== undefined && modulo && !podeVerArea(meuAcesso, modulo, secao.area)) continue;
        incluir({
          href: secao.href,
          label: secao.label,
          ferramenta: ferramenta.label,
          grupo: secao.grupo,
          icon: secao.icon,
        });
      }
    }

    incluir({ href: INICIO_HREF, label: "Início", ferramenta: "Atalhos e visão do dia" });
    return visiveis;
  }, [carregando, meuAcesso, rotaVisivel]);

  const resultados = useMemo(() => buscarTelas(telas, consulta), [telas, consulta]);

  // Ctrl+K / Cmd+K abre de qualquer tela; "/" também, fora de campos de texto. O cabeçalho do computador
  // e o do celular montam uma busca cada: só a do campo escuta o teclado, senão o atalho abriria duas caixas.
  useEffect(() => {
    if (variante !== "campo") return;
    function aoTeclar(e: KeyboardEvent) {
      const atalho = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      const alvo = e.target as HTMLElement | null;
      const emCampo = alvo?.matches("input, textarea, select, [contenteditable='true']") ?? false;
      if (atalho || (e.key === "/" && !emCampo && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        e.preventDefault();
        setAberta(true);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [variante]);

  function mudarAberta(valor: boolean) {
    setAberta(valor);
    if (!valor) {
      setConsulta("");
      setAtivo(0);
    }
  }

  function abrir(tela: TelaBuscavel) {
    mudarAberta(false);
    router.push(tela.href);
  }

  function aoTeclarNoCampo(e: React.KeyboardEvent<HTMLInputElement>) {
    if (resultados.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      mover((ativo + 1) % resultados.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      mover((ativo - 1 + resultados.length) % resultados.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      abrir(resultados[Math.min(ativo, resultados.length - 1)]);
    }
  }

  function mover(indice: number) {
    setAtivo(indice);
    lista.current?.children[indice]?.scrollIntoView({ block: "nearest" });
  }

  return (
    <>
      {variante === "campo" ? (
        <button
          type="button"
          onClick={() => setAberta(true)}
          aria-label="Buscar telas"
          className="flex h-9 w-56 items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-[13px] text-muted-foreground transition-colors hover:text-foreground lg:w-72"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 truncate">Buscar telas…</span>
          <kbd className="hidden rounded border border-border px-1.5 font-numeric text-[11px] lg:inline">Ctrl K</kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setAberta(true)}
          aria-label="Buscar telas"
          className="flex size-11 items-center justify-center rounded-full text-foreground active:bg-muted"
        >
          <Search className="size-5" />
        </button>
      )}

      <Dialog open={aberta} onOpenChange={mudarAberta}>
        <DialogContent
          showCloseButton={false}
          className="top-[12vh] translate-y-0 gap-0 p-0 sm:max-w-xl"
        >
          <DialogTitle className="sr-only">Buscar telas</DialogTitle>
          <DialogDescription className="sr-only">
            Digite o nome de uma tela e use as setas e Enter, ou clique no resultado.
          </DialogDescription>

          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={consulta}
              onChange={(e) => {
                setConsulta(e.target.value);
                setAtivo(0);
              }}
              onKeyDown={aoTeclarNoCampo}
              placeholder="O que você procura? Ex.: contratos, chamada, ponto"
              aria-label="Buscar telas"
              role="combobox"
              aria-expanded={resultados.length > 0}
              aria-controls="resultados-da-busca"
              className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {consulta.trim() === "" && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Digite o nome de uma tela para ir direto a ela.
              </p>
            )}

            {consulta.trim() !== "" && resultados.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {carregando ? "Carregando…" : "Nenhuma tela encontrada entre as que você pode abrir."}
              </p>
            )}

            {resultados.length > 0 && (
              <ul id="resultados-da-busca" ref={lista} role="listbox" aria-label="Telas encontradas">
                {resultados.map((tela, i) => {
                  const Icone = tela.icon ?? Search;
                  return (
                    <li key={tela.href} role="option" aria-selected={i === ativo}>
                      <button
                        type="button"
                        onClick={() => abrir(tela)}
                        onMouseMove={() => i !== ativo && setAtivo(i)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          i === ativo ? "bg-accent" : "hover:bg-accent/60"
                        )}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                          <Icone className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{tela.label}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {tela.ferramenta}
                            {tela.grupo ? ` · ${tela.grupo}` : ""}
                          </span>
                        </span>
                        {i === ativo && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
