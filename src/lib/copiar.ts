import { toast } from "sonner";

/** Copia o texto para a área de transferência e avisa; se o navegador negar, diz o que fazer. */
export async function copiarTexto(texto: string, oQue: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(`${oQue} copiado.`);
  } catch {
    toast.error("Não consegui copiar. Selecione o texto e copie manualmente.");
  }
}
