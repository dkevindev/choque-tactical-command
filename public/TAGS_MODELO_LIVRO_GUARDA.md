# TAGS DO MODELO DO LIVRO DA GUARDA (Itens 1-16)

Este documento contém todas as tags que devem ser utilizadas no modelo DOCX do Livro da Guarda.

---

## CABEÇALHO

```
GOVERNO DO ESTADO DO CEARÁ
SECRETARIA DA SEGURANÇA PÚBLICA E DEFESA SOCIAL
REGIMENTO DE POLÍCIA MONTADA CEL. MOURA BRASIL

RELATÓRIO DO OFICIAL DE OPERAÇÕES (24h) – DO DIA {dataInicio} PARA O DIA {dataFim}.

Ao Senhor Subcomandante do Regimento de Polícia Montada Cel. Moura Brasil.
```

---

## 01. ESCALA DE SERVIÇO INTERNO (24h)

```
{#escalaServicoInterno}
- {nome}:
  {#policiais}
  {linha}
  {/policiais}
{/escalaServicoInterno}
```

**Exemplo de linha formatada:**
- `3º Sgt 12345 Silva (08h00-16h00)`

---

## 02. ESCALA DE SERVIÇO EXTERNO

```
{escalaServicoExterno}
```

**Valor padrão:** "Conforme escala anexa."

---

## 03. ESCALA DE PERMANÊNCIA

```
{#escalaPermanencia}
{posto} {numeral} {nomeGuerra} - {funcao} ({horario}){#observacao} - {observacao}{/observacao}
{/escalaPermanencia}
```

**Exemplo:**
- `3º Sgt 23456 Costa - Chefe de Permanência (24h)`

---

## 04. ESCALA DE RONDA

```
{#escalaRonda}
{posto} {numeral} {nomeGuerra} - {funcao} ({horario}){#observacao} - {observacao}{/observacao}
{/escalaRonda}
```

**Exemplo:**
- `Cb 34567 Oliveira - Ronda Motorizada (08h00-16h00)`

---

## 05. CONTROLE DE QUILOMETRAGEM DAS VTRs

```
{#controleKm}
VTR {placa}:
  KM Atual: {kmAtual}
  KM Anterior: {kmAnterior}
  KM Rodada: {kmRodada}
  {#valorAbastecimento}Abastecimento: R$ {valorAbastecimento}{/valorAbastecimento}
  {#litros}Litros: {litros}{/litros}
  {#motoristaNome}Motorista: {motoristaNome}{/motoristaNome}
{/controleKm}
```

**Exemplo:**
- `VTR CAV 05: KM Atual: 12500 | KM Anterior: 12300 | KM Rodada: 200`

---

## 06. CONTROLE DAS VTRS UTILIZADAS FORA DE ESCALA

```
{#viaturasForaEscala}
VTR: {viatura}
Motorista: {motorista.posto} {motorista.numeral} {motorista.nomeGuerra}
Saída: {horarioSaida} | Chegada: {horarioChegada}
Destino: {destino}
{/viaturasForaEscala}
```

**Exemplo:**
```
VTR: CAV 08
Motorista: 3º Sgt 23834 Alexandre
Saída: 10:00 | Chegada: 10:40
Destino: Água Mineral - Posto Shell
```

---

## 07. CONTROLES DE CONSUMO ÁGUA/ENERGIA ELÉTRICA

```
{#consumoServicos}
{nomeServico}:
  Leitura Final (07h00): {leituraFinal}
  Leitura Inicial (07h00): {leituraInicial}
  Consumo: {consumo}
{/consumoServicos}
```

**Exemplo:**
```
ENERGIA 01:
  Leitura Final: 15230
  Leitura Inicial: 15180
  Consumo: 50
```

---

## 08. CONTROLES DE ALIMENTAÇÃO DOS SOLÍPEDES

```
{#alimentacaoSolipedes}
{tipoAlimentacao}:
  Saldo Anterior: {saldoAnterior}
  Entrada: {entrada}
  Saída: {saida}
  Consumo: {consumo}
  Saldo Atual: {saldoAtual}
{/alimentacaoSolipedes}
```

**Tipos fixos:**
- CAVALO
- POTRO/ÉGUA
- SAL MINERAL
- ALFAFA
- FENO

