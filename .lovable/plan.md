
## Plano de Implementação: Três Melhorias no Sistema

---

### 1. Botão "Calibre 12 - Não possui carregador" na Reserva de Armamento

**Problema:** Ao cautelar uma espingarda Calibre 12, o sistema abre o modal solicitando quantidade de carregadores, mas esse tipo de arma não utiliza carregadores.

**Solução:** Adicionar lógica especial no `ModalQuantidadeMaterial.tsx` para detectar armas Calibre 12 e pular a configuração de carregadores.

**Arquivos a modificar:**
- `src/components/reserva-armamento/ModalQuantidadeMaterial.tsx`

**Alterações técnicas:**
1. Detectar se o material é Calibre 12 através do campo `material.calibre`
2. Se for Calibre 12:
   - Exibir um botão destacado (cor laranja/amber) indicando "Calibre 12 - Sem Carregador"
   - Não mostrar o seletor de quantidade de carregadores
   - Confirmar automaticamente com 0 carregadores
3. Para outras armas, manter o comportamento atual

**Visual esperado:**

```
┌─────────────────────────────────────────┐
│ Configurar Armamento                    │
├─────────────────────────────────────────┤
│ Espingarda Cal 12                       │
│ Arma - Calibre: 12                      │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🔶 CALIBRE 12                  │    │
│  │     Não possui carregador       │    │  ← Botão destacado em amber
│  └─────────────────────────────────┘    │
│                                         │
│  [Cancelar]            [Adicionar]      │
└─────────────────────────────────────────┘
```

---

### 2. Correção de Livros Duplicados no Histórico

**Problema:** Ao fechar livros, estão aparecendo múltiplos registros duplicados para o mesmo dia e armeiro no histórico.

**Diagnóstico:** O botão "Fechar Livro" pode estar sendo clicado múltiplas vezes antes da operação ser concluída, ou há uma condição de corrida (race condition) que permite múltiplos fechamentos.

**Solução:** Implementar proteção contra cliques duplos e validação de estado.

**Arquivos a modificar:**
- `src/components/reserva-armamento/ModalFechamentoLivro.tsx`
- `src/components/reserva-armamento/ArmeiroInterface.tsx`

**Alterações técnicas:**

No `ModalFechamentoLivro.tsx`:
1. Desabilitar o botão imediatamente ao clicar
2. Fechar o modal automaticamente após sucesso (já feito)

No `ArmeiroInterface.tsx`:
1. Verificar se o livro ainda está ativo antes de fechar
2. Adicionar flag para prevenir múltiplos cliques
3. Verificar no Firebase se o livro já foi fechado antes de tentar fechar novamente

---

### 3. Funcionalidade "Enviar OS por Email" no Menu Documentos

**Problema:** Após criar OS, os auxiliares precisam manualmente montar o corpo do email com todas as informações. Isso é repetitivo e propenso a erros.

**Solução:** Criar uma nova aba/seção no `DocumentosPage` que permite selecionar múltiplas OS e gerar automaticamente o corpo do email formatado.

**Arquivos a criar:**
- `src/components/motorizado/GerarCorpoEmailOS.tsx`

**Arquivos a modificar:**
- `src/components/DocumentosPaga.tsx`

**Estrutura do novo componente:**

```
┌─────────────────────────────────────────────────────────────────┐
│ ENVIAR OS POR EMAIL                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Selecione o Auxiliar:                                           │
│ ┌───────────┐  ┌───────────┐                                    │
│ │ CB KEVIN  │  │ SD SOUSA  │   ← Botões de seleção              │
│ └───────────┘  └───────────┘                                    │
│                                                                 │
│ Ordens de Serviço disponíveis:                     [Filtrar ▼]  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ☐ OS 51726 | OF 006/2026 | CAV 12 | SBQ0D65 | R$ 993,08     │ │
│ │ ☑ OS 51445 | OF 007/2026 | DUSTER | PNK8927 | R$ 1.043,25   │ │
│ │ ☑ OS 51447 | OF 008/2026 | CO20   | PNM9507 | R$ 1.195,35   │ │
│ │ ☐ OS 7622764 | OF 009/2026 | CAV 08 | ORZ3930 | R$ 1.244,00 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Gerar Corpo do Email]                                          │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Boa tarde,                                                  │ │
│ │                                                             │ │
│ │ Segue em anexo ofício para solicitação de pagamento de      │ │
│ │ ordens de serviços mecânicos realizados nos veículos        │ │
│ │ PERTENCENTE a este RPMONT.                                  │ │
│ │                                                             │ │
│ │ - OF 007/2026 - OS 51445 - DUSTER de placa PNK8927 -        │ │
│ │   VALOR R$ 1.043,25                                         │ │
│ │ - OF 008/2026 - OS 51447 - CO20 de placa PNM9507 -          │ │
│ │   VALOR R$ 1.195,35                                         │ │
│ │                                                             │ │
│ │ --                                                          │ │
│ │                                                             │ │
│ │ Respeitosamente,                                            │ │
│ │                                                             │ │
│ │ CB KEVIN                                                    │ │
│ │ Auxiliar da 4° seção do RPMONT                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                        [Copiar para Área de Transferência]
└─────────────────────────────────────────────────────────────────┘
```

**Lógica do componente:**

1. Buscar todas as OS da coleção `ordensDeServico` no Firebase
2. Exibir lista com checkboxes para seleção múltipla
3. Permitir filtrar por mês/data
4. Ao clicar em "Gerar Corpo do Email":
   - Verificar hora atual: antes das 12h = "Bom dia", depois = "Boa tarde"
   - Montar texto com todas as OS selecionadas no formato especificado
   - Usar campos: `numeroOficina`, `numeroOS`, `cadastroViatura` (prefixo), `placaViatura`, `valorOS`
   - Adicionar assinatura do auxiliar selecionado
5. Botão para copiar texto para a área de transferência

**Campos utilizados das OS:**
- `numeroOficina` → "OF 006/2026"
- `numeroOS` → "OS 51726"
- `cadastroViatura` → "CAV 12" (prefixo da viatura)
- `placaViatura` → "SBQ0D65"
- `valorOS` → "R$ 993,08"

---

### Resumo das Alterações

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `ModalQuantidadeMaterial.tsx` | Modificar | Adicionar detecção de Calibre 12 e botão especial sem carregador |
| `ModalFechamentoLivro.tsx` | Modificar | Adicionar proteção contra cliques duplos |
| `ArmeiroInterface.tsx` | Modificar | Validar estado do livro antes de fechar |
| `GerarCorpoEmailOS.tsx` | Criar | Novo componente para geração de corpo de email |
| `DocumentosPaga.tsx` | Modificar | Adicionar nova opção "Enviar OS Email" na aba Motorizado |

---

### Ordem de Implementação

1. **Calibre 12** - Alteração simples no modal de quantidade
2. **Livros Duplicados** - Correção de proteção contra cliques duplos
3. **Email OS** - Nova funcionalidade mais complexa
