
## Plano de Correção: Termo de Entrega

### Problema Identificado

O documento de Termo de Entrega está saindo incorreto porque:
1. O frontend envia dados em formato `descricaoCompleta` (texto único)
2. O template DOCX espera colunas separadas: `QTD | NOME | MODELO | Nº SÉRIE`
3. As regras de formatação do modelo não estão sendo aplicadas corretamente

### Modelo Correto (MODELO.docx)

O documento deve ter duas tabelas:

**Tabela 1 - Materiais Bélicos:**
| QTD | NOME | MODELO | Nº SÉRIE |
|-----|------|--------|----------|
| 01 | Pistola .40 | SIGSAUER | 58H16975 |
| 03 | Carregadores .40 | SIGSAUER | - |
| 30 | Munições .40 | - | - |
| 01 | Colete balístico Tamanho M Masc | PROTECTA | 15G15SFSW152 |

**Tabela 2 - Outros Materiais:**
| QTD | OUTROS MATERIAIS |
|-----|------------------|
| 01 | BOTA DE MONTARIA TAMANHO 43 |

### Regras de Formatação

| Tipo | Coluna NOME | Coluna MODELO | Coluna Nº SÉRIE |
|------|-------------|---------------|-----------------|
| Armamento | nome + calibre (ex: "Pistola .40") | fabricante/modelo | numeroSerie |
| Munição | "Munições" + calibre (ex: "Munições .40") | "-" | "-" |
| Carregador | "Carregadores" + calibre (ex: "Carregadores .40") | fabricante | "-" |
| Colete | nome + tamanho + sexo (ex: "Colete balístico Tamanho M Masc") | fabricante | numeroSerie |
| Sem info | usar "-" para campos vazios | "-" | "-" |

---

### Alterações Necessárias

#### 1. Frontend (GerarTermoEntregaForm.tsx)

Modificar a função `handleGerar` para enviar dados em formato tabular:

**Código atual:**
```typescript
materiais.push({
  descricaoCompleta: `${m.nome || 'Pistola'}, Marca: ${m.fabricante || 'N/D'}...`
});
```

**Código corrigido:**
```typescript
// Para Armamento
materiais.push({
  qtd: '01',
  nome: `${m.nome} ${m.calibre || ''}`.trim(),  // Ex: "Pistola .40"
  modelo: m.fabricante || m.modelo || '-',
  serie: m.numeroSerie || '-'
});

// Para Carregadores
if (m.quantidadeCarregadores > 0) {
  materiais.push({
    qtd: String(m.quantidadeCarregadores).padStart(2, '0'),
    nome: `Carregadores ${m.calibre || ''}`.trim(),
    modelo: m.fabricante || '-',
    serie: '-'  // Carregadores não têm série
  });
}

// Para Munição
if (m.quantidadeMunicoes > 0) {
  materiais.push({
    qtd: String(m.quantidadeMunicoes).padStart(2, '0'),
    nome: `Munições ${m.calibre || ''}`.trim(),
    modelo: '-',
    serie: '-'
  });
}

// Para Colete
materiais.push({
  qtd: '01',
  nome: `${m.nome} Tamanho ${m.tamanhoColete || '-'} ${m.sexo === 'Masculino' ? 'Masc' : 'Fem'}`.trim(),
  modelo: m.fabricante || '-',
  serie: m.numeroSerie || '-'
});
```

#### 2. Cloud Function (functions/index.js)

Atualizar a função `gerarTermoEntregaDocx` para usar os novos campos:

**Código atual (linha 409-418):**
```javascript
const templateData = {
  ...
  materiais: data.materiais || [],
  itensadicionais: data.itensAdicionais || []
};
```

**Código corrigido:**
```javascript
// Formatar materiais para a tabela
const materiaisFormatados = (data.materiais || []).map(m => ({
  qtd: m.qtd || '01',
  nome: m.nome || '-',
  modelo: m.modelo || '-',
  serie: m.serie || '-'
}));

// Formatar itens adicionais para a segunda tabela
const outrosMateriais = (data.itensAdicionais || []).map(item => ({
  qtd: '01',
  descricao: item.descricao?.toUpperCase() || item.toUpperCase()
}));

const templateData = {
  ...
  materiais: materiaisFormatados,
  outrosmateriais: outrosMateriais
};
```

#### 3. Template DOCX (template-termo-entrega.docx)

O template no Firebase Storage precisa ter os placeholders corretos:

**Tabela 1:**
```
{#materiais}
| {qtd} | {nome} | {modelo} | {serie} |
{/materiais}
```

**Tabela 2:**
```
{#outrosmateriais}
| {qtd} | {descricao} |
{/outrosmateriais}
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin-belico/documentos/GerarTermoEntregaForm.tsx` | Refatorar formatação dos materiais para estrutura tabular |
| `functions/index.js` | Atualizar processamento dos dados na função `gerarTermoEntregaDocx` |

---

### Fluxo de Dados Corrigido

```
Frontend (GerarTermoEntregaForm)
         │
         ▼
┌─────────────────────────────────┐
│ materiais: [                    │
│   { qtd: "01",                  │
│     nome: "Pistola .40",        │
│     modelo: "SIGSAUER",         │
│     serie: "58H16975" },        │
│   { qtd: "03",                  │
│     nome: "Carregadores .40",   │
│     modelo: "SIGSAUER",         │
│     serie: "-" },               │
│   { qtd: "30",                  │
│     nome: "Munições .40",       │
│     modelo: "-",                │
│     serie: "-" }                │
│ ]                               │
│ itensAdicionais: [              │
│   { descricao: "BOTA..." }      │
│ ]                               │
└─────────────────────────────────┘
         │
         ▼
Cloud Function (gerarTermoEntregaDocx)
         │
         ▼
┌─────────────────────────────────┐
│ Template DOCX renderizado com   │
│ duas tabelas formatadas         │
└─────────────────────────────────┘
```