**Exemplo:**
```
CAVALO:
  Saldo Anterior: 112
  Entrada: -
  Saída: -
  Consumo: 08
  Saldo Atual: 104
```

---

## 09. DOCUMENTOS EM ANEXO

```
{documentosAnexo}
```

**Exemplo:**
- "BI nº 123/2025, Relatório de Ocorrência, Termo de Entrega de Material"

---

## 10. CAVALHADA

```
{cavalhada}
```

**Exemplo:**
- "Treinamento realizado no picadeiro principal das 08h00 às 10h00 com 5 animais. Todos os cavalos apresentaram bom comportamento."

---

## 11. SUBSTITUIÇÕES DE SOLÍPEDE

```
Foram realizadas as seguintes substituições:

{#substituicoesSolipede}
Horário: {horario} | Local: {local}
Substituído: {solipedeSubstituido} → Substituto: {solipedeSubstituto}
{/substituicoesSolipede}
```

**Exemplo:**
```
Horário: 14h30 | Local: Portão Principal
Substituído: Trovão → Substituto: Relâmpago
```

---

## 12. PERMUTAS DE SERVIÇO

```
Foram realizadas as seguintes substituições (permutas de serviço):

{#permutasServico}
Horário: {horario} | Local: {local}
PM Substituído: {pmSubstituido.posto} {pmSubstituido.numeral} {pmSubstituido.nomeGuerra}
PM Substituto: {pmSubstituto.posto} {pmSubstituto.numeral} {pmSubstituto.nomeGuerra}
Autorizado por: {autorizadoPor.posto} {autorizadoPor.numeral} {autorizadoPor.nomeGuerra}
{/permutasServico}
```

**Exemplo:**
```
Horário: 14h00 | Local: Portão Principal
PM Substituído: Cb 12345 Silva
PM Substituto: Cb 23456 Costa
Autorizado por: 3º Sgt 34567 Oliveira
```

---

## 13. REMANEJAMENTOS DE SERVIÇO

```
{#remanejamentosServico}
Nome: {policial.posto} {policial.numeral} {policial.nomeGuerra}
Serviço Anterior: {horarioAnterior} - {servicoAnterior}
Serviço Atual: {horarioAtual} - {servicoAtual}
{/remanejamentosServico}
```

**Exemplo:**
```
Nome: Cb 45678 Santos
Serviço Anterior: 08h00-16h00 - Portão 1
Serviço Atual: 16h00-00h00 - Ronda
```

---

## 14. ATIVIDADES DOS SERVIÇOS OPERACIONAIS

```
{#atividadesOperacionais}
{ordem}. {localHorario} - {tipoOcorrencia} (Quantidade: {quantidade})
{/atividadesOperacionais}
```

**Exemplo:**
```
1. Portão Principal 08h00-16h00 - Revista de Viaturas (Quantidade: 45)
2. Ronda Externa 16h00-00h00 - Abordagens Preventivas (Quantidade: 12)
```

---

## 15. OCORRÊNCIAS

```
{#ocorrencias}
{numero}. {descricao}

DESPACHO DO SUB CMT DO RPMONT:
{despacho}

{/ocorrencias}
```

**Exemplo:**
```
01. A Cb PM 29098 Lorena, escalada na VTR CAV-11, no horário de 16h00 às 02h00, faltou o serviço ao qual estava escalada e que enviaria o atestado posteriormente.

DESPACHO DO SUB CMT DO RPMONT:
Cientifique-se o policial e aguarde apresentação do atestado médico.

02. Por volta das 10h30, o senhor Francisco Sigisnaldo da Rocha, CPF: 62249050376, da oficina A Projetar Auto Center veio a este quartel para dar manutenção no TA-01. Vale informar que foi feita a retirada de ar do sistema de combustível.

DESPACHO DO SUB CMT DO RPMONT:
Ciente. Mantenha registro da manutenção realizada.
```

---

## 16. PASSAGEM DE SERVIÇO

```
{#passagemServico}
{texto}

{dataPassagem}
{/passagemServico}
```

**Texto formatado automaticamente:**
```
Fi-lo ao meu substituto legal o Oficial de Operações, {oficialSubstituto.posto} {oficialSubstituto.nome} a quem transmito todas as ordens em vigor para o serviço, bem como repassei todo material a meu cargo.

Fortaleza - CE, 29 de Outubro de 2025.
```

