
## Plano de Correção: Três Problemas no Sistema

### Problema 1: Oficiais sem NUMERAL causam erro na cautela provisória

**Diagnóstico:**
Ao criar uma cautela provisória, o campo `policialNumeral` recebe o valor `undefined` para oficiais que não possuem esse campo. O Firebase não aceita valores `undefined`, gerando erro ao tentar salvar o documento.

**Arquivos afetados:**
- `src/components/reserva-armamento/ArmeiroInterface.tsx`

**Solução:**
Modificar a função `enviarParaConfirmacao` para omitir o campo `policialNumeral` quando ele for `undefined`. Aplicar a mesma lógica usada para os materiais (spread condicional).

**Código atual (linha 690-697):**
```typescript
const numeral = policialSelecionado.NUMERAL;

const cautelaData: Record<string, any> = {
  policialNumeral: numeral, // ❌ Pode ser undefined
  ...
};
```

**Código corrigido:**
```typescript
const numeral = policialSelecionado.NUMERAL;

const cautelaData: Record<string, any> = {
  ...(numeral !== undefined && { policialNumeral: numeral }), // ✅ Só inclui se existir
  ...
};
```

Mesma correção aplicada em todas as funções que criam cautelas (3 locais no arquivo).

---

### Problema 2: Material Na Rua mostrando detalhes por padrão

**Diagnóstico:**
O componente `PolicialAvatar` exibe o balão com materiais sempre visível. Isso polui a tela e causa sobreposição com outros avatares.

**Arquivos afetados:**
- `src/components/reserva-armamento/MaterialNaRuaSection.tsx`

**Solução:**
Alterar o comportamento do balão de materiais para:
1. Ficar oculto por padrão
2. Aparecer somente ao clicar ou hover no ícone do policial
3. Manter a informação de QRA (nome de guerra) sempre visível abaixo do ícone

**Código atual (linhas 94-109):**
```typescript
{/* Balão de Fala */}
<div className={cn(
  "absolute bottom-full ... opacity-90 ..."  // ❌ Sempre visível
)}>
  {materiaisResumo.map(...)}
</div>
```

**Código corrigido:**
```typescript
{/* Balão de Fala - só aparece no hover ou click */}
<div className={cn(
  "absolute bottom-full ...",
  "opacity-0 group-hover:opacity-100",  // ✅ Invisível por padrão, visível no hover
  "pointer-events-none group-hover:pointer-events-auto",
  "transition-all duration-300"
)}>
  {materiaisResumo.map(...)}
</div>
```

---

### Problema 3: Câmera do Scanner QR Code não abre no CAVBot

**Diagnóstico:**
O console mostra "Container do scanner não encontrado". Isso indica que o elemento DOM com `id="qr-scanner-cadastro"` não está pronto quando a função `iniciarScanner` é chamada.

**Arquivos afetados:**
- `src/components/patrimonio/CadastroPatrimonioCavbot.tsx`

**Solução:**
1. Usar `useEffect` para iniciar o scanner somente após o componente de scan ser renderizado
2. Adicionar verificação robusta do container DOM com retry
3. Aplicar as mesmas configurações de câmera do `QRCodeScanner.tsx` (zoom 2.5x, focusMode: continuous)

**Código atual:**
```typescript
const iniciarScanner = async () => {
  await new Promise(resolve => setTimeout(resolve, 100)); // ❌ Delay fixo insuficiente
  
  const container = document.getElementById('qr-scanner-cadastro');
  if (!container) {
    toast.error('Erro ao iniciar câmera...');
    return;
  }
  ...
};
```

**Código corrigido:**
```typescript
const iniciarScanner = async () => {
  // Aguardar múltiplas tentativas para o DOM estar pronto
  let container = null;
  for (let i = 0; i < 10; i++) {
    container = document.getElementById('qr-scanner-cadastro');
    if (container) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (!container) {
    console.error('Container do scanner não encontrado após 10 tentativas');
    toast.error('Erro ao iniciar câmera. Tente novamente.');
    setScanning(false);
    return;
  }
  
  try {
    const scanner = new Html5Qrcode('qr-scanner-cadastro');
    scannerRef.current = scanner;
    
    await scanner.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: { width: 150, height: 150 },
        aspectRatio: 1,
        videoConstraints: {
          facingMode: 'environment',
          advanced: [
            { zoom: 2.5 } as any,
            { focusMode: 'continuous' } as any
          ]
        }
      },
      ...
    );
  } catch (error) {
    ...
  }
};
```

Além disso, garantir que `setScanning(true)` seja chamado **antes** de renderizar o container do scanner, para que o elemento exista no DOM quando `iniciarScanner` for chamado.

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `ArmeiroInterface.tsx` | Usar spread condicional para `policialNumeral` em 3 locais onde cautelas são criadas |
| `MaterialNaRuaSection.tsx` | Alterar balão de materiais para aparecer apenas no hover/click |
| `CadastroPatrimonioCavbot.tsx` | Adicionar retry para encontrar container DOM + manter `setScanning(true)` antes da busca do container |

---

### Fluxo Visual do "Material Na Rua" após correção

```
┌───────────────────────────────────────────────┐
│   ÁREA OPERACIONAL                            │
│                                               │
│      👮‍♂️             👮‍♂️                        │
│    SD SOUSA        CB KEVIN                   │
│                                               │
│                       ┌────────────────┐      │
│                       │ 🔫 Pistola .40 │◄──── hover/click  
│                       │ 💥 Munição 60  │      mostra balão
│                       │ 🛡️ Colete      │      
│                       └────────────────┘      │
│                                               │
│      👮‍♂️             👮‍♂️                        │
│   SGT PAULO        SD LIMA                    │
│                                               │
└───────────────────────────────────────────────┘
```

