

# Toggle de Oficio na OS -- Ativar/Desativar Geração de Documento

## Resumo

Criar uma configuração persistente no Firestore (`configuracoes/motorizado`) com um campo `oficioAtivo: boolean`. Quando desativado, o formulário de Nova OS esconde o campo "Nº (OF.)", o botão "Assinar Documento" e não chama a Cloud Function -- apenas registra no Firestore. Quando reativado, tudo volta a funcionar como antes.

## Alterações

### 1. Firestore -- documento de configuração

Coleção: `configuracoes`, documento: `motorizado`
```text
{ oficioAtivo: boolean }
```

Se o documento não existir, tratar como `false` (ofício desativado por padrão, já que é a situação atual).

### 2. Editar `src/components/motorizado/NovaOSForm.tsx`

- Carregar `oficioAtivo` do Firestore no `useEffect` inicial
- Condicionar com `oficioAtivo`:
  - Campo `numeroOficina` -- só aparece se ativo
  - Botão "Assinar Documento" -- só aparece se ativo
  - Chamada `fetch` à Cloud Function -- só executa se ativo
  - Texto do botão: "Gerar OS e Documento" (ativo) vs "Registrar OS" (desativado)
  - Campo `numeroOficina` no payload -- enviado como string vazia se desativado

### 3. Criar toggle de configuração

Adicionar um switch em algum local acessível ao admin. Duas opções:

**Opção escolhida**: Adicionar direto no topo da aba "Motorizado" em `DocumentosPage.tsx`, um pequeno toggle "Geração de Ofício" com Switch que grava no Firestore `configuracoes/motorizado.oficioAtivo`.

Isso permite ligar/desligar sem alterar código.

