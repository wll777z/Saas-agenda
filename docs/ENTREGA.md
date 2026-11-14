# Entrega e homologação

Data: 14/11/2026. Repositório: `wll777z/Saas-agenda`.

## Implementado

- Site comercial original, paleta solicitada, botões neutros, planos, FAQ e prévia do próprio painel.
- Demonstração com dados fictícios em memória, isolada do banco; não dispara pagamentos ou mensagens.
- Autenticação Supabase por e-mail/senha, verificação, recuperação, onboarding em três etapas e publicação controlada.
- Multiempresa, vínculo por empresa, proprietário, administrador e profissional. Painel do operador com acesso explícito e metadados.
- Reserva pública sem conta, serviços, profissional ou primeiro disponível, disponibilidade no fuso do negócio, revisão e confirmação.
- Restrição PostgreSQL de exclusão por intervalo, transações, idempotência e limites com serialização por empresa.
- Expediente semanal, múltiplos períodos para almoço, intervalos dos serviços, antecedência mínima, horizonte, bloqueios/férias por intervalo e exceções por data via RPC.
- Reserva manual, conclusão, falta, cancelamento, bloqueio/desbloqueio e reagendamento atômico sem perder o original em falha.
- Histórico de nome, preço e duração, desativação de serviços/profissionais e registros de auditoria das operações de reserva.
- Clientes, busca, lista diária e lista de sete dias, indicadores reais conforme período e permissões.
- Convite seguro por e-mail destinado, links limitados à reserva, ICS e compartilhamento manual no WhatsApp.
- Branding público: logo/capa PNG, JPEG ou WebP até 2 MB e quatro cores acessíveis, escrita isolada por empresa no Storage.
- Pix remoto das mensalidades: adaptador Mercado Pago, QR Code/copia e cola, consulta de status, webhook assinado, reconciliação, histórico e crédito idempotente de um mês. Sem débito automático e sem processamento de atendimentos.
- Fila transacional de confirmações/lembretes/cancelamentos, tentativas persistentes, leases e idempotência de envio.
- Exportação JSON pelo proprietário; dados/segredos privados fora das projeções públicas.
- Seis migrations reproduzíveis, `.env.example`, lockfile, guias e GitHub Actions.

## Testes realmente executados

- `npm run typecheck`: passou.
- `npm test`: 4 testes passaram (assinaturas válidas/inválidas/expiradas, comparações seguras e configuração de planos).
- `npm run test:db`: 23 verificações em PostgreSQL 17 real, banco descartável e dados fictícios. Aplicação de todas as migrations; onboarding; publicação autorizada; concorrência (uma única reserva); repetição idempotente; buffers; expediente/exceções; falha e sucesso de reagendamento; cancelamento; novas notificações; RLS de empresas e profissionais; preço histórico; teste vencido; pagamentos duplicados/fora de ordem; projeção pública; RPC privilegiada; cotas; conversão de fuso/horário de verão; papel de administrador; claim da fila; políticas de escrita de marca; estorno sem crédito repetido; rate limit.
- `npm run build`: build Next.js passou.
- `npm audit --omit=dev --audit-level=high`: nenhuma vulnerabilidade reportada na execução.

O teste de PostgreSQL cria um substituto mínimo dos schemas `auth` e `storage` para validar funções/RLS, não executa os serviços HTTP completos do Supabase. O teste de fuso verifica a conversão no banco; não representa um navegador em outro fuso.

**Não executado:** Playwright, inspeção visual em navegador, leitor de tela e auditoria WCAG completa. O ambiente Sites indicou perfil managed, mas não disponibilizou `cua_repl.js` nem os helpers de publicação. Nenhum servidor de preview alternativo foi iniciado. CSS responsivo, foco/teclado de modais, labels, controles e redução de movimento foram implementados, mas o fluxo mobile completo ainda exige validação em aparelhos reais.

Não foram executados cadastro/recuperação com e-mail real, upload via serviço Storage real, confirmação/lembrete com Resend real, pagamentos/webhooks de sandbox Mercado Pago nem restauração de backup externo, pois essas contas não estão conectadas. Nenhuma cobrança ou mensagem real foi enviada.

## Depende de configuração externa

