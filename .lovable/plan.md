# Plano: Correções na Reserva de Armamento

## ✅ CONCLUÍDO

### Alterações Realizadas

| Componente | Modificação | Status |
|------------|-------------|--------|
| `PendenciasAnterioresSection.tsx` | Adicionado Collapsible para minimizar seção | ✅ |
| `ModalComplementarCautela.tsx` | Corrigido busca de policial com fallback + integração Totem | ✅ |
| `TotemPolicialInterface.tsx` | Adicionado listener para detectar `statusComplemento` | ✅ |

---

## Detalhes da Implementação

### 1. Collapsible em Pendências Anteriores
- Adicionado estado `minimizado` e componente `Collapsible`
- Badge mostrando quantidade de pendências
- Botão com ícone ChevronUp/ChevronDown para expandir/minimizar

### 2. Correção de Busca de Policial
- Utiliza `buscarPolicialPorId` de `policialUtils.ts` com fallback
- Suporta busca por ID do documento, campo `id` ou `usuarioId`

### 3. Integração com Totem para Complemento
- Nova etapa `'aguardando'` no ModalComplementarCautela
- Campo `statusComplemento: 'aguardando_confirmacao'` salvo no Firebase
- Campo `materiaisComplemento` com lista de materiais a adicionar
- `sessaoDigitacao` sincronizado em tempo real para espelhar no Totem
- Suporte completo a primeiro acesso e reset de senha
- TotemPolicialInterface agora detecta complementos via novo listener
