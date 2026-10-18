# Pipeline — Rota Energética

A pipeline permite a transformação dos dados brutos em JSON para a web.

## Registro de fonte

Os dados sao vinculados a [fontes](../docs/fontes.md) e possuem um registro de metadados em [`manifest.json`](../data/manifest.json).

### Como registrar 

- **Arquivos automáticos** (como o Brent): o pipeline cria a entrada ao baixar.
- **Arquivos manuais** (como a ANP): coloque o arquivo em `data/raw/<fonte>/` e rode o comando de registro (a ajustar):

  ```bash
  cd pipeline
  uv run python -m pipeline.register \
    --source P01 \
    --origin-url "https://www.gov.br/anp/..." \
    --file ../data/raw/anp/ca-2026-01.csv
  ```

  Ele varre as pastas, calcula `sha256`, `rows` e `date_range` e cria ou atualiza as entradas.

### Atualizações

- O arquivo do **semestre corrente** muda a cada semana. Ao rebaixá-lo, a entrada existente é sobrescrita (novo `sha256`, `retrieved_at` e `date_range`). O histórico fica no git.
- Se, ao rebaixar um **semestre já encerrado**, o `sha256` mudar, a fonte revisou os dados. Investigar antes de aceitar o novo arquivo.

### Verificações automáticas

- No pipeline: todo arquivo em `data/raw/` tem entrada e toda entrada aponta para um arquivo existente; o `sha256` confere; as colunas esperadas estão presentes e não há lacunas de datas. Em caso de falha, a mensagem lista o que baixar ou registrar.
- Na CI, onde os brutos não existem: todo `source_id` do manifest consta neste documento, e todo `source_id` em `data/processed/` consta no manifest.

O formato é validado por [`schemas/manifest.schema.json`](../schemas/manifest.schema.json).