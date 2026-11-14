# Agenda Clara

**Atualização:** o endereço Sites agora tem um runtime próprio com API, login ChatGPT e banco D1. Consulte [o guia da publicação atual](docs/ATUALIZACAO-SITES.md). As instruções Supabase abaixo pertencem à implantação alternativa Next.js.

SaaS de agendamento em português, com Next.js, React, TypeScript, Supabase/PostgreSQL, Mercado Pago (Pix mensal avulso) e Resend. Interface responsiva com navegação inferior no celular, site comercial e demonstração separada em memória.

**Estado da implantação alternativa Next.js:** implementação no repositório; exige as conexões abaixo. São necessárias contas externas, variáveis, migrations e validação de ponta a ponta com os serviços reais. Sem credenciais, reservas reais, envio de e-mail e Pix ficam indisponíveis, com estado explícito. Nenhum recebimento foi testado com dinheiro real.

## Começar

Node.js 22.9 ou superior (verifique também os requisitos da versão de Next no lockfile).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

- `/`: página comercial.
- `/demo`: painel com dados fictícios em memória; não cobra nem envia mensagens.
- `/cadastro`, `/entrar`, `/recuperar`: autenticação Supabase.
- `/painel`: negócio, agenda, equipe, horários, clientes e assinatura.
- `/a/seu-negocio`: reserva sem conta de cliente.
- `/reserva/token`: gerenciamento limitado à reserva, com token seguro.
- `/operacao`: painel restrito de metadados da plataforma.

## Conectar o Supabase

1. Crie um projeto Supabase em sua própria conta.
2. Aplique **em ordem** todos os arquivos de `supabase/migrations` pelo SQL Editor ou Supabase CLI (`supabase link` e `supabase db push`). As migrations são destinadas a um projeto novo; não aplique sobre um banco alheio sem revisar.
3. Preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` nas variáveis da hospedagem. A service role fica exclusivamente no servidor.
4. Ative confirmação de e-mail, configure SMTP próprio, Site URL e redirecionamentos exatos `/painel` e `/recuperar` para seu domínio HTTPS. Ative limites de autenticação e proteção contra senhas comprometidas disponíveis na sua conta.
5. Gere `CRON_SECRET` com `openssl rand -hex 32` e configure em canal seguro. **Não troque essa chave sem plano de migração:** ela também deriva os links de reserva. A rotação invalida links existentes para novos envios. Nunca coloque segredos no GitHub, no chat ou em variáveis NEXT_PUBLIC.

O proprietário cria o negócio em três etapas e publica pelo painel após revisar serviço e expediente. O rascunho inicial fica em sessionStorage; reservas e registros do produto ficam no banco. Sessões usam o armazenamento gerenciado pelo cliente Supabase. A autenticação é por token Bearer verificado no servidor e RLS no banco; não há autorização baseada apenas no tenant enviado pelo navegador.

## Pix remoto das mensalidades

O Pix deste projeto paga a **assinatura do estabelecimento na Agenda Clara**, não os atendimentos vendidos por ele. Não há split, sinal, custódia ou Pix recorrente automático.

1. Crie uma conta Mercado Pago, conclua sua verificação e crie a aplicação no portal de desenvolvedores.
2. A chave solicitada foi registrada como referência `+5511949345361`. **O código não registra uma chave no Banco Central nem a vincula à sua conta Mercado Pago.** Faça esse vínculo no aplicativo oficial, se aplicável. Não é possível comprovar titularidade apenas pelo número.
3. A cobrança dinâmica usa a conta credenciada pelo `MERCADO_PAGO_ACCESS_TOKEN`; esse provedor define o recebedor. A chave exibida no painel não redireciona o dinheiro. Confira conta e favorecido no sandbox e na homologação antes de abrir o pagamento.
4. Configure `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` apenas no servidor. Comece com credenciais de teste e compradores de teste admitidos pelo provedor. Nunca misture ambiente de teste e produção no mesmo banco.
5. Defina `APP_URL=https://seu-dominio` e registre o webhook `https://seu-dominio/api/webhook`, evento `payment`, com assinatura secreta. O endpoint verifica `x-signature`, `x-request-id`, timestamp e `data.id`; em seguida consulta a API oficial, conferindo referência externa, valor e moeda.
6. Abra **Mais → Pix e assinatura**, selecione o plano e gere o QR Code/copia e cola. Ele expira em 30 minutos. Ao clicar novamente após falha de rede, a mesma chave da tela recupera a mesma cobrança. Ao recarregar a tela pode surgir nova cobrança pendente; apenas pagamentos efetivamente aprovados liberam períodos.
7. O proprietário pode pagar pelo celular, copiar para outro banco e verificar a confirmação. O servidor reconcilia o status com a API; retornar do pagamento ou clicar em “já paguei” nunca libera o plano sem aprovação.

