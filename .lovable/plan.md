# Inconsistências do Q5 com correção ao lado

## O que muda para você
Cada inconsistência mostra, ao lado, a ação para resolver ali mesmo:

| Inconsistência | Solução ao lado |
|---|---|
| Situação sem data de início (ex.: CURSANDO) | Campo de data + **Salvar data** |
| Situação com fim já passado ainda não retirada (ex.: LICENÇA PATERNIDADE) | **Retirar da situação** escolhendo a nova situação (padrão EM ATIVIDADE), com início/fim opcionais para a nova |
| Situação não ligada a nenhuma categoria (ex.: RESP A PROCESSO (PAD/CD...)) | Lista com as categorias do Q5 + **Ligar**: a situação passa a contar nessa categoria para todos que estiverem nela |
| Férias terminadas ainda marcadas | **Retirar de férias** (volta para EM ATIVIDADE) |
| Unidade não reconhecida | Mantém a escolha da unidade + **Corrigir** |
| Posto não reconhecido | Lista de postos + **Corrigir** |

- O nome deixa de aparecer com o posto repetido ("CB CB GALDINO" vira "CB GALDINO"). Isso vale também no painel de detalhes.
- Cada correção registra no histórico do policial (assentamentos), como já é feito na aba Situação.

## Detalhes técnicos
- `Q5Inconsistencia.tipo`: 'unidade' | 'posto' | 'semInicio' | 'fimVencido' | 'feriasVencidas' | 'naoLigada' | 'simultanea'; `calcularQ5` passa a preencher o tipo.
- Gravação em `policiais` com `setDoc merge` (sem campos undefined): `inicioSituacao`; retirada grava `SITUAÇÃO`, limpa `fimSituacao`/`inicioSituacao` (ou define as novas datas); férias limpa `inicioFerias`/`fimFerias`.
- "Ligar" adiciona a situação a `situacoes` da categoria escolhida e salva em `config_q5` (mesmo fluxo do Configurar ligações). Opções de situação vindas de `config_situacoes`.
- Nome exibido: helper `nomeExibicao(p)` remove do início do nome de guerra o posto quando ele já está lá.
