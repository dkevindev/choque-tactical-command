# Policiais "À Disposição" (recrutas temporários)

## O que entendi
- Recrutas ficam no mesmo cadastro de policiais, mas marcados como **À Disposição** — não aparecem no efetivo, estatísticas, resumo do efetivo nem nas listas normais.
- Eles mesmos se cadastram por um **link para celular**.
- Pistolas deles são cadastradas **em lote**, fora da nossa carga, visíveis só numa área separada.
- Cada pistola já vem com **2 carregadores e 20 munições**.
- Cautelas geradas do mesmo jeito que hoje, separadas das nossas, com consulta e botão **Baixar cautela** funcionando igual.

## 1. Link de autocadastro (celular)
- Página pública `/cadastro-disposicao`, visual simples para celular.
- Campos: Nome completo, Nome de guerra, Matrícula, Telefone, Endereço.
- Bloqueia matrícula repetida. Mostra tela de "Cadastro enviado".
- Grava em `policiais` com `aDisposicao: true`, situação "À DISPOSIÇÃO".
- Botão "Copiar link" e QR Code na área de gestão.

## 2. Nova área "À Disposição" (Gestão e Logística)
Três abas:
- **Policiais**: lista dos recrutas cadastrados (editar, excluir, efetivar como nosso se permanecer).
- **Pistolas**: cadastro em lote (modelo, calibre, lista de números de série colados um por linha); gravadas em `materiais_belicos` com `aDisposicao: true` — fora da carga, análises e alertas.
- **Cautelas**: gerar automaticamente (uma pistola + 2 carregadores + 20 munições por recruta, por ordem ou escolha manual), consultar e **Baixar cautela** com o mesmo botão/fluxo atual.

## 3. Separação do nosso efetivo e carga
- Filtrar `aDisposicao` fora de: tabela de policiais, efetivo, estatísticas, resumo efetivo, carga bélica, análise de armamentos, alertas e cautelas normais.

## Detalhes técnicos
- Campo booleano `aDisposicao` em `policiais`, `materiais_belicos` e nas cautelas (`cautelas_permanentes`).
- Reaproveita a geração/exportação existente de `NovaCautelaForm` / `GerenciarCautelas`.
- Regras do Firestore precisam permitir criação pública apenas em `policiais` com `aDisposicao == true` (vou passar o trecho para colar no console).

## Dúvida para confirmar
- Ao baixar a cautela, a pistola volta a ficar livre para outro recruta (sim, por padrão).
