"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { Camera, CircleCheck, Fingerprint, LoaderCircle, MapPin, QrCode, RefreshCw, Smartphone } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ErroDeLocalizacao,
  cameraNaPagina,
  distanciaEmMetros,
  fotoDoVideo,
  formatarDistancia,
  lerComoDataUrl,
  lerPosicao,
  mensagemDaBiometria,
  mensagemDaCamera,
  nomeSugeridoDoAparelho,
  permissaoDeLocalizacao,
  prepararFoto,
  suportaBiometria,
  type PosicaoDoAparelho,
} from "@/lib/rh/ponto-do-aparelho";
import {
  ErroDoPonto,
  ROTULO_DO_TIPO,
  assinarDesafio,
  baterPonto,
  gravarAparelhoLocal,
  pedirDesafio,
  useCadastrarAparelho,
  type AparelhoDoFuncionario,
  type ComprovanteDoPonto,
  type MeuPonto,
  type TipoDeBatida,
} from "@/lib/rh/use-meu-ponto";

import { cn } from "@/lib/utils";

import { LeitorDeQr } from "./leitor-de-qr";
import { Aviso, BotaoGrande } from "./pecas";
import { Folha } from "./folha";

type Passo = "aparelho" | "localizacao" | "foto" | "qr" | "confirmar";

interface FotoTirada {
  arquivo: File;
  /** "data:" para mostrar a prévia. */
  previa: string;
}

/**
 * A batida do ponto, passo a passo, dentro de uma folha:
 *
 *   1. aparelho     — só se este celular ainda não foi cadastrado (WebAuthn: criar a chave);
 *   2. localização  — explica, pede o GPS (15 s) e segue sem ele se a pessoa não quiser;
 *   3. foto         — só se a escola exige: selfie pela câmera da página ou pela do celular;
 *   4. qr           — só se a pessoa escolheu "Ler o QR da recepção": no lugar do GPS, a câmera traseira
 *                     lê o código da tela da recepção (que vence em segundos, por isso este passo vem
 *                     logo antes de confirmar);
 *   5. confirmar    — resumo, aviso do que vai ficar pendente, justificativa e a biometria.
 *
 * Nada trava a pessoa: localização e foto têm saída ("continuar sem"), que só deixa a batida
 * pendente para a gestão. O desafio da biometria é pedido ao entrar no passo 4, e não ao tocar no
 * botão: o Safari só abre a biometria logo depois do toque, e uma ida ao servidor no meio gastaria
 * esse toque.
 */
