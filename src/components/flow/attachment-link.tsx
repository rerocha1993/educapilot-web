"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
import { getToken } from "@/lib/auth/session";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7141";

const TIPOS_SEGUROS = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Abre um anexo de resposta de formulário.
 *
 * Não é um <a href> simples por dois motivos. O caminho gravado é relativo à API, não ao site —
 * um href relativo apontaria para o próprio frontend e daria 404. E o download agora exige o
 * token JWT, que só vai num header: navegação de link não manda header nenhum.
 *
 * Por isso: busca com o token, transforma em blob e abre. O custo é o arquivo passar pela
 * memória do navegador; em troca, o documento deixa de ficar acessível a quem tiver a URL.
 */
export function AttachmentLink({ url }: { url: string }) {
  const [abrindo, setAbrindo] = useState(false);

  async function abrir() {
    setAbrindo(true);
    try {
      // Segurança (2026-10, auditoria): o valor vem da resposta da família. Só busca caminho de anexo da própria
      // API; antes, um valor como ".host-do-atacante/x" virava outro domínio e levava o token junto.
      const api = new URL(baseUrl);
      const destino = new URL(url, api);
      if (destino.origin !== api.origin || !destino.pathname.startsWith("/api/FormUploads/arquivo/")) {
        throw new Error("Anexo inválido.");
      }

      const token = getToken();
      const resposta = await fetch(destino, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!resposta.ok) {
        // 404 aqui costuma ser anexo enviado antes desta correção: aqueles arquivos ficavam em
        // wwwroot e foram apagados na primeira publicação seguinte.
        throw new Error(
          resposta.status === 404
            ? "Arquivo não encontrado. Peça o documento novamente à família."
            : "Não foi possível abrir o anexo."
        );
      }

      // Tipo de lista fechada: HTML ou SVG aberto como blob rodaria na origem do site.
      const recebido = await resposta.blob();
      const tipo = TIPOS_SEGUROS.includes(recebido.type) ? recebido.type : "application/octet-stream";
      const blob = new Blob([recebido], { type: tipo });
      const objeto = URL.createObjectURL(blob);
      window.open(objeto, "_blank", "noopener");

      // Revoga depois de a aba abrir: revogar na hora deixaria a nova aba sem conteúdo.
      setTimeout(() => URL.revokeObjectURL(objeto), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o anexo.");
    } finally {
      setAbrindo(false);
    }
  }

  return (
    <button
      type="button"
      onClick={abrir}
      disabled={abrindo}
      className="-my-2 inline-flex items-center gap-1 py-2 text-primary underline disabled:opacity-60 md:my-0 md:py-0"
    >
      <Paperclip className="size-3" />
      {abrindo ? "Abrindo..." : "Ver anexo"}
    </button>
  );
}
