"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAgendaEduSettings,
  useImportAgendaEdu,
  useSaveAgendaEduSettings,
  useTestAgendaEduConnection,
  type AgendaEduImportResult,
} from "@/lib/integrations/use-agenda-edu";
import { formatarDataHora } from "@/lib/format/date";

/**
 * Configuração e importação do Agenda Edu.
 *
 * As credenciais são de cada escola (o Agenda Edu emite client_id/secret por instituição),
 * por isso ficam nesta tela e não numa configuração global da plataforma.
 */
export function AgendaEduCard() {
  const { data: settings, isLoading, isError, error } = useAgendaEduSettings();
  const saveSettings = useSaveAgendaEduSettings();
  const testConnection = useTestAgendaEduConnection();
  const importar = useImportAgendaEdu();

  const [baseUrl, setBaseUrl] = useState("https://api.agendaedu.com");
  const [clientId, setClientId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [schoolToken, setSchoolToken] = useState("");
  const [resultado, setResultado] = useState<AgendaEduImportResult | null>(null);

  useEffect(() => {
    if (!settings) return;
    setBaseUrl(settings.baseUrl || "https://api.agendaedu.com");
    setClientId(settings.clientId || "");
  }, [settings]);

  const configurado = settings?.configurado ?? false;

  async function handleSalvar() {
    try {
      await saveSettings.mutateAsync({ baseUrl, clientId, secretKey, schoolToken });
      // Limpa os campos de segredo depois de salvar: mantê-los preenchidos na tela deixaria
      // a credencial visível para quem passasse pelo computador.
      setSecretKey("");
      setSchoolToken("");
      toast.success("Configuração salva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    }
  }

  async function handleTestar() {
    try {
      const { sucesso } = await testConnection.mutateAsync();
      if (sucesso) toast.success("Conexão com o Agenda Edu funcionando.");
      else toast.error("Não foi possível conectar. Confira o Client ID, a Secret Key e o School Token.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao testar conexão.");
    }
  }

  async function handleImportar() {
    setResultado(null);
    try {
      const r = await importar.mutateAsync();
      setResultado(r);
      if (r.sucesso) toast.success("Importação concluída.");
      else toast.error(r.erro ?? "A importação falhou.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao importar.");
    }
  }

  if (isLoading) {
    return <Skeleton className="h-56 w-full rounded-lg" />;
  }

  // Sem isto, uma falha ao carregar a configuração deixava o card com os campos em branco e
  // os botões desabilitados — indistinguível de "ainda não configurado".
  if (isError) {
    return (
      <div className="rounded-xl border border-destructive-border bg-destructive-soft p-4 text-sm break-words text-destructive-soft-foreground">
        {error instanceof Error ? error.message : "Não foi possível carregar a configuração do Agenda Edu."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="font-heading text-[15.5px] font-semibold">Agenda Edu</h2>
        <p className="mt-1 text-[13.5px] leading-[1.55] text-pretty text-muted-foreground">
          Traz turmas, alunos e responsáveis direto do Agenda Edu. O Agenda Edu é a fonte da
          verdade: quem já foi importado antes é atualizado, não duplicado.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-[5px]">
          <label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">URL da API</label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        </div>
        <div className="flex flex-col gap-[5px]">
          <label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">Client ID</label>
          <Input value={clientId} onChange={(e) => setClientId(e.target.value)} />
        </div>
        <div className="flex flex-col gap-[5px]">
          <label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
            Secret Key {configurado && <span className="text-success-soft-foreground">(já configurada)</span>}
          </label>
          <Input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder={configurado ? "Deixe em branco para manter" : ""}
          />
        </div>
        <div className="flex flex-col gap-[5px]">
          <label className="text-[10.5px] font-bold uppercase tracking-[.14em] text-muted-foreground">
            School Token {configurado && <span className="text-success-soft-foreground">(já configurado)</span>}
          </label>
          <Input
            type="password"
            value={schoolToken}
            onChange={(e) => setSchoolToken(e.target.value)}
            placeholder={configurado ? "Deixe em branco para manter" : ""}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSalvar} disabled={saveSettings.isPending} className="w-full md:w-auto">
          {saveSettings.isPending ? "Salvando..." : "Salvar credenciais"}
        </Button>
        <Button
          variant="outline"
          onClick={handleTestar}
          disabled={!configurado || testConnection.isPending}
          className="w-full md:w-auto"
        >
          {testConnection.isPending ? "Testando..." : "Testar conexão"}
        </Button>
        <Button
          variant="outline"
          onClick={handleImportar}
          disabled={!configurado || importar.isPending}
          className="w-full md:w-auto"
        >
          {importar.isPending ? "Importando..." : "Importar turmas, alunos e responsáveis"}
        </Button>
      </div>

      {settings?.ultimaImportacaoEm && (
        <p className="text-xs text-muted-foreground">
          Última importação:{" "}
          <span className="font-mono tabular-nums">{formatarDataHora(settings.ultimaImportacaoEm)}</span>
        </p>
      )}

      {resultado && <ResultadoImportacao resultado={resultado} />}
    </div>
  );
}

function ResultadoImportacao({ resultado }: { resultado: AgendaEduImportResult }) {
  if (!resultado.sucesso) {
    return (
      <div className="rounded-lg border border-destructive-border bg-destructive-soft px-3 py-2 text-sm break-words text-destructive-soft-foreground">
        {resultado.erro ?? "A importação falhou."}
      </div>
    );
  }

  const linhas = [
    ["Turmas", resultado.turmasCriadas, resultado.turmasAtualizadas],
    ["Alunos", resultado.alunosCriados, resultado.alunosAtualizados],
    ["Responsáveis", resultado.responsaveisCriados, resultado.responsaveisAtualizados],
  ] as const;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-success-border bg-success-soft px-3 py-2 text-sm text-success-soft-foreground">
      <div className="grid gap-1">
        {linhas.map(([rotulo, criados, atualizados]) => (
          <div key={rotulo}>
            <strong>{rotulo}:</strong> <span className="font-mono tabular-nums">{criados}</span> criados,{" "}
            <span className="font-mono tabular-nums">{atualizados}</span> atualizados
          </div>
        ))}
        <div>
          <strong>Vínculos aluno/responsável:</strong>{" "}
          <span className="font-mono tabular-nums">{resultado.vinculosCriados}</span> criados
        </div>
      </div>

      {resultado.ignorados.length > 0 && (
        <details className="text-xs">
          {/* Registros pulados ficam visíveis de propósito: sem isso a conta não fecha
              ("o Agenda Edu tem 116 alunos e só entraram 113") e ninguém descobre o porquê. */}
          <summary className="cursor-pointer">
            <span className="font-mono tabular-nums">{resultado.ignorados.length}</span> registro(s) não
            importado(s) — ver motivos
          </summary>
          <ul className="mt-1 list-disc pl-4 break-words">
            {resultado.ignorados.map((motivo, i) => (
              <li key={i}>{motivo}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
