
# Plano: Correção do Seletor de Materiais no Modal de Complementar Cautela

## Problema Identificado

Ao adicionar materiais a uma cautela já recebida através do `ModalComplementarCautela`, o sistema está mostrando controles de quantidade para TODOS os materiais, incluindo itens com número de série como "HT" (rádios) que deveriam ser adicionados diretamente com quantidade = 1.

### Comportamento Atual (Incorreto)

```text
1. Usuário clica em "HT" (rádio)
2. Sistema mostra: "Qtd: [-] 1 [+]" + botão "Adicionar"
3. Qualquer ajuste modifica a quantidade indevidamente
```

### Comportamento Esperado (Como funciona no ArmeiroInterface)

```text
1. Usuário clica em "HT" (item com nº série)
   → Adiciona diretamente com quantidade = 1

2. Usuário clica em "Munição .40"
   → Abre modal de quantidade (padrão 30)
   → Usuário ajusta e confirma
```

---

## Solução

Replicar exatamente a lógica do `ArmeiroInterface.handleClickMaterial` no `ModalComplementarCautela`:

1. **Para itens com número de série** (armas, coletes, HTs, etc.):
   - Adicionar diretamente com `quantidade = 1`
   - Sem exibir controles de quantidade

2. **Para munição**:
   - Exibir controles de quantidade (padrão 30)
   - Permitir ajuste antes de adicionar

3. **Para EPIs e Acessórios sem série**:
   - Adicionar diretamente com `quantidade = 1`

---

## Implementação Técnica

### Modificar `ModalComplementarCautela.tsx`

Alterar o callback `onSelecionarMaterial` do `SeletorMateriaisModal` para:

```typescript
onSelecionarMaterial={(material) => {
  const categoriaNorm = (material.categoria || '').toLowerCase();
  const isMunicao = categoriaNorm.includes('munição') || categoriaNorm.includes('municao');
  
  if (isMunicao) {
    // Munição: selecionar para ajuste de quantidade
    setMaterialSelecionado(material.id);
    setQuantidadeMaterial(30);
  } else {
    // Outros itens: adicionar direto com quantidade 1
    const novoMaterial: MaterialSelecionado = {
      materialId: material.id,
      nome: material.nome,
      quantidade: 1,
      categoria: material.categoria,
      numeroSerie: material.numeroSerie
    };
    
    setMateriaisAdicionados(prev => [...prev, novoMaterial]);
    
    // Remover da lista de disponíveis
    setMateriaisDisponiveis(prev => prev.filter(m => m.id !== material.id));
    
    toast({
      title: "Material Adicionado",
      description: `${material.nome} foi adicionado à lista.`
    });
  }
}}
```

### Ajustar a exibição condicional

Mostrar os controles de quantidade APENAS quando:
1. Existe um `materialSelecionado`
2. O material é do tipo munição

```typescript
{materialSelecionado && isMaterialMunicao(materialSelecionado) && (
  <div className="p-3 bg-primary/5 rounded-lg border space-y-2">
    {/* Controles de quantidade */}
  </div>
)}
```

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `ModalComplementarCautela.tsx` | Alterar lógica de seleção de material para comportamento idêntico ao ArmeiroInterface |

---

## Fluxo Corrigido

```text
ModalComplementarCautela

┌─────────────────────────────────────────────────────────────┐
│ COMPLEMENTAR CAUTELA - SD Kevin                             │
├─────────────────────────────────────────────────────────────┤
│ Materiais atuais (2):                                       │
│   • Pistola Glock .40                                       │
│   • Colete Balístico                                        │
├─────────────────────────────────────────────────────────────┤
│ Materiais a adicionar (1):                                  │
│   • HT Motorola (1)                           [X]           │
├─────────────────────────────────────────────────────────────┤
│ Adicionar material:                                         │
│ ┌─────────┬──────────┬─────┬────────────┐                  │
│ │ Nº Série│ Munição  │ EPI │ Acessórios │                  │
│ └─────────┴──────────┴─────┴────────────┘                  │
│                                                             │
│ 🔍 [Buscar...]                                              │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ HT Motorola GP3500 - Série: HT001              [+]      ││ → Clica e adiciona direto
│ │ Fuzil 5.56 - Série: FZ001                      [+]      ││ → Clica e adiciona direto
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ [Cancelar]                         [Continuar (1)]          │
└─────────────────────────────────────────────────────────────┘

Se clicar na aba "Munição":

│ ┌─────────────────────────────────────────────────────────┐│
│ │ Munição .40 CBC - Est: 1000                    [+]      ││ → Clica e mostra controle:
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Munição .40 CBC                                       │  │
│ │ Qtd: [-] 30 [+]           [Adicionar]                 │  │
│ └───────────────────────────────────────────────────────┘  │
```

---

## Resumo

| Item | Comportamento |
|------|---------------|
| Itens com nº série (armas, HT, coletes) | Adiciona direto com qtd = 1 |
| Munição | Mostra controles de quantidade |
| EPI sem série | Adiciona direto com qtd = 1 |
| Acessórios sem série | Adiciona direto com qtd = 1 |
