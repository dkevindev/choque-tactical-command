

# Plano: Correcoes e Novas Funcionalidades em Gestao de Pessoas

Este plano cobre 3 grandes itens solicitados. Devido a complexidade, vou dividir em partes para implementar de forma organizada.

---

## 1. Corrigir aba "Transferidos" (nao mostra os ultimos)

**Problema:** A aba Transferidos filtra policiais da colecao `policiais` buscando `SITUACAO === 'transferido'`. Porem, ao transferir, o policial e removido da colecao `policiais` e movido para `policiais_transferidos`. Por isso nada aparece.

**Solucao:** Alterar o componente `TransferidosTab` para buscar dados diretamente da colecao `policiais_transferidos` no Firebase, em vez de filtrar da lista de policiais ativos.

### Arquivo: `src/components/gestao-pessoas/TransferidosTab.tsx`
- Adicionar `useEffect` para carregar documentos da colecao `policiais_transferidos` via `getDocs`
- Exibir colunas: Nome, Post/Grad, Matricula, Destino, Data da Transferencia, Publicacao
- Manter busca por nome/posto/destino
- Ordenar por data de transferencia (mais recente primeiro)

---

## 2. Nova aba "Atestados Medicos"

Criar um sistema completo de cadastro de atestados medicos, inspirado no modelo VBA da imagem de referencia.

### Novo arquivo: `src/components/gestao-pessoas/AtestadosMedicosTab.tsx`

**Funcionalidades:**
- Sub-abas: "Cadastro/Lista" e "Pendentes de Pericia"
- Busca de policial por numeral, nome ou nome de guerra (consultando colecao `policiais`)
- Ao localizar, preenche automaticamente: Numeral, Nome, Matricula, Post/Grad, CPF, OPM/Unidade

**Campos do atestado:**
- Data inicio
- Quantidade de dias
- CID (com autocomplete usando dicionario local de CIDs - os codigos mais comuns da CID-10 serao incluidos em um arquivo JSON embarcado no sistema, sem necessidade de API externa)
- Tipo/descricao do CID (preenchido automaticamente ao digitar o codigo)
- Medico
- CRM
- Hospital
- CPF (pre-preenchido do policial)
- Data fim (calculada automaticamente: data inicio + dias)

**Regra de pericia:**
- Se quantidade de dias > 3, o atestado e marcado como "Pendente de Pericia"
- Status possíveis: NAO PRECISA, PENDENTE, AGENDADO, HOMOLOGADO

**Aba "Pendentes de Pericia":**
- Lista apenas atestados com dias > 3 e status pendente
- Botao "Copiar CPF" em cada linha (para agilizar marcacao de pericia)
- Botao "Confirmar Marcacao" que abre dialog para inserir data e hora da pericia
- Ao confirmar, status muda para "AGENDADO"

**Armazenamento:** Colecao Firebase `atestados_medicos` com campos: policialId, policialNome, policialPostGrad, policialMatricula, policialCpf, policialNumeral, dataInicio, dias, dataFim, cid, cidDescricao, medico, crm, hospital, statusPericia, dataPericia, horaPericia

### Novo arquivo: `src/lib/cidData.ts`
- Dicionario com os CIDs mais comuns (aproximadamente 200 codigos) incluindo categorias como: lesoes, doencas osteomusculares, transtornos mentais, doencas respiratorias, etc.
- Formato: `{ codigo: string, descricao: string }`

---

## 3. Ficha de Assentamentos do Policial (ao clicar no Efetivo)

Ao clicar no botao "Visualizar" (olho) de um policial na aba Efetivo, alem dos dados atuais, exibir uma secao de "Assentamentos" que consolida todos os registros do policial.

### Arquivo: `src/components/gestao-pessoas/EfetivoTab.tsx`

**Alteracoes no Dialog de visualizacao:**
- Adicionar abas dentro do dialog: "Dados Pessoais" (atual) e "Assentamentos"
- Na aba Assentamentos, buscar e exibir:
  - Atestados medicos (colecao `atestados_medicos` filtrado por policialId)
  - Ferias (dados do proprio policial)
  - Licencas (historico de situacoes)
  - Movimentacoes/transferencias
- Cada registro com data, tipo, descricao e status
- Timeline visual organizada cronologicamente

---

## Alteracao na pagina principal

### Arquivo: `src/components/GestãoPessoas.tsx`
- Adicionar a aba "Atestados" no TabsList (passar de 7 para 8 colunas)
- Importar e renderizar o novo componente `AtestadosMedicosTab`

---

## Resumo dos arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/gestao-pessoas/TransferidosTab.tsx` | Reescrever para buscar de `policiais_transferidos` |
| `src/components/gestao-pessoas/AtestadosMedicosTab.tsx` | Novo - sistema completo de atestados |
| `src/lib/cidData.ts` | Novo - dicionario de CIDs |
| `src/components/gestao-pessoas/EfetivoTab.tsx` | Adicionar aba Assentamentos no dialog de visualizacao |
| `src/components/GestãoPessoas.tsx` | Adicionar aba Atestados |

