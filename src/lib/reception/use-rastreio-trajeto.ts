"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { metrosEntre } from "./distancia";
import {
  CHAVE_PAINEL,
  encerrarTrajeto,
  enviarPosicao,
  iniciarTrajeto,
  type TrajetoDoResponsavel,
} from "./use-responsavel";

const CHAVE_DISPOSITIVO = "educapilot_dispositivo";
const INTERVALO_MS = 10_000;
// Andou isso desde o último envio? Manda antes dos 10 s — de carro, 10 s são uns 150 m.
const MUDANCA_METROS = 100;
const INTERVALO_MINIMO_MS = 3_000;

export type EstadoRastreio = "parado" | "iniciando" | "rastreando";

function dispositivoId(): string {
  try {
    let id = localStorage.getItem(CHAVE_DISPOSITIVO);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CHAVE_DISPOSITIVO, id);
    }
    return id;
  } catch {
    // localStorage bloqueado (aba privada): o trajeto funciona, só não reconhece o aparelho depois.
    return crypto.randomUUID();
  }
}

/**
 * "Estou a caminho": abre o trajeto e manda a posição do celular enquanto a página estiver aberta.
 *
 * Tudo que o GPS entrega passa por refs; estado só para o que aparece na tela. Assim os callbacks do
 * watchPosition e do timer não ficam presos a valores velhos.
 */
export function useRastreioTrajeto() {
  const queryClient = useQueryClient();
  const [trajeto, setTrajeto] = useState<TrajetoDoResponsavel | null>(null);
  const [estado, setEstado] = useState<EstadoRastreio>("parado");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [encerradoId, setEncerradoId] = useState<string | null>(null);

  const trajetoId = useRef<string | null>(null);
  const watchId = useRef<number | null>(null);
  const ultimaPosicao = useRef<GeolocationPosition | null>(null);
  const ultimoEnvio = useRef<{ em: number; lat: number; lon: number } | null>(null);
  const enviando = useRef(false);
  const telaLigada = useRef<WakeLockSentinel | null>(null);

  const pedirTelaLigada = useCallback(async () => {
    if (!("wakeLock" in navigator) || telaLigada.current || document.visibilityState !== "visible") return;
    try {
      const sentinela = await navigator.wakeLock.request("screen");
      telaLigada.current = sentinela;
      sentinela.addEventListener("release", () => {
        if (telaLigada.current === sentinela) telaLigada.current = null;
      });
    } catch {
      // Bateria fraca ou navegador recusou: segue sem, a tela só pode apagar.
    }
  }, []);

  const pararGps = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    ultimaPosicao.current = null;
    telaLigada.current?.release().catch(() => {});
    telaLigada.current = null;
  }, []);

  const mandar = useCallback(
    async (pos: GeolocationPosition) => {
      const id = trajetoId.current;
      if (!id || enviando.current) return;

      const { latitude, longitude, accuracy } = pos.coords;
      const agora = Date.now();
      const ultimo = ultimoEnvio.current;
      if (ultimo) {
        const passou = agora - ultimo.em;
        const andou = metrosEntre(ultimo.lat, ultimo.lon, latitude, longitude);
        if (passou < INTERVALO_MS && !(andou >= MUDANCA_METROS && passou >= INTERVALO_MINIMO_MS)) return;
      }

      enviando.current = true;
      ultimoEnvio.current = { em: agora, lat: latitude, lon: longitude };
      try {
        const atualizado = await enviarPosicao(id, { latitude, longitude, precisaoMetros: accuracy });
        if (trajetoId.current !== id) return; // encerrado enquanto a chamada ia

        setTrajeto(atualizado);
        setAviso(null);
        if (atualizado.chegadasRegistradas?.length) {
          toast.success(`Chegada registrada: ${atualizado.chegadasRegistradas.join(", ")}`);
          queryClient.invalidateQueries({ queryKey: CHAVE_PAINEL });
        }
        // Chegou: a escola já sabe. Continuar ligando o GPS só gastaria bateria.
        if (atualizado.situacao === "Chegou") {
          pararGps();
          setEstado("parado");
        }
      } catch (err) {
        setAviso(`${err instanceof Error ? err.message : "Falha ao enviar sua localização."} Tentando de novo...`);
      } finally {
        enviando.current = false;
      }
    },
    [pararGps, queryClient]
  );

  async function comecar(existente?: TrajetoDoResponsavel) {
    setErro(null);
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setErro("Este navegador não informa a localização. Tente pelo Chrome ou Safari do celular.");
      return;
    }
    if (!window.isSecureContext) {
      setErro("A localização só funciona com o site aberto em endereço seguro (https).");
      return;
    }

    setEstado("iniciando");
    try {
      const atual = existente ?? (await iniciarTrajeto(dispositivoId()));
      trajetoId.current = atual.id;
      ultimoEnvio.current = null;
      setTrajeto(atual);
      setAviso("Procurando sua localização...");

      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          ultimaPosicao.current = pos;
          void mandar(pos);
        },
        (falha) => {
          if (falha.code === falha.PERMISSION_DENIED) {
            pararGps();
            setEstado("parado");
            setAviso(null);
            setErro(
              "Você não permitiu o acesso à localização. Libere a localização para este site nas configurações do navegador e tente de novo."
            );
          } else if (falha.code === falha.TIMEOUT) {
            setAviso("A localização está demorando. Confira se o GPS do celular está ligado.");
          } else {
            setAviso("Não conseguimos achar sua localização agora. Continuamos tentando.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
      );
      setEstado("rastreando");
      void pedirTelaLigada();
    } catch (err) {
      setEstado("parado");
      setAviso(null);
      setErro(err instanceof Error ? err.message : "Não foi possível avisar a escola.");
    }
  }

  async function encerrar(id: string) {
    pararGps();
    trajetoId.current = null;
    setEstado("parado");
    setAviso(null);
    try {
      await encerrarTrajeto(id);
      setTrajeto(null);
      setEncerradoId(id);
      queryClient.invalidateQueries({ queryKey: CHAVE_PAINEL });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível encerrar.");
    }
  }

  /** Para o GPS sem encerrar o trajeto — ao sair da conta, por exemplo. */
  function parar() {
    pararGps();
    trajetoId.current = null;
    setEstado("parado");
  }

  // Parado no semáforo o GPS pode ficar mudo: reenvia a última posição a cada 10 s para a portaria
  // não achar que a pessoa sumiu.
  useEffect(() => {
    if (estado !== "rastreando") return;
    const timer = setInterval(() => {
      if (ultimaPosicao.current) void mandar(ultimaPosicao.current);
    }, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [estado, mandar]);

  // O navegador solta o "tela ligada" quando a aba some; pede de novo quando ela volta.
  useEffect(() => {
    if (estado !== "rastreando") return;
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void pedirTelaLigada();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [estado, pedirTelaLigada]);

  useEffect(() => pararGps, [pararGps]);

  return { trajeto, estado, erro, aviso, encerradoId, comecar, encerrar, parar };
}
