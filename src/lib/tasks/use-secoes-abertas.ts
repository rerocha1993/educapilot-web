import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Lembra quais seções da ficha do aluno a pessoa deixou abertas (por navegador, vale para todos os alunos).
 *
 * Fica em localStorage, sempre com try/catch: em janela anônima ou com dados bloqueados o acesso lança, e a
 * ficha tem que abrir do mesmo jeito (tudo fechado). Uma cópia em memória mantém o abrir e fechar funcionando
 * na sessão mesmo quando o armazenamento falha.
 */

const CHAVE = "educapilot:ficha:secoes-abertas";

const ouvintes = new Set<() => void>();
let memoria: string | null = null;

function ler(): string {
  if (memoria !== null) return memoria;
  try {
    return window.localStorage.getItem(CHAVE) ?? "";
  } catch {
    return "";
  }
}

function gravar(ids: string[]) {
  const texto = JSON.stringify(ids);
  memoria = texto;
  try {
    window.localStorage.setItem(CHAVE, texto);
  } catch {
    // Sem armazenamento: vale só nesta sessão.
  }
  ouvintes.forEach((f) => f());
}

function assinar(aviso: () => void) {
  ouvintes.add(aviso);
  const outraAba = (e: StorageEvent) => {
    if (e.key === CHAVE) {
      memoria = null;
      aviso();
    }
  };
  window.addEventListener("storage", outraAba);
  return () => {
    ouvintes.delete(aviso);
    window.removeEventListener("storage", outraAba);
  };
}

function interpretar(texto: string): Set<string> {
  if (!texto) return new Set();
  try {
    const lista: unknown = JSON.parse(texto);
    return new Set(Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function useSecoesAbertas() {
  // No servidor (e na primeira pintura) tudo fechado; o navegador corrige logo depois.
  const texto = useSyncExternalStore(assinar, ler, () => "");
  const abertas = useMemo(() => interpretar(texto), [texto]);

  const alternar = useCallback((id: string) => {
    const atual = interpretar(ler());
    if (atual.has(id)) atual.delete(id);
    else atual.add(id);
    gravar([...atual]);
  }, []);

  const abrirTudo = useCallback((ids: string[]) => {
    gravar([...new Set([...interpretar(ler()), ...ids])]);
  }, []);

  const fecharTudo = useCallback((ids: string[]) => {
    const atual = interpretar(ler());
    ids.forEach((id) => atual.delete(id));
    gravar([...atual]);
  }, []);

  return { abertas, alternar, abrirTudo, fecharTudo };
}
