import { useMutation } from "@tanstack/react-query";
import { getToken } from "@/lib/auth/session";

// StudentController.ImportStudents / ClassController.ImportClasses são
// [ApiExplorerSettings(IgnoreApi = true)] — não aparecem no Swagger, então não tem
// como o openapi-fetch tipar essas chamadas. Fetch cru com FormData mesmo.
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

export type ImportTipo = "alunos" | "turmas";

export interface ImportResult {
  message: string;
}

export function useBulkImport() {
  return useMutation({
    mutationFn: async ({ tipo, file }: { tipo: ImportTipo; file: File }) => {
      const route = tipo === "alunos" ? "/api/Student/import" : "/api/Class/import";
      const formData = new FormData();
      formData.append("file", file);

      const token = getToken();
      const res = await fetch(`${baseUrl}${route}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { Message: text };
      }

      const obj = parsed as { message?: string; Message?: string };
      const message = obj?.message ?? obj?.Message;

      if (!res.ok) {
        throw new Error(message ?? "Não foi possível importar o arquivo.");
      }

      return { message: message ?? "Importação concluída." };
    },
  });
}
