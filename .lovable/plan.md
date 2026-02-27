

# Plano: Usar Template DOCX com Docxtemplater para Resumo de Efetivo

## Problema dos Zeros
O arquivo `gerar-resumo-efetivo.js` e separado do `index.js` e nao chama `admin.initializeApp()`. Por isso o Firestore nao funciona e retorna tudo zero. A solucao e mover a funcao para dentro do `index.js`.

## Abordagem: Template com Docxtemplater
Igual as outras funcoes do projeto (OS, Cautela, Termo de Entrega, etc.), usaremos um template DOCX no Firebase Storage com placeholders do docxtemplater.

---

## Tags para o Template DOCX

Voce precisa criar o arquivo `template-resumo-efetivo.docx` no Word com estas tags exatas e subir para o Firebase Storage em `templates/template-resumo-efetivo.docx`.

### Cabecalho (texto fixo no template)
O cabecalho "COMANDO DE POLICIAMENTO DE CHOQUE / REGIMENTO DE POLICIA MONTADA DO CEARA / CEL MOURA BRASIL" fica fixo no template, sem tags.

### Tabela Principal - Resumo de Efetivo

Criar uma tabela com 4 colunas. A primeira linha e cabecalho fixo. A segunda linha contem as tags de loop:

| UNIDADE | TOTAL | INDISPONIVEL | OPERACIONAL |
|---------|-------|--------------|-------------|
| `{#unidades}{nome}` | `{total}` | `{indisponivel}` | `{operacional}{/unidades}` |

Apos a tabela, uma linha extra (fora do loop) com totais:

**EFETIVO TOTAL RPMONT: `{totalGeral}` | `{totalIndisponivel}` | `{totalOperacional}`**

Ou melhor, incluir o total como ultima entrada do loop (a function vai adicionar automaticamente).

### Tabela de Indisponibilidades

Criar uma tabela com 3 colunas. Usar loop aninhado:

```
{#indisponibilidades}
```
Linha com colspan 3: `{nomeUnidade}`
```
{#situacoes}
```
| `{situacao}` | `{quantidade}` | `{policiais}` |
```
{/situacoes}
{/indisponibilidades}
```

### Observacao de Ferias

```
{#temFerias}
Obs. Encontram-se em gozo de ferias:
{#ferias}
{texto}
{/ferias}
{/temFerias}
```

### Data do Documento

```
{dataDocumento}
```

---

## Lista Completa de Tags

| Tag | Descricao | Exemplo |
|-----|-----------|---------|
| `{#unidades}` | Inicio do loop de unidades | - |
| `{nome}` | Nome da unidade | "RPMONT - SEDE" |
| `{total}` | Total de policiais da unidade | "3" |
| `{indisponivel}` | Indisponiveis da unidade | "1" |
| `{operacional}` | Operacionais da unidade | "2" |
| `{/unidades}` | Fim do loop de unidades | - |
| `{totalGeral}` | Total geral de policiais | "133" |
| `{totalIndisponivel}` | Total geral indisponiveis | "26" |
| `{totalOperacional}` | Total geral operacionais | "107" |
| `{#indisponibilidades}` | Loop de unidades com indisponiveis | - |
| `{nomeUnidade}` | Nome da unidade + total | "RPMONT - SEDE - TOTAL: 3" |
| `{#situacoes}` | Loop de situacoes dentro da unidade | - |
| `{situacao}` | Tipo de situacao | "READAPTACAO FUNCIONAL" |
| `{quantidade}` | Quantidade nessa situacao | "2" |
| `{policiais}` | Nomes dos policiais | "CAP 12345 SILVA, 1o SGT 67890 SOUZA" |
| `{/situacoes}` | Fim do loop de situacoes | - |
| `{/indisponibilidades}` | Fim do loop de indisponibilidades | - |
| `{#temFerias}` | Condicional: so aparece se tem ferias | - |
| `{#ferias}` | Loop de ferias por unidade | - |
| `{texto}` | Texto da observacao de ferias | "03 PPMM do 1o Esquadrao/RPMONT" |
| `{/ferias}` | Fim do loop de ferias | - |
| `{/temFerias}` | Fim da condicional de ferias | - |
| `{dataDocumento}` | Data formatada | "Quartel do RPMONT, 27 de Fevereiro de 2026." |

---

## Alteracoes nos Arquivos

### 1. `functions/index.js` - Adicionar funcao ao final
- Nova funcao `gerarResumoEfetivoDocx` usando o mesmo padrao das outras (Express + docxtemplater)
- Baixa template de `templates/template-resumo-efetivo.docx` do Firebase Storage
- Busca policiais do Firestore com `admin.firestore()` (que ja esta inicializado)
- Agrupa por unidade, calcula totais, monta dados para o template
- Logs de debug para verificar valores reais do campo `Unidade`

### 2. `functions/gerar-resumo-efetivo.js` - Limpar
- Remover todo o conteudo (logica movida para index.js)

### 3. Template DOCX (manual)
- Voce cria o documento Word com o layout exato do modelo que anexou
- Substitui os dados por tags listadas acima
- Sobe para Firebase Storage em `templates/template-resumo-efetivo.docx`

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `functions/index.js` | MODIFICAR - Adicionar funcao gerarResumoEfetivoDocx com docxtemplater |
| `functions/gerar-resumo-efetivo.js` | MODIFICAR - Limpar conteudo |
| Template DOCX (manual) | CRIAR no Word e subir ao Firebase Storage |

