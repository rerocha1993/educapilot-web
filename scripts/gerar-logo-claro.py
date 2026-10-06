"""Gera as variantes claras do logo, para uso sobre fundos escuros (ex.: a sidebar roxa).

O contorno do logo e o texto sao roxo escuro (#3D2180), que some sobre `--sidebar: #2D095D`.
Aqui o roxo vira branco, mantendo o alpha de cada pixel, e o laranja (#FF8F0B) fica como esta.

Como as bordas sao antialiased, um pixel pode ser roxo puro, laranja puro ou uma mistura dos dois
(a cor fica sobre o segmento roxo -> laranja). Em vez de um corte duro, cada pixel e decomposto
nessa mistura: com t = fracao de laranja, a nova cor e (1 - t) * branco + t * laranja. Assim a
transicao roxo -> laranja vira branco -> laranja sem halo roxo. Transicoes roxo -> transparente
nao tem mistura de cor (o PNG guarda alpha separado), entao o pixel so fica branco com o mesmo alpha.

Uso (na raiz do educapilot-web):  python scripts/gerar-logo-claro.py
"""

from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
PUBLIC = RAIZ / "public"

ROXO = (0x3D, 0x21, 0x80)
LARANJA = (0xFF, 0x8F, 0x0B)
BRANCO = (255, 255, 255)

# Distancia maxima (RGB euclidiana) ate o segmento roxo -> laranja para o pixel contar como
# "roxo ou mistura de roxo com laranja". Cobre os tons mais escuros do contorno (ate ~#00005F).
TOLERANCIA = 75.0

ARQUIVOS = [
    ("icon-192.png", "icon-192-claro.png"),
    ("logo.png", "logo-claro.png"),
]


def clarear(entrada: Path, saida: Path) -> int:
    img = Image.open(entrada).convert("RGBA")
    px = img.load()
    largura, altura = img.size

    dx = [LARANJA[i] - ROXO[i] for i in range(3)]
    norma2 = sum(d * d for d in dx)
    alterados = 0

    for y in range(altura):
        for x in range(largura):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            c = (r, g, b)
            # Projecao do pixel no segmento roxo -> laranja: t = fracao de laranja na mistura.
            t = sum((c[i] - ROXO[i]) * dx[i] for i in range(3)) / norma2
            t = min(1.0, max(0.0, t))
            ponto = [ROXO[i] + t * dx[i] for i in range(3)]
            dist = sum((c[i] - ponto[i]) ** 2 for i in range(3)) ** 0.5
            if dist > TOLERANCIA:
                # Fora da tolerancia, so mexe em pixels de tom azulado/lilas (azul acima de vermelho
                # e verde): sobras de borda com alpha baixo, que sobre fundo escuro virariam halo.
                # O laranja tem azul baixo, entao nunca cai aqui.
                if b > r + 25 and b > g + 25:
                    px[x, y] = (*BRANCO, a)
                    alterados += 1
                continue
            nova = tuple(round((1 - t) * BRANCO[i] + t * c_laranja) for i, c_laranja in enumerate(LARANJA))
            if nova != c:
                alterados += 1
            px[x, y] = (*nova, a)

    img.save(saida, optimize=True)
    return alterados


def main() -> None:
    for nome_in, nome_out in ARQUIVOS:
        n = clarear(PUBLIC / nome_in, PUBLIC / nome_out)
        print(f"{nome_in} -> {nome_out}: {n} pixels alterados")


if __name__ == "__main__":
    main()
