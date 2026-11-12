# Reativar Patrimônio no Sistema dos Usuários

## O que muda
No menu do "Sistema dos Usuários" (antigo CAVBot) voltam dois botões novos:

- **Escanear Patrimônio** — abre a câmera, lê o QR do item e mostra nome, tombo, seção e valor.
- **Cadastrar Patrimônio** — pede matrícula e senha (só quem tem acesso a Gestão e Logística), depois abre o cadastro de item com foto pela câmera e escolha da seção, igual ao que tínhamos.

Ao cadastrar com sucesso, aparece um aviso de confirmação.

## Detalhes técnicos
- Editar `src/components/sistema-usuario/SistemaUsuarioHome.tsx`: adicionar dois cards (ícones `QrCode` e `Package`) que abrem modais em vez de navegar.
- Reutilizar componentes existentes: `QRCodeScanner`, `ModalAuthPatrimonio` → `CadastroPatrimonioCavbot`. Nenhuma mudança nos dados.
- Resultado do scan mostrado em um pequeno cartão/toast.
