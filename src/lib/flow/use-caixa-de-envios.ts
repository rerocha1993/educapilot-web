import { useQuery } from "@tanstack/react-query";
import { clearSession, getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

/** Um formulário da escola na tela de entrada da Caixa de envios. */
export interface FormularioDaCaixa {
  formId: string;
  nome: string;
  tipo: string | null;
  statusDoFormulario: string;
  temContrato: boolean;
  /** Passa pelo degrau "Pendente" antes de "Concluída". Falso: envio novo já nasce Concluído. */
  temEtapaDeAprovacao: boolean;
  totalEnvios: number;
  pendentes: number;
  paraRevisar: number;
  concluidos: number;
  ultimoEnvioEm: string | null;
}

export interface CaixaDeEnvios {
  formularios: FormularioDaCaixa[];
}

/**
 * Formulários da escola com a contagem de envios — GET /api/Flow/respostas/formularios.
 * Tipado à mão como os demais hooks; depois do deploy dá para regenerar os tipos do Swagger.
 */
export function useCaixaDeEnvios() {
  return useQuery({
    queryKey: ["flow", "caixa-de-envios"],
    queryFn: async (): Promise<CaixaDeEnvios> => {
      const token = getToken();
      const res = await fetch(`${baseUrl}/api/Flow/respostas/formularios`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401 && typeof window !== "undefined") {
        clearSession();
        if (!window.location.pathname.startsWith("/login")) {
          window.location.replace("/login?expirada=1");
        }
      }
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(
          (corpo as { message?: string } | null)?.message ?? "Não foi possível carregar os formulários."
        );
      }
      return (await res.json()) as CaixaDeEnvios;
    },
  });
}
