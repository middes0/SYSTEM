# SYSTEM — v0.1.0

PWA responsiva para Android, em português, inspirada em interfaces sci-fi de RPG. Sem conta: os dados são guardados localmente no navegador.

## Funcionalidades
- Criar, concluir, reabrir e excluir missões.
- Categorias: estudos, dinheiro, treino, hábitos e objetivos.
- Recompensas base: fácil 10 XP, média 25 XP, difícil 50 XP, extrema 100 XP.
- XP, níveis, ranks, atributos e histórico local.
- Planejador heurístico local (não é IA generativa).
- Exportar e importar backup JSON.
- IndexedDB com fallback para localStorage.
- Manifesto e service worker para PWA e cache básico.

## Publicar pelo celular
1. Envie os arquivos da raiz deste repositório para GitHub.
2. No Cloudflare Dashboard, abra Workers & Pages → Create → Pages → Connect to Git.
3. Selecione este repositório e a branch `main`.
4. Use preset `None`, sem build command e diretório de saída `/` ou `.` conforme a interface.
5. Após o deploy, abra a URL HTTPS no Chrome Android e escolha Instalar app/Adicionar à tela inicial.

## Teste manual recomendado
1. Criar uma missão, concluí-la e conferir o XP.
2. Recarregar a página e confirmar que os dados persistem.
3. Testar filtros, exportação e importação do backup.
4. Visitar uma vez online e testar a abertura offline.

## Limitações
- Ainda não existe IA generativa externa nem adaptação baseada em um modelo de linguagem; o planejador local usa regras simples.
- Os dados não sincronizam entre navegadores ou aparelhos. Limpar os dados do site pode apagar o progresso; exporte backups.
- O service worker faz cache dos arquivos principais; não garante todas as funcionalidades offline em todos os navegadores.
- A interface precisa ser validada num dispositivo Android real antes de considerar o lançamento testado.

## Próxima etapa: IA segura
Adicionar uma Cloudflare Pages Function em `functions/api/plan.js`, com chave guardada como secret no Cloudflare. Nunca incluir chaves no frontend público. Validar e limitar requisições, e manter XP e progressão sob controle do núcleo local. Confirmar disponibilidade e cotas gratuitas do provedor antes de escolher o modelo.
