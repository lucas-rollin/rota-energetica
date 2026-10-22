# Fontes de Dados e Rastreabilidade
    
Cada dado que alimenta o **Rota Energética** é catalogado em [`data/sources.json`](../data/sources.json) sob três eixos de classificação: **temático** (ID), **metodológico** (Selo) e **jurídico** (Categoria).

## 1. Eixo Temático: Nomenclatura dos IDs

Identifica a qual domínio do problema o dado pertence:

| Prefixo | Domínio | Escopo e Exemplos |
|---|---|---|
| **P** | **Preços e Volatilidade** | Séries semanais de combustíveis (ANP), Brent (EIA), tarifas de eletricidade (ANEEL) e gás canalizado. |
| **E** | **Emissões e Fatores** | Intensidades regulatórias de carbono (CNPE), emissão média do SIN (MCTI) e teores de biodiesel. |
| **V** | **Veículos e Desempenho** | Fichas de caminhões (Scania, Sany), tabela FIPE, piso mínimo de frete (ANTT) e manutenção (CNT). |
| **I** | **Infraestrutura e Contexto** | Eletropostos (ABVE/Tupi), corredores de GNV (Compagás) e capacidade de biometano (ABiogás). |

## 2. Eixo Metodológico: Selos de Qualidade Técnica

Qualifica o nível de intervenção e precisão do número exibido no simulador:

| Selo | Critério Metodológico |
|---|---|
| **Primária** | Dado extraído diretamente de órgão oficial, regulador ou norma, sem transformação além de conversão de unidade. |
| **Adaptada** | Derivado de fonte oficial ou setorial com cálculo, mediana móvel temporal, média regional ou ajuste de escopo. |
| **Ilustrativa** | Premissa plausível na ausência de série pública consolidada (ex.: cotação de mercado ou tarifa média de recarga privada). Editável pelo usuário. |

## 3. Eixo Jurídico: Categorias de Reuso e Direitos Autorais

Define as condições de republicação e licenciamento da fonte (regras em [`LICENSE-DATA.md`](../LICENSE-DATA.md)):

| Categoria | Natureza da Fonte | Regra de Reuso |
|---|---|---|
| **A** | **Atos oficiais** (leis, resoluções, portarias) | Não têm proteção autoral (Lei nº 9.610/1998, art. 8º, IV). Citar ato, data e link. |
| **B** | **Dados abertos governamentais** | Uso sob os termos do catálogo de dados abertos da fonte (ex.: CC BY, ODbL). Exige atribuição. |
| **C** | **Entidades privadas ou setoriais** | Sem licença aberta presumida. Usar apenas valores pontuais com citação; não redistribuir séries sem autorização. |
| **D** | **Imprensa, consultorias e montadoras** | Fatos e especificações podem ser citados com veículo e data. Textos, tabelas inteiras, imagens e PDFs não são copiados nem hospedados. |

## 4. Estrutura de Arquivos

- **Catálogo estruturado:** [`data/sources.json`](../data/sources.json) (validado por `schemas/sources.schema.json`).
- **Arquivos brutos baixados:** [`data/manifest.json`](../data/manifest.json) (log de integridade e auditoria de `data/raw/`).
- **Premissas padrão do simulador:** [`data/parameters.json`](../data/parameters.json).
