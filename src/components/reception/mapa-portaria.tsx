"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { EscolaNoMapa, SituacaoTrajeto, TrajetoNoMapa } from "@/lib/reception/use-mapa";
import { horaBrasilia } from "@/lib/reception/formatar";
import { formatarDistancia } from "@/lib/reception/distancia";
import { ROTULO_FINALIDADE, ROTULO_SITUACAO } from "./situacao-trajeto";

// Cor do pino por situação. Variável do tema com cor fixa de reserva: o HTML do divIcon é montado
// fora do React, e um token que faltar não pode deixar o pino invisível.
const COR_SITUACAO: Record<SituacaoTrajeto, string> = {
  ACaminho: "var(--primary, #5b4b8a)",
  Chegando: "var(--warning, #d97706)",
  Chegou: "var(--success, #16a34a)",
};

// Ícone "car" do lucide, em SVG solto porque o divIcon recebe HTML, não componente.
const SVG_CARRO =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';

function escaparHtml(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Pino do responsável: carrinho na cor da situação e o primeiro nome embaixo.
 *
 * Antes era um círculo de 9 px sem nome: some no meio das ruas, e quem já chegou ficava escondido
 * debaixo do marcador da escola.
 */
function iconeDoResponsavel(nome: string, situacao: SituacaoTrajeto) {
  const cor = COR_SITUACAO[situacao];
  const primeiroNome = escaparHtml(nome.trim().split(/\s+/)[0] ?? "");
  return L.divIcon({
    className: "",
    html:
      `<div style="display:flex;flex-direction:column;align-items:center">` +
      `<div style="width:34px;height:34px;border-radius:9999px;background:${cor};color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35)">${SVG_CARRO}</div>` +
      `<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${cor};margin-top:-2px"></div>` +
      `<div style="margin-top:2px;background:#fff;color:#111;font:600 11px/1.3 system-ui,sans-serif;padding:1px 6px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.3);white-space:nowrap">${primeiroNome}</div>` +
      `</div>`,
    iconSize: [120, 64],
    // Ponta do pino (34 px do círculo + 6 px do triângulo) no ponto exato da posição.
    iconAnchor: [60, 40],
    popupAnchor: [0, -40],
  });
}

// divIcon em vez do ícone padrão: as imagens do marcador padrão se perdem no bundler.
const iconeEscola = L.divIcon({
  className: "",
  html: '<div class="flex size-7 items-center justify-center rounded-md border-2 border-card bg-foreground shadow-md"><div class="size-2.5 rounded-full bg-card"></div></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

type EscolaComLocal = EscolaNoMapa & { latitude: number; longitude: number };

export default function MapaPortaria({ escola, trajetos }: { escola: EscolaComLocal; trajetos: TrajetoNoMapa[] }) {
  const centro: [number, number] = [escola.latitude, escola.longitude];
  const noMapa = trajetos.filter(
    (t): t is TrajetoNoMapa & { latitude: number; longitude: number } => t.latitude != null && t.longitude != null
  );

  return (
    // isolate: os panes do Leaflet têm z-index 400+ e passariam por cima do menu e dos diálogos.
    <div className="isolate h-[420px] overflow-hidden rounded-lg border border-border lg:h-[560px]">
      <MapContainer center={centro} zoom={15} scrollWheelZoom className="size-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Circle
          center={centro}
          radius={escola.raioChegandoMetros}
          pathOptions={{ className: "stroke-warning fill-warning", weight: 1, fillOpacity: 0.08, dashArray: "4 4" }}
        />
        <Circle
          center={centro}
          radius={escola.raioChegouMetros}
          pathOptions={{ className: "stroke-success fill-success", weight: 2, fillOpacity: 0.2 }}
        />
        <Marker position={centro} icon={iconeEscola}>
          <Popup>
            <strong>{escola.nome}</strong>
          </Popup>
        </Marker>

        {noMapa.map((t) => (
          // zIndexOffset: o pino fica por cima do marcador da escola, senão quem chegou some embaixo dele.
          <Marker
            key={`${t.id}-${t.situacao}`}
            position={[t.latitude, t.longitude]}
            icon={iconeDoResponsavel(t.responsavelNome, t.situacao)}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="flex flex-col gap-0.5 text-sm">
                <strong>{t.responsavelNome}</strong>
                <span>
                  {ROTULO_FINALIDADE[t.finalidade]} {t.alunos.join(", ")}
                </span>
                <span>
                  {ROTULO_SITUACAO[t.situacao]} · {formatarDistancia(t.distanciaMetros)}
                </span>
                <span className="text-xs opacity-70">Atualizado às {horaBrasilia(t.atualizadoEm)}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        <EnquadrarUmaVez centro={centro} pontos={noMapa.map((t) => [t.latitude, t.longitude] as [number, number])} />
      </MapContainer>
    </div>
  );
}

/**
 * Enquadra escola e responsáveis na primeira leitura com gente a caminho. Só uma vez: reenquadrar a
 * cada 10 s tiraria o mapa do lugar enquanto a pessoa da portaria arrasta ou dá zoom.
 */
function EnquadrarUmaVez({ centro, pontos }: { centro: [number, number]; pontos: [number, number][] }) {
  const map = useMap();
  const feito = useRef(false);

  useEffect(() => {
    if (feito.current || pontos.length === 0) return;
    feito.current = true;
    map.fitBounds(L.latLngBounds([centro, ...pontos]), { padding: [40, 40], maxZoom: 16 });
  }, [map, centro, pontos]);

  return null;
}
