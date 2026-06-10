# Leitura online do Intensivão (celular, tablet e qualquer lugar)

Podemos publicar em 3 opções:

## Opção 1 (rápida): leitura online no celular
- Use o arquivo já pronto: `index-online.html`
- Ele lê os arquivos Markdown desta pasta (`LEITURA_OFICIAL.md`, `MAPA_DE_QUESTOES_TEME22-25.md` e os `temas/*.md`)
- A navegação é por sidebar, busca e fluxo responsivo.

## Opção 2 (mais indicada): publicar no GitHub Pages
1. Suba a pasta `Intensivao` para um repositório.
2. Em **Settings > Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main` (ou a branch do seu projeto)
   - Folder: `/ (root)`
3. Abra o link gerado, exemplo:
   - `https://SEU-USUARIO.github.io/SEU-REPO/index-online.html`

## Opção 3: publicar no GitHub Pages com deploy automático (recomendado)
1. Crie um repositório no GitHub e envie a pasta inteira do projeto.
2. Se quiser, o workflow automático já está pronto em `.github/workflows/pages-intensivao.yml`.
3. Em `Settings > Pages`, selecione:
   - Source: `GitHub Actions`
4. URL final:
   - `https://SEU-USUARIO.github.io/SEU-REPO/index-online.html`

## Opção 4: publicar no Vercel (também simples)
1. Crie novo projeto no Vercel com a pasta raiz do repositório.
2. Framework: **Other**.
3. Build command: `-` (vazio).
4. Output dir: `.` (a raiz).
5. URL final:
   - `https://SEU-PROJETO.vercel.app/index-online.html`

## Dica para “estilo Docusaurus”
Se você quiser a mesma experiência, mas com estrutura e busca ainda mais robusta (versão Docusaurus mesmo), a gente pode migrar no próximo passo.  
A versão atual já cumpre o objetivo prático: leitura limpa no navegador, mobile-first, com barra lateral, busca e atualização automática pelo mesmo Markdown.

## Observação importante
- Os arquivos `REGRAS_DO_MATERIAL.md` e `TEMPLATE_TEMA.md` ficaram fora do sidebar de leitura.
- Se você alterar títulos/ordem dos módulos no futuro, é só ajustar `index-online-sidebar.md` para manter o índice bonito no celular.
