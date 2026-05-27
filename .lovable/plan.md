Problema: O site usa tema dark militar (fundo quase-preto, texto branco). Os wizards do Sistema dos Usuários usam um container claro (`bg-white`, `text-slate-900`), mas os componentes shadcn `Input` e `Textarea` usam `bg-background` (fundo escuro herdado do tema) sem definir explicitamente `text-foreground`. Como o container claro impõe `text-slate-900`, os inputs ficam com fundo preto + texto preto = invisível.

Solução em 2 passos:

1. Corrigir os componentes shadcn base (`Input`, `Textarea`, `SelectTrigger`) adicionando `text-foreground` explicitamente, garantindo que o texto sempre contraste com o fundo escuro, independente de herança do container pai.

2. Melhorar a experiência visual nos wizards, passando `bg-white text-slate-900 border-slate-300` nos inputs dos wizards do sistema-usuario (LoginUsuarioStep, IniciarServicoWizard, EncerrarServicoWizard, EntradaOficinaWizard, SaidaOficinaWizard), para que os inputs tenham aparência clara dentro dos cards brancos.

Arquivos a editar:
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/select.tsx` (SelectTrigger)
- `src/components/sistema-usuario/LoginUsuarioStep.tsx`
- `src/components/sistema-usuario/IniciarServicoWizard.tsx`
- `src/components/sistema-usuario/EncerrarServicoWizard.tsx`
- `src/components/sistema-usuario/EntradaOficinaWizard.tsx`
- `src/components/sistema-usuario/SaidaOficinaWizard.tsx`
