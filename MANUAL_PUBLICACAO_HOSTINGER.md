# Manual simples: publicar o sistema em uma VPS da Hostinger

Este projeto foi preparado para uma VPS (servidor virtual privado). “VPN” é uma rede privada; o servidor de hospedagem é a VPS.

## 1. Antes de começar

Você precisa de uma VPS Hostinger com Ubuntu 24.04/Docker, o IP público, seu domínio, a chave original `apps/pocketbase/.encryption-key` e um superusuário do PocketBase. A chave original é obrigatória para abrir um banco existente. Se for um banco realmente novo, gere uma chave no servidor com `openssl rand -hex 32` e guarde-a em um gerenciador de senhas.

## 2. DNS do domínio

No DNS, crie os registros abaixo. Para outro subdomínio, substitua `app` pelo nome desejado.

| Tipo | Nome | Valor |
|---|---|---|
| A | `@` | IP público da VPS |
| A | `www` | IP público da VPS |

Apague A/AAAA/CNAME conflitantes do mesmo nome, mas não altere MX, SPF, DKIM ou DMARC se você usa e-mail. A propagação pode levar até 24 horas.

## 3. Firewall

Permita somente SSH, HTTP e HTTPS no firewall da Hostinger. No Ubuntu:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Não abra as portas 3000, 3001 ou 8090. Confirme que o SSH está liberado antes de ativar o firewall.

## 4. Acesso SSH e envio do projeto

No PowerShell:

```powershell
ssh root@IP_DA_VPS
```

Na VPS:

```bash
mkdir -p /opt/jd-office
cd /opt/jd-office
```

Envie `app.tar.gz` com SCP:

```powershell
scp .\app.tar.gz root@IP_DA_VPS:/opt/jd-office/
```

Extraia:

```bash
cd /opt/jd-office
tar -xzf app.tar.gz
```

A raiz precisa conter `deploy/docker-compose.production.yml`, `apps/api`, `apps/web` e `apps/pocketbase`.

## 5. Segredos de produção

```bash
cd /opt/jd-office/deploy
cp .env.production.example .env.production
nano .env.production
```

Preencha sem aspas:

```dotenv
APP_DOMAIN=app.seudominio.com.br
PB_ENCRYPTION_KEY=chave-original-do-encryption-key
PB_SUPERUSER_EMAIL=admin@seudominio.com.br
PB_SUPERUSER_PASSWORD=senha-longa-e-unica
PB_DEMO_CLIENT_PASSWORD=senha-do-cliente-de-demonstracao
DATAJUD_API_KEY=
DJEN_BASE_URL=https://comunicaapi.pje.jus.br/api/v1
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_CALENDAR_WEBHOOK_URL=https://app.seudominio.com.br/hcgi/api/gcal/webhook
GOOGLE_CALENDAR_WEBHOOK_TOKEN=token-longo-e-aleatorio
```

Proteja o arquivo:

```bash
chmod 600 /opt/jd-office/deploy/.env.production
```

Para migrar o banco atual, pare o PocketBase local e copie todo `apps/pocketbase/pb_data` para o mesmo caminho em `/opt/jd-office`. Use exatamente a mesma chave; não misture bancos.

## 6. Iniciar e testar

```bash
cd /opt/jd-office
docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml up -d --build
docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml ps
docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml logs -f --tail=100
```

O Caddy cria e renova o HTTPS automaticamente nas portas 80/443. Teste:

```bash
curl -I https://app.seudominio.com.br
curl -s https://app.seudominio.com.br/hcgi/api/health
```

O endereço público da API é `/hcgi/api/health`; não use `:3001` no navegador.

## 7. Google Agenda

No Google Cloud Console, habilite a Google Calendar API, crie um OAuth 2.0 “Aplicativo da Web” e adicione `https://app.seudominio.com.br` em **Origens JavaScript autorizadas**. Informe o Client ID em **Configurações** ou em `GOOGLE_OAUTH_CLIENT_ID` antes do build. Na agenda, clique em **Entrar com Google**; a senha é digitada apenas no Google. O webhook deve usar `https://app.seudominio.com.br/hcgi/api/gcal/webhook`.

## 8. Backup

Faça backup antes de qualquer atualização:

```bash
cd /opt/jd-office
docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml stop pocketbase
tar -czf /opt/jd-office-backup-$(date +%Y%m%d-%H%M%S).tar.gz apps/pocketbase/pb_data deploy/.env.production
docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml start pocketbase
```

Copie o arquivo para outro local seguro. A exportação JSON da área de Configurações é útil para registros, mas não substitui esse backup: não migra hashes de senha e anexos com a mesma fidelidade.

## 9. Atualizar sem perder dados

Faça o backup, atualize somente o código e preserve `apps/pocketbase/pb_data` e `deploy/.env.production`. Depois:

```bash
cd /opt/jd-office
docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml up -d --build
docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml ps
```

As migrações do PocketBase rodam na inicialização. Nunca use `docker compose down -v`, pois isso pode remover volumes. Se falhar, volte ao código anterior e restaure o backup em homologação.

## 10. Segurança operacional

- Use senha exclusiva e longa para o superusuário.
- Prefira chave SSH, desative login SSH por senha depois de testar a chave e use fail2ban.
- Mantenha somente 22/80/443 expostas e o Ubuntu atualizado.
- Nunca publique `.env.production`, `PB_ENCRYPTION_KEY`, DataJud ou tokens Google no Git.
- Troque o token do webhook se ele for revelado.
- Verifique logs e espaço em disco semanalmente e mantenha uma cópia externa do backup.
- O painel administrativo do PocketBase fica bloqueado pelo proxy público; administre-o via SSH/VPN.

## 11. Operação diária

```bash
cd /opt/jd-office
docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml ps
docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml restart
docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml logs -f --tail=100 api
docker compose --env-file deploy/.env.production -f deploy/docker-compose.production.yml logs -f --tail=100 pocketbase
```

Use `stop` para parar sem apagar dados e `start` para voltar. Nunca apague `pb_data`.

## 12. Solução rápida de problemas

- **Domínio não abre:** confira A/AAAA, firewall e propagação DNS.
- **HTTPS não foi criado:** confirme `APP_DOMAIN`, DNS e porta 80.
- **Missing encryption key:** a chave está ausente ou não é a mesma que criou `pb_data`.
- **Login inválido:** confira e-mail/senha no `.env.production` e veja `logs api` e `logs pocketbase`.
- **Google não conecta:** confira a origem HTTPS, o Client ID e a API habilitada.

## Referências oficiais

- [Template Docker da Hostinger para VPS](https://www.hostinger.com/support/8306612-how-to-use-the-docker-vps-template-at-hostinger/)
- [Apontar domínio para uma VPS Hostinger](https://www.hostinger.com/support/1583227-how-to-point-your-domain-to-your-vps-at-hostinger/)
- [Firewall e configuração inicial de VPS](https://www.hostinger.com/tutorials/how-to-set-up-vps/)
- [Gerenciador Docker da Hostinger](https://www.hostinger.com/support/12040815-how-to-deploy-your-first-container-with-hostinger-docker-manager/)

