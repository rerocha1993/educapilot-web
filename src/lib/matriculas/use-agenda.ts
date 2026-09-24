import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matriculasFetch, matriculasJson } from "./api";
import type { AgendaDeVisitas, Material, SalvarAgendaDeVisitas } from "./tipos";

const AGENDA = ["matriculas", "agenda"] as const;
const MATERIAIS = ["matriculas", "materiais"] as const;

export function useAgendaDeVisitas() {
  return useQuery({
    queryKey: AGENDA,
    queryFn: () => matriculasJson<AgendaDeVisitas>("/agenda", {}, "Não foi possível carregar a agenda."),
  });
}

export function useSalvarAgenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SalvarAgendaDeVisitas) =>
      matriculasJson<AgendaDeVisitas>("/agenda", { method: "PUT", body: JSON.stringify(dto) }, "Não foi possível salvar a agenda."),
    onSuccess: (dados) => {
      qc.setQueryData(AGENDA, dados);
      qc.invalidateQueries({ queryKey: ["matriculas", "assistente"] });
    },
  });
}

export function useMateriais() {
  return useQuery({
    queryKey: MATERIAIS,
    queryFn: () => matriculasJson<Material[]>("/materiais", {}, "Não foi possível carregar os materiais."),
  });
}

function useInvalidarMateriais() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: MATERIAIS });
}

/** Material novo: os campos vão num FormData, com o arquivo (ou o link do YouTube). */
export function useCriarMaterial() {
  const invalidar = useInvalidarMateriais();
  return useMutation({
    mutationFn: (dados: FormData) =>
      matriculasJson<{ material: Material; substituidos: number; aviso?: string | null }>(
        "/materiais",
        { method: "POST", body: dados },
        "Não foi possível salvar o material."
      ),
    onSuccess: invalidar,
  });
}

export function useAlternarMaterial() {
  const invalidar = useInvalidarMateriais();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      matriculasJson<Material>(`/materiais/${id}`, { method: "PATCH", body: JSON.stringify({ ativo }) }, "Não foi possível mudar o material."),
    onSuccess: invalidar,
  });
}

export function useExcluirMaterial() {
  const invalidar = useInvalidarMateriais();
  return useMutation({
    mutationFn: (id: string) => matriculasJson<void>(`/materiais/${id}`, { method: "DELETE" }, "Não foi possível excluir o material."),
    onSuccess: invalidar,
  });
}

/** Abre o arquivo numa aba: a rota exige login, então vem por fetch com o token e vira endereço local. */
export async function abrirArquivoDoMaterial(id: string) {
  const res = await matriculasFetch(`/materiais/${id}/arquivo`);
  if (!res.ok) throw new Error("O arquivo não está disponível.");
  const url = URL.createObjectURL(await res.blob());
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
