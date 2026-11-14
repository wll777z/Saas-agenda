# Operação e dados

## Operador da plataforma

Depois de criar e verificar a conta, um administrador autorizado do banco pode inserir seu UUID em `platform_operators`. Nunca disponibilize esse cadastro pelo navegador. Acesse `/operacao` autenticado. O painel lista até mil negócios e assinaturas, e contagens de cobranças pendentes e e-mails com falha. Não exibe lista de clientes, reservas privadas, tokens ou segredos. Configure monitoramento externo para um volume superior.

A empresa é um tenant. Vínculos definem proprietário, administrador e profissional. Profissionais enxergam sua agenda e clientes relacionados. Mutações privilegiadas usam funções transacionais; dados públicos vêm de projeções explícitas sem clientes. O bucket `business-branding` contém apenas logos e capas intencionalmente públicos (PNG, JPEG ou WebP, até 2 MB). Políticas impedem escrita e exclusão em pastas de outras empresas; as imagens publicadas podem ser lidas sem conta. Não envie dados pessoais nesse bucket. Quatro cores de destaque acessíveis podem ser selecionadas. Não há upload de documentos privados. Limpe arquivos de marca substituídos por rotina de retenção administrativa.

## Backups e restauração

Ative backups gerenciados do Supabase conforme o plano contratado e confirme a retenção. Para operação comercial, contrate recuperação pontual quando necessária e defina RPO/RTO conforme seu negócio.

Procedimento sugerido a validar em sua conta:

1. Faça backup criptografado de banco (ferramenta oficial Supabase ou `pg_dump` com conexão segura); guarde fora do servidor de aplicação. Nunca coloque dumps no Git.
2. Crie um projeto de staging isolado, sem credenciais de pagamento/e-mail de produção.
3. Restaure schema e dados seguindo o procedimento oficial compatível com auth e extensões Supabase. Não restaure por cima de produção.
4. Confira contagens por empresa, integridade de vínculos, restrição de sobreposição, políticas RLS, assinaturas, autenticação e fila. Jobs restaurados não devem enviar mensagens reais até a conferência.
5. Documente data, duração e resultado. A restauração da infraestrutura externa **não foi executada nesta entrega**; exige conta e backup reais.

## Retenção e direitos

Defina com o responsável jurídico a identificação do controlador, canais, prazos de retenção e bases legais antes do lançamento. Os documentos publicados são informativos e sinalizam as pendências, sem CNPJ ou contato inventados.

Exportação: apenas proprietário, a partir de tabelas filtradas pela empresa no servidor, sem hash de gerenciamento. O arquivo contém dados pessoais; armazenamento é responsabilidade de quem exporta.

Exclusão: procedimento manual restrito, depois de verificar identidade e obrigações de retenção. Revogue membros e convites, suspenda a publicação, cancele jobs pendentes, trate dados de clientes e reserva conforme política, retenha o mínimo legal e registre a operação. Não há botão de exclusão irreversível automático. Não apague uma conta auth antes de conferir seus vínculos com outras empresas.

## Monitoramento

- Erros de API e indisponibilidade: monitore `/api/health`; esse endpoint informa configuração, não certifica conectividade externa.
- Monitore `notification_jobs` com estado `failed` e leases vencidos. Não registre recipient, payload, token ou texto de mensagem em logs de aplicação.
- Reconcilie cobranças pendentes: cron `/api/jobs`; “já paguei” também consulta a API.
- Ative alarmes de gastos e limites dos provedores. Observe taxas de falha de autenticação e reservas; configure proteção de borda por IP além do limite persistente por IP/e-mail.
- Limpe entradas antigas de `rate_limits` por rotina administrativa, sem apagar as janelas ativas.

Não há sincronização Google Calendar; ICS é uma cópia. Não há envio automático de WhatsApp. Não existe reserva offline. Não há acesso excepcional de suporte privado por interface; qualquer acesso de banco exige autorização operacional e auditoria externa da infraestrutura.