Solo: R$49/mês; Equipe: R$99/mês. Cada pagamento aprovado libera um mês. Se já existe período pago, o mês é acrescentado ao fim. O teste não é somado ao primeiro mês contratado. A troca de plano é permitida após o período atual; o plano deve comportar os profissionais e serviços ativos. Cancelar assinatura não devolve valores automaticamente e preserva acesso até o vencimento. Estorno/chargeback suspende novas reservas para revisão operacional. Não armazenamos cartão.

## E-mails e fila persistente

Configure domínio verificado no Resend, `RESEND_API_KEY` e `EMAIL_FROM`. O SMTP da autenticação Supabase e o Resend operacional são conexões separadas.

Agende a cada minuto uma chamada **POST** a `/api/jobs` com `Authorization: Bearer <CRON_SECRET>` por um scheduler que mantenha cabeçalhos secretos. O endpoint usa `FOR UPDATE SKIP LOCKED`, leases de cinco minutos, até cinco tentativas e chave de idempotência do provedor. Confirmações e lembretes entram na mesma transação da reserva. Cancelamentos/reagendamentos invalidam jobs antigos; falha de e-mail não desfaz reserva. Sem e-mail conectado, a fila é preservada. Reconciliação de cobranças pendentes roda mesmo com e-mail desconectado.

A fila é projetada para entrega ao menos uma vez. A janela de idempotência do provedor externo tem limites: monitore jobs presos e não reenvie manualmente sem conferir o histórico. Uma alteração concorrente durante um envio HTTP já em andamento pode fazer chegar uma mensagem obsoleta; o link sempre lê o estado atual do banco. Para garantia mais forte, evolua o protocolo de envio e versionamento com o provedor.

## Publicar

A aplicação requer servidor Next.js; não publique como exportação estática.

1. Importe `wll777z/Saas-agenda` em uma hospedagem com suporte a Next.js, como Vercel.
2. Use `npm ci`, build `npm run build` e framework Next.js. Configure todas as variáveis da `.env.example` pelo painel seguro.
3. Configure domínio HTTPS e a URL correspondente em Supabase e Mercado Pago.
4. Ative o scheduler POST dos jobs, monitore a fila e execute os critérios de homologação em `docs/ENTREGA.md`.

Alternativa: Node.js com `npm run build` e `npm start` atrás de proxy HTTPS. O proxy deve sobrescrever `x-real-ip`/`x-forwarded-for` e limitar corpo, requisições e tentativas por IP. Não confie em cabeçalhos enviados pelo visitante.

A infraestrutura Sites desta sessão não disponibilizou os helpers necessários para empacotar/publicar este projeto Next.js. Nenhum endereço público ou implantação de produção foi criado. A importação do GitHub é o caminho documentado de publicação.

## Operação, segurança e testes

```sh
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Integração com PostgreSQL real, banco descartável e usuários fictícios:

```sh
docker run -d --name agenda-clara-tests -e POSTGRES_PASSWORD=local-test-only -p 127.0.0.1:55432:5432 postgres:17-alpine
npm run test:db
docker rm -f agenda-clara-tests
```

`TEST_DATABASE_URL` pode apontar a outro **servidor de testes** com permissão para criar banco e roles. O teste cria e remove um banco isolado. Não use uma URL de produção.

Documentos complementares:

- [Administração pelo celular](docs/CELULAR.md)
- [Estado, validações e dependências](docs/ENTREGA.md)
- [Operação, backups e privacidade](docs/OPERACAO.md)

As skills de design citadas no briefing não estavam instaladas. Foram usados os recursos disponíveis para composição, tokens CSS, responsividade, foco e formulários acessíveis. As skills Sites e Cloud Runtime foram consultadas. O produto não depende de instalar skills no computador do cliente.

## Contato e documentos

As variáveis públicas `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_OPERATOR_DOCUMENT`, `NEXT_PUBLIC_SUPPORT_EMAIL` e `NEXT_PUBLIC_RETENTION_POLICY` permitem informar o responsável real, contato e política de retenção sem alterar código. São informações exibidas aos visitantes, não segredos. Preencha somente dados verdadeiros, revise os textos legais e reconstrua a aplicação após alterar variáveis públicas.

## Prévia navegável no ChatGPT

`npm run build:preview` usa o mesmo frontend React para construir uma prévia estática em `dist/`, com página comercial e painel fictício em `/demo`. Nessa publicação, banco, autenticação, reservas reais e pagamentos ficam desabilitados explicitamente. A aplicação Next.js completa continua sendo construída por `npm run build`. O manifesto `.openai/hosting.json` agora identifica o Worker com backend D1; use `npm run build:sites` para republicar o endereço funcional.