export function FluxoDaBatida({
  tipo,
  dados,
  aparelhoDeste,
  onFechar,
  onConcluir,
  onAtualizar,
}: {
  tipo: TipoDeBatida;
  dados: MeuPonto;
  aparelhoDeste: AparelhoDoFuncionario | null;
  onFechar: () => void;
  onConcluir: (comprovante: ComprovanteDoPonto) => void;
  /** Pede à tela para reler o dia (a batida pode ter mudado de situação por outro caminho). */
  onAtualizar: () => void;
}) {
  const { configuracao, escola } = dados;
  const [passo, setPasso] = useState<Passo>(aparelhoDeste ? "localizacao" : "aparelho");
  const [enviando, setEnviando] = useState(false);

  // Celular recém-cadastrado que a escola ainda precisa aprovar (o dado do servidor só chega depois).
  const [aparelhoEmAprovacao, setAparelhoEmAprovacao] = useState(false);
  const aparelhoPendente = aparelhoEmAprovacao || (!!aparelhoDeste && !aparelhoDeste.aprovado);

  // Localização
  const [permissao, setPermissao] = useState<"granted" | "denied" | "prompt" | "desconhecida">("desconhecida");
  const [buscando, setBuscando] = useState(false);
  const [erroDeLocalizacao, setErroDeLocalizacao] = useState<string | null>(null);
  const [posicao, setPosicao] = useState<PosicaoDoAparelho | null>(null);

  // Foto e confirmação
  const [foto, setFoto] = useState<FotoTirada | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [semSaida, setSemSaida] = useState(false);

  // QR da recepção: prova de presença no lugar do GPS. `usaQr` é a escolha da pessoa; `codigoQr` é
  // o texto lido (vence em segundos, então é jogado fora quando o servidor o recusa).
  const [usaQr, setUsaQr] = useState(false);
  const [codigoQr, setCodigoQr] = useState<string | null>(null);
  const [voltarDoQr, setVoltarDoQr] = useState<"localizacao" | "confirmar">("localizacao");
  const desafio = useRef<Promise<PublicKeyCredentialRequestOptionsJSON> | null>(null);

  useEffect(() => {
    let vivo = true;
    void permissaoDeLocalizacao().then((p) => vivo && setPermissao(p));
    return () => {
      vivo = false;
    };
  }, []);

  // ---------------------------------------------------------------- contas da tela

  const temLocal = escola?.latitude != null && escola?.longitude != null;
  const distancia =
    posicao && temLocal
      ? distanciaEmMetros(posicao, { latitude: escola.latitude as number, longitude: escola.longitude as number })
      : null;
  const foraDaCerca = configuracao.cercaAtiva && distancia !== null && distancia > configuracao.raioMetros;
  // Com o QR da recepção lido, o servidor dá a batida como no local: a cerca não bloqueia nem pende.
  const bloqueadaPelaCerca = foraDaCerca && configuracao.foraDaCercaBloqueia && !codigoQr;
  const imprecisa = posicao !== null && posicao.precisao > configuracao.precisaoMaximaMetros;

  // O que fará esta batida ficar pendente. É só um aviso: quem decide é o servidor.
  const avisos: string[] = [];
  if (aparelhoPendente) avisos.push("Seu celular ainda não foi aprovado pela escola.");
  if (!codigoQr) {
    if (!posicao) avisos.push("Sem localização: a escola não vai saber onde você estava.");
    else if (foraDaCerca && distancia !== null) avisos.push(`Você está a ${formatarDistancia(distancia)} da escola.`);
    else if (imprecisa) avisos.push(`A localização está imprecisa (erro de ${formatarDistancia(posicao.precisao)}).`);
  }
  if (configuracao.exigirFoto && !foto) avisos.push("Sem foto.");

  // ---------------------------------------------------------------- transições

  function prepararConfirmacao() {
    // Escolheu o QR e ainda não leu: a leitura é o último passo antes da biometria, para o código
    // (que vence em segundos) chegar ao servidor ainda válido.
    if (usaQr && !codigoQr) {
      setPasso("qr");
      return;
    }
    irParaConfirmar();
  }

  function irParaConfirmar() {
    // Pede o desafio já, para a biometria abrir no mesmo instante do toque. O erro de verdade
    // aparece quando a pessoa confirma.
    novoDesafio();
    setPasso("confirmar");
  }

  /** "Ler o QR da recepção": pula o GPS e segue para a foto (se a escola pede) e para a leitura. */
  function escolherQr(de: "localizacao" | "confirmar") {
    setUsaQr(true);
    setVoltarDoQr(de);
    setErro(null);
    setPosicao(null);
    setPasso(configuracao.exigirFoto && !foto ? "foto" : "qr");
  }

  function aoLerQr(texto: string) {
    setCodigoQr(texto);
    setErro(null);
    irParaConfirmar();
  }

  function desistirDoQr() {
    setUsaQr(false);
    setCodigoQr(null);
    setErro(null);
    if (voltarDoQr === "confirmar") irParaConfirmar();
    else setPasso("localizacao");
  }

  function depoisDaLocalizacao(fotoAtual: FotoTirada | null) {
    if (configuracao.exigirFoto && !fotoAtual) setPasso("foto");
    else prepararConfirmacao();
  }

  async function buscarLocalizacao() {
    setBuscando(true);
    setErroDeLocalizacao(null);
    try {
      const p = await lerPosicao();
      setPosicao(p);
      if (p.precisao <= configuracao.precisaoMaximaMetros) depoisDaLocalizacao(foto);
    } catch (e) {
      if (e instanceof ErroDeLocalizacao) {
        setErroDeLocalizacao(e.message);
        if (e.motivo === "negada") setPermissao("denied");
      } else {
        setErroDeLocalizacao("Não foi possível descobrir sua localização.");
      }
    } finally {
      setBuscando(false);
    }
  }

  function seguirSemLocalizacao() {
    setPosicao(null);
    setErroDeLocalizacao(null);
    depoisDaLocalizacao(foto);
  }

  /** Deixa um desafio novo pronto, para a próxima tentativa abrir a biometria sem esperar. */
  function novoDesafio() {
    const p = pedirDesafio();
    p.catch(() => undefined);
    desafio.current = p;
  }

  async function confirmar() {
    setErro(null);

    // Sem rede não adianta gastar a biometria: o registro não chegaria ao servidor.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setErro("Sem conexão com a internet. Conecte-se e toque em tentar de novo.");
      return;
    }

    setEnviando(true);

    try {
      // 1. o desafio (quase sempre já pronto) e a biometria: nada de espera longa antes dela
      let opcoes: PublicKeyCredentialRequestOptionsJSON;
      try {
        opcoes = await (desafio.current ?? pedirDesafio());
      } catch (e) {
        if (e instanceof ErroDoPonto && e.status === 404) {
          // O servidor não conhece mais este celular (foi removido): cadastrar de novo.
          gravarAparelhoLocal(null);
          setPasso("aparelho");
          return;
        }
        throw e;
      }

      let resposta;
      try {
        resposta = await assinarDesafio(opcoes);
      } catch (e) {
        setErro(mensagemDaBiometria(e));
        novoDesafio();
        return;
      }

      // 2. o registro
      const comprovante = await baterPonto({
        tipo,
        posicao,
        codigoQr,
        justificativa: (codigoQr ? aparelhoPendente : foraDaCerca || !posicao || imprecisa || aparelhoPendente)
          ? justificativa
          : "",
        resposta,
        foto: foto?.arquivo ?? null,
      });
      onConcluir(comprovante);
    } catch (e) {
      // O servidor recusou o código (venceu, é inválido ou esta pessoa já usou): joga fora e pede
      // outra leitura, com a frase dele. 409 também é "fora de sequência", então só vale como QR
      // quando a frase fala do código.
      if (codigoQr && e instanceof ErroDoPonto && ehErroDoQr(e)) {
        setCodigoQr(null);
        setErro(e.message);
        novoDesafio();
        return;
      }

      if (e instanceof ErroDoPonto && e.status === 409) {
        // Sequência ou intervalo: a tela do dia estava velha. Só resta fechar e reler.
        setSemSaida(true);
        onAtualizar();
        setErro(e.message);
        return;
      }

      novoDesafio();
      if (e instanceof ErroDoPonto && e.status === 422) {
        setErro(
          e.distanciaMetros != null
            ? `Você está a ${formatarDistancia(e.distanciaMetros)} da escola, e a escola não aceita ponto fora do local. Chegue mais perto e tente de novo.`
            : e.message
        );
      } else if (e instanceof ErroDoPonto) {
        setErro(e.message);
      } else {
        setErro("Não foi possível registrar o ponto. Confira sua internet e tente de novo.");
      }
    } finally {
      setEnviando(false);
    }
  }

  // ---------------------------------------------------------------- tela

  return (
    <Folha
      titulo={ROTULO_DO_TIPO[tipo]}
      descricao={
        passo === "aparelho"
          ? "Primeiro, vamos cadastrar este celular."
          : passo === "localizacao"
            ? "Passo 1: onde você está"
            : passo === "foto"
              ? "Passo 2: uma selfie rápida"
              : passo === "qr"
                ? "Ler o QR da recepção"
                : "Confira e confirme"
      }
      onFechar={onFechar}
      bloqueada={enviando}
    >
      {enviando ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center" role="status">
          <LoaderCircle className="size-10 animate-spin text-primary" aria-hidden />
          <p className="text-base font-medium">Registrando seu ponto...</p>
          <p className="text-sm text-muted-foreground">Não feche esta tela.</p>
        </div>
      ) : (
        <>
          {passo === "aparelho" && (
            <PassoAparelho
              onPronto={(aprovado) => {
                setAparelhoEmAprovacao(!aprovado);
                setPasso("localizacao");
              }}
            />
          )}

          {passo === "localizacao" && (
            <PassoLocalizacao
              permissao={permissao}
              buscando={buscando}
              erro={erroDeLocalizacao}
              imprecisa={imprecisa}
              precisao={posicao?.precisao ?? null}
              onPermitir={buscarLocalizacao}
              onSemLocalizacao={seguirSemLocalizacao}
              onContinuarAssim={() => depoisDaLocalizacao(foto)}
              onLerQr={() => escolherQr("localizacao")}
            />
          )}

          {passo === "foto" && (
            <PassoFoto
              foto={foto}
              onFoto={setFoto}
              onContinuar={prepararConfirmacao}
              onSemFoto={prepararConfirmacao}
            />
          )}

          {passo === "qr" && <LeitorDeQr onLido={aoLerQr} onVoltar={desistirDoQr} />}

          {passo === "confirmar" && (
            <PassoConfirmar
              tipo={tipo}
              posicao={posicao}
              distancia={distancia}
              foraDaCerca={foraDaCerca}
              bloqueada={bloqueadaPelaCerca}
              raioMetros={configuracao.raioMetros}
              imprecisa={imprecisa}
              foto={foto}
              usaQr={usaQr}
              codigoQr={codigoQr}
              onLerQr={() => escolherQr("confirmar")}
              onLerQrDeNovo={() => {
                setVoltarDoQr("confirmar");
                setErro(null);
                setPasso("qr");
              }}
              onSemQr={() => {
                setUsaQr(false);
                setCodigoQr(null);
                setErro(null);
              }}
              avisos={avisos}
              justificativa={justificativa}
              onJustificativa={setJustificativa}
              erro={erro}
              semSaida={semSaida}
              onConfirmar={confirmar}
              onAtualizarLocal={() => {
                setErro(null);
                setPasso("localizacao");
              }}
              onFechar={onFechar}
            />
          )}
        </>
      )}
    </Folha>
  );
}

