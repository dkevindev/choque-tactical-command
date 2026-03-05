

# Gestao de Processos de Troca de Pneus por Viatura

## Resumo

Criar um sistema de processos de troca de pneus com 3 etapas (Solicitacao → Aprovacao → Conclusao), integrado ao modal de detalhes da viatura. Processos negados sao arquivados separadamente e nao entram no historico de trocas.

## Estrutura de Dados (Firestore)

Colecao: `frota/{viaturaId}/processos_pneus`

```text
{
  id: string (auto)
  status: 'solicitado' | 'aprovado' | 'finalizado' | 'negado'
  
  // Etapa 1 - Solicitacao
  nup: string                    // Numero do processo
  kmAtual: number
  quantidadePneus: number
  anexoLaudo_url: string | null  // PDF do laudo (Firebase Storage)
  dataSolicitacao: timestamp
  
  // Etapa 2 - Aprovacao
  origem: 'COLOG' | 'OFICINA' | null
  nomeOficina: string | null     // se origem === 'OFICINA'
  referenciaPneus: string | null
  dataAprovacao: timestamp | null
  
  // Etapa 3 - Conclusao
  numeroOS: string | null
  anexoOS_url: string | null     // se comprado em oficina
  pneusRecebidosColog: boolean   // se cedido pela COLOG
  dataConclusao: timestamp | null
  
  // Negacao
  motivoNegacao: string | null
  dataNegacao: timestamp | null
  
  criadoEm: timestamp
  criadoPor: string
}
```

Storage path: `processos_pneus/{viaturaId}/{processoId}/{nomeArquivo}`

## Arquivos

### 1. Criar: `src/components/frota/ProcessosPneusSection.tsx`

Componente principal com:

- **Lista de processos em andamento** (status != finalizado e != negado) com badges coloridos por status
- **Botao "Novo Processo"** que abre formulario da Etapa 1 (NUP, KM atual, quantidade de pneus, upload do laudo)
- **Ao clicar num processo existente**, exibe os dados ja preenchidos e libera o formulario da proxima etapa:
  - Status `solicitado` → mostra botoes "Informar Aprovacao" e "Processo Negado"
  - Status `aprovado` → mostra botao "Registrar Conclusao" e "Processo Negado"
- **Formulario Etapa 2 (Aprovacao)**: origem (COLOG/Oficina), nome oficina (condicional), referencia dos pneus
- **Formulario Etapa 3 (Conclusao)**: 
  - Se OFICINA: numero OS + upload OS
  - Se COLOG: checkbox "Pneus Recebidos na COLOG"
- **Botao "Processo Negado"**: pede motivo, muda status para `negado`
- **Historico de trocas finalizadas** (status === 'finalizado') em tabela com todos os dados consolidados
- Processos negados visiveis em aba/secao separada "Negados" apenas para consulta

### 2. Editar: `src/components/ModalDetalhesViatura.tsx`

- Importar `ProcessosPneusSection`
- Adicionar aba "Pneus" no TabsList
- Passar `viaturaId` (o `id` do documento da viatura) como prop

## Fluxo

```text
[Novo Processo] → Preenche NUP, KM, Qtd, Laudo → status: SOLICITADO
       │
       ├── [Negado] → Motivo → Arquivado (nao entra em historico)
       │
       └── [Aprovado] → Origem, Oficina, Referencia → status: APROVADO
              │
              ├── [Negado] → Motivo → Arquivado
              │
              └── [Conclusao] → OS/Recebido COLOG → status: FINALIZADO
                                                     (entra no historico)
```

