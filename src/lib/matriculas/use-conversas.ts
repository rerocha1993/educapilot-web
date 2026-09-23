import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matriculasFetch, matriculasJson } from "./api";
import type {
  ConectarWhatsApp,
  ContaWhatsApp,
  Conversa,
  ConversaResumo,
  LeadResumo,
  Mensagem,
  ModeloDeMensagem,
  SalvarModelo,
  SincronizacaoDeModelos,
} from "./tipos";

const RAIZ = ["matriculas"] as const;

/**
 * As conversas, relidas a cada 15 segundos, e a aberta a cada 5. O tempo real por SignalR (o hub já
 * existe no EducaPilot) substitui isto depois; até lá, 5 segundos é o que uma família espera num chat
 * sem achar que ninguém leu.
 */
export function useConversas(busca: string) {
  return useQuery({
    queryKey: [...RAIZ, "conversas", busca],
    queryFn: () => {
      const q = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : "";
      return matriculasJson<ConversaResumo[]>(`/conversas${q}`, {}, "Não foi possível carregar as conversas.");
    },
    refetchInterval: 15_000,
    placeholderData: (anterior) => anterior,
  });
}

export function useConversa(leadId: string | null) {
  return useQuery({
    queryKey: [...RAIZ, "conversa", leadId ?? ""],
    queryFn: () => matriculasJson<Conversa>(`/conversas/${leadId}`, {}, "Não foi possível carregar a conversa."),
    enabled: !!leadId,
    refetchInterval: 5_000,
  });
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: RAIZ });
}

export function useEnviarTexto(leadId: string) {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (texto: string) =>
      matriculasJson<Mensagem>(`/conversas/${leadId}/texto`, { method: "POST", body: JSON.stringify({ texto }) }, "Não foi possível enviar."),
    onSuccess: invalidar,
  });
}

export function useEnviarModelo(leadId: string) {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (dto: { modeloId: string; textoLivre?: string | null }) =>
      matriculasJson<Mensagem>(`/conversas/${leadId}/modelo`, { method: "POST", body: JSON.stringify(dto) }, "Não foi possível enviar o modelo."),
    onSuccess: invalidar,
  });
}

export function useAssumirConversa(leadId: string) {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (acao: "assumir" | "devolver") =>
      matriculasJson<LeadResumo>(`/conversas/${leadId}/${acao}`, { method: "POST" }, "Não foi possível mudar quem atende."),
    onSuccess: invalidar,
  });
}

/**
 * O arquivo de uma mensagem como endereço local do navegador. A rota exige login, então não dá para
 * pôr o endereço da API direto num &lt;img&gt;: o navegador não manda o token.
 */
export function useArquivoDaMensagem(mensagemId: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (!mensagemId) return;
    let cancelado = false;
    let criado: string | null = null;
    matriculasFetch(`/mensagens/${mensagemId}/arquivo`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        if (cancelado) return;
        criado = URL.createObjectURL(blob);
        setUrl(criado);
      })
      .catch(() => !cancelado && setFalhou(true));
    return () => {
      cancelado = true;
      if (criado) URL.revokeObjectURL(criado);
    };
  }, [mensagemId]);

  return { url, falhou };
}

// ------------------------------------------------------------------ número e modelos

export function useContaWhatsApp() {
  return useQuery({
    queryKey: [...RAIZ, "whatsapp", "conta"],
    queryFn: () => matriculasJson<ContaWhatsApp>("/whatsapp/conta", {}, "Não foi possível carregar o WhatsApp da escola."),
  });
}

export function useConectarWhatsApp() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (dto: ConectarWhatsApp) =>
      matriculasJson<ContaWhatsApp>("/whatsapp/conta", { method: "PUT", body: JSON.stringify(dto) }, "Não foi possível conectar."),
    onSuccess: invalidar,
  });
}

export function useDesconectarWhatsApp() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: () => matriculasJson<void>("/whatsapp/conta", { method: "DELETE" }, "Não foi possível desconectar."),
    onSuccess: invalidar,
  });
}

export function useModelosDeMensagem() {
  return useQuery({
    queryKey: [...RAIZ, "whatsapp", "modelos"],
    queryFn: () => matriculasJson<ModeloDeMensagem[]>("/whatsapp/modelos", {}, "Não foi possível carregar os modelos."),
  });
}

export function useSincronizarModelos() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: () =>
      matriculasJson<SincronizacaoDeModelos>("/whatsapp/modelos/sincronizar", { method: "POST" }, "Não foi possível falar com a Meta."),
    onSuccess: invalidar,
  });
}

export function useSalvarModelo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SalvarModelo }) =>
      matriculasJson<ModeloDeMensagem>(`/whatsapp/modelos/${id}`, { method: "PUT", body: JSON.stringify(dto) }, "Não foi possível salvar o modelo."),
    onSuccess: invalidar,
  });
}

export function useEnviarModeloParaAprovacao() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) =>
      matriculasJson<ModeloDeMensagem>(`/whatsapp/modelos/${id}/enviar`, { method: "POST" }, "Não foi possível enviar para aprovação."),
    onSuccess: invalidar,
  });
}
