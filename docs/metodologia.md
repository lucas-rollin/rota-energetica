# Metodologia

Documento de método do **Rota Energética**. Define o que o simulador calcula, com quais premissas e onde ele deixa de valer. Os IDs (P01, E01, V01...) remetem ao catálogo de [`data/sources.json`](../data/sources.json) e ao guia de [`fontes.md`](fontes.md).

Trechos marcados **[a definir]** indicam valores ainda sem fonte ou decisão; não são publicados como número.

> Os resultados são estimativas educacionais para comparar cenários. Não substituem estudo técnico, econômico ou ambiental para decisão de investimento.

## 1. Premissas e decisões de modelagem (MVP)

Os valores numéricos (taxa, janela, faixas) ficam nas seções indicadas e em `parameters.json`; esta tabela só registra a escolha e o motivo.

| Dimensão | Escolha no MVP | Racional |
|---|---|---|
| **Alternativas** | Diesel B, GNV (GNC), Biometano, Elétrico a bateria | Rotas com oferta comercial no Brasil para cavalos mecânicos pesados |
| **Canal de preço** | Preço de bomba (rede pública) para todas as alternativas | Existe série oficial para diesel e GNV (ANP); evita comparar gás de tarifa industrial com diesel de bomba |
| **Veículo de referência** | Cavalo mecânico rodoviário, um modelo nominal por alternativa (seção 2) | Ancora os números em modelos comercializados no país |
| **Estado de referência** | Santa Catarina, com média nacional como contexto | Filtro da série ANP por estado e referência para a futura inclusão da tarifa TG6 da SCGÁS (seção 9). Se a amostra de GNV no estado for pequena, usa-se a série nacional (seção 5.2) |
| **Moeda e desconto** | Valores reais na data-base; taxa de desconto real (seção 4.2) | Evita projetar inflação sem fonte. O valor padrão é ilustrativo |
| **Evolução de preços** | Constante em termos reais; sensibilidade por deslocamento percentual (seção 8.1) | Projeções por energia não foram avaliadas no MVP |
| **Valor residual** | Parâmetro com faixa ampla, incluído no fluxo do TCO (seção 4.3) | Omiti-lo enviesaria a comparação contra gás e elétrico |
| **Fronteira de emissões** | Poço à roda, base regulatória única (seção 6) | Só a combustão não é comparável com combustíveis renováveis |
| **Poluentes locais** | Qualitativo no MVP | Sem dado medido levantado |
| **Preço padrão** | Mediana de uma janela recente da série ANP, calculada pelo pipeline (seção 5.2) | Reprodutível, sem digitação manual |

