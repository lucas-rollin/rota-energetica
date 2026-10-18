# Fontes de dados

Inventário das fontes do **Rota Energética**. Cada número exibido no site tem uma linha aqui, identificada por um ID (P01, E01, V01...).

Levantamento inicial: 07/10/2026.

## Selo de qualidade do dado

Exibido no simulador junto de cada parâmetro.

| Selo | Significado |
|---|---|
| **Primária** | Valor tirado diretamente de fonte oficial ou norma, sem transformação além de conversão de unidade. |
| **Adaptada** | Derivado de fonte oficial ou setorial, com cálculo, média ou ajuste de escopo feito por nós. A adaptação é descrita nas notas. |
| **Ilustrativa** | Valor plausível, sem série pública confiável (ex.: preço de caminhão, tarifa de carregador público). Apresentado como exemplo editável. |

## 1. Preços e volatilidade

| ID | Dado | Fonte e link | Selo | Notas |
|---|---|---|---|---|
| P01 | Preço semanal de diesel B (S-10 e S-500) e de GNV nos postos | **ANP, Série Histórica de Preços de Combustíveis** (dados abertos). https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis | Primária | Pesquisa semanal (LPC) em 459 localidades, com arquivos CSV por semestre. Diesel em R$/L e GNV em R$/m³: converter para R$/MJ. O catálogo de dados abertos lista licença Creative Commons Attribution (conferir no portal). O acesso aos arquivos pode exigir login gov.br; nesse caso, o download é manual e o login não deve ser automatizado. |
| P02 | Preço do petróleo Brent (US$/barril) | **EIA (EUA), Europe Brent Spot Price FOB** (série RBRTE). Espelho em CSV: https://datahub.io/core/oil-prices | Primária | O espelho do DataHub (licença ODC-PDDL) pode estar desatualizado; preferir a EIA diretamente e comparar o último ponto. Agregar para média semanal. |
| P03 | Diesel S10 de referência da ANTT | **ANTT, Portaria SUROC nº 3/2026**: média nacional de R$ 6,89/L na semana de 08 a 14/03/2026. Lido em https://cbic.org.br/?p=106432 e https://setcesp.org.br/noticias/piso-minimo-do-trc/antt-atualiza-piso-minimo-de-frete-considerando-o-reajuste-do-diesel/ | Adaptada | Marco para o gráfico de volatilidade. A Res. ANTT 6.084/2026 usa R$ 6,97/L (lido em transp.net). Citar o texto da norma. |
| P04 | Preço de venda do diesel A pela Petrobras às distribuidoras | **Petrobras, preços de venda.** https://precos.petrobras.com.br/precos-diesel. | Primária | Procurar "Preços de venda às distribuidoras" no site da Petrobras. |
| P05 | Preço do biometano | **Copersucar, estudo de 2025**, citado na AutoData (fev/2026). https://www.autodata.com.br/revistas/flipbook/429-2026-02/83/ | Ilustrativa | O trecho lido estava truncado e a unidade do valor (R$ 4,60) não ficou clara. Não há série pública oficial. |
| P06 | Tarifa de energia elétrica (recarga em base própria) | **ANEEL, dados abertos de tarifas homologadas.** https://dadosabertos.aneel.gov.br/dataset/tarifas-distribuidoras-energia-eletrica. | Primária | Possivel visualização pelo Power BI: https://portalrelatorios.aneel.gov.br/luznatarifa/basestarifas |
| P07 | Painel de Preços de energia elétrica | **CCEE, dados abertos de Preços e energia elétrica.** https://www.ccee.org.br/precos/painel-precos. | Adaptada | |
| P08 | Tarifa de recarga pública rápida (DC) | Preços divulgados por operadores de recarga. | Ilustrativa | Sem fonte oficial. Registrar operador, data e URL de cada preço. |

## 2. Emissões

