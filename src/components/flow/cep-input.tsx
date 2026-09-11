"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  apenasDigitos,
  buscarCep,
  CepNaoEncontradoError,
  formatarCep,
  type EnderecoCep,
} from "@/lib/flow/cep";

/**
 * Campo de CEP que busca o endereço e preenche o resto do formulário.
 *
 * Dispara sozinho ao completar os 8 dígitos, em vez de exigir um botão: quem preenche endereço
 * já digitou o CEP inteiro, e um botão a mais é um passo que se esquece — o endereço fica em
 * branco e a pessoa acha que o formulário está quebrado.
 */
export function CepInput({
  value,
  onChange,
  onEndereco,
}: {
  value: string;
  onChange: (v: string) => void;
  onEndereco: (endereco: EnderecoCep) => void;
}) {
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimoBuscado, setUltimoBuscado] = useState<string | null>(null);

  async function mudar(bruto: string) {
    const formatado = formatarCep(bruto);
    onChange(formatado);
    setErro(null);

    const digitos = apenasDigitos(formatado);

    // Só busca ao completar, e nunca duas vezes o mesmo CEP: sem essa guarda, apagar e redigitar
    // um dígito dispararia uma consulta a cada tecla.
    if (digitos.length !== 8 || digitos === ultimoBuscado) return;

    setUltimoBuscado(digitos);
    setBuscando(true);

    try {
      onEndereco(await buscarCep(digitos));
    } catch (err) {
      // CEP inexistente e falha de rede dão mensagens diferentes de propósito: mandar conferir
      // um CEP que estava certo faz a pessoa duvidar do dado dela.
      setErro(
        err instanceof CepNaoEncontradoError
          ? err.message
          : "Não conseguimos consultar o CEP agora. Preencha o endereço à mão."
      );
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Input
          value={value}
          inputMode="numeric"
          placeholder="00000-000"
          onChange={(e) => mudar(e.target.value)}
        />
        {buscando && (
          <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {erro && (
        <p className="text-xs text-warning-soft-foreground">{erro}</p>
      )}

      {!erro && !buscando && (
        <p className="text-xs text-muted-foreground">
          Digite o CEP e o endereço é preenchido sozinho. Depois é só informar o número.
        </p>
      )}
    </div>
  );
}
