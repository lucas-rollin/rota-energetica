# Metodologia

Documento metodológico do **Rota Energética**. Define o que o simulador calcula, suas fontes de dados, premissas e limitações.

Os IDs (P01, E01, V01...) remetem ao catálogo de [`data/sources.json`](../data/sources.json) e ao guia de [`fontes.md`](fontes.md). Os parâmetros numéricos ficam em `parameters.json`, e os dados derivados são gerados pelo pipeline Python.

> Os resultados são estimativas educacionais para comparação de cenários. Não substituem estudo técnico, econômico ou ambiental para decisões de investimento.

## 1. Escopo e premissas do MVP

O MVP compara quatro alternativas energéticas para veículos pesados rodoviários: Diesel B, GNV (GNC), biometano e eletricidade por bateria.

| Dimensão | Decisão no MVP | Justificativa e limitação |
|---|---|---|
| Alternativas | Diesel B, GNV, biometano e elétrico a bateria | Tecnologias de interesse para descarbonização do transporte pesado |
| Canal de abastecimento | Preços públicos de referência | Evita modelar contratos e infraestrutura próprios de cada frota |
| Veículos | Modelos nominais comercializados no Brasil | Ancoram os cálculos em referências concretas, sem isolar perfeitamente o efeito da tecnologia |
| Geografia | Santa Catarina como referência; Brasil como fallback para preços de combustíveis quando necessário | Mantém o escopo regional e permite lidar com amostras insuficientes |
| Preços | Valores nominais em reais na data de referência dos dados | O simulador não prevê preços futuros |
| Evolução dos preços | Preços constantes em termos reais durante o horizonte financeiro | Permite comparar alternativas sem introduzir projeções especulativas |
| Horizonte financeiro | Cinco anos por padrão, editável | Premissa de cenário, não previsão da vida útil dos veículos |
| Financiamento | Compra à vista | Financiamento e estrutura de capital ficam fora do MVP |
| Emissões | Poço à roda, com fatores de emissão documentados | Considera emissões a montante e durante o uso conforme a fronteira de cada fonte |
| Incerteza | Parâmetros editáveis e faixas baixo/base/alto quando justificadas | Permite explorar cenários sem sugerir precisão inexistente |
| Infraestrutura | Não modelada economicamente nem geograficamente | Custos de postos próprios, carregadores e reforço de rede ficam fora do MVP |

Os dados e resultados são classificados conforme sua natureza:

- **Primária:** valor observado ou publicado diretamente pela fonte, sem transformação substantiva.
- **Adaptada:** valor derivado de dados publicados por meio de filtros, agregações, conversões ou cálculos documentados.
- **Ilustrativa:** hipótese ou estimativa sem evidência suficiente para ser tratada como valor observado. Deve ser identificada na interface e permitir edição quando relevante.

A classificação descreve a origem do valor, não garante sua precisão.

## 2. Veículos de referência

Cada alternativa utiliza um modelo nominal como referência. O simulador compara cenários representativos, não marcas ou veículos equivalentes em todos os aspectos.

