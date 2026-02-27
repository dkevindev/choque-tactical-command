

# Corrigir Resolucao Dinamica de Dados de Policiais

## Problema identificado

Existem **dois problemas distintos** que fazem o sistema continuar mostrando "SD" ao inves do posto atual:

### Problema 1: Race condition no carregamento
Em `CadastroMateriais.tsx`, o `loadMateriais()` roda no `useEffect([], [])` e chama `resolverNome()` internamente. Porem, o hook `usePolicialResolver` tambem carrega de forma assincrona -- quando `loadMateriais` executa, o `policiaisMap` ainda esta vazio (Map vazia). O `resolverNome` cai no fallback e retorna os dados estaticos da cautela (`SD ...`).

**Correcao**: Adicionar `policiaisMap` como dependencia do useEffect que chama `loadMateriais`, para recarregar quando o mapa estiver pronto.

### Problema 2: DOCX gerado com dados estaticos
Em `GerenciarCautelas.tsx`, a funcao `gerarDocumento` (linha 161) envia `cautela.policialNome` e `cautela.policialPatente` diretamente para a Cloud Function. Esses sao os dados gravados na hora da cautela -- nunca atualizados apos promocao.

**Correcao**: Usar `resolverNome` para obter dados atuais e enviar ao endpoint DOCX.

O mesmo problema ocorre nos 3 formularios de documentos (`GerarNadaConstaForm`, `GerarTermoEntregaForm`, `GerarTransferenciaCautelaForm`) que usam dados estaticos da colecao `transferencias_policiais`.

## Arquivos a modificar

### 1. src/components/admin-belico/CadastroMateriais.tsx
- Mudar o `useEffect` de `[]` para `[policiaisMap]` -- so carregar materiais quando o mapa de policiais estiver pronto
- Adicionar guard `if (policiaisMap.size === 0) return` para nao rodar com mapa vazio

### 2. src/components/admin-belico/GerenciarCautelas.tsx
- Na funcao `gerarDocumento`, resolver nome e patente atuais via `policiaisMap` antes de enviar ao endpoint
- Substituir `cautela.policialNome` por nome resolvido e `cautela.policialPatente` por patente resolvida
- Tambem corrigir o nome do arquivo de download

### 3. src/components/admin-belico/documentos/GerarNadaConstaForm.tsx
- Adicionar `usePolicialResolver`
- Na funcao `handleGerar`, resolver dados atuais do policial pelo `policialId` da transferencia antes de enviar ao endpoint
- Corrigir exibicao na lista e detalhes

### 4. src/components/admin-belico/documentos/GerarTermoEntregaForm.tsx
- Adicionar `usePolicialResolver`
- Na funcao de geracao, resolver dados atuais antes de enviar ao endpoint
- Corrigir exibicao na lista e detalhes

### 5. src/components/admin-belico/documentos/GerarTransferenciaCautelaForm.tsx
- Adicionar `usePolicialResolver`
- Na funcao `handleGerar`, resolver dados atuais antes de enviar ao endpoint
- Corrigir exibicao na lista e detalhes

### 6. src/components/consultas/ConsultaMaterialPolicial.tsx
- Mesmo problema de timing: cautelas sao carregadas no useEffect mas `policiaisMap` pode nao estar pronto
- Adicionar dependencia no useEffect de cautelas para recarregar quando o mapa estiver disponivel

## Detalhes tecnicos

### Race condition fix (CadastroMateriais)
```text
Antes:  useEffect(() => { loadMateriais(); }, []);
Depois: useEffect(() => { if (policiaisMap.size > 0) loadMateriais(); }, [policiaisMap]);
```

### DOCX fix (GerenciarCautelas)
```text
Antes:
  policial: { nome: cautela.policialNome, grad: cautela.policialPatente }

Depois:
  const dadosAtuais = policiaisMap.get(cautela.policialId);
  policial: {
    nome: dadosAtuais?.nomeGuerra || cautela.policialNome,
    grad: dadosAtuais?.postGrad || cautela.policialPatente
  }
```

### Formularios de documentos (3 arquivos)
Cada formulario precisa:
1. Importar e usar `usePolicialResolver`
2. Na hora de enviar dados ao endpoint, resolver `policialId` -> dados atuais
3. Na exibicao de lista/detalhes, usar `resolverNome` ao inves de dados estaticos