1. Projeto Supabase, migrations, URLs de autenticação, confirmação de e-mail, SMTP e segredos de servidor.
2. Conta Mercado Pago verificada, aplicação, token e webhook; conferir titular/favorecido e homologar Pix remoto.
3. Resend com remetente/domínio verificados e scheduler POST seguro para `/api/jobs`.
4. Hospedagem Next.js, domínio, HTTPS, limites na borda, alarmes e backup gerenciado.
5. Identidade real do responsável, canal de suporte, política de retenção e revisão dos documentos legais.

As skills de design e Playwright citadas no briefing não estavam instaladas. Não foram inventadas licenças, acessos Figma ou resultados visuais.

## Limitações a considerar antes de vender

- Publicação de produção não foi realizada. Código no GitHub não equivale a SaaS ativo.
- Sem credenciais, o produto desabilita operações reais. A chave Pix registrada como referência não registra titularidade, não configura uma conta bancária e não confirma recebimentos.
- Agenda não possui push/realtime; atualizar a página carrega reservas de outros aparelhos.
- Semana é uma lista de sete dias, não uma grade de arrastar. As operações possuem alternativa por formulário.
- Preferências de marketing não são coletadas: só há mensagens operacionais. Preferência individual para desativar lembrete é uma evolução pendente.
- Gestão de acesso excepcional a dados privados pelo operador não é disponibilizada na interface. Há metadados e trilha das reservas, mas não uma ferramenta de suporte com aprovação delegada.
- Troca de fuso de um negócio com reservas já criadas não é disponibilizada; o fuso é escolhido no onboarding para preservar coerência das regras.
- Personalização de marca usa cores pré-aprovadas e upload de imagens; não existe editor de tema livre.
- Retenção, limpeza de arquivos substituídos e exclusão são procedimentos administrativos documentados, não fluxos automáticos de autoatendimento.
- A fila trabalha com entrega ao menos uma vez. Envio já em andamento pode chegar após uma mudança concorrente; o link mostra o estado atual. Homologue o comportamento e monitore as janelas de idempotência do provedor.
- Planos são contados por mês civil UTC ou início do ciclo contratado, o que for mais recente, como exibido nos termos. Reagendar não conta de novo, canceladas contam. Não há promessa de ciclo móvel de trinta dias.
- O primeiro fluxo Pix usa mensalidades avulsas e não a API de assinaturas com cartão. Chargeback/estorno exige revisão operacional. Não existe reembolso automático pelo painel.

## Bloqueia receber clientes

Não abra comercialmente antes de conectar e homologar banco/autenticação, confirmar URLs e e-mails, validar Pix com sua conta, configurar suporte/documentos e executar o fluxo completo em celular com duas empresas distintas. Configure e teste backup/restauração e monitoramento. Esses itens não são considerados aprovados apenas pelos testes locais.

## Homologação mínima com suas contas

1. Crie duas contas verificadas, duas empresas e publique uma agenda por empresa.
2. Em dois aparelhos, dispute o mesmo horário. Confira que uma reserva é aceita e a outra preserva o formulário e oferece alternativas.
3. Recarregue, confira persistência, tente acesso com o outro usuário e um profissional limitado.
4. Reagende, cancele, verifique os links e a fila; valide prazo de cancelamento e fuso em outro navegador.
5. Verifique entrega de confirmação, lembrete e cancelamento; confira e-mails obsoletos e falhas no operador.
6. Faça Pix de teste, confira recebedor, valor, expiração, status pendente, aprovação, webhook repetido e atraso de webhook. Confira que retorno do checkout não libera o plano sozinho.
7. Teste upload real, exportação, vencimento do teste e limite mensal.
8. Valide 360px, teclado, zoom, foco e leitor de tela; restaure um backup em staging.

## Custos e dependências

Mensalidades do produto: Solo R$49, Equipe R$99, configuradas em `src/lib/config.ts` (preços de lançamento não validados pelo mercado).

Custos operacionais são contratados separadamente: hospedagem Next.js, Supabase (banco, auth, Storage e backups), domínio, e-mail transacional, scheduler e tarifas Pix do Mercado Pago. Planos gratuitos podem servir ao desenvolvimento, mas franquias, disponibilidade, uso comercial e preços devem ser conferidos com cada fornecedor na contratação. Não foram consultadas tabelas atuais de preços nem criadas contas pagas. Mensagens de WhatsApp automáticas não estão inclusas.
