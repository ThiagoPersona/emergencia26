# Publicar o Intensivão no GitHub (somente Markdown + HTML)

Você pediu certo: subir só `md` e `html`, sem arquivos extras.

## 1) O que já está pronto para isso
- `.gitignore` no root já ignora:
  - `Intensivao/.obsidian/`
  - `Intensivao/build_html.ps1`
  - `Intensivao/Intensivao_TEME26_completo.pdf`
  - arquivos binários em geral (`*.pdf`, imagens, planilhas, etc.)
- Leitor online: `index-online.html`
- Índice de navegação: `index-online-sidebar.md`
- Conteúdo: `*.md` (inclusive `temas/*.md`)

## 2) Subir no GitHub (comando objetivo)
No terminal, na raiz do repo (`c:\Projetos\Emergencia`):

```bash
git init  # se ainda não existir
git add .gitignore
git add .github/workflows/pages-intensivao.yml
git add --all Intensivao/*.html Intensivao/*.md
git add --all Intensivao/temas/*.md
git add --all Intensivao/index-online-sidebar.md
git commit -m "Adiciona estudo TEME26 em formato online (markdown + html)"
```

Se você preferir incluir somente arquivos já existentes de uma vez:

```bash
git add --all Intensivao/*.html Intensivao/*.md Intensivao/temas/*.md
```

> Observação: certifique-se de usar `Intensivao` (com `n`) no caminho da pasta.

## 3) Link final no GitHub Pages
- Opção 1 (automático com workflow):
  - O projeto já inclui o workflow `.github/workflows/pages-intensivao.yml`.
  - Ele monta um pacote mínimo com os arquivos `html` e `md` na raiz do Pages e também em `/Intensivao/` (compatibilidade).
  - No GitHub, vá em `Settings > Pages` e em `Source` escolha **GitHub Actions**.
  - URL final:
    - `https://SEU-USUARIO.github.io/SEU-REPO/` (recomendado: landing curta com redirect automático)
    - `https://SEU-USUARIO.github.io/SEU-REPO/index-online.html`
    - `https://SEU-USUARIO.github.io/SEU-REPO/Intensivao/index-online.html`

- Opção 2 (manual):
  - Vá em `Settings > Pages`.
  - **Source**: `Deploy from a branch`
  - **Branch**: `main`, pasta `/ (root)`.
  - URL final:
    - `https://SEU-USUARIO.github.io/SEU-REPO/Intensivao/index-online.html`
