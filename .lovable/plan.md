

# Plano: Gerador Automatico do Resumo de Efetivo

## O que sera feito

Criar um sistema que gera automaticamente o documento "RESUMO DE EFETIVO POR UNIDADE" em DOCX, preenchido com dados reais do Firebase. O documento sera identico ao modelo enviado, com tabelas de efetivo por unidade e descricao detalhada das indisponibilidades.

---

## Estrutura do Documento Gerado

1. **Resumo de Efetivo por Unidade** - Tabela com colunas: Unidade, Total, Indisponivel, Operacional
   - RPMONT - SEDE
   - 1o Esquadrao/RPMONT
   - 2o Esquadrao/RPMONT
   - 3o Pelotao/2oESQD (Crato)
   - BSP
   - EFETIVO TOTAL RPMONT

2. **Descricao Indisponibilidade por Unidade** - Agrupado por unidade, cada tipo de indisponibilidade com quantidade e nomes dos policiais

3. **Observacao de ferias** - Quantidade de policiais de ferias por unidade

---

## Mapeamento de Unidades

O campo `Unidade` no Firebase sera mapeado para os nomes do documento:

```text
"1º ESQD"  -->  "1o Esquadrao/RPMONT"
"2º ESQD"  -->  "2o Esquadrao/RPMONT"
"3º PEL"   -->  "3o Pelotao/2oESQD/RPMONT (Crato)"
"SEDE"     -->  "RPMONT - SEDE"
"BSP"      -->  "BSP"
```

## Situacoes que contam como Indisponivel

Todas as situacoes do `SITUACOES_DISPONIVEIS` (exceto operacionais):
- FERIAS, READAPTACAO FUNCIONAL, LICENCA TRATAMENTO DE SAUDE, LICENCA PATERNIDADE, LICENCA MATERNIDADE, RECOMPENSA MILITAR, NUPCIAS, LUTO, CURSANDO, TRANSITO, RESP. PROCESSO, DESERTOR, A DISP. DE OUTROS ORGAOS, RECOLHIDO PRES. MILITAR, AGREGADO, AGREGADO - AGUARDANDO RESERVA

---

## Alteracoes Tecnicas

### 1. Template DOCX (upload para Firebase Storage)

Criar `public/templates/template-resumo-efetivo.docx` com os placeholders do docxtemplater:
- `{mesAno}` - mes e ano do relatorio
- `{#unidades}` - loop das unidades com `{nome}`, `{total}`, `{indisponivel}`, `{operacional}`
- `{totalGeral}`, `{totalIndisponivel}`, `{totalOperacional}`
- `{#indisponibilidades}` - loop agrupado por unidade e tipo de situacao com nomes
- `{#ferias}` - observacao de ferias por unidade
- `{dataDocumento}` - data formatada

### 2. Firebase Cloud Function (`functions/index.js`)

Nova funcao `gerarResumoEfetivo`:
- Endpoint POST que recebe `{ mes, ano }` (opcional, default = mes atual)
- Busca todos os policiais da colecao `policiais`
- Agrupa por `Unidade`
- Calcula indisponiveis (qualquer SITUACAO que nao seja 'MONTADO - POLICIAMENTO OSTENSIVO' ou 'VIATURA')
- Para cada unidade, lista os indisponiveis agrupados por tipo de situacao com Post/Grad + Matricula + Nome
- Separa ferias em observacao a parte
- Preenche o template e retorna o DOCX

### 3. Frontend - Botao no modulo de Gestao de Pessoas

Adicionar botao "Gerar Resumo de Efetivo" em dois locais:
- **EstatisticasTab** (`src/components/gestao-pessoas/EstatisticasTab.tsx`): junto aos botoes de exportacao existentes
- **DocumentosPage** (`src/components/DocumentosPaga.tsx`): na aba "Expediente" que hoje esta vazia

O botao abre um dialog simples para selecionar mes/ano e chama a Cloud Function, fazendo download do DOCX gerado.

### 4. Componente de formulario

Criar `src/components/gestao-pessoas/GerarResumoEfetivoForm.tsx`:
- Select de mes (janeiro a dezembro)
- Select de ano (ano atual e anterior)
- Botao "Gerar Documento"
- Chama a Cloud Function via fetch
- Faz download automatico do arquivo

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `public/templates/template-resumo-efetivo.docx` | NOVO - Template DOCX |
| `functions/index.js` | MODIFICAR - Adicionar funcao gerarResumoEfetivo |
| `src/components/gestao-pessoas/GerarResumoEfetivoForm.tsx` | NOVO - Formulario de geracao |
| `src/components/gestao-pessoas/EstatisticasTab.tsx` | MODIFICAR - Adicionar botao |
| `src/components/DocumentosPaga.tsx` | MODIFICAR - Adicionar na aba Expediente |

---

## Observacao importante

Como o Lovable nao consegue criar arquivos .docx programaticamente, a Cloud Function gerara o documento **sem template**, construindo as tabelas diretamente no DOCX usando a biblioteca docxtemplater com um template minimo. Alternativamente, o template DOCX precisara ser criado externamente e enviado ao Firebase Storage manualmente (como ja e feito com os outros templates do projeto). A Cloud Function seguira o mesmo padrao das funcoes existentes (gerarOrdemServicoDocx, gerarCautelaDocx, etc).

