# Operação, backup e atualização

## Configurar Google Agenda

1. No Google Cloud Console, crie uma credencial OAuth 2.0 do tipo Aplicativo da Web.
2. Adicione `http://localhost:3000` às origens JavaScript autorizadas e habilite a Google Calendar API.
3. Entre na área restrita, abra **Configurações** e preencha o Client ID. Não informe a senha do Google no sistema.
4. Para push em produção, informe uma URL pública HTTPS terminando em `/hcgi/api/gcal/webhook` e um token aleatório.

## Backup físico recomendado

Execute `backup-system.bat`. O arquivo será criado em `backups/` e conterá `apps/pocketbase/pb_data` e `.encryption-key`. Esse é o backup que preserva banco, anexos, usuários e senhas. Proteja-o como dado confidencial.

## Exportação e importação JSON

Na tela **Configurações**, use **Exportar dados JSON** para migrar registros da aplicação. A importação é incremental: atualiza o mesmo ID e cria o que não existe. Coleções de autenticação (`users` e `clients`) são reportadas, mas não são recriadas por JSON porque o PocketBase não expõe hashes de senha para exportação. Para migrar credenciais, restaure o backup físico de `pb_data`.

## Atualizar sem perder dados

1. Feche os serviços atuais.
2. Coloque o pacote da nova versão como `app.tar.gz` na raiz, ou passe outro caminho para `update-system.bat`.
3. Execute `update-system.bat`.
4. O script cria um backup, atualiza o código, preserva `pb_data`, `.env`, `.encryption-key`, `backups` e `node_modules`, instala dependências, compila e executa `start-all.bat`.
5. As migrações em `apps/pocketbase/pb_migrations` são aplicadas automaticamente pelo PocketBase. Nunca apague `pb_data`.

Se uma atualização falhar, restaure o último arquivo `.zip` em uma cópia do projeto, mantenha a mesma `.encryption-key` e só substitua `apps/pocketbase/pb_data` depois de parar o PocketBase.
