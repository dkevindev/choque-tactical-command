

# Painel de Notícias e Determinações no Totem da Reserva

## Resumo
Reorganizar o Totem da Reserva de Armamento para que, quando estiver ocioso (sem cautela em andamento), exiba um grande painel de notícias/determinações em formato de banner em slideshow automático. O bloco "Aguardando material..." vira pequeno e discreto no canto. Inclui um banner fixo de aniversariantes do dia gerado automaticamente a partir das datas de nascimento dos policiais.

## 1. Nova estrutura visual do Totem (modo ocioso)

**Arquivo**: `src/components/reserva-armamento/TotemPolicialInterface.tsx`

Layout em tela cheia dividido em duas regiões:
- **Header reduzido** (topo): logo + título + um pequeno chip de status "Aguardando material" com `Loader2` discreto
- **Área principal (≈85% da tela)**: carrossel de banners em rotação automática (8s por slide, transição fade/slide)
- **Rodapé**: data/hora atual em destaque e indicadores de slide (bullets)

Quando uma cautela chega (`cautelaAtual !== null`), o painel some e a interface atual de cautela ocupa toda a tela como já é hoje.

## 2. Carrossel de Notícias

Novo componente: `src/components/reserva-armamento/PainelNoticias.tsx`

- Listener `onSnapshot` em nova coleção `noticias_totem` filtrando `ativa == true` e `dataExpiracao >= hoje`
- Ordenação por `prioridade` desc + `dataPublicacao` desc
- Auto-play 8s, pausa em erro, faz loop infinito
- Banner full-bleed com:
  - Tag de tipo (NOTÍCIA / DETERMINAÇÃO / AVISO) com cor distinta
  - Título grande (text-6xl)
  - Corpo da mensagem (text-3xl)
  - Autor + data de publicação no canto
- Banner especial de aniversariantes (sempre incluso quando houver) usa visual festivo: gradiente dourado/azul, ícone 🎂, animação `animate-pulse`/confete, lista os nomes dos aniversariantes do dia em destaque

## 3. Aniversariantes do dia (automático)

Função utilitária dentro do `PainelNoticias.tsx`:
- Lê coleção `policiais` uma vez (com refresh diário)
- Filtra por `dataNascimento` (suporta os formatos já em uso: string ISO, número Excel serial, e campo `NASCIMENTO`/`Data de Nascimento`)
- Compara `dia` e `mês` com a data atual
- Gera um slide virtual injetado no início do carrossel:
  - "🎉 PARABÉNS AOS ANIVERSARIANTES DE HOJE 🎉"
  - Lista: `POSTO/GRAD NOME DE GUERRA` (uma linha por policial em fonte grande)
  - Subtítulo: "Que Deus abençoe sua jornada — RPMONT"
- Se não houver aniversariantes, slide é omitido

## 4. Cadastro de notícias (Gestão)

Nova coleção Firestore `noticias_totem`:
```text
{
  tipo: "noticia" | "determinacao" | "aviso",
  titulo: string,
  mensagem: string,
  autor: string,
  origemPainel: "gestao_logistica" | "gestao_pessoas",
  dataPublicacao: Timestamp,
  dataExpiracao: Timestamp,
  prioridade: number (0-10),
  ativa: boolean
}
```

Novo componente compartilhado: `src/components/painel-noticias/GerenciarNoticiasTotem.tsx`
- Tabela com notícias existentes (editar/desativar/excluir)
- Formulário (Dialog) para criar nova: tipo, título, mensagem, validade (data de expiração), prioridade
- Preview do banner antes de salvar

Integração:
- **Gestão e Logística** (`src/components/AdminDashboard.tsx`): nova aba/card "Painel Totem" → renderiza `GerenciarNoticiasTotem` com `origemPainel="gestao_logistica"`
- **Gestão de Pessoas** (`src/components/GestãoPessoas.tsx`): nova aba "Painel Totem" → mesmo componente com `origemPainel="gestao_pessoas"`

Ambos veem todas as notícias, mas a origem fica registrada para auditoria.

## 5. Detalhes técnicos

- Animação dos banners usa Tailwind keyframes existentes (`animate-fade-in`, `animate-scale-in`)
- Aniversariantes recalculados automaticamente quando o relógio cruza a meia-noite (setInterval de 1 min checando data)
- Toda a área do painel é `pointer-events-none` para evitar interação acidental no totem
- Cores por tipo: NOTÍCIA (azul), DETERMINAÇÃO (vermelho), AVISO (âmbar), ANIVERSÁRIO (gradiente dourado/festivo)

## Arquivos

**Criar:**
- `src/components/reserva-armamento/PainelNoticias.tsx`
- `src/components/painel-noticias/GerenciarNoticiasTotem.tsx`

**Editar:**
- `src/components/reserva-armamento/TotemPolicialInterface.tsx` — substituir bloco "Aguardando material" pelo painel
- `src/components/AdminDashboard.tsx` — nova aba "Painel Totem"
- `src/components/GestãoPessoas.tsx` — nova aba "Painel Totem"

