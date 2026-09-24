"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSession } from "@/lib/auth/session";
import type { ContaMetaAds } from "@/lib/matriculas/tipos";
import { dataHoraCurta } from "@/lib/matriculas/rotulos";
import { useConectarFacebook, useDesconectarFacebook, useEscolherNaMeta } from "@/lib/matriculas/use-anuncios";

/**
 * O cartão do "Conectar Facebook": conectar, escolher a página e a conta de anúncios, desconectar. As
 * listas de página e conta só vêm logo depois do login (é quando a Meta devolve o que a pessoa autorizou).
 */
export function ConexaoFacebook({ conta }: { conta: ContaMetaAds }) {
  const ehGestao = getSession()?.role === "Admin";
  const conectar = useConectarFacebook();
  const escolher = useEscolherNaMeta();
  const desconectar = useDesconectarFacebook();
  const [pagina, setPagina] = useState(conta.paginaId ?? "");
  const [contaDeAnuncios, setContaDeAnuncios] = useState(conta.contaDeAnunciosId ?? "");
  const escolhendo = conta.paginas.length > 0 || conta.contasDeAnuncios.length > 0;

  if (!conta.disponivel) {
    return (
      <p className="text-sm text-muted-foreground">
        A conexão com o Facebook ainda não foi ativada pelo EducaPilot. As conversões dos anúncios de WhatsApp já funcionam sem ela.
      </p>
    );
  }

  async function salvar() {
    try {
      const r = await escolher.mutateAsync({ paginaId: pagina || null, contaDeAnunciosId: contaDeAnuncios || null });
      toast.success(r.leadAdsInscrito ? "Pronto. Os formulários do Lead Ads já caem no funil." : "Salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }

  if (!conta.conectada) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Opcional. Conectando a página e a conta de anúncios, os formulários do Lead Ads viram famílias no funil e esta tela
          mostra quanto cada anúncio custou até a matrícula.
        </p>
        {ehGestao && (
          <Button variant="action" disabled={conectar.isPending} onClick={() => conectar.mutate(undefined, { onError: (e) => toast.error(e.message) })}>
            Conectar Facebook
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-1.5 text-sm">
        <Linha ok={!!conta.paginaId}>
          {conta.paginaId ? `Página: ${conta.paginaNome}` : "Escolha a página dos anúncios"}
          {conta.paginaId && (conta.leadAdsInscrito ? " · formulários do Lead Ads chegando" : " · formulários do Lead Ads não inscritos")}
        </Linha>
        <Linha ok={!!conta.contaDeAnunciosId}>
          {conta.contaDeAnunciosId ? `Conta de anúncios: ${conta.contaDeAnunciosNome}` : "Escolha a conta de anúncios para ver o gasto"}
        </Linha>
      </ul>
      {conta.ultimoErro && <p className="rounded-xl bg-destructive-soft px-3 py-2 text-[13px] text-destructive-soft-foreground">{conta.ultimoErro}</p>}

      {escolhendo && ehGestao && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-[5px]">
            <Label htmlFor="fb-pagina" className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Página</Label>
            <Select value={pagina || undefined} onValueChange={(x) => setPagina(String(x ?? ""))}>
              <SelectTrigger id="fb-pagina" className="w-full">
                <SelectValue>{() => conta.paginas.find((p) => p.id === pagina)?.nome ?? "Escolha"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {conta.paginas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-[5px]">
            <Label htmlFor="fb-conta" className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Conta de anúncios</Label>
            <Select value={contaDeAnuncios || undefined} onValueChange={(x) => setContaDeAnuncios(String(x ?? ""))}>
              <SelectTrigger id="fb-conta" className="w-full">
                <SelectValue>{() => conta.contasDeAnuncios.find((c) => c.id === contaDeAnuncios)?.nome ?? "Escolha"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {conta.contasDeAnuncios.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button variant="action" disabled={escolher.isPending || (!pagina && !contaDeAnuncios)} onClick={salvar}>
              Salvar escolha
            </Button>
          </div>
        </div>
      )}

      {ehGestao && (
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
          {conta.conectadaEm && <span>Conectado em {dataHoraCurta(conta.conectadaEm)}.</span>}
          <Button variant="ghost" size="sm" onClick={() => conectar.mutate(undefined, { onError: (e) => toast.error(e.message) })}>
            Trocar página ou conta
          </Button>
          <Button variant="ghost" size="sm" disabled={desconectar.isPending} onClick={() => desconectar.mutate()}>
            Desconectar
          </Button>
        </div>
      )}
    </div>
  );
}

function Linha({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
      <span>{children}</span>
    </li>
  );
}