O que fica fora do modelo está na [seção 9](#9-fronteira-do-modelo).

## 2. Veículos de referência

Cada alternativa é ancorada em um modelo vendido no Brasil, com ficha e preço citados. O simulador compara tecnologias, não marcas; o usuário pode editar qualquer valor.

| Alternativa | Modelo | Configuração | Ficha | Fontes |
|---|---|---|---|---|
| Diesel B | Scania R 460 A6x2NA (Super) | 6x2 | [Ficha Scania](https://www.solucoesscania.com.br/wp-content/uploads/2026/10/super-r460-6x2-1.pdf) | V06, V07 |
| GNV / Biometano | Scania G 460 A6x2NA (gás, CNG) | 6x2 | [Ficha Scania](https://www.solucoesscania.com.br/wp-content/uploads/2026/04/especificacoes-tecnicas-g460-6x2-gas-cng.pdf) | V06, V07 |
| Elétrico | Sany SE 588 (versão Standard) | 6x4 | [Folheto Sany](https://mail.sanydobrasil.com/wp-content/uploads/2026/04/7-SE588-Standard.pdf) | V08 |

Diesel e gás usam chassi 6x2 e motor de 460 hp, mas **as fichas são de linhas de cabine diferentes**: a do diesel é da linha R e a do gás, da linha G. Os preços FIPE usados são do R 460 para os dois. Por isso a comparação não isola totalmente o efeito do combustível. O elétrico é o único cavalo mecânico pesado de longa distância com preço e ficha encontrados no Brasil (V08). Reserva a gás: Iveco S-Way NG 460 (V09).

### Limitações que o site declara junto da comparação

- **Eixos diferentes** (6x2 e 6x4): afeta preço, peso e consumo.
- **Cabines diferentes** entre as fichas de diesel e gás (R e G).
- **As fichas não trazem consumo nem autonomia.** Esses valores vêm de imprensa e têm selo **Ilustrativa**.
- **Elétrico de fabricante recém-chegado:** poucas unidades vendidas, sem histórico de revenda, vida útil da bateria declarada pelo fabricante.
- **Preços de lista (FIPE)** não são preços de negociação de grandes frotas.
- **Comparação a preço de bomba** não representa uma frota com abastecimento próprio (seção 9).

## 3. Modelo de cálculo

### 3.1 Notação

| Domínio | Símbolo | Significado | Unidade |
|---|---|---|---|
| **Operação e veículo** | $D$ | Quilometragem anual | km/ano |
| | $V_0$ | Preço de aquisição do veículo zero km | R$ |
| | $\mathit{fr}$ | Fração de valor residual ao fim do horizonte | fração de $V_0$ |
| | $C$ | Consumo, na unidade original da energia | km/L, km/m³ ou km/kWh |
| | $C_\text{diesel}$ | Consumo do caminhão a diesel | km/L |
| | $C_\text{bateria}$ | Consumo do elétrico medido na bateria | km/kWh |
| | $C_\text{rede}$ | Consumo do elétrico medido na tomada, $C_\text{bateria} \cdot \eta$ | km/kWh |
| | $\eta$ | Eficiência de recarga (energia na bateria ÷ energia da rede) | fração |
| | $\text{capacidade}_\text{útil}$ | Capacidade útil de armazenamento de energia | L, m³ ou kWh |
| | $f_\text{red}$ | Fator de redução de autonomia (carga, margem, clima) | fração |
| **Custos e finanças** | $P$ | Preço da energia na bomba ou posto público | R$/L, R$/m³ ou R$/kWh |
| | $P_\text{arla}$ | Preço do ARLA 32 | R$/L |
| | $a$ | Consumo de ARLA 32 por litro de diesel | L/L |
| | $M$ | Manutenção, desgaste e pneus | R$/km |
| | $h$ | Horizonte de análise | anos |
| | $t$ | Ano do fluxo de caixa, $t \in \{1, \dots, h\}$ | anos |
| | $r$ | Taxa de desconto real anual | fração a.a. |
| | $\text{VP}_\text{oper}$ | Valor presente dos custos operacionais | R$ |
| | $\text{VP}_\text{res}$ | Valor presente do valor residual no ano $h$ | R$ |
| | $\text{TCO}$ | Custo total de propriedade | R$ |
| | $\text{km}_\text{niv}$ | Quilômetros rodados descontados a valor presente | km |
| | $\text{custo}_\text{niv}$ | Custo nivelado por quilômetro | R$/km |
| **Emissões e energia** | $\text{PCI}$ | Poder calorífico inferior do combustível | MJ/L ou MJ/m³ |
| | $I$ | Intensidade de carbono poço à roda | gCO₂eq/MJ |
| | $I_\text{fóssil}$ | Intensidade da parcela fóssil do diesel | gCO₂eq/MJ |
| | $I_\text{biodiesel}$ | Intensidade do biodiesel | gCO₂eq/MJ |
| | $b$ | Teor volumétrico de biodiesel no diesel B | fração v/v |

### 3.2 Custo por km

```text
custo energético/km   = P / C
custo de ARLA/km      = a · P_arla / C_diesel          (somente diesel)
custo operacional/km  = custo energético + ARLA + M    (+ perda de carga útil, opcional)
```

`a` é o consumo de ARLA 32 por litro de diesel (**[a definir]**, fabricante). A ficha do Scania a gás informa que ele não tem tanque de ARLA; o diesel tem tanque de 105 L, mas a ficha não informa o consumo. Para o elétrico, `C` é medido **na tomada**: `C_rede = C_bateria · η` (em km/kWh, o consumo na tomada é menor que o da bateria), com `η` a eficiência de recarga (**[a definir]**).

### 3.3 TCO e custo nivelado

Fluxos anuais no fim de cada ano, investimento no ano 0:

```text
custo anual_t   = D · custo operacional/km
VP operacional  = Σ_{t=1..h} custo anual_t / (1+r)^t
VP residual     = fr · V0 / (1+r)^h
TCO             = V0 + VP operacional − VP residual
km nivelados    = Σ_{t=1..h} D / (1+r)^t
custo nivelado  = TCO / km nivelados          (R$/km)
```

O custo nivelado desconta os km na mesma taxa dos custos, o que mantém a comparação coerente entre alternativas com perfis de gasto diferentes. O site também mostra o custo operacional por km sem desconto, por ser o número mais intuitivo.

### 3.4 Emissões

```text
energia por km (MJ/km)      = PCI / C           (combustíveis)
                            = 3,6 / C_rede      (elétrico, C_rede em km/kWh)
emissões por km (gCO₂eq/km) = energia por km · I
emissões anuais             = D · emissões por km
```

Para o diesel B, a intensidade é a mistura ponderada pelo teor de biodiesel `b`:

```text
I_dieselB = (1 − b) · I_fóssil + b · I_biodiesel
```

### 3.5 Autonomia e tempo de abastecimento

```text
autonomia útil (km) = capacidade útil · C · f_red
```

O fator de redução cobre carga, janela de uso da bateria, temperatura e margem de segurança. O tempo de reabastecimento ou recarga é mostrado como métrica; **não entra no TCO** no MVP.

### 3.6 Comparação entre alternativas

O diesel é a linha de base. O site mostra diferença absoluta e relativa de custo por km, TCO e emissões, o **ponto de equilíbrio** do preço de cada energia (preço em que duas alternativas empatam no TCO) e um gráfico tornado de sensibilidade.

## 4. Parâmetros e convenções

### 4.1 Convenções de unidade

- Taxas e teores em **fração decimal** nos JSON (0,10; 0,15). A interface exibe percentual.
- Preços em R$ da data-base dos dados. Brent em **US$/barril**, apenas como contexto, sem conversão cambial no MVP.
- Energia em MJ para comparação; um único PCI por combustível, com a mesma fonte para todas as alternativas.

### 4.2 Parâmetros e correspondência de dados (`parameters.json`)

| Parâmetro | Unidade | Origem | Observação |
|---|---|---|---|
| Preço do diesel S10 | R$/L | Derivado de P01 | Seção 5.2 |
| Preço do GNV | R$/m³ | Derivado de P01 | Seção 5.2 |
| Preço do biometano | R$/m³ | P05 | **Ilustrativa**, faixa editável; varia por contrato, região e certificação |
| Tarifa do elétrico (recarga pública) | R$/kWh | P08 | **Ilustrativa**; valor de trabalho atual (0,82) sem fonte |
| Consumo diesel e gás | km/L, km/m³ | V07 | Fichas não trazem consumo. Imprensa cita 2,8 km/L (diesel 460 cv) e 2,7 km/m³ (gás) |
| Consumo elétrico (bateria) | km/kWh | V08 | Derivado de imprensa: 588 kWh por 350 km (carregado) a 500 km (vazio), ou seja, 0,6 a 0,85 km/kWh (1,7 a 1,2 kWh/km), supondo toda a capacidade utilizável. O valor 0,8 do `parameters.json` corresponde ao caso vazio. Dividir pela tomada com `η` |
| PCI | MJ/L, MJ/m³ | E03 | **Um valor único para GNV e biometano** (hoje 38 e 36 no `parameters.json`) |
| Intensidade de carbono | gCO₂eq/MJ | E01, E02, E04, E05 | Seção 6 |
| Preço do veículo diesel e gás | R$ | V06 | FIPE. Prêmio do gás sobre o diesel: 5% / 12% / 25% (baixo/base/alto) |
| Preço do veículo elétrico | R$ | V08 | R$ 1,5 / 1,8 / 2,1 milhões (imprensa); a versão coberta pelo preço (Standard ou Composite) **[a definir]** |
| Manutenção e pneus | R$/km | V01, V05 | Fatores relativos ao diesel, **Ilustrativos** |
| ARLA 32 | L por L de diesel | Fabricante | **[a definir]** |
| Eficiência de recarga η | fração | Fabricante | **[a definir]** |
| Valor residual fr | fração de V0 | Seção 4.3 | Faixa ampla |
| Quilometragem anual | km/ano | V01, V05 | 120.000 (padrão atual) |
| Horizonte | anos | Premissa | 5 |
| Taxa de desconto real | a.a. | Premissa | 10% (6% a 14%), ilustrativa |
| Teor de biodiesel | fração | E06 | **0,15 (B15)**, vigente desde 01/08/2025; B16 previsto para 2027 |

### 4.3 Valor residual

- **Diesel:** derivado da curva de desvalorização da FIPE (V06) para o modelo de referência, por idade.
- **Gás:** fator do diesel com redução por menor liquidez de revenda. Valor de redução **[a definir]**.
- **Elétrico:** faixa ampla, sem série de revenda no Brasil. Valores **[a definir]**.

Todos entram com `baixo / base / alto` e selo **Ilustrativa**.

### 4.4 Carga útil

Pesos em ordem de marcha: Scania R 460 diesel, 9.407 kg; Scania G 460 gás, 9.299 kg (cabines diferentes, não é comparação direta); Sany SE 588, cerca de 12,2 t na leitura do folheto e 12,9 t segundo a imprensa. O elétrico 6x4 pesa de 2,8 a 3,5 t a mais que o diesel 6x2, mas parte da diferença vem do eixo adicional. O folheto indica capacidade máxima de tração de 60 t, enquanto a imprensa cita PBTC de 80 t (75 t no Brasil, com 1 t extra no eixo dianteiro para elétricos). O modelo não usa nenhum desses valores até que a divergência seja resolvida **[a definir]**.

O simulador oferece um parâmetro opcional de **perda de receita por redução de carga útil**, **desligado por padrão**, com a nota de que o efeito depende da carga transportada. Nas fichas atuais não há evidência de penalidade de peso para o gás.

## 5. Tratamento dos dados de preço

### 5.1 Séries

| Série | Fonte | Tratamento |
|---|---|---|
| Diesel S10 e GNV, preço de bomba | P01 | Média semanal por localidade, depois **mediana** das localidades do estado, por semana |
| Brent | P02 | Média semanal em US$/barril |
| Referência regulatória do diesel | P03 | Marco no gráfico de volatilidade, não preço padrão |

A série é exibida em R$/MJ (conversão pelo PCI) para comparar energias, e na unidade original para leitura direta.

### 5.2 Preço padrão do simulador

O preço padrão de diesel e GNV é a **mediana das últimas 12 semanas** da série do estado de referência (SC). A janela de 12 semanas é uma escolha do projeto. O pipeline calcula e grava o valor e a janela; ninguém digita. Se a amostra do estado for pequena (principalmente GNV), usa a série nacional e marca isso. Número mínimo de localidades: **[a definir]**.

O selo do preço padrão é **Primária** apenas se a conversão for de unidade; mediana e janela fazem dele **Adaptada**.

### 5.3 Regimes de preço

Preços de bomba variam semanalmente; tarifas de distribuidoras de gás mudam em degraus semestrais. O site mostra a série com o histórico completo e indica que o preço padrão é uma fotografia, não uma previsão.

## 6. Emissões

### 6.1 Fronteira e base única

- **Poço à roda** para todas as alternativas, com uma única base de ciclo de vida declarada.
- Valores de gás vêm de **valores regulatórios** (CNPE, Res. 4/2026): GNV 76,85 e biometano 8,55 gCO₂eq/MJ (E01). São valores para a meta do mandato, não ACV de uma planta específica. O site explica isso.
- **Diesel:** adotar a referência fóssil do RenovaBio/ANP (E04, E05) para manter a mesma lógica regulatória do gás. Valor e intensidade do biodiesel: **[a definir]**. O 75,5 do `parameters.json` é provisório.
- **Potencial de aquecimento global:** GWP100, na mesma base da fonte regulatória usada. Sensibilidade com GWP20 para o metano fica fora do MVP.

### 6.2 Elétrico

Usa a **média anual** do fator de emissão do SIN publicada pelo MCTI (E02), e não o maior valor mensal. O 8,03 gCO₂eq/MJ atual vem de 28,9 kg/MWh, que é um valor mensal de 2025. Conversão: 1 kg CO₂/MWh = 0,278 gCO₂/MJ.

### 6.3 Biogênico e fóssil

Biometano e biodiesel reduzem a intensidade por conterem carbono biogênico. O site distingue emissão fóssil de biogênica e remete à metodologia do RenovaBio (E05).

### 6.4 Poluentes locais e metano

No MVP, NOx e material particulado são **qualitativos**: zero na ponta do escapamento para o elétrico e limites regulatórios do PROCONVE como teto para os demais (fonte **[a definir]**). As fichas Scania indicam norma Euro 6 para os dois motores. O **escape de metano** (motor e cadeia a montante) pode reduzir a vantagem do gás; não se afirma ganho líquido sem verificar se E01 o considera.

## 7. Autonomia e infraestrutura de abastecimento

### 7.1 Autonomia

| Alternativa | Referência | Observação |
|---|---|---|
| Diesel | **[a definir]** | A ficha informa tanques de 395 L + 355 L (750 L); não informa consumo |
| Gás (GNC) | Até 650 km (imprensa, Scania) | A ficha G 460 informa 4×95 + 4×80 + 2×235 L de capacidade dos tanques (1.170 L no total, volume do cilindro, não m³ de gás) e **não informa autonomia** |
| Elétrico | Cerca de 350 km carregado, até 500 km vazio (imprensa); recarga de 20% a 80% em até 55 min (folheto, duas pistolas de 600 A); opção de troca de bateria em 5 min (folheto) | A autonomia não consta no folheto; a infraestrutura de troca de bateria não foi avaliada |

### 7.2 Corredores de referência

O veredito de viabilidade compara, em **3 a 5 corredores curados manualmente**, o maior intervalo entre pontos de abastecimento adequados a caminhões com a autonomia útil de cada alternativa. Resultado: viável, viável com planejamento ou inviável.

- Critérios para um ponto contar: adequado a caminhões, em operação, com data e fonte da verificação.
- Candidatos: ligações de Curitiba ao litoral catarinense (BR-376/BR-101) e o eixo da BR-376 em Ponta Grossa, onde há posto de GNV de alta vazão (I09). A lista de pontos em SC **[a definir]**.
- Dados de recarga para carros de passeio (I01) **não contam** como infraestrutura para caminhões.
- Em uma eventual geocodificação em escala, a licença dos dados precisa ser compatível (por exemplo, a ODbL do OpenStreetMap exige atribuição e compartilhamento pela mesma licença).

## 8. Incerteza e validação

### 8.1 Faixas e sensibilidade

Todo parâmetro tem `value_low`, `value` e `value_high` no esquema v2. Parâmetros **Ilustrativos** sempre têm faixa. O painel mostra o gráfico tornado e os pontos de equilíbrio. Preços de energia aceitam deslocamento percentual de ±30% como cenário.

### 8.2 Validação cruzada

Uma implementação de referência em Python (`pipeline/reference`) e a versão TypeScript (`web/src/lib/calc`) devem produzir os mesmos resultados em cenários fixos. Pelo menos **3 cenários de referência conferidos à mão**, com planilha de apoio versionada, entram nos testes de ambos os lados. Tolerância numérica: **[a definir]**.

### 8.3 Verificações dos dados

As checagens do pipeline e da CI estão descritas em [`pipeline/README.md`](../pipeline/README.md). Em particular: todo `source_id` em `data/processed/` consta no manifest, e todo `source_id` do manifest consta no catálogo de [`data/sources.json`](../data/sources.json).

## 9. Fronteira do modelo

| Tópico | No MVP | Fora do MVP | Observação |
|---|---|---|---|
| **Canal de abastecimento** | Preço de bomba (rede pública) para todas as alternativas | Base própria: tarifa TG6 Frotista da SCGÁS, tarifa de alta tensão (grupo A), diesel a granel | Exige tarifas por distribuidora, cotação de posto e carregador e reforço de rede |
| **Tecnologia do gás** | GNC | GNL e bio-GNL | Não avaliado no MVP |
| **Finanças e tributos** | Compra à vista, sem financiamento, em moeda real | Financiamento (por exemplo linhas do BRDE), créditos de ICMS, incentivos | Depende do regime tributário e do perfil de crédito de cada transportadora |
| **Tempo de operação** | Tempo de recarga ou abastecimento exibido como métrica | Custo de parada monetizado | Exige modelar jornada e rotatividade de carga |
| **Poluentes e emissões** | CO₂eq fóssil e biogênico (GWP100) | NOx e material particulado medidos; GWP20 para metano | Não avaliado no MVP |
| **Geografia** | Santa Catarina | Outros estados (Paraná como segunda opção) | No Paraná não foi encontrada tarifa frotista publicada (P10) |

**Efeito esperado de excluir a base própria.** O MVP compara tudo a preço de bomba. Ele, portanto, **não captura a economia de uma frota com abastecimento próprio**, que tende a ser relevante para o gás (a distribuidora Comgás cita de 30% a 40% de economia sobre o diesel de posto convencional; é afirmação de distribuidora, não verificada aqui) e também para o elétrico. Por outro lado, o MVP também **não inclui o investimento** em posto de GNC ou carregador de alta potência, que pesa contra essas alternativas. O sinal líquido depende do tamanho da frota. Por isso o site afirma que o resultado de bomba **não deve ser lido como o de uma frota com base própria**. O usuário pode testar o cenário editando manualmente os preços de energia e o preço do veículo.

## 10. O que o site deve dizer

Além das limitações da seção 2:

1. Os resultados são estimativas educacionais.
2. Valores marcados **Ilustrativa** são exemplos editáveis, sem série pública confiável.
3. Valores de intensidade de carbono do gás são regulatórios, não medições de planta.
4. Cada gráfico acompanha resumo textual e tabela.