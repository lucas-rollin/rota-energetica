# Licenças e termos dos dados

Este arquivo define as **regras gerais** de uso e republicação dos dados do **Rota Energética**. A categoria, os termos e a atribuição de cada fonte estão em [`data/sources.json`](data/sources.json); a descrição das fontes está em [`docs/fontes.md`](docs/fontes.md). Complementa o [`README`](README.md).

> **Aviso:** este documento descreve a política do projeto e não é aconselhamento jurídico. Os termos devem ser lidos nas páginas oficiais das fontes antes de cada publicação.

## 1. Regra geral

| Conteúdo | Licença |
| --- | --- |
| Código | MIT (arquivo [`LICENSE`](LICENSE)) |
| Textos e documentação originais | CC BY 4.0 |
| Dados de terceiros | **Não são relicenciados.** Mantêm os termos da fonte original, registrados em [`data/sources.json`](data/sources.json) |
| Dados processados do projeto (`data/processed/`) | Ver seção 2 |

## 2. Dados processados

Os JSONs em `data/processed/` são derivados de fontes de terceiros. Regras:

1. Uma fonte só alimenta `data/processed/` se for **categoria A** (ato oficial) ou se tiver termos confirmados que permitam explicitamente redistribuir dados derivados ou agregados (como dados abertos governamentais).
2. O que o projeto acrescenta (agregação, conversão de unidade, medianas) pode ser reutilizado sob **CC BY 4.0**, **sempre com atribuição à fonte original**, conforme os campos `source_id` e `retrieved_at` de cada série. A exceção são fontes cujos termos exigem licença igual ou compatível para bases derivadas (por exemplo, a ODbL da ANEEL); nesses casos vale a licença da fonte.
3. Fontes de uso restrito, privado ou sem termos confirmados de dados abertos ficam fora dos JSONs publicados; podem ser usadas para cálculo interno e citadas por link.
4. **Agregar, não republicar linhas brutas.** Os arquivos de `data/raw/` não vão ao git. Os processados trazem séries agregadas (por exemplo, mediana semanal por estado), nunca registros por posto.

## 3. Categorias de fonte

[Eixo Jurídico: Categorias de Reuso e Direitos Autorais](docs/fontes.md#3-eixo-jurídico-categorias-de-reuso-e-direitos-autorais)

## 4. Atribuição no site

O site terá uma página **Fontes e licenças** com:

- cada parâmetro exibido, seu `source_id`, selo de qualidade e data de acesso;
- o texto de atribuição de cada fonte usada (campo `attribution` de `data/sources.json`);
- um link para este arquivo.

Cada gráfico traz a fonte na legenda, não apenas na página de fontes.

## 5. Privacidade

A série da ANP é por estabelecimento revendedor e traz razão social, CNPJ e endereço. O projeto **não publica registros por posto**, só agregados por estado ou por semana, o que também limita a exposição de dados de pessoas que operam como empresa individual.

## 6. Como adicionar uma fonte

1. Ler a licença ou os termos de uso na **página oficial** da fonte.
2. Registrar a fonte em [`data/sources.json`](data/sources.json) (metadados, categoria, termos, atribuição e `terms_url`).
3. Registrar cada download de arquivo bruto em `data/manifest.json`.

## 7. Remoção

Quem detiver direitos sobre algum dado aqui usado e quiser sua remoção pode abrir uma issue no repositório. O dado será retirado de `data/processed/` e do site na próxima publicação.
