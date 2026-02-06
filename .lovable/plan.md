

# Plano: Remover Todas as Referências ao Lovable

## Resumo

Substituir toda menção ao Lovable por branding DKCODE / RPMONT em todos os arquivos do projeto.

---

## Alterações

### 1. `index.html` - Meta Tags

Substituir as meta tags do OpenGraph e Twitter que referenciam Lovable:

| Linha | Antes | Depois |
|-------|-------|--------|
| 15 | `og:title` com UUID | `og:title` = "RPMONT - Sistema Tático" |
| 16 | `og:description` = "Lovable Generated Project" | "Sistema de Gestão Tática - RPMONT PM-CE - Desenvolvido por DKCODE" |
| 18 | `og:image` apontando para lovable.dev | Remover ou apontar para `/favicon.jpg` |
| 21 | `twitter:site` = "@lovable_dev" | Remover tag |
| 22 | `twitter:image` apontando para lovable.dev | Remover ou apontar para `/favicon.jpg` |

---

### 2. `README.md` - Reescrever Completo

Substituir todo o conteúdo por:

```text
# RPMONT - Sistema Tático

Sistema de Gestão Tática do Regimento de Polícia Montada.

Desenvolvido por DKCODE.

## Tecnologias

- React + TypeScript
- Vite
- Tailwind CSS
- Firebase
- shadcn/ui
```

---

### 3. `vite.config.ts` - Remover lovable-tagger

- Remover linha 4: `import { componentTagger } from "lovable-tagger";`
- Remover linhas 22-23: uso do `componentTagger()`
- Manter apenas o plugin `react()`

---

### 4. `package.json` - Remover dependência

- Remover `"lovable-tagger"` da lista de dependências

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `index.html` | Substituir meta tags Lovable por DKCODE/RPMONT |
| `README.md` | Reescrever com branding DKCODE/RPMONT |
| `vite.config.ts` | Remover import e uso do lovable-tagger |
| `package.json` | Remover dependência lovable-tagger |

