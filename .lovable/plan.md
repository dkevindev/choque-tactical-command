

# Refatorar Historico de Materiais: Botao Global "Consultar Historico"

## Problema Atual

Ao clicar no icone de relogio (History) de cada material individual, o sistema verifica se existe historico e, caso nao exista, cria um registro retroativo para aquele material especifico. Isso significa que o usuario precisa clicar em cada material um por um para gerar o historico.

## O que sera feito

1. Remover a logica de registro retroativo do `loadHistorico` (o clique individual apenas consulta, sem criar nada)
2. Adicionar um botao "Consultar Historico" no header da pagina que processa TODOS os materiais de uma vez
3. Para cada material cautelado sem historico, cria o registro retroativo
4. Tambem consulta a colecao `transferencias_policiais` para verificar se algum material passou por policiais transferidos e cria registros de historico tipo "transferido"

## Detalhes Tecnicos

### Arquivo: `src/components/admin-belico/CadastroMateriais.tsx`

**1. Remover registro retroativo do `loadHistorico` (linhas 560-602)**

A funcao `loadHistorico` passara a ser apenas consulta simples:

```typescript
const loadHistorico = async (materialId: string, materialNome: string) => {
  setHistoricoLoading(true);
  setHistoricoNomeMaterial(materialNome);
  setShowHistorico(true);
  try {
    const q = query(collection(db, 'historico_material'), where('materialId', '==', materialId));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({
      id: d.id, ...d.data(),
      data: d.data().data?.toDate?.() || new Date()
    }));
    data.sort((a, b) => b.data.getTime() - a.data.getTime());
    setHistoricoMaterial(data);
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    setHistoricoMaterial([]);
  } finally {
    setHistoricoLoading(false);
  }
};
```

**2. Nova funcao `gerarHistoricoGlobal`**

Adicionar funcao que:
- Carrega todos os registros de `historico_material` de uma vez
- Para cada material cautelado sem historico, cria registro retroativo tipo `cautelado`
- Carrega `transferencias_policiais` e verifica se algum materialId dos materiais aparece nos `materiaisLevados`
- Para cada match em transferencias sem registro de historico tipo `transferido`, cria o registro com dados do policial transferido e destino
- Exibe toast com resumo (ex: "12 registros criados, 3 transferencias encontradas")

**3. Adicionar botao no header (linha 685-698)**

Adicionar botao "Consultar Historico" ao lado dos botoes existentes:

```typescript
<Button 
  variant="outline" 
  onClick={gerarHistoricoGlobal}
  disabled={gerandoHistorico}
  className="flex items-center gap-2"
>
  <History className="h-4 w-4" />
  {gerandoHistorico ? 'Gerando...' : 'Gerar Histórico'}
</Button>
```

**4. Novo estado para controle de loading**

```typescript
const [gerandoHistorico, setGerandoHistorico] = useState(false);
```

### Logica da verificacao de transferidos

```
Para cada material em materiais_belicos:
  1. Buscar se existe historico em historico_material
  2. Se nao existe e material esta cautelado -> criar registro "cautelado"
  3. Buscar em transferencias_policiais se o materialId aparece em materiaisLevados
  4. Para cada transferencia encontrada sem historico correspondente -> criar registro "transferido"
     com policialNome, localDestino e data da transferencia
```

### Resumo de alteracoes

| Local | Acao |
|-------|------|
| `loadHistorico` | Remover bloco de registro retroativo (linhas 571-587) |
| Header | Adicionar botao "Gerar Historico" |
| Nova funcao | `gerarHistoricoGlobal` que processa todos os materiais + transferidos |
| Novo estado | `gerandoHistorico` para loading do botao |

