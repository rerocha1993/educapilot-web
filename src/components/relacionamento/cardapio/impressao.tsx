import { etiquetasPorExtenso, chaveDaCelula, type GradeEditada } from "@/lib/relacionamento/cardapio-edicao";
import { DIAS_DO_CARDAPIO, dataDoDiaDaGrade, etiquetaEhPositiva, rotuloDaEtiqueta, rotuloDaRefeicao, rotuloDaSemana } from "@/lib/relacionamento/cardapio-vocabulario";
import { diaEMes } from "@/lib/tasks/calendario-datas";

/**
 * O cardápio da semana no papel: A4 paisagem, cabeçalho com o nome da escola, uma tabela limpa e a
 * observação no rodapé. Fica escondido na tela (`hidden print:block`) e é o único conteúdo que
 * aparece na impressão: o resto da tela leva `print:hidden`. O `@page` só vale enquanto esta peça
 * está montada, para não mudar a orientação das outras impressões do sistema.
 */
export function ImpressaoDoCardapio({
  escola,
  titulo,
  paraQuem,
  semana,
  dias,
  refeicoes,
  grade,
  observacao,
}: {
  escola: string | null;
  titulo: string;
  paraQuem: string;
  semana: string;
  dias: readonly string[];
  refeicoes: readonly string[];
  grade: GradeEditada;
  observacao: string;
}) {
  const ultimo = (dias[dias.length - 1] ?? "Sexta") as (typeof DIAS_DO_CARDAPIO)[number]["id"];

  return (
    <section aria-hidden className="hidden text-black print:block">
      <style media="print">{"@page { size: A4 landscape; margin: 12mm; }"}</style>

      <header className="mb-3 flex items-end justify-between gap-4 border-b-2 border-black pb-2">
        <div>
          {escola && <p className="text-[11pt] font-semibold tracking-wide uppercase">{escola}</p>}
          <h1 className="text-[18pt] leading-tight font-bold">{titulo || "Cardápio da semana"}</h1>
          <p className="text-[10pt]">{paraQuem}</p>
        </div>
        <p className="text-[12pt] font-semibold">Semana de {rotuloDaSemana(semana, ultimo)}</p>
      </header>

      <table className="w-full table-fixed border-collapse text-[9.5pt]">
        <thead>
          <tr>
            <th className="w-[26mm] border border-black bg-neutral-200 p-1.5 text-left">Refeição</th>
            {dias.map((d) => (
              <th key={d} className="border border-black bg-neutral-200 p-1.5 text-left">
                {DIAS_DO_CARDAPIO.find((x) => x.id === d)?.rotulo}{" "}
                <span className="font-normal">{diaEMes(dataDoDiaDaGrade(semana, d))}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {refeicoes.map((r) => (
            <tr key={r} className="break-inside-avoid">
              <th scope="row" className="border border-black p-1.5 text-left align-top">
                {rotuloDaRefeicao(r)}
              </th>
              {dias.map((d) => {
                const celula = grade[chaveDaCelula(d, r)];
                const prato = celula?.descricao.trim();
                return (
                  <td key={d} className="border border-black p-1.5 align-top">
                    {prato ? (
                      <>
                        {prato}
                        <NotasDoPrato etiquetas={celula.etiquetas} />
                      </>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {observacao.trim() && <p className="mt-3 text-[10pt] whitespace-pre-line">{observacao.trim()}</p>}
    </section>
  );
}

/** "Contém: leite, ovo" e, à parte, "Vegetariano" (que não é um ingrediente). */
function NotasDoPrato({ etiquetas }: { etiquetas: readonly string[] }) {
  const ingredientes = etiquetas.filter((e) => !etiquetaEhPositiva(e));
  const vegetariano = etiquetas.some((e) => etiquetaEhPositiva(e));
  if (ingredientes.length === 0 && !vegetariano) return null;

  return (
    <span className="mt-0.5 block text-[8pt] italic">
      {ingredientes.length > 0 && <>Contém: {etiquetasPorExtenso(ingredientes, rotuloDaEtiqueta)}</>}
      {ingredientes.length > 0 && vegetariano && " · "}
      {vegetariano && "Vegetariano"}
    </span>
  );
}
