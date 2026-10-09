# Implementação DJEN + DataJud + Prazos

## O que foi acrescentado

### 1. Caixa de publicações do DJEN por OAB
- Nova tela: **Área Restrita > Publicações DJEN**.
- Sincronização manual por botão e sincronização diária automática no backend.
- Usa o número e a UF da OAB já cadastrados no usuário.
- Janela diária com sobreposição para reduzir risco de perda de publicação e deduplicação por identificador externo.
- Guarda teor, resumo, tribunal, órgão, processo, destinatários, link e datas da comunicação.
- Publicações são classificadas como **Ação necessária**, **Revisar** ou **Sem ação**.
- Caso o texto aparente dirigir o comando à parte adversa, o sistema não cria prazo automático; deixa para revisão humana.

### 2. Prazo em rascunho + agenda
- Quando a publicação contém prazo identificável, o sistema cria um **rascunho** com vencimento calculado.
- O rascunho já aparece na Agenda & Tarefas, diferenciado de um prazo confirmado.
- Na própria publicação é possível alterar a quantidade de dias, recalcular, confirmar ou marcar como sem ação.
- A confirmação cria compromisso na agenda e, quando o processo estiver vinculado, também cria o registro de prazo do processo.
- O motor registra os marcos de disponibilização, publicação, início da contagem e vencimento.

### 3. CPC / CLT, dias úteis, recesso e feriados
- Contagem em dias úteis.
- Suspensão de 20/12 a 20/01 para CPC/CLT.
- Feriados nacionais fixos incorporados ao motor.
- Nova coleção e nova interface para feriados/suspensões de tribunal e comarca.
- Feriados locais devem ser cadastrados (ou futuramente importados de uma fonte oficial específica do tribunal) para que o cálculo seja completo naquele foro.

### 4. Consulta por número CNJ
- No formulário de processo, o botão **Buscar** consulta o DataJud.
- Preenche automaticamente, quando disponível: número formatado, tribunal, órgão/vara, classe, assuntos e metadados de capa.
- Busca também comunicações do mesmo número no DJEN para tentar preencher **partes/destinatários**, já que a API Pública do DataJud protege os dados das partes.
- Ao salvar o processo, importa até **500 movimentações** do DataJud, com deduplicação.
- A gravação dos andamentos usa concorrência limitada para reduzir o tempo de importação sem sobrecarregar o PocketBase.

## Novos endpoints internos

- `GET /hcgi/api/legal/datajud/process/:cnj`
- `POST /hcgi/api/legal/datajud/import`
- `POST /hcgi/api/legal/deadline/calculate`
- `POST /hcgi/api/legal/djen/sync`
- `POST /hcgi/api/legal/djen/:id/recalculate`
- `POST /hcgi/api/legal/djen/:id/confirm`
- `POST /hcgi/api/legal/djen/:id/ignore`

Todos os endpoints jurídicos exigem sessão válida do usuário no PocketBase.

## Variáveis de ambiente

O backend utiliza as seguintes variáveis, sem expor a chave no navegador:

- `DATAJUD_API_KEY` — obrigatória para consulta ao DataJud.
- `DATAJUD_BASE_URL` — opcional; padrão: API Pública do DataJud/CNJ.
- `DJEN_BASE_URL` — opcional; padrão: `https://comunicaapi.pje.jus.br/api/v1`.
- `DJEN_DAILY_SYNC` — `true` por padrão; use `false` para desativar o job diário.
- `DJEN_SYNC_HOUR` — hora local de São Paulo para início da sincronização; padrão `6`.
- `DJEN_OAB_VARIANTS` — `true` por padrão; consulta variações usuais de inscrição e deduplica o resultado.

## Banco de dados

Migração acrescentada:

`apps/pocketbase/pb_migrations/1788465000_djen_datajud_operational.js`

Ela adiciona campos operacionais ao DJEN/processos/eventos/agenda e cria `court_holidays`.

## Observações importantes

1. **Partes:** a API Pública do DataJud não deve ser usada como fonte de nomes das partes. O sistema tenta complementar pelo DJEN; quando não encontra, mantém o campo editável e não inventa informação.
2. **Classificação “é para agir?”:** foi implementada de forma conservadora. Trata-se de triagem assistida, não de decisão jurídica autônoma. Publicações duvidosas permanecem em **Revisar**.
3. **Feriados locais:** não existe neste pacote uma integração única com todos os calendários forenses municipais/estaduais. O cadastro por tribunal/comarca foi incluído para que o cálculo seja auditável e ajustável.
4. **Produção:** a API do DJEN deve ser testada no servidor real onde o sistema será hospedado, inclusive quanto a disponibilidade/restrições de rede do serviço externo.
5. **Validação realizada:** sintaxe dos novos arquivos de backend e JSX alterado, testes do motor de prazo e migração completa em banco PocketBase limpo. O build completo do Vite não pôde ser executado neste ambiente porque as dependências do ZIP não vieram instaladas e o ambiente de execução não conseguiu acessar o registro NPM para baixá-las.

## Testes mínimos recomendados no computador de destino

1. Abrir o programa e confirmar que a migração foi aplicada sem erro.
2. Cadastrar uma OAB/UF em um usuário e executar **Publicações DJEN > Sincronizar agora**.
3. Conferir uma publicação real diretamente com o DJEN e validar destinatário, teor e data de disponibilização.
4. Testar um prazo de 5, 10 e 15 dias úteis, inclusive atravessando feriado local e 20/12–20/01.
5. Digitar um CNJ conhecido e comparar tribunal/vara/movimentações com a consulta oficial.
6. Confirmar um prazo e verificar a conversão do rascunho em compromisso na agenda.
7. Testar uma publicação da parte adversa e confirmar que ela não foi transformada automaticamente em prazo.
