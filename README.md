# Rota Energética

**Simulador educacional de alternativas energéticas para frotas pesadas.**

Compare Diesel, GNV/GNC, Biometano e Elétrico em custo por km, Custo Total de Propriedade (TCO) e emissões estimadas, ajustando as premissas e vendo os resultados mudarem em tempo real.

> Projeto de extensão universitária. Os resultados são estimativas educacionais para comparar cenários e não substituem estudos técnicos, econômicos ou ambientais para decisões reais de investimento.

## Por que existe

Para caminhões pesados de longa distância, a eletrificação envolve desafios de autonomia, potência de recarga e disponibilidade de infraestrutura ao longo das rotas. GNV e biometano oferecem outra rota tecnológica, especialmente em operações com acesso à infraestrutura de abastecimento e disponibilidade de combustível. O simulador permite explorar como essas condições alteram o resultado econômico e ambiental.

O simulador não parte da conclusão de que uma tecnologia é superior: ele mostra **como a atratividade de cada alternativa muda conforme o cenário**. Em rota fixa, com base de recarga própria e energia barata, o elétrico pode ser a melhor opção.

## O que faz (MVP)

| Item | Escopo |
| --- | --- |
| Alternativas | Diesel B, GNV/GNC, Biometano, Elétrico |
| Veículo | Cavalo mecânico de longa distância (um único perfil) |
| Entradas | Km/ano, preço de cada energia, consumo, sobrepreço do veículo, manutenção, horizonte e taxa de desconto |
| Saídas | Custo por km, TCO, emissões estimadas e diferença relativa entre alternativas |
| Contexto | Série histórica de diesel, GNV e Brent, e panorama da infraestrutura de recarga e abastecimento |
| Acessibilidade | Cada gráfico acompanha resumo textual e tabela |

O teor de biodiesel é tratado como parâmetro da mistura do diesel. Para o detalhamento matemático completo, premissas de fronteira e equações de TCO e emissões, consulte [`docs/metodologia.md`](docs/metodologia.md).

## Dados e Rastreabilidade

Todo número adotado no simulador vem de uma fonte pública ou oficial catalogada em [`data/sources.json`](data/sources.json). Cada parâmetro exibe um selo de confiabilidade metodológica (**Primária**, **Adaptada** ou **Ilustrativa**) e um identificador rastreável (`P01`, `E01`, etc.).

Para a chave completa de identificadores, critérios dos selos e categorias jurídicas, consulte [`docs/fontes.md`](docs/fontes.md).

## Como o cálculo funciona

- **Custo energético por km** = preço da energia ÷ rendimento
- **Custo operacional por km** = custo energético por km + manutenção por km
- **TCO** = investimento inicial + valor presente dos custos operacionais no horizonte escolhido.
- **Emissões** = energia consumida (MJ) × intensidade de carbono (gCO₂eq/MJ); para o elétrico, fator médio do SIN.

As alternativas utilizam a mesma fronteira de contabilização de emissões definida na metodologia. As diferenças entre emissões fósseis e biogênicas são explicitadas no site.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Site | Astro (estático) + TypeScript |
| Interface e gráficos | Tailwind CSS + DaisyUI, Apache ECharts |
| Pipeline de dados | Python + Polars (`uv`) |
| Testes | Vitest (site), pytest (pipeline) |
| CI/CD e hospedagem | GitHub Actions, GitHub Pages |

## Estrutura

```text
rota-energetica/
├── schemas/       # JSON Schemas compartilhados (manifest, parameters)
├── docs/          # fontes, metodologia, acessibilidade
├── pipeline/      # Python + Polars e implementação de referência
├── data/          # raw/, processed/ e parameters.json
├── web/           # Astro + TypeScript (src/lib/calc = módulo de cálculo)
└── .github/workflows/
```

## Executando localmente

Requisitos: Node.js 22+, [pnpm](https://pnpm.io) e [uv](https://docs.astral.sh/uv/).

```bash
git clone https://github.com/lucas-rollin/rota-energetica.git
cd rota-energetica

cd pipeline && uv sync && uv run pytest   # pipeline e testes
cd ../web && pnpm install && pnpm dev     # site
```

## Limitações

Os resultados dependem das premissas informadas; valores padrão ilustrativos não representam nenhuma empresa. Preços de bomba (ANP) não equivalem a contratos de grandes frotas. Incentivos fiscais, financiamento e valor residual não são considerados.

## Licenças e atribuição

| Conteúdo | Licença |
| --- | --- |
| Código | [MIT](LICENSE) |
| Textos e documentação originais | CC BY 4.0 |
| Dados de terceiros | **Não são relicenciados.** Mantêm as licenças e os termos de uso de cada fonte, registrados em [`data/sources.json`](data/sources.json) |

As regras completas de reuso, privacidade e termos de dados derivados estão em [`LICENSE-DATA.md`](LICENSE-DATA.md). Os JSONs em `data/processed/` incluem os campos `source` e `retrieved_at` em cada série, para que a atribuição acompanhe o dado onde quer que ele seja reutilizado.
