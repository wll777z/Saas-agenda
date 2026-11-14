# Atualização do site publicado — 14/11/2026

A publicação deixou de ser apenas estática. O endereço Sites usa um Worker com API e banco D1 da própria hospedagem. O frontend continua compartilhado com a aplicação Next.js/Supabase, que permanece disponível no repositório como implantação alternativa.

## Design

A referência fornecida pelo usuário está em `design/REFERENCIA.md`. O site aplica branco, tipografia em pesos 400/600, Space Grotesk (substituto aberto permitido pela referência, sem inventar licença PP Radio Grotesk), Inter, bordas de 1px, cantos de 6px e azul cobalto. A abertura tem uma animação original de calendário, escolha de horário e confirmação, em vez da órbita da referência. Outras seções usam entrada de reserva na agenda e páginas em leque. `prefers-reduced-motion` remove movimento e preserva a informação.

## Agendamento no endereço Sites

1. Entre em `/painel` usando a autenticação ChatGPT oferecida pela hospedagem.
2. Cadastre negócio, fuso, serviço e expediente. Os dados vão para o D1.
3. Revise os horários e publique a agenda. O link `/a/seu-negocio` abre o fluxo público; `/agendar` lista apenas negócios publicados.
4. O cliente escolhe serviço, profissional, data e horário e confirma sem criar uma conta no produto. A disponibilidade, preço e duração são validados no servidor.
5. A reserva aparece no painel. Token seguro permite cancelar ou reagendar. O arquivo ICS pode ser baixado, sem promessa de sincronização.

D1/SQLite serializa as transações. Triggers de banco impedem sobreposição por profissional, inclusive em inserções e alterações que não passem pela consulta de disponibilidade. A API usa lote transacional para cliente, reserva, notificações e auditoria. Restrições únicas garantem idempotência. Toda consulta administrativa verifica o vínculo e o papel no servidor; o cliente não pode escolher uma empresa sem autorização. O runtime D1 não usa RLS PostgreSQL; essa garantia é implementada pela autorização centralizada da API e pelas restrições de integridade do banco.

O acesso administrativo usa ChatGPT, não uma autenticação Supabase fictícia. O cadastro de cliente final continua dispensado. O controle de audiência da hospedagem precisa permitir acesso público para o link funcionar sem o login da hospedagem.

## Pix direto com a chave fornecida

A chave `+5511949345361` está registrada no código como destinatário solicitado. A aplicação não registra chaves no Banco Central nem verifica sua titularidade.

Na aba **Pix e assinatura**, o responsável pela plataforma pode abrir **Configurar meu Pix para receber**, informar nome e cidade da conta e confirmar que a chave está cadastrada. Esses dados são persistidos no servidor. Após salvar, o painel gera BR Code Pix com valor e referência, QR Code escaneável e copia e cola. O banco do pagador resolve a chave e mostra o favorecido; confira antes de pagar. Não houve pagamento real durante o desenvolvimento.

O Pix direto não tem retorno bancário automático. O clique “Já paguei” consulta o status registrado, sem liberar plano. O operador abre `/operacao`, confere o extrato e confirma explicitamente o recebimento. A operação registra auditoria e libera um mês uma única vez. Referências antigas ficam no histórico; código Pix estático não expira no banco.

O adaptador Mercado Pago segue disponível no Worker. Com token e segredo de webhook conectados, o provedor gera Pix dinâmico e confirma pela API oficial. Segredos ficam nas variáveis do Sites. Não existe Pix recorrente automático, split ou pagamento pelos atendimentos.

## Conexões externas ainda necessárias

E-mails reais: Resend e remetente verificado, mais scheduler POST autenticado para `/api/jobs`. Sem configuração, a fila permanece persistida e o site não declara mensagem enviada.

Pix automático: conta do provedor e webhook. Sem isso, funciona o Pix direto com conferência manual do recebimento. O nome/cidade precisam ser fornecidos pelo responsável; o código não inventa esses dados.

Identidade jurídica, suporte, política de retenção e backup/restauração precisam da configuração operacional do responsável antes da oferta comercial.

## Verificações

`npm run test:sites` constrói e importa exatamente o Worker publicado e executa a API com SQLite persistente em memória através de um adaptador da interface D1. Inclui reserva pública, nova consulta de persistência, clique repetido, concorrência, trigger de sobreposição, isolamento entre empresas, links, cancelamento, reagendamento, Pix com CRC16, conferência manual restrita e idempotente, expiração e proteção de origem. As fixtures usam identidades e dados fictícios apenas no processo de testes, sem criar empresas fictícias no banco publicado.

Esses testes não são homologação de transferência Pix, entrega de e-mail ou backup externo. O ambiente não disponibiliza `cua_repl.js`; não foi iniciado servidor de preview alternativo nem declarada aprovação Playwright. A publicação e o vínculo do banco são conferidos pelas ferramentas nativas Sites.

## Build

- `npm run build:sites`: frontend + Worker + migrations para a publicação Sites.
- `npm run build`: alternativa Next.js/Supabase.
- `npm run typecheck` e `npm test`: validações locais.

As migrations D1 estão em `drizzle/` (fonte correspondente em `hosted/migrations/`). As migrations PostgreSQL/Supabase permanecem em `supabase/migrations/` e não são aplicadas ao D1. Não misture os bancos.