| ID | Dado | Fonte e link | Selo | Notas |
|---|---|---|---|---|
| E01 | **Intensidade de carbono do GNV e do biometano** (gCO₂eq/MJ) | **CNPE, Resolução nº 4/2026** (DOU 06/05/2026). https://www.gov.br/mme/pt-br/assuntos/conselhos-e-comites/cnpe/resolucoes-do-cnpe/2026/resolucao-4-publicada.pdf | Primária | Define **GNV 76,85**, **gás natural para geração elétrica 73,52** e **biometano 8,55** gCO₂eq/MJ. São valores regulatórios para converter a meta do mandato, não uma ACV de planta específica; explicar isso na interface. |
| E02 | Fator de emissão médio do SIN (para o elétrico) | **MCTI, SIRENE**, via notas técnicas. Link a incluir. | Primária | Valores lidos em imprensa: média de **38,5 kg CO₂/MWh em 2023** (https://eixos.com.br/brasil-tem-menor-taxa-de-emissao-de-carbono-na-geracao-eletrica-em-onze-anos/) e fatores mensais de 2025 entre 21,5 e 28,9 kg/MWh (https://canalsolar.com.br/emissoes-de-co₂-geracao-eletrica-mcti/). Usar a média anual publicada pelo MCTI. |
| E03 | Fatores de emissão de combustíveis fósseis (diesel, gás natural) | **Programa Brasileiro GHG Protocol (FGV EAESP)**, ferramenta de cálculo (Excel, atualizada anualmente) e FAQ. https://eaesp.fgv.br/node/13268 · https://fgv.br/ghg · https://eaesp.fgv.br/sites/eaesp.fgv.br/files/u1087/faq_ghg.pdf | Primária | Anotar a versão da ferramenta e a aba de onde cada fator foi extraído. Ler no FAQ os termos de uso antes de redistribuir valores em dataset aberto. |
| E04 | Intensidade de carbono do **diesel** em gCO₂eq/MJ | Opções: ferramenta do GHG Protocol, valor de referência do RenovaBio/ANP ou estudo de ciclo de vida. | Primária ou Adaptada | Não há valor oficial único comparável ao de E01 (regulatório, "poço à roda"). Fixar uma única base de ciclo de vida para todas as alternativas e declará-la. Combustão apenas não se compara diretamente com biometano. |
| E05 | RenovaBio e RenovaCalc | **ANP, RenovaBio.** https://www.gov.br/anp/pt-br/assuntos/renovabio · Apresentação ANP (03/03/2026): https://www.gov.br/anp/pt-br/centrais-de-conteudo/apresentacoes-palestras/2026/arquivos/apresentacao-anp-renovabio-03032026.pdf · Nota técnica: https://www.gov.br/anp/pt-br/assuntos/consultas-e-audiencias-publicas/consulta-audiencia-publica/2018/arquivos-consultas-e-audiencias-publicas-2018/cap-10-2018/cp10-2018_nota-tecnica-renova-calc.pdf | Primária | Explica o cálculo da intensidade de carbono por ACV (a Res. ANP 984/2025 atualiza a RenovaCalc). Base para explicar CO₂ **biogênico** e **fóssil**. |
| E06 | Teor de biodiesel no diesel B | Lei 14.993/2024 e resoluções do CNPE. Link a incluir. | Primária | Usar o percentual vigente na data de publicação. |

## 3. Veículos e custos de operação

| ID | Dado | Fonte e link | Selo | Notas |
|---|---|---|---|---|
| V01 | Custo de deslocamento por km (referência para diesel) | **ANTT, Resolução nº 6.084/2026** (DOU 17/07/2026), que atualiza o Anexo II da Res. 5.867/2020. Lida em https://mundologistica.com.br/noticias/antt-atualiza-tabela-do-piso-minimo-do-frete e https://www.poder360.com.br/poder-infra/antt-atualiza-tabela-do-piso-minimo-do-frete/ | Adaptada | Carga geral, lotação (Tabela A): CCD de **R$ 3,9826/km (2 eixos)** a **R$ 9,2027/km (9 eixos)**. É um **piso de frete**, não o custo contábil da empresa: usar como ordem de grandeza, com valor editável. Revisão em janeiro e julho, e extraordinária quando o diesel varia 5% ou mais. Citar o texto da resolução no site da ANTT. |
| V02 | Consumo (km/L, km/m³, kWh/km) e preço de caminhões a diesel, gás e elétricos | **Fichas técnicas de fabricantes** (Scania, Iveco, Volvo, VW, Mercedes-Benz, JAC e outros). | Ilustrativa | Registrar fabricante, modelo, ano e link da ficha. Preço costuma sair só em imprensa especializada: registrar a matéria. |
| V03 | Sobrepreço do caminhão elétrico | **Mirow & Co**, via Agência Infra (03/03/2026). https://agenciainfra.com/blog/frota-eletrica-e-04-e-infraestrutura-trava-setor-aponta-mirow-co/ | Ilustrativa | O estudo aponta custo inicial de **duas a três vezes** o do diesel. |
| V04 | Sobrepreço do caminhão a gás | Declaração de executivo da Scania em matéria do Especialista/Safra. https://oespecialista.safra.com.br/biocombustiveis-lixo-gas/ | Ilustrativa | Fala em "até 30% mais caro", mas a matéria é antiga (menciona a pandemia). Datar o valor e buscar cotação mais recente. |
| V05 | Manutenção, pneus e depreciação por km | **NTC&Logística** (custos do transporte de carga) e **CNT**. Link a incluir. | Adaptada | Manutenção de elétrico e de gás: usar fatores relativos ao diesel, marcados como ilustrativos. |

## 4. Contexto e infraestrutura

| ID | Dado | Fonte e link | Selo | Notas |
|---|---|---|---|---|
| I01 | Pontos de recarga no Brasil | **ABVE com a plataforma Tupi**, ago/2026: **29.866 pontos**, **11.397 em corrente contínua (DC)**, frota plug-in de 639.133 veículos. https://canalve.com.br/brasil-aproxima-30-mil-eletropostos/ | Primária | Números **majoritariamente de carros de passeio**; não usar como prova de infraestrutura para caminhões. Crescimento de cerca de 77% em 12 meses (https://www.vrum.com.br/aceleradas/2026/09/7510728-recarga-rapida-para-carros-eletricos-triplica-e-ja-muda-o-mapa-no-pais.html). |
| I02 | Infraestrutura para caminhões elétricos | **Mirow & Co**, via Agência Infra (03/03/2026). https://agenciainfra.com/blog/frota-eletrica-e-04-e-infraestrutura-trava-setor-aponta-mirow-co/ | Adaptada | Elétricos são **0,4% da frota** de caminhões; há **mais de 2.300 estações públicas de recarga rápida**, mas poucas adequadas a caminhões médios e pesados; faltam redes de média e alta tensão em rodovias; reforços de rede levam de **6 a 24 meses**. Estudo de consultoria: citar como tal. |
| I03 | Vendas de caminhões elétricos | Dados setoriais reportados em https://garagem360.com.br/?p=318536 | Adaptada | Queda de 15,3% no 1º semestre (190 para 161 unidades emplacadas). Conferir no informativo da Fenabrave. |
| I04 | Regras de conexão de cargas de alta potência | **ANEEL, Consulta Pública nº 033/2026**, citada em https://www.vrum.com.br/aceleradas/2026/09/7510728-recarga-rapida-para-carros-eletricos-triplica-e-ja-muda-o-mapa-no-pais.html | Primária | Mostra que a conexão em alta potência está em discussão regulatória. Citar o documento no site da ANEEL. |
| I05 | Produção e potencial de biometano | **ABiogás**, mapeamento (2024): potencial de **120 milhões de Nm³/dia**; capacidade de **1,77 milhão m³/dia (2025)** projetada para **4,5 milhões (2026)**. https://static.poder360.com.br/2025/08/ABiogas-mapeamento-biometano.pdf · AutoData (fev/2026): cerca de 80 plantas preparadas. https://www.autodata.com.br/revistas/flipbook/429-2026-02/80/ | Primária | Capacidade é **projeção**, não produção efetiva. Diferenciar potencial, capacidade instalada e produção. |
| I06 | Mandato do biometano | **Lei nº 14.993/2024 (Combustível do Futuro).** http://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L14993.htm · **CNPE, Res. nº 4/2026** (E01): meta de **0,5% em 2026** (a lei previa 1%). Certificados CGOB regulamentados pela ANP (Res. 995/2026 e 996/2026), lido em https://eixos.com.br/gas-natural/biogas/meta-de-descarbonizacao-do-gas-natural-traz-novo-componente-a-formacao-de-precos-do-setor/ | Primária | A trajetória de 1,5% em 2027 a 5% em 2030 foi citada por dirigente da ABiogás: tratar como expectativa do setor, não como norma. |
| I07 | Postos de GNV e atendimento a pesados | **ANP**, cadastro de revendedores. Link a incluir. | Primária | O total de postos não mostra a capacidade de atender caminhões; esse dado pode existir só junto às distribuidoras (Abegás). |
| I08 | Rede de gás e distribuição de biometano | **Abegás** e **ABiogás.** Parceria noticiada em https://eixos.com.br/combustiveis-e-bioenergia/biocombustiveis/distribuidoras-de-gas-e-produtores-de-biometano-formam-parceria/ | Primária | Matéria sem data clara. |

## 5. Lacunas conhecidas e como tratá-las

| Lacuna | Risco | Tratamento |
|---|---|---|
| Pontos de recarga **adequados a caminhões pesados** | O argumento central fica sem número oficial. | Citar o estudo da Mirow & Co. como fonte qualitativa e pedir o dado à ABVE ou a operadoras. Se montar contagem própria, descrever critério e data. Preferir "ainda insuficiente para caminhões pesados, segundo X" a "não existe". |
| Preço do biometano | Valor mais sensível do cenário de gás renovável. | Selo ilustrativa, faixa editável e nota sobre variação por contrato, região e certificação. |
| Intensidade de carbono do diesel comparável à de E01 | Critérios diferentes distorcem o resultado. | Fixar uma base única de ciclo de vida para todas as alternativas. |
| Preço e consumo de caminhões a gás e elétricos | Sem série pública. | Faixas ilustrativas baseadas em fichas de fabricantes, com fonte por linha. |
| Termos de uso de dados derivados (GHG Protocol, ANP) | Redistribuir valores em JSON aberto pode exigir citação ou autorização. | Ler licenças e termos e registrá-los em `LICENSE-DATA.md`. |

## 6. Parâmetros do simulador × fontes

| Parâmetro | Unidade | Fontes |
|---|---|---|
| Preço da energia | R$/L, R$/m³, R$/kWh | P01, P03, P04, P05, P06, P07, P08 |
| Consumo | km/L, km/m³, kWh/km | V02 |
| Conteúdo energético (PCI) | MJ por unidade | E03 (GHG Protocol / BEN) |
| Sobrepreço do veículo | R$ | V02, V03, V04 |
| Manutenção | R$/km | V01, V05 |
| Intensidade de carbono | gCO₂eq/MJ ou kg/MWh | E01, E02, E04, E05 |
| Teor de biodiesel no diesel B | % v/v | E06 |
| Quilometragem anual | km/ano | V01, V05 |
| Horizonte e taxa de desconto | anos, % a.a. | Premissas do usuário, documentadas em `docs/metodologia.md` |

Os valores usados pelo simulador (com ID de fonte e selo em cada linha) ficam em `data/parameters.json` (validado por `schemas/parameters.schema.json`).

## 7. Registro de aquisição: `data/manifest.json`

Este documento diz **de onde** vem cada dado. O `manifest.json` registra **o que foi efetivamente baixado**: quais arquivos, quando, de onde e com qual conteúdo. Ele é versionado no git, enquanto os arquivos em `data/raw/` não são.

### Para que serve

- **Rastreabilidade:** cada número publicado leva ao arquivo e à data de download que o originou.
- **Reprodutibilidade:** como os arquivos brutos não estão no git, o manifest permite conferir se um novo download é idêntico ao anterior.
- **Atribuição:** os campos `source_id` e `retrieved_at` dos JSONs em `data/processed/` vêm dele.

### Regra de preenchimento: uma entrada por arquivo

Cada arquivo em `data/raw/` tem sua **própria entrada**. Se a série da ANP vem em 13 arquivos semestrais, são 13 entradas, todas com `source_id: "P01"`. O ID liga a entrada à linha correspondente neste documento; cada arquivo tem checksum, número de linhas e período próprios.

Ficam **fora** do manifest os parâmetros digitados à mão (preços de caminhões, consumos e fatores extraídos de planilhas). Eles vivem em `data/parameters.json`, com ID de fonte e selo por linha.

### Campos

| Campo | Obrigatório | Descrição | Exemplo |
|---|---|---|---|
| `source_id` | Sim | ID da fonte neste documento. | `"P01"` |
| `file` | Sim | Caminho do arquivo, relativo à raiz do repositório. | `"data/raw/anp/ca-2026-01.csv"` |
| `origin_url` | Sim | Página ou endereço do arquivo de onde veio. | `"https://www.gov.br/anp/..."` |
| `acquisition` | Sim | Como foi obtido: `"manual"` (baixado à mão) ou `"auto"` (baixado pelo pipeline). | `"manual"` |
| `retrieved_at` | Sim | Data do download, no formato `AAAA-MM-DD`. | `"2026-10-07"` |
| `sha256` | Sim | Impressão digital do arquivo (explicada abaixo). | `"9f86d081..."` |
| `rows` | Não | Número de linhas de dados, sem o cabeçalho, para arquivos tabulares. | `412380` |
| `date_range` | Não | Primeira e última data presentes nos dados. | `["2026-01-04", "2026-06-27"]` |
| `notes` | Não | Observação livre. | `"1º semestre de 2026, parcial"` |

O arquivo também tem `schema_version` e `generated_at` na raiz.

