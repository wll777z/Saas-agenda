"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Globe,
  Link2,
  Menu,
  MousePointer2,
  Plus,
  Scissors,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
  X,
} from "lucide-react";
export function CalendarSculpture() {
  return (
    <div
      className="cl-sculpture"
      role="img"
      aria-label="Ilustração animada de um calendário: um horário é escolhido e o agendamento aparece confirmado"
    >
      <div className="cl-calendar-shadow" />
      <div className="cl-calendar-sheet sheet-back">
        <span>Seu tempo.</span>
      </div>
      <div className="cl-calendar-sheet sheet-middle">
        <span>Seu ritmo.</span>
      </div>
      <div className="cl-calendar-object">
        <div className="cl-rings">
          <i />
          <i />
        </div>
        <div className="cl-cal-bar">
          <span>NOVEMBRO</span>
          <span>2026</span>
        </div>
        <div className="cl-cal-week">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
        <div className="cl-cal-grid">
          {Array.from({ length: 28 }, (_, i) => (
            <span key={i} className={i === 18 ? "cl-chosen-day" : ""}>
              {i + 1}
              {i === 18 && <i />}
            </span>
          ))}
        </div>
        <div className="cl-cal-object-footer">
          <span className="cl-indicator" />O próximo encontro começa aqui.
        </div>
      </div>
      <div className="cl-floating-time">
        <Clock size={15} />
        <span>14:30</span>
        <span>disponível</span>
      </div>
      <div className="cl-floating-booking">
        <span className="cl-booking-avatar">M</span>
        <div>
          <b>Marina confirmou.</b>
          <span>Corte e finalização · 14:30</span>
        </div>
        <span className="cl-check-icon">
          <Check size={15} />
        </span>
      </div>
      <div className="cl-calendar-cursor">
        <MousePointer2 size={28} fill="#000" color="#fff" />
        <span>Seu cliente</span>
      </div>
      <div className="cl-sculpture-caption">
        <span>01 — ESCOLHER</span>
        <span>02 — RESERVAR</span>
        <span>03 — ORGANIZAR</span>
      </div>
      <span className="cl-illustration-label">
        ILUSTRAÇÃO DO FLUXO · DADOS FICTÍCIOS
      </span>
    </div>
  );
}
function LiveAgenda() {
  return (
    <div className="cl-agenda-visual">
      <div className="cl-mini-app">
        <div className="cl-mini-sidebar">
          <span className="cl-mini-logo">
            <CalendarDays size={18} />
          </span>
          {[CalendarDays, Users, Scissors, Wallet].map((I, i) => (
            <span key={i} className={i === 0 ? "active" : ""}>
              <I size={17} />
            </span>
          ))}
        </div>
        <div className="cl-mini-content">
          <div className="cl-mini-top">
            <span>QUINTA, 19 DE NOVEMBRO</span>
            <span className="cl-live-pill">
              <i /> Tudo em ordem
            </span>
          </div>
          <h3>Seu dia, com clareza.</h3>
          <div className="cl-mini-days">
            {["16", "17", "18", "19", "20", "21", "22"].map((d, i) => (
              <div key={d} className={d === "19" ? "selected" : ""}>
                <small>{["S", "T", "Q", "Q", "S", "S", "D"][i]}</small>
                <b>{d}</b>
              </div>
            ))}
          </div>
          <div className="cl-mini-reservation">
            <span>09:00</span>
            <i />
            <div>
              <b>Marina Oliveira</b>
              <small>Corte e finalização · 60 min</small>
            </div>
            <span className="cl-mini-status">Confirmado</span>
          </div>
          <div className="cl-mini-reservation">
            <span>10:30</span>
            <i />
            <div>
              <b>Camila Santos</b>
              <small>Design de sobrancelhas · 30 min</small>
            </div>
            <span className="cl-mini-status">Confirmado</span>
          </div>
          <div className="cl-mini-gap">
            <span>11:00</span>
            <div>
              Um espaço para o próximo encontro.
              <Plus size={16} />
            </div>
          </div>
          <div className="cl-mini-reservation arriving">
            <span>14:30</span>
            <i />
            <div>
              <b>Juliana Costa</b>
              <small>Hidratação · 45 min</small>
            </div>
            <span className="cl-mini-status">
              <Check size={12} /> Nova reserva
            </span>
          </div>
          <div className="cl-mini-bottom">
            <span>SEM HORÁRIOS SOBREPOSTOS.</span>
            <ShieldCheck size={14} />
          </div>
        </div>
      </div>
      <div className="cl-visual-caption">
        Prévia da interface · nomes e horários ilustrativos
      </div>
    </div>
  );
}
function BookingFan() {
  return (
    <div className="cl-booking-fan" aria-hidden="true">
      <div className="cl-fan-sheet fan-one">
        <span>01</span>
        <CalendarDays />
        <b>Escolha um dia.</b>
      </div>
      <div className="cl-fan-sheet fan-two">
        <span>02</span>
        <Clock />
        <b>Encontre seu horário.</b>
        <div>
          <i>09:00</i>
          <i>10:30</i>
          <i>14:30</i>
        </div>
      </div>
      <div className="cl-fan-sheet fan-three">
        <span>03</span>
        <span className="cl-fan-check">
          <Check size={30} />
        </span>
        <b>Encontro marcado.</b>
        <small>Simples assim.</small>
      </div>
    </div>
  );
}
export default function Landing() {
  const [menu, setMenu] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.12 },
    );
    root.current
      ?.querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={root} className="cl-site">
      <header className="cl-nav">
        <a href="/" className="cl-brand">
          <CalendarDays size={24} />
          <span>
            agenda<b>clara</b>
            <i>.</i>
          </span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <a href="/agendar">Agendar</a>
        </nav>
        <div className="cl-nav-right">
          <a href="/entrar">Entrar</a>
          <a className="cl-button cl-button-secondary" href="/cadastro">
            Criar minha agenda <ArrowUpRight size={16} />
          </a>
          <button
            className="cl-menu-btn"
            aria-label={menu ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
        {menu && (
          <div className="cl-mobile-menu">
            <a href="#como-funciona" onClick={() => setMenu(false)}>
              Como funciona
            </a>
            <a href="#recursos" onClick={() => setMenu(false)}>
              Recursos
            </a>
            <a href="#planos" onClick={() => setMenu(false)}>
              Planos
            </a>
            <a href="/agendar">Agendar um horário</a>
            <a href="/pix">Pix e assinatura</a>
            <a href="/cadastro">
              Criar minha agenda <ArrowUpRight size={16} />
            </a>
          </div>
        )}
      </header>
      <main>
        <section className="cl-hero">
          <span className="cl-eyebrow">
            <span />
            MENOS MENSAGENS. MAIS ENCONTROS.
          </span>
          <h1>
            Seu dia, <b>em ordem.</b>
            <br />
            Seu tempo, <b>de volta.</b>
          </h1>
          <p>
            Uma agenda que trabalha com você.
            <br />
            Seu cliente escolhe o horário. Você cuida do que faz de melhor.
          </p>
          <div className="cl-hero-actions">
            <a className="cl-button cl-button-primary" href="/cadastro">
              Criar minha agenda <ArrowUpRight size={18} />
            </a>
            <a className="cl-text-link" href="/agendar">
              Agendar um horário <ArrowRight size={17} />
            </a>
          </div>
          <div className="cl-hero-proof">
            <span>
              <Check size={13} /> 14 dias grátis
            </span>
            <span>
              <Check size={13} /> Sem cartão
            </span>
            <span>
              <Check size={13} /> Feita para o celular
            </span>
          </div>
          <CalendarSculpture />
        </section>
        <div className="cl-audience">
          <span>UM ESPAÇO PARA QUEM ATENDE PESSOAS.</span>
          <div>
            <span>Beleza & bem-estar</span>
            <span>Consultorias</span>
            <span>Serviços pessoais</span>
            <span>Seu próximo negócio</span>
          </div>
        </div>
        <section className="cl-section cl-intro" id="recursos" data-reveal>
          <span className="cl-eyebrow">CLAREZA NA ROTINA</span>
          <h2>
            Menos idas e vindas.
            <br />
            <b>Mais horários marcados.</b>
          </h2>
          <p>
            Seu negócio não precisa de mais uma complicação.
            <br />
            Precisa de um lugar onde tudo se encaixa.
          </p>
          <div className="cl-feature-grid">
            {[
              {
                I: Link2,
                n: "01",
                title: "Seu link. Sua agenda.",
                description:
                  "Uma página do seu negócio para o cliente escolher serviço, profissional e horário. Sem criar conta.",
                tag: "AGENDAMENTO ONLINE",
              },
              {
                I: Clock,
                n: "02",
                title: "Cada horário no seu lugar.",
                description:
                  "Expediente, almoço e intervalos respeitados. Reservas concorrentes protegidas pelo banco.",
                tag: "DISPONIBILIDADE REAL",
              },
              {
                I: Smartphone,
                n: "03",
                title: "Sua rotina vai com você.",
                description:
                  "Clientes, atendimentos, serviços e equipe. Tudo que você precisa para administrar pelo celular.",
                tag: "DO PRIMEIRO AO ÚLTIMO HORÁRIO",
              },
            ].map(({ I, n, title, description, tag }) => (
              <article key={n}>
                <div className="cl-feature-icon">
                  <I size={30} />
                  <span>{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="cl-tag">{tag}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="cl-section cl-split" data-reveal>
          <div className="cl-split-copy">
            <span className="cl-eyebrow">O ESSENCIAL. BEM RESOLVIDO.</span>
            <h2>
              Um olhar claro
              <br />
              para <b>o seu dia.</b>
            </h2>
            <p>
              Saiba quem chega, o que vem a seguir e onde existe espaço.
              Organize os atendimentos com a mesma facilidade com que você abre
              uma mensagem.
            </p>
            <ul>
              <li>
                <Check size={16} /> Sua agenda por dia ou por semana.
              </li>
              <li>
                <Check size={16} /> Cancelamentos e reagendamentos sem confusão.
              </li>
              <li>
                <Check size={16} /> Histórico de clientes, serviços e valores.
              </li>
            </ul>
            <a className="cl-button cl-button-outline" href="/demo">
              Explorar o painel <ArrowUpRight size={16} />
            </a>
          </div>
          <LiveAgenda />
        </section>
        <section
          className="cl-section cl-split reverse"
          id="como-funciona"
          data-reveal
        >
          <BookingFan />
          <div className="cl-split-copy">
            <span className="cl-eyebrow">COMEÇAR PODE SER SIMPLES</span>
            <h2>
              Configure.
              <br />
              Compartilhe.
              <br />
              <b>Receba seus clientes.</b>
            </h2>
            <div className="cl-numbered-steps">
              {[
                [
                  "Seu espaço",
                  "Cadastre seu negócio, serviço e horários disponíveis.",
                ],
                [
                  "Seu link",
                  "Compartilhe na bio, no WhatsApp ou onde seus clientes estão.",
                ],
                [
                  "Seu próximo encontro",
                  "O cliente reserva. O compromisso aparece no seu painel.",
                ],
              ].map(([title, text], i) => (
                <div key={title}>
                  <span>0{i + 1}</span>
                  <div>
                    <b>{title}</b>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
            <a className="cl-text-link" href="/cadastro">
              Vamos organizar seu dia <ArrowRight size={17} />
            </a>
          </div>
        </section>
        <section className="cl-section cl-pix-section" data-reveal>
          <div>
            <span className="cl-eyebrow">PAGUE DE ONDE ESTIVER</span>
            <h2>
              Uma mensalidade.
              <br />
              <b>Um Pix. Tudo claro.</b>
            </h2>
            <p>
              Gere o QR Code ou copie o código pelo painel. Pague no seu banco e
              acompanhe o status da mensalidade, sem cobranças automáticas.
            </p>
            <a className="cl-button cl-button-outline" href="/pix">
              Abrir Pix e assinatura <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="cl-pix-illustration">
            <div className="cl-pix-sheet">
              <Wallet size={27} />
              <span>AGENDA CLARA · SOLO</span>
              <strong>
                R$ 49<span>/mês</span>
              </strong>
              <div className="cl-illustrative-qr" aria-hidden="true">
                {Array.from({ length: 81 }, (_, i) => (
                  <i
                    className={(i * 13 + (i % 7)) % 3 ? "filled" : ""}
                    key={i}
                  />
                ))}
              </div>
              <span className="cl-pix-demo-label">
                ILUSTRAÇÃO — NÃO UTILIZE PARA PAGAR
              </span>
              <div className="cl-pix-copy">
                <span>Pix copia e cola</span>
                <Copy size={17} />
              </div>
              <p>O QR Code válido é gerado na aba Pix.</p>
            </div>
            <span className="cl-pix-note">
              <ShieldCheck size={16} /> Valores e status sempre visíveis.
            </span>
          </div>
        </section>
        <section className="cl-section cl-plans" id="planos" data-reveal>
          <span className="cl-eyebrow">CRESÇA NO SEU RITMO</span>
          <h2>
            Um plano para
            <br />
            <b>o seu momento.</b>
          </h2>
          <p>
            Comece com 14 dias de teste. Sem cartão e sem cobrança automática.
          </p>
          <div className="cl-plan-grid">
            {[
              {
                name: "Solo",
                price: "49",
                subtitle: "Para quem faz acontecer.",
                features: [
                  "1 profissional",
                  "Até 10 serviços ativos",
                  "100 novos agendamentos por mês",
                  "Página pública de agendamento",
                  "Painel completo pelo celular",
                ],
              },
              {
                name: "Equipe",
                price: "99",
                subtitle: "Para crescer junto.",
                features: [
                  "Até 5 profissionais",
                  "Até 50 serviços ativos",
                  "500 novos agendamentos por mês",
                  "Agenda individual por profissional",
                  "Gestão de equipe e permissões",
                ],
              },
            ].map((plan) => (
              <article key={plan.name}>
                <div className="cl-plan-top">
                  <h3>{plan.name}</h3>
                  <span className="cl-tag">
                    {plan.name === "Solo" ? "SEU NEGÓCIO" : "SUA EQUIPE"}
                  </span>
                </div>
                <p>{plan.subtitle}</p>
                <div className="cl-price">
                  <span>R$</span>
                  {plan.price}
                  <small>/mês</small>
                </div>
                <ul>
                  {plan.features.map((x) => (
                    <li key={x}>
                      <Check size={16} />
                      {x}
                    </li>
                  ))}
                </ul>
                <a href="/cadastro" className="cl-button cl-button-outline">
                  Começar com 14 dias grátis <ArrowUpRight size={16} />
                </a>
              </article>
            ))}
          </div>
          <small>
            Pix mensal avulso. Canceladas contam no uso do mês; reagendamentos
            não. O pagamento se refere à assinatura do sistema.
          </small>
        </section>
        <section className="cl-section cl-faq" data-reveal>
          <div>
            <span className="cl-eyebrow">SEM PONTAS SOLTAS</span>
            <h2>
              Vamos deixar
              <br />
              <b>tudo claro.</b>
            </h2>
          </div>
          <div>
            {[
              [
                "Meu cliente precisa criar conta?",
                "Não. Na página pública do seu negócio, ele escolhe o serviço e o horário, informa nome e e-mail e confirma a reserva.",
              ],
              [
                "Posso administrar só pelo celular?",
                "Sim. Configuração, serviços, disponibilidade, agendamentos, equipe e mensalidade estão no painel responsivo.",
              ],
              [
                "Como funciona o Pix?",
                "Você gera uma cobrança na aba Pix. O código direto usa a chave do responsável e precisa de conferência no extrato para liberar o plano. Com Mercado Pago conectado, a confirmação pode ser automática pelo provedor.",
              ],
              [
                "O sistema recebe pagamentos pelos atendimentos?",
                "O Pix desta versão paga a mensalidade da Agenda Clara. O pagamento do atendimento é combinado entre você e seu cliente.",
              ],
              [
                "O que acontece quando o teste termina?",
                "Novas reservas ficam suspensas se você não contratar. Seus compromissos e dados continuam disponíveis para gerenciamento e exportação.",
              ],
              [
                "O WhatsApp envia mensagens sozinho?",
                "O botão abre uma conversa com texto pronto para você enviar. Não é uma automação. Confirmações por e-mail dependem do remetente conectado.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus size={18} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="cl-section cl-closing" data-reveal>
          <span className="cl-eyebrow">SEU TEMPO MERECE CLAREZA</span>
          <h2>
            Abra espaço para
            <br />
            <b>um dia mais leve.</b>
          </h2>
          <a href="/cadastro" className="cl-button cl-button-secondary">
            Criar minha agenda <ArrowUpRight size={18} />
          </a>
          <span>14 dias grátis. Seu próximo passo pode ser simples.</span>
        </section>
      </main>
      <footer className="cl-footer">
        <a href="/" className="cl-brand">
          <CalendarDays size={23} />
          <span>
            agenda<b>clara</b>
            <i>.</i>
          </span>
        </a>
        <p>
          Mais clareza na rotina.
          <br />
          Mais tempo para o que importa.
        </p>
        <div>
          <a href="/agendar">Agendamento</a>
          <a href="/pix">Pix</a>
          <a href="/termos">Termos</a>
          <a href="/privacidade">Privacidade</a>
          <a href="/suporte">Suporte</a>
        </div>
        <small>© {new Date().getFullYear()} Agenda Clara</small>
        <small>O próximo encontro começa aqui.</small>
      </footer>
    </div>
  );
}
