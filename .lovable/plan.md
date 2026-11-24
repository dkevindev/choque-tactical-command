# Corrigir letras ilegíveis em Gestão de Pessoas

## O problema
O sistema usa tema escuro, com letra clara. Em vários pontos o fundo foi pintado com cores claras fixas (amarelo, verde, azul e vermelho bem claros). Nesses pontos a letra clara fica em cima do fundo claro e quase some. O Top Assiduidade é um exemplo: os 3 primeiros ficam em amarelo claro.

## O que vou corrigir (16 pontos encontrados)
- **Estatísticas:** Top Assiduidade (três primeiros), selos coloridos das situações (azul, verde, amarelo, vermelho) e o card de disponibilidade.
- **Efetivo:** linhas de cedidos/BSP e selos de situação.
- **Atestados Médicos:** avisos em amarelo e selos de status.
- **Movimentações:** destaques amarelo e azul.
- **Tela principal de Gestão de Pessoas:** fundos claros que restarem.

Regra aplicada: fundo colorido suave e translúcido (ex.: amarelo a 15%) com letra da mesma cor em tom claro e legível, ou fundo forte com letra escura definida. Assim nunca fica letra parecida com o fundo. As cores de destaque (ouro/prata/bronze, verde, vermelho) continuam, só ficam legíveis.

Depois abro cada aba de Gestão de Pessoas no navegador e tiro fotos para confirmar.

## Detalhes técnicos
- Trocar `bg-*-50/100/200` e `bg-white` sem cor de texto por `bg-*-500/15 text-*-300 border-*-500/30` (ou equivalente), em GestãoPessoas.tsx e gestao-pessoas/{EstatisticasTab,EfetivoTab,AtestadosMedicosTab,MovimentacoesTab}.tsx.
- Conferir textos `text-gray-500/600/700` e `text-*-700/800` sobre o card escuro e subir para tons 300/400.
- Não mexer em lógica nem em outras áreas do sistema.
