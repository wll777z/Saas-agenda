# WhatsApp oficial e comunicações operacionais

A publicação Sites contém um adaptador da WhatsApp Business Cloud API da Meta e uma fila persistente. Isso não significa que sua conta da Meta já esteja conectada. Sem configuração completa, a opção de envio automático não aparece na reserva e nenhuma mensagem é declarada como enviada.

## Conectar

1. Configure sua conta empresarial na Meta e um número remetente habilitado para a WhatsApp Business Cloud API.
2. Crie e aprove **três modelos operacionais** em `pt_BR`: confirmação, lembrete e cancelamento. Cada modelo deve usar quatro parâmetros de corpo, nesta ordem: nome do negócio; serviço; data/hora no fuso do negócio; URL segura de gerenciamento. Não inclua conteúdo promocional nesses modelos.
3. Cadastre nas variáveis seguras do Sites, sem expor no chat ou no repositório: `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_TEMPLATE_CONFIRMATION`, `META_WHATSAPP_TEMPLATE_REMINDER`, `META_WHATSAPP_TEMPLATE_CANCELLATION`. O token é segredo. Use `META_WHATSAPP_API_VERSION` para uma versão Graph suportada pela sua aplicação (o código sugere `v23.0`, que deve ser conferida na configuração).
4. Republique a versão para aplicar as variáveis. **Mais → Conexões** mostra o estado configurado. A presença de variáveis não substitui homologação com o provedor.
5. Configure um scheduler externo para fazer POST a `/api/jobs`, com `Authorization: Bearer <CRON_SECRET>`, por exemplo a cada minuto. O agendador não foi contratado nem configurado nesta entrega. O mesmo endpoint processa e-mail e reconciliação de cobranças quando essas conexões existem.
6. Faça a homologação com seu número de teste/autorizado. Confira nome exibido, aprovação dos modelos, fuso, links, filas e cancelamento/reagendamento.

Documentação do fornecedor: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

## Autorização e envio

Quando a configuração está completa, o cliente pode marcar uma caixa específica na reserva autorizando confirmação e lembrete por WhatsApp, informar o número com DDD e país e confirmar o atendimento. A escolha é separada de marketing e não é obrigatória para agendar. Sem autorização, não entra job WhatsApp na fila.

A confirmação é criada na mesma transação do agendamento. Quando o atendimento está a mais de 24 horas, um lembrete é programado para o dia anterior. Reagendamento substitui jobs obsoletos; cancelamento invalida lembretes e cria o aviso de cancelamento. Pelo link seguro da reserva, o cliente pode desativar mensagens WhatsApp explicitamente; os jobs pendentes desse cliente são cancelados.

O botão de compartilhar no WhatsApp continua sendo envio manual: ele abre a conversa com texto pronto. Não usa esse adaptador automaticamente.

## Limites de confiabilidade

- `sent` significa que o provedor aceitou a mensagem e retornou um ID. Não afirma entrega, leitura ou recebimento no aparelho.
- O ID retornado é armazenado em `notification_jobs.provider_message_id`, sem publicar tokens ou texto de mensagem em logs.
- A API oficial de mensagens não oferece a mesma idempotência do provedor de e-mail. Falha/timeout WhatsApp fica em `failed` para conferência, em vez de repetir automaticamente e arriscar duplicação de uma mensagem já aceita. O operador deve consultar o provedor antes de reenviar.
- Um envio HTTP já em andamento pode chegar após um cancelamento concorrente. O link de gerenciamento sempre mostra o estado atual.
- Há custos, limites, permissões e políticas da Meta. Não há promessa de mensagens ilimitadas incluídas na mensalidade.

Nos testes locais, as respostas da Meta são substituídas por fixtures explicitamente identificadas. Nenhuma mensagem real foi enviada ou homologada nesta implementação.
