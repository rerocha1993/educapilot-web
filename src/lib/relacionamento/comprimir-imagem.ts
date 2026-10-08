/**
 * Redução de foto no navegador, antes do envio.
 *
 * Uma foto de celular passa de 5 MB e o servidor aceita até 15 MB por arquivo; reduzir aqui poupa o
 * plano de dados de quem envia da sala de aula e o disco da escola. A saída é sempre JPEG com o
 * lado maior em 1600 px e qualidade 0,85: o bastante para ver a foto inteira na tela do celular
 * da família e boa para imprimir em 10x15.
 *
 * Passar pelo canvas também aplica a rotação do EXIF (a foto sai em pé, como foi tirada) e descarta
 * os metadados, incluindo a localização da escola.
 */

export const LADO_MAXIMO = 1600;
export const QUALIDADE_JPEG = 0.85;

/** Acima disto nem tentamos decodificar: a imagem inteira vira bitmap na memória do celular. */
export const LIMITE_DE_ORIGINAL = 40 * 1024 * 1024;

type Decodificada = { origem: CanvasImageSource; largura: number; altura: number; liberar: () => void };

/** Decodifica respeitando a orientação do EXIF. `createImageBitmap` é o caminho; <img> é o plano B. */
async function decodificar(arquivo: File): Promise<Decodificada> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
      return { origem: bitmap, largura: bitmap.width, altura: bitmap.height, liberar: () => bitmap.close() };
    } catch {
      // formato que o decodificador rápido não leu: tenta pelo <img>
    }
  }

  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return {
      origem: img,
      largura: img.naturalWidth,
      altura: img.naturalHeight,
      liberar: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Não foi possível ler esta imagem. Use uma foto JPG ou PNG.");
  }
}

function nomeEmJpeg(nome: string): string {
  const ponto = nome.lastIndexOf(".");
  const base = ponto > 0 ? nome.slice(0, ponto) : nome;
  return `${base || "foto"}.jpg`;
}

/**
 * Devolve a imagem reduzida, como JPEG, mantendo o nome (com a extensão trocada para .jpg).
 *
 * PNG com transparência também vira JPEG: o fundo transparente é pintado de branco antes, porque o
 * JPEG não tem canal alfa e o padrão do canvas seria preto.
 */
export async function comprimirImagem(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Este arquivo não é uma imagem.");
  if (arquivo.size > LIMITE_DE_ORIGINAL) throw new Error("A imagem é grande demais. Use uma foto de até 40 MB.");

  const imagem = await decodificar(arquivo);
  try {
    if (imagem.largura === 0 || imagem.altura === 0) throw new Error("Não foi possível ler esta imagem.");

    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.largura, imagem.altura));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(imagem.largura * escala));
    canvas.height = Math.max(1, Math.round(imagem.altura * escala));

    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("Este navegador não consegue reduzir imagens.");
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(imagem.origem, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALIDADE_JPEG));
    if (!blob) throw new Error("Não foi possível reduzir a imagem.");

    return new File([blob], nomeEmJpeg(arquivo.name), { type: "image/jpeg", lastModified: arquivo.lastModified });
  } finally {
    imagem.liberar();
  }
}
