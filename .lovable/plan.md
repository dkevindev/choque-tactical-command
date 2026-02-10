

# Refatorar sub-aba "Transferidos" - Foco no Material

## O que muda

A sub-aba "Transferidos" dentro de "Saiu da Carga" sera completamente reescrita. Em vez de uma tabela centrada no policial (com colunas de publicacao, destino, documentos), passara a ser uma **tabela focada nos materiais** que sairam da carga por transferencia.

## Nova estrutura da tabela principal

Cada linha sera um **material individual** (extraido dos arrays `materiaisLevados` de todas as transferencias).

| Coluna | Conteudo |
|--------|----------|
| Material | Nome do material |
| N/S | Numero de serie |
| Categoria | Categoria do material |
| Fabricante/Modelo | Fabricante e modelo |
| Cautelado a | Nome do policial que levou |
| Data | Data da transferencia |
| Acoes | Botao olho para ver detalhes |

### Filtro/Busca

Campo de busca que filtra por nome do material, numero de serie ou nome do policial.

### Modal ao clicar no olho

Ao clicar no icone de olho, abre um modal com todas as informacoes da transferencia:

- **Dados do Policial**: patente, nome, matricula
- **Transferencia**: destino, publicacao, data
- **Materiais Levados**: lista completa do que o policial levou
- **Materiais Devolvidos**: lista do que ficou no batalhao

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/MateriaisTransferidos.tsx`

Reescrever o componente para:

1. Ao carregar as transferencias de `transferencias_policiais`, fazer um "flat map" para criar uma lista de materiais:

```typescript
interface MaterialTransferido {
  material: Material;
  transferencia: Transferencia;
}

const materiaisFlat = transferencias.flatMap(t =>
  t.materiaisLevados.map(m => ({ material: m, transferencia: t }))
);
```

2. Tabela renderiza `materiaisFlat` - cada linha e um material
3. Busca filtra por `material.nome`, `material.numeroSerie`, `transferencia.policialNome`
4. Remover filtros de local e status (nao mais necessarios)
5. Modal de detalhes continua mostrando os dados completos da transferencia (policial, destino, publicacao, materiais levados, materiais devolvidos) - sem a secao de documentos

### Resumo

| Arquivo | Acao |
|---------|------|
| `MateriaisTransferidos.tsx` | Reescrever - tabela focada em materiais com modal de detalhes do policial |

