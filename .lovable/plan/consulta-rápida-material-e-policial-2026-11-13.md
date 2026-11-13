# Consulta Rápida: Material e Policial

## O que o usuário vai ver
Em **Gestão e Logística > Bélico**, um novo botão/aba **"Consulta Rápida"** com duas opções:

### 1. Consultar Material (por número de série)
- Campo único: digite o número de série (arma, colete, algema, carregador). Aceita parte do número, sem diferenciar maiúsculas.
- Resultado em ficha para celular e computador:
  - **Status atual** em destaque: Na carga / Cautelado (com quem) / Baixado / Transferido (para qual batalhão/COLOG) / Saiu da carga / À disposição (recrutas).
  - **Dados do material**: tipo, modelo, fabricante, calibre, validade (coletes), SIARM.
  - **Linha do tempo completa**, do mais recente ao mais antigo: cadastro, edições, cautelas permanentes e provisórias (quem pegou, quando devolveu), passagens de um policial para outro, baixas, transferências, relatos de problema, faltas de munição anotadas no livro.
- Se o mesmo número aparecer em mais de um lugar (ex.: cadastrado duas vezes), mostra todos.

### 2. Consultar Policial (por nome, nome de guerra, matrícula ou numeral)
Ficha completa:
- **Situação atual**: graduação, quadro, situação (disponível, férias, LTS, à disposição, respondendo processo), se está no regimento ou transferido (e para onde).
- **Materiais atuais**: arma, colete, algema e demais itens cautelados hoje.
- **Histórico de materiais**: todas as armas/coletes que já teve cautelados, com datas.
- **Serviços de motorista**: fichas de serviço (viatura, km inicial/final, avarias), oficina (entradas/saídas que registrou).
- **Gestão de pessoas**: assentamentos, promoções, atestados, transferências.
- **Outros**: projetos sociais (se instrutor), cautelas à disposição.
- Botão **Baixar PDF** da ficha (policial ou material).

## Melhorias para as próximas consultas (sem quebrar o que existe)
- Criar um **registro único de eventos** (histórico central): toda ação nova em material ou policial passa a gravar também uma linha nesse histórico — cadastro, edição, cautela, devolução, troca de policial, baixa, transferência, promoção, mudança de situação, início/fim de serviço de motorista.
- Os registros atuais continuam sendo gravados como hoje; o histórico central é **adicional**.
- Cada linha guarda: número de série e/ou matrícula, tipo de ação, antes/depois, quem fez, data e hora.
- A consulta junta os dados antigos (buscados nas tabelas existentes) com o histórico central novo.

## Detalhes técnicos
- Novo componente `src/components/consulta/ConsultaRapida.tsx` (+ `FichaMaterial.tsx`, `FichaPolicial.tsx`), nova aba em `AdminDashboard.tsx` no grupo Bélico.
- Busca de material: `materiais_belicos`, `materiais_disposicao`, `historico_material`, `movimentacoes_belicas`, `cautelas_permanentes`, `cautelas_provisorias`, `cautelas_disposicao`, `baixas_materiais`, `problemas_material`, `livros_reserva_armamento` (anotações). Normalizar série (trim, upper, sem espaços); busca em memória onde não houver índice.
- Busca de policial: `policiais`, `policiais_transferidos`, `transferencias_policiais`, `assentamentos`, `historico_promocoes`, `atestados_medicos`, `servicosDiarios`, `oficina_controle`, `projetos_instrutores`, cautelas acima. Nomes/graduação via `usePolicialResolver`.
- Nova coleção `eventos_auditoria` + helper `src/lib/auditoria.ts` (`registrarEvento`), chamado (try/catch, nunca bloqueia a ação) em: CadastroMateriais, BaixaMaterialCargaModal, TransferenciaPolicialModal, NovaCautelaForm/GerenciarCautelas, BaixaMaterialSection/ArmeiroInterface, promoções/situação, IniciarServicoWizard/encerramento, oficina. Remove campos `undefined` antes de gravar.
- Campo `serieNormalizada` gravado em novos cadastros/edições de material para busca rápida.
- PDF com jsPDF/autotable, datas `dd/MM/yy`.
