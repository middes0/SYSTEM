# SYSTEM

PWA responsiva para Android, em português, com progressão pessoal inspirada em RPG.

## Funcionalidades atuais
- Criar, concluir, reabrir e excluir missões.
- Categorias de estudo, dinheiro, treino, hábitos e objetivos.
- Recompensas base: fácil 10 XP, média 25 XP, difícil 50 XP, extrema 100 XP.
- XP, níveis, ranks, atributos e histórico armazenados localmente.
- Planejador local baseado em regras (não é IA generativa).
- Exportar e importar backup JSON.
- IndexedDB com alternativa via localStorage.
- Cadastro, login, perfil e sistema social com Supabase.
- PWA com manifesto e service worker.

## Dados e sincronização
O progresso detalhado (missões, histórico, XP e atributos) ainda é local ao navegador/aparelho. O Supabase é usado para contas, perfil social e amizades; entrar na conta não sincroniza automaticamente o progresso entre aparelhos. Não limpe os dados do site para tentar corrigir problemas. Exporte um backup JSON antes de operações de manutenção.

## Banco Supabase
Os arquivos SQL do projeto ficam em `supabase/`:
1. `schema.sql`: tabelas e políticas básicas de perfil e amizades.
2. `friends.sql`: funções seguras para busca e operações sociais.

Se as tabelas já existem, faça backup e revise o SQL antes de executar novamente. O esquema é idempotente para as tabelas e políticas descritas, mas não substitui um backup do banco.

## Publicar pelo celular
1. Conecte o repositório `middes0/SYSTEM` ao Cloudflare Pages.
2. Use a branch `main`, sem comando de build, e diretório de saída `/` ou `.` conforme a interface.
3. Aguarde o deploy terminar antes de testar a URL HTTPS.
4. No Android, abra a URL no Chrome e use Instalar app/Adicionar à tela inicial.

## Teste manual recomendado
1. Criar uma missão e conferir XP/atributos após concluir.
2. Recarregar o site e confirmar que o progresso permanece.
3. Excluir uma missão padrão, recarregar e confirmar que ela não reaparece.
4. Abrir o site várias vezes e confirmar que não são criados eventos artificiais no histórico.
5. Testar exportação e importação de backup.
6. Testar cadastro/login e operações de amizade com duas contas de teste.
7. Confirmar que o deploy publicado corresponde ao último commit.

## Limitações conhecidas
- A progressão local ainda não sincroniza entre aparelhos.
- O planejador não usa IA generativa.
- A abertura offline depende do cache e das limitações do navegador.
- Testes estáticos não substituem a validação em um Android real.