| Alternativa | Modelo | Configuração | Fonte |
|---|---|---|---|
| Diesel B | [Scania R 460 A6x2NA (Super)](https://www.solucoesscania.com.br/wp-content/uploads/2026/10/super-r460-6x2-1.pdf) | 6x2 | V06, V07 |
| GNV (GNC) | [Scania G 460 A6x2NA](https://www.solucoesscania.com.br/wp-content/uploads/2026/04/especificacoes-tecnicas-g460-6x2-gas-cng.pdf) | 6x2 | V06, V07 |
| Biometano | Mesmo veículo de referência do GNV | 6x2 | V06, V07 |
| Elétrico | [Sany SE 588 Standard](https://mail.sanydobrasil.com/wp-content/uploads/2026/04/7-SE588-Standard.pdf) | 6x4 | V08 |

O veículo a gás também serve como referência técnica para o cenário a biometano. Diesel e gás utilizam linhas de cabine diferentes. O elétrico possui configuração de eixos diferente, e suas características de preço, peso, consumo e autonomia não são diretamente equivalentes às dos modelos a combustão.

### Limitações apresentadas junto dos resultados

- As diferenças observadas não podem ser atribuídas exclusivamente à tecnologia de propulsão.
- Preços de tabela ou FIPE não representam necessariamente os valores negociados por grandes frotas.
- Valores de consumo e autonomia derivados de imprensa são estimativas, não ensaios padronizados.
- O veículo elétrico possui disponibilidade comercial e histórico de revenda limitados no mercado brasileiro.
- O cenário a biometano utiliza o veículo a GNV como referência técnica.
- O simulador não estima a viabilidade operacional de cada tecnologia em corredores rodoviários.

## 3. Dados de entrada e preços de energia

### 3.1 Fontes e tratamento

| Energia | Fonte principal | Indicador do MVP | Tratamento |
|---|---|---|---|
| Diesel S10 | ANP — Série Histórica de Preços de Combustíveis (P01) | Preço de revenda em R$/L | Série semanal por estado e referência nacional |
| GNV | ANP — Série Histórica de Preços de Combustíveis (P01) | Preço de revenda em R$/m³ | Série semanal por estado e referência nacional |
| Biometano | Fonte pública documentada, quando disponível (P05) | Preço de referência em R$/Nm³ | Valor ilustrativo editável quando não houver série representativa |
| Eletricidade | ANEEL — tarifas homologadas das distribuidoras (P06) | Referência em R$/kWh | Tarifa e tributos aplicáveis conforme as hipóteses documentadas |

A comparação utiliza preços públicos de referência, não preços efetivamente negociados por transportadoras. O preço de revenda de combustíveis e a tarifa de fornecimento de eletricidade representam etapas distintas da cadeia de aquisição. Portanto, seus valores não são perfeitamente equivalentes.

Para a eletricidade, a soma de TE, TUSD e tributos só será apresentada como preço final estimado quando a incidência tributária e os demais componentes relevantes tiverem sido calculados de forma consistente. A tarifa homologada, isoladamente, não representa necessariamente o valor final da conta.

Se não houver informação suficiente para calcular uma tarifa final comparável, o parâmetro será identificado como estimativa tarifária, com suas hipóteses e limitações explícitas. Não será apresentado como preço médio observado de recarga pública.

Para o biometano, o preço de produtor, o preço de fornecimento e o preço de abastecimento veicular são indicadores distintos. Uma referência de fornecimento não será apresentada como média de revenda.

### 3.2 Preço padrão

Para Diesel e GNV, o preço padrão é a mediana das últimas 12 semanas disponíveis da série do estado de referência.

1. Filtrar os registros válidos para Santa Catarina.
2. Agregar as observações por semana e localidade, conforme o esquema publicado pela ANP.
3. Calcular a mediana das localidades por semana.
4. Calcular a mediana das últimas 12 semanas válidas.
5. Se a cobertura estadual for insuficiente, utilizar a série nacional e registrar o fallback nos dados processados.

O número mínimo de localidades e a regra de cobertura devem ser definidos em `parameters.json` ou na configuração do pipeline antes da publicação.

Para biometano e eletricidade, o valor padrão é derivado da fonte ou hipótese documentada. Não se calcula uma mediana histórica quando não existe uma série adequada.

Todo preço padrão deve registrar, no mínimo, a unidade, a data de referência, a origem, a transformação aplicada e a classificação de confiabilidade.

### 3.3 Histórico de preços

O histórico de Diesel e GNV será exibido quando houver cobertura suficiente para produzir uma série compreensível e rastreável.

O histórico de biometano ou eletricidade só será exibido se os dados disponíveis tiverem periodicidade, unidade, cobertura e significado econômico adequados à comparação. Não serão criadas séries artificiais para preencher lacunas.

Os preços são referências históricas, não previsões. Os cenários financeiros mantêm os preços constantes em termos reais, salvo quando o usuário os altera.

## 4. Modelo econômico

### 4.1 Parâmetros

| Símbolo | Significado | Unidade |
|---|---|---|
| D | Quilometragem anual | km/ano |
| V₀ | Preço de aquisição do veículo | R$ |
| fr | Fração do valor residual ao fim do horizonte | fração de V₀ |
| C | Eficiência de consumo na unidade de origem | km/L, km/m³ ou km/kWh |
| P | Preço da energia | R$/L, R$/m³ ou R$/kWh |
| Pₐᵣₗₐ | Preço do ARLA 32 | R$/L |
| a | Consumo de ARLA por litro de diesel | L/L |
| M | Manutenção e pneus | R$/km |
| h | Horizonte financeiro | anos |
| r | Taxa de desconto real anual | fração |
| η | Eficiência de recarga da bateria | fração |
| PCI | Poder calorífico inferior | MJ/L ou MJ/m³ |
| I | Intensidade de carbono poço à roda | gCO₂eq/MJ |

Os parâmetros editáveis devem ter valores padrão válidos, unidades explícitas e limites de entrada definidos. Quando um valor for ilustrativo, essa condição será apresentada ao usuário.

### 4.2 Custo energético e operacional por quilômetro

Para combustíveis líquidos e gasosos:

```text
custo energético/km = P / C
```

Para eletricidade, o consumo utilizado deve ser expresso em kWh retirados da rede:

```text
C_rede = C_bateria × η

custo energético/km = P / C_rede
```

Essa convenção pressupõe que `C_bateria` seja a distância percorrida por kWh armazenado na bateria e que `η` represente a razão entre a energia armazenada e a energia retirada da rede.

Se a fonte do consumo elétrico já informar o consumo medido na tomada, a eficiência de recarga não será aplicada novamente.

Para Diesel:

```text
custo de ARLA/km = a × P_arla / C_diesel

custo operacional/km =
    custo energético/km
    + custo de ARLA/km
    + manutenção e pneus/km
```

Para as demais alternativas, o custo de ARLA é zero no modelo quando não houver consumo desse reagente. Outros custos não modelados não devem ser implicitamente tratados como inexistentes na operação real.

Se não houver fonte defensável para o consumo de ARLA ou para a manutenção, os valores devem ser identificados como ilustrativos. Não se deve apresentar um custo operacional completo como se todas as parcelas fossem observadas.

### 4.3 Custo total de propriedade (TCO)

O modelo considera aquisição à vista, custos operacionais anuais, desconto real e valor residual ao fim do horizonte.

```text
custo anual_t = D × custo operacional/km

VP operacional =
    Σ(t=1..h) custo anual_t / (1+r)^t

VP residual = fr × V₀ / (1+r)^h

TCO = V₀ + VP operacional − VP residual

km nivelados =
    Σ(t=1..h) D / (1+r)^t

custo nivelado/km = TCO / km nivelados
```

Os fluxos de caixa ocorrem ao fim de cada ano, e o investimento inicial ocorre no ano zero.

O custo nivelado divide o valor presente do TCO pelos quilômetros descontados no mesmo horizonte. O simulador também apresenta o custo operacional por quilômetro sem desconto, para facilitar a interpretação.

O TCO do MVP não inclui financiamento, seguros, impostos sobre propriedade, custos de infraestrutura energética, paradas operacionais monetizadas ou perda de receita por carga útil. Essas exclusões devem ser visíveis na interface.

### 4.4 Valor residual

O valor residual é um parâmetro necessário para evitar que a comparação financeira dependa apenas dos custos iniciais e operacionais.

- Diesel: estimativa baseada em referências de mercado disponíveis.
- GNV e biometano: estimativa parametrizada, sem presumir que a revenda tenha o mesmo comportamento do Diesel.
- Elétrico: estimativa parametrizada, reconhecendo a ausência de histórico suficiente para uma curva robusta de revenda.

Quando não houver evidência adequada, o valor residual será classificado como ilustrativo e permitirá cenários baixo, base e alto. Não será apresentada uma curva de desvalorização precisa sem dados que a sustentem.

### 4.5 Parâmetros financeiros

O cenário-base utiliza:

- Quilometragem anual: 120.000 km.
- Horizonte: cinco anos.
- Taxa de desconto real: 10% ao ano, com faixa editável de 6% a 14%.
- Preços de energia constantes em termos reais.
- Compra à vista, sem financiamento.

Esses valores são premissas ilustrativas de cenário, não médias representativas de todas as transportadoras.

## 5. Emissões e energia

### 5.1 Fronteira metodológica

O simulador utiliza emissões poço à roda sempre que houver fatores de emissão adequados e documentados para a alternativa. As fontes podem empregar metodologias e fronteiras diferentes; essas diferenças devem ser explicitadas.

Os valores regulatórios de intensidade de carbono para gás natural e biometano não serão descritos como medições de uma instalação específica. Sua aplicação deve respeitar a finalidade e a metodologia da fonte original.

### 5.2 Cálculos

Para combustíveis:

```text
energia por km (MJ/km) = PCI / C
```

Para eletricidade:

```text
energia por km (MJ/km) = 3,6 / C_rede
```

Para todas as alternativas:

```text
emissões por km (gCO₂eq/km) =
    energia por km × intensidade de carbono

emissões anuais (gCO₂eq/ano) =
    D × emissões por km
```

A intensidade do Diesel B deve considerar a mistura de diesel fóssil e biodiesel:

```text
I_dieselB =
    (1 − b) × I_fóssil
    + b × I_biodiesel
```

O teor de biodiesel e os fatores de emissão precisam corresponder à mesma base temporal e metodológica. Não se deve combinar fatores de fontes incompatíveis sem documentar a limitação.

Para eletricidade, utilizar o fator de emissão anual do Sistema Interligado Nacional (SIN), publicado pelo MCTI, quando disponível para o período de referência. O fator deve corresponder ao ano e à unidade efetivamente registrados nos dados processados.

As emissões são estimativas dependentes dos fatores selecionados. Não se deve inferir que um resultado numérico preciso representa a incerteza real da cadeia de energia.

### 5.3 Limitações ambientais

- O MVP apresenta CO₂ equivalente; não modela detalhadamente todos os poluentes atmosféricos.
- NOx e material particulado não recebem estimativas quantitativas no MVP.
- Não há análise de sensibilidade com GWP20 para o metano.
- As emissões de fabricação dos veículos e baterias só são incluídas se houver dados compatíveis com a fronteira adotada; caso contrário, ficam fora do cálculo.
- A comparação não substitui uma análise de ciclo de vida específica de veículo, combustível ou instalação.

## 6. Consumo, autonomia e abastecimento

O consumo energético por quilômetro é utilizado nos cálculos econômicos e ambientais. A autonomia é apresentada como informação auxiliar, não como prova de viabilidade em uma rota.

Quando a ficha técnica não informar consumo ou autonomia, os valores derivados de imprensa serão identificados como ilustrativos e acompanhados de suas fontes.

```text
autonomia estimada (km) =
    capacidade útil × eficiência de consumo × fator de redução
```

O fator de redução pode representar uma margem conservadora de operação, desde que sua definição e seu valor sejam documentados.

O tempo de abastecimento ou recarga pode ser apresentado como informação contextual se houver dados suficientes. Não entra no TCO do MVP.

A capacidade dos tanques de GNC expressa em volume geométrico dos cilindros não deve ser confundida com o volume de gás comercializado em m³ nas condições de referência.

A análise geográfica de postos, corredores rodoviários e carregadores adequados a veículos pesados fica fora do MVP.

## 7. Interface e comparação de cenários

A interface apresenta:

- Preços de referência, fontes e datas.
- Consumo energético e custo energético por quilômetro.
- Custo operacional por quilômetro, quando as parcelas estiverem suficientemente definidas.
- TCO e custo nivelado por quilômetro.
- Emissões por quilômetro e por ano.
- Diferenças absolutas e relativas em relação ao Diesel.
- Parâmetros editáveis e premissas ilustrativas claramente identificadas.

O usuário pode modificar os principais parâmetros para explorar cenários. As alterações são simulações condicionais aos valores escolhidos, não previsões.

O MVP não exige gráfico tornado, ponto de equilíbrio entre todas as alternativas, projeções futuras de preços ou otimização de rotas. Essas funcionalidades ficam para versões posteriores.

Os resultados devem ser acompanhados de resumo textual ou tabela, para que a interpretação não dependa exclusivamente dos gráficos.

## 8. Validação e qualidade dos dados

### 8.1 Validação dos cálculos

A implementação de referência em Python e a implementação TypeScript devem produzir resultados equivalentes para os mesmos parâmetros.

Antes da publicação, devem existir pelo menos três cenários de referência calculados manualmente, cobrindo:

1. Custo energético e operacional por quilômetro.
2. TCO e custo nivelado por quilômetro.
3. Consumo energético e emissões por quilômetro.

A tolerância numérica será definida conforme a grandeza e o arredondamento aplicado. Os testes devem cobrir também entradas inválidas, valores ausentes e limites dos parâmetros.

### 8.2 Validação do pipeline

O pipeline deve verificar:

- Esquema e tipos dos dados de entrada e saída.
- Unidades, datas e valores ausentes.
- Ausência de preços negativos ou valores fisicamente impossíveis.
- Cobertura mínima da série utilizada para produzir o preço padrão.
- Fallback nacional, quando aplicado, devidamente registrado.
- Correspondência entre os `source_id` dos dados processados e o catálogo de fontes.
- Reprodutibilidade dos arquivos gerados a partir das mesmas entradas.

A atualização dos dados não deve alterar silenciosamente as premissas de cálculo.

## 9. Fronteira do MVP e evolução futura

| Tema | MVP | Versões futuras |
|---|---|---|
| Preço de energia | Referências públicas e parâmetros ilustrativos identificados | Custos efetivos de contratos e abastecimento próprio |
| Eletricidade | Referência tarifária documentada | Tarifas de alta tensão, demanda contratada, mercado livre e recarga pública observada |
| GNV e biometano | Preço de referência, sem infraestrutura própria | Tarifas específicas para frotistas, contratos e custos de compressão e transporte |
| Diesel | Preço médio de revenda | Compras a granel e contratos empresariais |
| Finanças | Compra à vista, TCO simplificado | Financiamento, seguros, tributação e incentivos |
| Valor residual | Parâmetro editável, com incerteza documentada | Curvas próprias de revenda por tecnologia |
| Sensibilidade | Edição de parâmetros e comparação de cenários | Gráfico tornado e pontos de equilíbrio |
| Infraestrutura | Sem avaliação geográfica | Corredores, cobertura de postos e carregadores adequados a veículos pesados |
| Operação | Custos por quilômetro e quilometragem anual | Paradas monetizadas, jornada, carga útil e produtividade |
| Emissões | CO₂ equivalente com fatores documentados | Poluentes locais, GWP20 e análise de ciclo de vida mais detalhada |
| Geografia | Santa Catarina como referência | Expansão para outros estados |

A comparação a preços públicos de referência não representa o custo efetivo de aquisição de energia por uma frota com infraestrutura própria. O modelo não captura eventuais economias de escala em contratos ou abastecimento, nem os investimentos necessários para implantar essa infraestrutura.

## 10. Transparência dos resultados

O site deve deixar claro que:

1. Os resultados são estimativas educacionais, não previsões nem recomendações de investimento.
2. Os preços representam referências públicas, não necessariamente o custo efetivo de uma transportadora.
3. Os valores ilustrativos são hipóteses editáveis, não dados observados.
4. Veículos diferentes não constituem um experimento que isola o efeito da tecnologia.
5. O TCO exclui custos não modelados, especialmente infraestrutura e financiamento.
6. As emissões dependem da fronteira metodológica e dos fatores selecionados.
7. A incerteza dos dados pode ser maior do que a precisão exibida nos resultados.

Cada valor relevante deve permitir identificar sua unidade, fonte, data de referência e classificação. A interface deve distinguir resultados calculados a partir de dados observados daqueles que dependem significativamente de premissas ilustrativas.