/**
 * Máscaras e formatos do RH.
 *
 * Datas ficam como texto "yyyy-MM-dd" do começo ao fim (ver calendario-datas.ts): passar por Date
 * mudaria o dia conforme o fuso de quem olha. Aqui só entram dinheiro, CPF e horas.
 */

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarMoeda(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "—" : moeda.format(valor);
}

export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** "12345678901" → "123.456.789-01", aos poucos, enquanto a pessoa digita. */
export function mascararCpf(texto: string): string {
  const d = soDigitos(texto).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** CPF vindo do servidor (com ou sem pontuação), já com máscara. Vazio fica vazio. */
export function formatarCpf(cpf: string | null | undefined): string {
  return cpf ? mascararCpf(cpf) : "—";
}

/**
 * Máscara de reais para <input>: só dígitos entram e eles contam centavos ("12345" → "R$ 123,45").
 * Campo vazio fica vazio, para a pessoa poder apagar tudo.
 */
export function mascararMoeda(texto: string): string {
  const d = soDigitos(texto);
  if (!d) return "";
  return moeda.format(Number(d) / 100);
}

/** O número que a máscara mostra. Vazio é nulo. */
export function moedaParaNumero(texto: string): number | null {
  const d = soDigitos(texto);
  return d ? Number(d) / 100 : null;
}

/** Número do servidor → texto já com a máscara, para preencher o campo. */
export function numeroParaMoeda(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? "" : moeda.format(valor);
}

/**
 * Horas decimais em "8h30". Negativo leva o sinal na frente ("-1h20"), e `comSinal` põe "+" no
 * positivo (para saldo). O servidor manda horas como número decimal; um "HH:mm" já pronto passa.
 */
export function formatarHoras(valor: number | string | null | undefined, comSinal = false): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "string") return valor;

  const minutosTotais = Math.round(Math.abs(valor) * 60);
  const h = Math.floor(minutosTotais / 60);
  const m = minutosTotais % 60;
  const texto = `${h}h${String(m).padStart(2, "0")}`;

  if (minutosTotais === 0) return texto;
  if (valor < 0) return `-${texto}`;
  return comSinal ? `+${texto}` : texto;
}

/** Minutos em "35 min" ou "1h05". */
export function formatarMinutos(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined) return "—";
  if (minutos <= 0) return "0 min";
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** "HH:mm" ou "HH:mm:ss" → "HH:mm"; vazio vira travessão. */
export function horaOuTravessao(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : "—";
}

/** Primeiro e último dia do mês, como "yyyy-MM-dd". */
export function limitesDoMes(ano: number, mes: number): { de: string; ate: string } {
  const mm = String(mes).padStart(2, "0");
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return { de: `${ano}-${mm}-01`, ate: `${ano}-${mm}-${String(ultimo).padStart(2, "0")}` };
}

/** "2026-10" → ano 2026, mês 10. */
export function mesDeIso(iso: string): { ano: number; mes: number } {
  const [ano, mes] = iso.slice(0, 7).split("-");
  return { ano: Number(ano), mes: Number(mes) };
}

/** Tamanho de arquivo legível: "2,3 MB". */
export function formatarTamanho(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
