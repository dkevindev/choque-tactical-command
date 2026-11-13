# Escanear patrimônio: lista quando vários itens têm o mesmo QR

## O que muda
1. **Vários itens com o mesmo QR (ex.: 24 beliches):** ao escanear, em vez de mostrar só o último cadastrado, aparece uma lista com todos os itens que batem com aquele QR.
   - Topo: "24 itens encontrados" + nome do item.
   - Cada linha (cartão grande, fácil de tocar no celular): **Nº do tombo** em destaque e **local/seção** com ícone de mapa.
   - Itens ordenados por seção e depois por tombo; pequeno resumo de quantos há em cada seção (ex.: "Alojamento A: 10 · Alojamento B: 14").
   - Campo de busca rápida por tombo ou seção dentro da lista.
   - Tocar num item abre a ficha completa (tombo, nome, seção, valor, categoria, descrição) com botão "Voltar à lista".
2. **Só um item encontrado:** continua abrindo direto a ficha, como hoje.
3. **Texto invisível na ficha:** o cartão verde do item encontrado passa a ter fundo claro com texto escuro fixo (mesmo ajuste feito antes nas caixas do Sistema dos Usuários), para ler sem precisar selecionar o texto. Mesma correção no cartão amarelo de "não encontrado".

## Detalhes técnicos
- `QRCodeScanner.tsx`: além do melhor match, filtrar todos os itens com o mesmo texto de QR (descrição normalizada igual) e mesmo score máximo; ignorar baixados/transferidos. Se >1, estado `listaResultados` com vista lista/detalhe.
- Cores com classes forçadas (`!bg-white !text-slate-900`) nos cartões de resultado.
- Sem mudanças no cadastro nem no banco.
