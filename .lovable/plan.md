

# Corrigir Mapeamento de Unidades e Logica de Indisponibilidade

## Problema 1: Unidade "3ºPEL/2ºESQD" nao mapeada
O Firestore tem valores como `"3ºPEL/2ºESQD"` mas o codigo espera `"3º PEL"`. A falta de normalizacao faz com que esses policiais caiam em "OUTROS" e aparecam com 0/0/0.

## Problema 2: Indisponibilidades incorretas
A logica atual classifica como "indisponivel" TUDO que nao seja "MONTADO - POLICIAMENTO OSTENSIVO" ou "VIATURA". Isso inclui funcoes normais como ARMEIRO, MOTORISTA, OFICIAL, SENTINELA CAVALARICO, PROJETOS SOCIAIS, etc.

O correto e: so deve ser "indisponivel" quem estiver nas situacoes cadastradas na aba Situacao:
- FERIAS
- READAPTACAO FUNCIONAL
- LICENCA TRATAMENTO DE SAUDE
- LICENCA PATERNIDADE / MATERNIDADE
- RECOMPENSA MILITAR
- NUPCIAS / LUTO
- CURSANDO / TRANSITO
- RESP. PROCESSO
- DESERTOR
- A DISP. DE OUTROS ORGAOS
- RECOLHIDO PRES. MILITAR
- AGREGADO / AGREGADO - AGUARDANDO RESERVA

## Alteracoes no arquivo `functions/index.js`

### 1. Substituir SITUACOES_OPERACIONAIS por SITUACOES_INDISPONIVEIS
Em vez de listar quem e operacional (e todo o resto ser indisponivel), listar explicitamente quem e indisponivel:

```javascript
const SITUACOES_INDISPONIVEIS = [
  'FERIAS',
  'READAPTACAO FUNCIONAL',
  'LICENCA TRATAMENTO DE SAUDE',
  'LICENCA PATERNIDADE',
  'LICENCA MATERNIDADE',
  'RECOMPENSA MILITAR',
  'NUPCIAS',
  'LUTO',
  'CURSANDO',
  'TRANSITO',
  'RESP. PROCESSO',
  'RESP A PROCESSO (PAD/CD...)',
  'DESERTOR',
  'A DISP. DE OUTROS ORGAOS',
  'RECOLHIDO PRES. MILITAR',
  'AGREGADO',
  'AGREGADO - AGUARDANDO RESERVA'
];
```

### 2. Inverter a logica de classificacao
Antes: "se NAO esta em SITUACOES_OPERACIONAIS, e indisponivel"
Depois: "se ESTA em SITUACOES_INDISPONIVEIS, e indisponivel"

### 3. Adicionar normalizacao de unidades
Criar funcao que mapeia variacoes reais do Firestore para as chaves esperadas:
- `"3ºPEL/2ºESQD"` -> `"3º PEL"`
- `"2o ESQD"` -> `"2º ESQD"`
- `"1O ESQD"` -> `"1º ESQD"`
- etc.

### 4. Logar unidades nao mapeadas
Adicionar log para identificar rapidamente valores de UNIDADE que nao foram reconhecidos.

## Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `functions/index.js` | Trocar logica de SITUACOES_OPERACIONAIS para SITUACOES_INDISPONIVEIS |
| `functions/index.js` | Adicionar normalizacao de nomes de unidade |

Apos as alteracoes, sera necessario fazer deploy: `firebase deploy --only functions:gerarResumoEfetivoDocx`
