# Pipeline de Dados — Rota Energética

Módulo Python responsável pela ingestão, validação de integridade, agregação estatística com Polars e exportação de schemas e datasets processados para o simulador web.

## 1. Visão Geral da Arquitetura

O pipeline conecta os dados brutos aos artefatos versionados consumidos pelo site:

```text
data/raw/ (não versionado)
├── anp/ca-*.csv            ──┐
├── eia/brent-weekly.csv    ──┼──> [pipeline build] ──> data/processed/prices_history.json
└── aneel/tarifas-*.csv     ──┼──> [pipeline defaults] ──> data/processed/default_prices.json
                              └──> [--apply] ────────────> data/parameters.json
```

- **Polars LazyFrames:** Processamento rápido e com baixo uso de memória dos arquivos semestrais da ANP e tarifas da ANEEL.
- **Pydantic (Single Source of Truth):** Modelos formais com `extra="forbid"`, validando premissas, metadados e histórico.
- **Governança e Privacidade:** Nenhuma linha de dado bruto por posto ou CNPJ é exportada para os JSONs públicos (`LICENSE-DATA.md` §5). Apenas agregações estatísticas por município e estado são publicadas.

## 2. Comandos CLI

A CLI unificada é invocada através de subcomandos via `uv run pipeline <comando>`:

### 2.1 `pipeline build`

Varre os dados brutos de `data/raw/` e gera a série histórica semanal agregada em `data/processed/prices_history.json`.

```bash
cd pipeline
uv run pipeline build
```

- Normaliza cabeçalhos e encodings heterogêneos (`utf-8-sig` / `latin1`).
- Calcula a mediana de preços por município e a mediana estadual para Santa Catarina por semana ISO.
- Aplica fallback nacional automático quando a semana possuir menos de 3 municípios amostrados em SC.
- Converte preços nominais em R$/MJ utilizando o poder calorífico de referência (`parameters.json`).
- Agrega a série semanal de Brent em US$/bbl.

### 2.2 `pipeline defaults`

Calcula a mediana móvel das últimas 12 semanas (janela metodológica padrão) para combustíveis observados na ANP e extrai a tarifa comercial da ANEEL com tributos.

```bash
cd pipeline
# Exibe o diff e grava data/processed/default_prices.json (dry-run)
uv run pipeline defaults

# Atualiza data/parameters.json com os novos preços padrão calculados
uv run pipeline defaults --apply
```

- **Diesel B (S10):** Mediana de 12 semanas da ANP em SC (`P01`, badge **Adaptada**).
- **GNV:** Mediana de 12 semanas da ANP em SC (`P01`, badge **Adaptada**).
- **Biometano:** Preço de referência ilustrativo fixado em R$ 4,60/m³ (`P05`, badge **Ilustrativa**).
- **Eletricidade:** Tarifa homologada ANEEL B3 Comercial da CELESC com incidência tributária estimada de ~24,5% ICMS + PIS/COFINS (`P06`, badge **Adaptada**).

### 2.3 `pipeline export-schemas`

Exporta os JSON Schemas atualizados a partir dos modelos Pydantic para a pasta `schemas/`.

```bash
cd pipeline
uv run pipeline export-schemas
```

- Gera `schemas/manifest.schema.json`, `schemas/parameters.schema.json`, `schemas/sources.schema.json` e `schemas/prices_history.schema.json`.
- A integridade contratual é verificada pelo teste unitário `test_no_schema_drift` na CI.

### 2.4 `pipeline register`

Registra e audita novos arquivos brutos baixados manualmente em `data/manifest.json`.

```bash
cd pipeline
uv run pipeline register \
  --source P01 \
  --origin-url "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis" \
  --file ../data/raw/anp/ca-2026-02.csv
```

Calcula checksum SHA-256, contagem de linhas e intervalo de datas do arquivo.

## 3. Testes e Qualidade de Código

Para executar a suíte de testes e os linters do pipeline:

```bash
cd pipeline

# Executar testes unitários e de integração
uv run pytest

# Verificação de lint e formatação (Ruff)
uv run ruff check .
uv run ruff format --check .

# Verificação estática de tipos (Pyrefly)
uv run pyrefly check
```

A suíte de testes inclui:

1. `test_parameters.py`: Validação de consistência e limites de `data/parameters.json`.
2. `test_pipeline.py`: Agregação com CSVs sintéticos, fallback de amostragem municipal e integridade referencial dos datasets processados.
3. `test_register.py`: Verificação de cálculo de hash e registros no manifest.
4. `test_schemas.py`: Prevenção contra deriva entre os modelos Python e os JSON Schemas versionados.
