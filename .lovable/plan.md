# Q5 – Quadro Quantitativo do Efetivo (Gestão de Pessoas)

Nova aba **Q5** em Gestão de Pessoas que monta sozinha o quadro da planilha "Q5 RPMONT 11-11-2026", a partir dos cadastros que já existem. Nenhum formulário novo para digitar os números.

## O que já existe no sistema e de onde vem cada número
- **Efetivo e posto/graduação:** cadastro de policiais (posto atual, situação, função). Ficam de fora os alunos À Disposição, transferidos e cedidos.
- **Situação** (Gestão de Pessoas > Situação): FÉRIAS, LTS, Paternidade, Maternidade, Luto, Núpcias, Recompensa, Cursando, Trânsito, Resp. Processo, A Disp. de Outros Órgãos, Agregado, Agregado – Aguardando Reserva, Readaptação, Recolhido, Desertor. Cada uma tem data de início e de fim.
- **Férias:** início, fim e publicação gravados no policial.
- **LTS:** atestados médicos (início, dias, retorno).
- **Função** (Gestão de Pessoas > Função): Guarda do Quartel, Armeiro, Motorista ADM, Sentinela, Fiscal de Dia, Resp. a Processo, Auxiliares de seção etc.
- **Histórico:** assentamentos (mudanças de situação, promoções, atestados) e histórico de promoções.

## Ligação das 16 categorias
| Categoria Q5 | Fonte proposta |
|---|---|
| 1 Férias | Situação FÉRIAS com período vigente na data |
| 2 Viagem/Missão | Situação TRÂNSITO (a confirmar) |
| 3 LTS | Situação LTS + atestados vigentes |
| 4 Licenças diversas | Paternidade, Luto, Núpcias, Recompensa/Dispensa |
| 5 Serviços leves | Readaptação funcional |
| 6 À disposição | A Disp. de Outros Órgãos |
| 7 Cursando/Instrução | Situação CURSANDO (discente); instrutor sem fonte |
| 8 PAD/CD/CJ | Resp. Processo / função Resp. a Processo |
| 9 Afastado preventivamente | sem fonte hoje |
| 10 Agregado REF/RR | Agregado, Aguardando Reserva, RR Aguardando |
| 11 Guarda Quartel | funções Guarda do Quartel, Sentinela, Fiscal de Dia (adjunto) |
| 12 Armeiros | função Armeiro |
| 13 Relatorista | sem fonte hoje |
| 14 Motoristas ADM | função Motorista ADM |
| 15 SAI – Reservado | sem fonte hoje |
| 16 Atividade-meio | funções Auxiliar de seção, Ferrador, Seleiro etc. |

Para não inventar regras, a Q5 terá uma tela **"Configurar ligações"**: para cada categoria você marca quais situações e funções entram nela. Ela já vem preenchida com a tabela acima e pode ser ajustada a qualquer momento. As categorias ainda sem fonte aparecem com o aviso "sem dados no sistema". Para elas também basta criar a função ou situação correspondente (ex.: RELATORISTA, SAI, AFASTADO PREVENTIVAMENTE, INSTRUTOR).

## Regras de contagem
- Só conta registros vigentes na data de referência (início ≤ data ≤ fim). Encerrados, futuros e retirados não entram.
- Cada policial conta uma vez por categoria.
- Se o policial estiver em duas categorias de afastamento ao mesmo tempo, vale a ordem: LTS > Férias > Licenças > demais. Ele é contado só na primeira e a sobreposição aparece em "Inconsistências".
- As categorias de função (11 a 16) contam só quem não está afastado.

## Página
- Cabeçalho Q5, seletor de **data de referência** (padrão: hoje) e "atualizado em dd/MM/yy HH:mm". Os dados se atualizam sozinhos sempre que um cadastro muda.
- **Efetivo global** em destaque, com total e os 12 postos/graduações (CEL a SD).
- **Grade** no formato da planilha: linhas por posto e colunas pelas 16 categorias, com subtotais.
- **Todo número é clicável** e abre um painel lateral com os policiais: nome, posto, matrícula, situação/função, início, fim, dias, publicação, observação e origem do dado.
- Filtro por posto, busca por nome ou matrícula e "ver todos".
- Painel **Inconsistências**: sem posto, situação sem data, férias vencidas ainda marcadas, sobreposições, situação que não está ligada a nenhuma categoria.
- **Exportar**: Excel no layout da planilha e PDF para impressão.

## Data passada
Para datas anteriores, o quadro é reconstruído com os períodos guardados (férias, atestados, assentamentos de situação e promoções). Onde não houver histórico, por exemplo funções, que não guardam data, aparece o aviso "baseado no cadastro atual".

## Detalhes técnicos
- Novo `src/components/gestao-pessoas/Q5Tab.tsx` e o hook `useQ5Data` com `onSnapshot` em `policiais`, `atestados_medicos`, `assentamentos`, `config_situacoes` e `config_funcoes`.
- O mapeamento das categorias fica salvo em `config_q5` (um documento por categoria).
- O cálculo fica em uma função pura `calcularQ5(dados, dataRef, mapa)`, com testes para vigência, deduplicação e prioridade.
- O posto/graduação é normalizado para as 12 linhas da planilha (ex.: "1º SGT", "1 SGT PM").
- A exportação para Excel usa a biblioteca já instalada; o PDF usa jsPDF/autotable.
