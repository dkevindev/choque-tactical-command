# Bloquear acesso por link direto na Galeria privada

Sim, é possível — mas exige mudar como os arquivos são lidos. Hoje o app guarda a URL pública de download do Firebase; qualquer pessoa com essa URL abre o arquivo sem senha. Para fechar isso, o acesso ao arquivo precisa depender de um login real do Firebase, não só da senha na tela.

## Como vai funcionar

1. A tela de senha continua igual para você. Por trás, ao acertar a senha, o app faz login numa **conta técnica do Firebase Auth** (e-mail/senha, criada só para a galeria).
2. Os arquivos deixam de ter URL pública. A galeria baixa cada foto/vídeo pelo SDK autenticado e monta a exibição na hora.
3. As regras do Firebase Storage passam a exigir esse login: quem colar um link direto (ou tentar a URL antiga) recebe erro de permissão.
4. Mesmo comportamento visual: grade, envio múltiplo, tela cheia com player, apagar.

## Pontos importantes

- **Arquivos já enviados**: as URLs antigas continuam válidas enquanto o token delas existir. Para invalidá-las, o plano inclui um botão de "revogar links antigos" que reenvia/renomeia os arquivos existentes para novos caminhos protegidos e remove as URLs salvas.
- **Vídeos**: com acesso protegido, o vídeo é baixado por inteiro antes de tocar (não há streaming por faixa). Para vídeos grandes isso significa alguns segundos de espera; o app mostra progresso.
- **Regras do Storage**: preciso que você cole as regras no console do Firebase (Storage > Rules) — o Lovable não tem acesso ao console. Eu forneço o texto exato pronto para colar.
- A senha de tela continua existindo como camada extra e é ela que dispara o login técnico; você não precisa lembrar de outra credencial.

## Detalhes técnicos

- Firebase Auth: habilitar provedor E-mail/Senha e criar uma conta única (ex.: `galeria@dkcode.local`). O par e-mail/senha dessa conta fica em `galeria_config/acesso` só depois de validado o hash da senha da tela — a senha digitada é usada para derivar/liberar o login via `signInWithEmailAndPassword`.
- `src/lib/galeriaAuth.ts`: após `validarSenha`, chamar `signInWithEmailAndPassword`; `sair()` chama `signOut`. Guardar sessão pelo próprio `onAuthStateChanged` em vez de `localStorage`.
- `GaleriaUpload.tsx`: parar de chamar `getDownloadURL`; salvar no Firestore apenas `storagePath` (sem `url`).
- Novo hook `useArquivoProtegido`: `getBlob(ref(storage, storagePath))` → `URL.createObjectURL`, com cache em memória e `revokeObjectURL` ao desmontar. Usado na grade (miniaturas) e no `GaleriaViewer`.
- Regras a colar no console:

```text
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /galeria-privada/{arquivo=**} {
      allow read, write: if request.auth != null
        && request.auth.token.email == 'galeria@dkcode.local';
    }
  }
}
```

- Regras equivalentes para a coleção `galeria_privada` no Firestore (leitura/escrita só para esse usuário autenticado).
- Migração: função de manutenção na própria página que percorre os docs com `url` salva, recopia o arquivo para `galeria-privada-protegida/…`, apaga o original e limpa o campo `url`.