function ehErroDoQr(e: ErroDoPonto): boolean {
  if (e.status === 422) return e.distanciaMetros == null;
  if (e.status === 409) return /c[óo]digo|qr/i.test(e.message);
  return false;
}

// ------------------------------------------------------------------ passo 0: cadastrar o celular

export function PassoAparelho({ onPronto }: { onPronto: (aprovado: boolean) => void }) {
  const cadastrar = useCadastrarAparelho();
  const [nome, setNome] = useState(() => nomeSugeridoDoAparelho());
  const [erro, setErro] = useState<string | null>(null);
  const [emAprovacao, setEmAprovacao] = useState(false);
  const biometria = suportaBiometria();

  async function cadastrarAgora() {
    setErro(null);
    try {
      const aparelho = await cadastrar.mutateAsync(nome.trim() || "Meu celular");
      if (aparelho.aprovado) onPronto(true);
      else setEmAprovacao(true);
    } catch (e) {
      setErro(mensagemDoCadastro(e));
    }
  }

  if (emAprovacao) {
    return (
      <div className="flex flex-col gap-4">
        <Aviso tom="atencao">
          <p className="font-semibold">Seu celular foi enviado para aprovação da escola.</p>
          <p className="mt-1">
            Você já pode bater o ponto agora. Até a escola aprovar, ele fica aguardando aprovação.
          </p>
        </Aviso>
        <BotaoGrande variant="action" onClick={() => onPronto(false)}>
          Continuar
        </BotaoGrande>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-primary">
          <Smartphone className="size-6" aria-hidden />
        </span>
        <p className="text-[15px] leading-[1.55]">
          Só o seu celular pode bater o seu ponto: assim ninguém registra por você. Vamos cadastrar este aparelho
          uma vez; depois, ele vai pedir sua digital, seu rosto ou o bloqueio de tela.
        </p>
      </div>

      {!biometria && (
        <Aviso tom="erro">
          Este navegador não consegue usar a biometria do celular. Abra o sistema pelo endereço oficial da escola
          (começa com https) no Chrome ou no Safari atualizado.
        </Aviso>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="nome-do-aparelho">Nome deste celular</Label>
        <Input
          id="nome-do-aparelho"
          value={nome}
          maxLength={60}
          onChange={(e) => setNome(e.target.value)}
          className="h-12 text-base max-md:h-12"
        />
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <BotaoGrande variant="action" disabled={!biometria || cadastrar.isPending} onClick={cadastrarAgora}>
        {cadastrar.isPending ? (
          <>
            <LoaderCircle className="size-5 animate-spin" aria-hidden />
            Cadastrando...
          </>
        ) : (
          <>
            <Fingerprint className="size-5" aria-hidden />
            Cadastrar este celular
          </>
        )}
      </BotaoGrande>
    </div>
  );
}

/**
 * Erros do WebAuthn (biblioteca ou navegador) têm `code` ou um `name` conhecido e viram a frase da
 * biometria; os do servidor chegam como Error comum, já com a mensagem dele.
 */
function mensagemDoCadastro(e: unknown): string {
  if (e instanceof TypeError) return "Sem conexão com a internet. Conecte-se e tente de novo.";
  const nome = e instanceof Error ? ((e as { code?: string }).code ?? e.name) : "";
  const doNavegador = ["NotAllowedError", "InvalidStateError", "SecurityError", "NotSupportedError", "AbortError"];
  if (nome.startsWith("ERROR_") || doNavegador.includes(nome)) return mensagemDaBiometria(e);
  return e instanceof Error && e.message ? e.message : "Não foi possível cadastrar o celular.";
}

// ------------------------------------------------------------------ passo 1: localização

function PassoLocalizacao({
  permissao,
  buscando,
  erro,
  imprecisa,
  precisao,
  onPermitir,
  onSemLocalizacao,
  onContinuarAssim,
  onLerQr,
}: {
  permissao: "granted" | "denied" | "prompt" | "desconhecida";
  buscando: boolean;
  erro: string | null;
  imprecisa: boolean;
  precisao: number | null;
  onPermitir: () => void;
  onSemLocalizacao: () => void;
  onContinuarAssim: () => void;
  onLerQr: () => void;
}) {
  const negada = permissao === "denied";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-primary">
          <MapPin className="size-6" aria-hidden />
        </span>
        <p className="text-[15px] leading-[1.55]">
          Vamos conferir se você está na escola. Usamos sua localização só neste momento, para registrar o ponto —
          não acompanhamos você depois.
        </p>
      </div>

      {negada && (
        <Aviso tom="atencao">
          A localização está bloqueada neste celular. Você pode continuar sem ela, mas o ponto ficará aguardando
          aprovação da escola. Para liberar, toque no cadeado ao lado do endereço do site.
        </Aviso>
      )}

      {erro && !negada && <Aviso tom="atencao">{erro}</Aviso>}

      {imprecisa && precisao !== null && (
        <Aviso tom="atencao">
          O GPS está com erro de {formatarDistancia(precisao)}. Vá para perto de uma janela ou de um lugar aberto e
          tente de novo — ou continue assim, e o ponto ficará aguardando aprovação.
        </Aviso>
      )}

      {buscando ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
          <LoaderCircle className="size-9 animate-spin text-primary" aria-hidden />
          <p className="text-base font-medium">Buscando sua localização...</p>
          <p className="text-sm text-muted-foreground">Pode levar até 15 segundos.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {!negada && (
            <BotaoGrande variant="action" onClick={onPermitir}>
              {erro || imprecisa ? (
                <>
                  <RefreshCw className="size-5" aria-hidden />
                  Tentar de novo
                </>
              ) : (
                <>
                  <MapPin className="size-5" aria-hidden />
                  {permissao === "granted" ? "Conferir minha localização" : "Permitir e continuar"}
                </>
              )}
            </BotaoGrande>
          )}
          <BotaoGrande variant="outline" onClick={onLerQr}>
            <QrCode className="size-5" aria-hidden />
            Ler o QR da recepção
          </BotaoGrande>
          {imprecisa ? (
            <BotaoGrande variant="outline" onClick={onContinuarAssim}>
              Continuar assim mesmo
            </BotaoGrande>
          ) : (
            <BotaoGrande variant={negada ? "action" : "ghost"} onClick={onSemLocalizacao}>
              Continuar sem localização
            </BotaoGrande>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ passo 2: foto

function PassoFoto({
  foto,
  onFoto,
  onContinuar,
  onSemFoto,
}: {
  foto: FotoTirada | null;
  onFoto: (foto: FotoTirada | null) => void;
  onContinuar: () => void;
  onSemFoto: () => void;
}) {
  const naPagina = cameraNaPagina();
  const [estado, setEstado] = useState<"abrindo" | "ativa" | "indisponivel">(naPagina ? "abrindo" : "indisponivel");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [processando, setProcessando] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);
  const entrada = useRef<HTMLInputElement | null>(null);

  // Abre a câmera frontal ao entrar no passo (e de novo em "Tirar outra"). Sem foto tirada.
  useEffect(() => {
    if (!naPagina || foto) return;

    let vivo = true;
    let aberto: MediaStream | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((s) => {
        if (!vivo) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        aberto = s;
        setStream(s);
        setEstado("ativa");
      })
      .catch((e) => {
        if (!vivo) return;
        setMensagem(mensagemDaCamera(e));
        setEstado("indisponivel");
      });

    return () => {
      vivo = false;
      aberto?.getTracks().forEach((t) => t.stop());
    };
    // `foto` entra só para a câmera ficar parada com a foto na tela; `tentativa` reabre.
  }, [naPagina, foto, tentativa]);

  async function tirar() {
    const el = video.current;
    if (!el || processando) return;
    setProcessando(true);
    try {
      const arquivo = await fotoDoVideo(el);
      stream?.getTracks().forEach((t) => t.stop());
      setStream(null);
      onFoto({ arquivo, previa: await lerComoDataUrl(arquivo) });
    } catch {
      setMensagem("Não foi possível tirar a foto. Tente de novo.");
    } finally {
      setProcessando(false);
    }
  }

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setProcessando(true);
    try {
      const pronta = await prepararFoto(arquivo);
      onFoto({ arquivo: pronta, previa: await lerComoDataUrl(pronta) });
    } catch {
      setMensagem("Não foi possível ler a foto. Tente de novo.");
    } finally {
      setProcessando(false);
    }
  }

  function tirarOutra() {
    onFoto(null);
    setMensagem(null);
    if (naPagina) {
      setEstado("abrindo");
      setTentativa((t) => t + 1);
    } else {
      entrada.current?.click();
    }
  }

  const entradaDeArquivo = (
    <input
      ref={entrada}
      type="file"
      accept="image/*"
      capture="user"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={aoEscolherArquivo}
    />
  );

  // Foto já tirada: prévia, e a escolha de seguir ou refazer.
  if (foto) {
    return (
      <div className="flex flex-col gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- prévia local em data URL */}
        <img src={foto.previa} alt="Sua foto" className="aspect-[3/4] max-h-[50dvh] w-full rounded-2xl bg-muted object-cover" />
        <div className="flex flex-col gap-2">
          <BotaoGrande variant="action" onClick={onContinuar}>
            Usar esta foto
          </BotaoGrande>
          <BotaoGrande variant="outline" onClick={tirarOutra}>
            <RefreshCw className="size-5" aria-hidden />
            Tirar outra
          </BotaoGrande>
        </div>
        {entradaDeArquivo}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-[1.55]">
        Olhe para a câmera da frente e tire uma foto. Ela fica guardada com o seu ponto, só para a escola conferir.
      </p>

      {estado !== "indisponivel" && (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={(el) => {
              video.current = el;
              if (el && stream && el.srcObject !== stream) el.srcObject = stream;
            }}
            autoPlay
            playsInline
            muted
            className="aspect-[3/4] max-h-[50dvh] w-full -scale-x-100 object-cover"
          />
          {estado === "abrindo" && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 text-white" role="status">
              <span className="flex flex-col items-center gap-2 text-sm">
                <LoaderCircle className="size-8 animate-spin" aria-hidden />
                Abrindo a câmera...
              </span>
            </div>
          )}
        </div>
      )}

      {mensagem && <Aviso tom="atencao">{mensagem}</Aviso>}

      <div className="flex flex-col gap-2">
        {estado === "ativa" && (
          <BotaoGrande variant="action" disabled={processando} onClick={tirar}>
            <Camera className="size-5" aria-hidden />
            {processando ? "Salvando..." : "Tirar foto"}
          </BotaoGrande>
        )}
        {estado === "indisponivel" && (
          <BotaoGrande variant="action" disabled={processando} onClick={() => entrada.current?.click()}>
            <Camera className="size-5" aria-hidden />
            {processando ? "Salvando..." : "Abrir a câmera do celular"}
          </BotaoGrande>
        )}
        {estado === "ativa" && (
          <BotaoGrande variant="outline" disabled={processando} onClick={() => entrada.current?.click()}>
            Usar a câmera do celular
          </BotaoGrande>
        )}
        <BotaoGrande variant="ghost" disabled={processando} onClick={onSemFoto}>
          Continuar sem foto
        </BotaoGrande>
      </div>
      {entradaDeArquivo}
    </div>
  );
}

// ------------------------------------------------------------------ passo 3: confirmar

function PassoConfirmar({
  tipo,
  posicao,
  distancia,
  foraDaCerca,
  bloqueada,
  raioMetros,
  imprecisa,
  foto,
  usaQr,
  codigoQr,
  onLerQr,
  onLerQrDeNovo,
  onSemQr,
  avisos,
  justificativa,
  onJustificativa,
  erro,
  semSaida,
  onConfirmar,
  onAtualizarLocal,
  onFechar,
}: {
  tipo: TipoDeBatida;
  posicao: PosicaoDoAparelho | null;
  distancia: number | null;
  foraDaCerca: boolean;
  bloqueada: boolean;
  raioMetros: number;
  imprecisa: boolean;
  foto: FotoTirada | null;
  usaQr: boolean;
  codigoQr: string | null;
  onLerQr: () => void;
  onLerQrDeNovo: () => void;
  onSemQr: () => void;
  avisos: string[];
  justificativa: string;
  onJustificativa: (texto: string) => void;
  erro: string | null;
  semSaida: boolean;
  onConfirmar: () => void;
  onAtualizarLocal: () => void;
  onFechar: () => void;
}) {
  // Escolheu o QR e o código foi recusado (ou ainda não veio): sem ele não dá para confirmar.
  const faltaOQr = usaQr && !codigoQr;
  const pendente = avisos.length > 0 && !faltaOQr;
  const podeOferecerQr = !usaQr && (!posicao || foraDaCerca || imprecisa);

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-2 text-[15px]">
        {usaQr && (
          <li className="flex items-center gap-3">
            <QrCode className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            {codigoQr ? (
              <span className="flex items-center gap-1.5 font-medium text-success">
                <CircleCheck className="size-4" aria-hidden />
                Código lido ✓
              </span>
            ) : (
              <span className="text-muted-foreground">QR da recepção ainda não lido</span>
            )}
          </li>
        )}
        <li className={cn("flex items-center gap-3", usaQr && "hidden")}>
          <MapPin className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          {posicao ? (
            distancia !== null ? (
              <span>
                {foraDaCerca
                  ? `Você está a ${formatarDistancia(distancia)} da escola`
                  : `A ${formatarDistancia(distancia)} da escola`}
              </span>
            ) : (
              <span>Localização encontrada{imprecisa ? " (imprecisa)" : ""}</span>
            )
          ) : (
            <span className="text-muted-foreground">Sem localização</span>
          )}
        </li>
        <li className="flex items-center gap-3">
          <Camera className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          {foto ? (
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura local em data URL */}
              <img src={foto.previa} alt="" className="size-10 rounded-lg object-cover" />
              Foto tirada
            </span>
          ) : (
            <span className="text-muted-foreground">Sem foto</span>
          )}
        </li>
      </ul>

      {bloqueada ? (
        <Aviso tom="erro">
          <p className="font-semibold">Você está fora da escola.</p>
          <p className="mt-1">
            A escola só aceita o ponto a até {formatarDistancia(raioMetros)} do local
            {distancia !== null && ` — você está a ${formatarDistancia(distancia)}`}. Chegue mais perto e atualize sua
            localização.
          </p>
        </Aviso>
      ) : pendente ? (
        <Aviso tom="atencao">
          <p className="font-semibold">Este ponto vai ficar aguardando aprovação da escola:</p>
          <ul className="mt-1 list-disc pl-4">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Aviso>
      ) : null}

      {pendente && !bloqueada && !semSaida && (
        <div className="grid gap-1.5">
          <Label htmlFor="justificativa-do-ponto">Quer explicar? (opcional)</Label>
          <Textarea
            id="justificativa-do-ponto"
            value={justificativa}
            maxLength={300}
            rows={3}
            placeholder="Ex.: estou em passeio com a turma"
            onChange={(e) => onJustificativa(e.target.value)}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">Ajuda a escola a aprovar mais rápido.</p>
        </div>
      )}

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <div className="flex flex-col gap-2">
        {bloqueada ? (
          <BotaoGrande variant="action" onClick={onAtualizarLocal}>
            <RefreshCw className="size-5" aria-hidden />
            Atualizar minha localização
          </BotaoGrande>
        ) : semSaida ? (
          <BotaoGrande variant="default" onClick={onFechar}>
            Fechar
          </BotaoGrande>
        ) : faltaOQr ? (
          <>
            <BotaoGrande variant="action" onClick={onLerQrDeNovo}>
              <QrCode className="size-5" aria-hidden />
              {erro ? "Ler o QR de novo" : "Ler o QR da recepção"}
            </BotaoGrande>
            <BotaoGrande variant="ghost" onClick={onSemQr}>
              Registrar sem o QR
            </BotaoGrande>
          </>
        ) : (
          <>
            <BotaoGrande variant="action" onClick={onConfirmar}>
              <Fingerprint className="size-6" aria-hidden />
              {foraDaCerca ? "Registrar mesmo assim" : erro ? "Tentar de novo" : "Confirmar e registrar"}
            </BotaoGrande>
            <p className="text-center text-xs text-muted-foreground">
              O celular vai pedir sua digital, seu rosto ou o bloqueio de tela para confirmar o{" "}
              {ROTULO_DO_TIPO[tipo].toLowerCase()}.
            </p>
            {podeOferecerQr && (
              <BotaoGrande variant="outline" onClick={onLerQr}>
                <QrCode className="size-5" aria-hidden />
                Ler o QR da recepção
              </BotaoGrande>
            )}
          </>
        )}
        {bloqueada && (
          <BotaoGrande variant="ghost" onClick={onFechar}>
            Fechar
          </BotaoGrande>
        )}
      </div>
    </div>
  );
}