---

## ASSINATURA DO DOCUMENTO

```
{#assinatura}

{nome} - {posto}
{funcao}
MF.: {matricula}

{/assinatura}
```

**Exemplo:**
```
ROBERTO Barbosa de AZEVEDO - 1º Tenente QOPM
Oficial de Operações
MF.: 843.989-6-9
```

---

## FUNÇÕES DISPONÍVEIS PARA ASSINATURA

1. Comandante do RPMON
2. Subcomandante do RPMONT
3. Respondendo pelo Comando do RPMONT
4. **Oficial de Operações** ✨ (NOVO)
5. Chefe do P1
6. Chefe do P3
7. Chefe do P4
8. Chefe do P6
9. Comandante do 1ºEsq/RPMONT
10. Comandante do 2ºEsq/RPMONT
11. Comandante do 3ªPel/2ªEsq/RPMONT

---

## VARIÁVEIS DE DATA

```
{dataInicio} - Data formatada: "29 DE OUTUBRO DE 2025"
{dataFim} - Data seguinte formatada: "30 DE OUTUBRO DE 2025"
{ano} - Ano: "2025"
{mes} - Mês por extenso: "OUTUBRO"
{dia} - Dia: "29"
```

---

## OBSERVAÇÕES IMPORTANTES

1. **Arrays vazios não são renderizados** - Se uma seção não tiver dados, ela não aparecerá no documento
2. **Campos opcionais** - Tags condicionais como `{#observacao}...{/observacao}` só aparecem se houver conteúdo
3. **Formatação automática** - Datas e textos são formatados automaticamente pela função Firebase
4. **Valores padrão** - Campos como "KM Rodada" mostram "-" quando não há valor

---

## ESTRUTURA COMPLETA DO TEMPLATE

```
GOVERNO DO ESTADO DO CEARÁ
SECRETARIA DA SEGURANÇA PÚBLICA E DEFESA SOCIAL
REGIMENTO DE POLÍCIA MONTADA CEL. MOURA BRASIL

RELATÓRIO DO OFICIAL DE OPERAÇÕES (24h) – DO DIA {dataInicio} PARA O DIA {dataFim}.

Ao Senhor Subcomandante do Regimento de Polícia Montada Cel. Moura Brasil.

01. ESCALA DE SERVIÇO INTERNO (24h):
[tags da seção 01]

02. ESCALA DE SERVIÇO EXTERNO:
[tags da seção 02]

03. ESCALA DE PERMANÊNCIA:
[tags da seção 03]

04. ESCALA DE RONDA:
[tags da seção 04]

05. CONTROLE DE QUILOMETRAGEM DAS VTRs:
[tags da seção 05]

06. CONTROLE DAS VTRS UTILIZADAS FORA DE ESCALA:
[tags da seção 06]

07. CONTROLES DE CONSUMO ÁGUA/ENERGIA ELÉTRICA:
[tags da seção 07]

08. CONTROLES DE ALIMENTAÇÃO DOS SOLÍPEDES:
[tags da seção 08]

09. DOCUMENTOS EM ANEXO:
[tags da seção 09]

10. CAVALHADA:
[tags da seção 10]

11. SUBSTITUIÇÕES DE SOLÍPEDE:
[tags da seção 11]

12. PERMUTAS DE SERVIÇO:
[tags da seção 12]

13. REMANEJAMENTOS DE SERVIÇO:
[tags da seção 13]

14. ATIVIDADES DOS SERVIÇOS OPERACIONAIS:
[tags da seção 14]

15. OCORRÊNCIAS:
[tags da seção 15]

16. PASSAGEM DE SERVIÇO:
[tags da seção 16]

[tags de assinatura]
```

---

## COMO USAR NO MODELO DOCX

1. Abra o arquivo `modelo-livro-guarda.docx` no Microsoft Word
2. Copie as tags deste documento e cole no template
3. Use `Ctrl+H` para substituir as tags antigas pelas novas (se necessário)
4. Salve o arquivo
5. Faça upload do template para o Firebase Storage em `templates/template-livro-guarda.docx`
6. Teste a geração do documento no sistema

---

**Data de criação:** Outubro 2025  
**Versão:** 2.0 (16 seções completas)  
**Última atualização:** Inclusão da Seção 16 e Sistema de Assinatura
