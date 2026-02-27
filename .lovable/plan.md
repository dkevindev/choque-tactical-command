
# Melhorias: Colunas de Situacao/CID, LTS Automatico e Modal de Aviso

## 1. Adicionar coluna "Situacao" na lista de Outros Afastamentos

No `EstatisticasTab.tsx`, a funcao `renderPolicialList` sera modificada para aceitar um parametro indicando colunas extras. Na lista de "Outros Afastamentos", sera adicionada a coluna **Situacao** mostrando em qual situacao o policial se encontra (ex: CURSANDO, LUTO, etc).

## 2. Mostrar CID e Descricao na lista de LTS e na tabela de Indisponibilidades

Ao carregar a aba de Estatisticas, buscar a colecao `atestados_medicos` do Firebase e criar um mapa por `policialId`. Na lista de LTS e na tabela de Indisponibilidades, para policiais em LTS, exibir colunas adicionais:
- **CID** (codigo)
- **Descricao CID**

## 3. Automacao de LTS ao cadastrar atestado acima de 3 dias

No `AtestadosMedicosTab.tsx`, na funcao `handleSalvar`, apos salvar o atestado com sucesso e se `dias > 3`:
- Atualizar o policial no Firebase com `SITUACAO = "LICENCA TRATAMENTO DE SAUDE"`, `inicioSituacao`, `fimSituacao`, `funcaoOrigem`
- Registrar assentamento automatico

## 4. Verificacao automatica ao abrir o sistema (GestãoPessoas.tsx)

Criar funcao `verificarSituacoesLTS()` que roda apos `fetchPoliciais`:

- **Entrar em LTS**: Buscar atestados vigentes com dias > 3. Se o policial nao esta em LTS, atualizar automaticamente e registrar assentamento.
- **Sair de LTS**: Para cada policial em LTS, verificar se existe atestado vigente. Se nao existe ou ja venceu, retornar para "EM ATIVIDADE", restaurar `funcaoOrigem` e registrar assentamento.

## 5. Tela de Loading com banner do Regimento

Substituir o loading atual do `GestãoPessoas.tsx` por overlay elegante com:
- Fundo escuro semi-transparente
- Logo do regimento centralizada e grande
- Barra de progresso animada
- Texto "Verificando efetivo..."
- Fade-out suave ao concluir

## 6. Modal de aviso para policiais que voltaram de LTS automaticamente

Ao concluir a verificacao automatica (item 4), guardar em estado a lista de policiais que foram automaticamente retirados de LTS (atestado venceu). Essa lista sera passada como prop ou contexto.

**Comportamento do modal:**
- Aparece sempre que o usuario clicar na aba "Atestados" se houver policiais que retornaram automaticamente para "EM ATIVIDADE"
- Mostra uma tabela com: Nome de Guerra, Numeral, Matricula, CID, Data Inicio, Data Fim do atestado
- Titulo: "Policiais que retornaram de LTS automaticamente"
- Botao "Confirmar Leitura" ao lado de cada policial (ou um botao geral para confirmar todos)
- Ao confirmar, o policial e removido da lista de avisos (armazenado em estado local - sessionStorage para persistir durante a sessao)
- O modal so para de aparecer quando todos os avisos forem confirmados

---

## Detalhes Tecnicos

### Arquivo: `src/components/gestao-pessoas/EstatisticasTab.tsx`
- Adicionar useEffect para buscar `atestados_medicos` e criar mapa `policialId -> atestado`
- Modificar `renderPolicialList` para aceitar opcoes de colunas extras (situacao, cid)
- Lista LTS: mostrar CID e Descricao CID
- Lista Outros: mostrar coluna Situacao
- Tabela Indisponibilidades: mostrar CID e Descricao para policiais em LTS

### Arquivo: `src/components/gestao-pessoas/AtestadosMedicosTab.tsx`
- Em `handleSalvar`, apos `addDoc`, se `dias > 3`: `updateDoc` no policial + `addDoc` em assentamentos
- Aceitar prop `avisoRetornos` (lista de policiais que voltaram de LTS) e `onConfirmarAviso`
- Renderizar Dialog/Modal de aviso no topo do componente

### Arquivo: `src/components/GestãoPessoas.tsx`
- Criar funcao `verificarSituacoesLTS()` que roda apos fetchPoliciais
- Estado `verificando` para loading bonito com logo
- Estado `retornosLTS` para armazenar policiais que voltaram automaticamente
- Passar `retornosLTS` e `onConfirmarAviso` como props para AtestadosMedicosTab
- Loading com imagem `src/assets/logo-regimento.jpg`, barra de progresso e texto animado
