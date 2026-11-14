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
  Plus,
  Scissors,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
  X,
  Pause,
  Play,
} from "lucide-react";
export function CalendarSculpture() {
  return (
    <figure className="cl-calendar-art" data-motion>
      <svg
        viewBox="0 0 720 430"
        className="cl-calendar-svg"
        role="img"
        aria-labelledby="calendar-art-title calendar-art-description"
      >
        <title id="calendar-art-title">Seu próximo encontro, organizado.</title>
        <desc id="calendar-art-description">
          Calendário ilustrativo com um horário disponível e uma reserva
          confirmada. As informações permanecem visíveis durante a animação.
        </desc>
        <rect x="12" y="30" width="696" height="338" rx="32" fill="#d9e4ff" />
        <circle cx="597" cy="114" r="57" fill="#e6c5f7" />
        <circle cx="115" cy="286" r="43" fill="#c8d8ff" />
        <g transform="rotate(-8 351 190)">
          <rect
            x="207"
            y="45"
            width="292"
            height="291"
            rx="8"
            fill="#e6c5f7"
            stroke="#c7ade0"
          />
        </g>
        <g transform="rotate(6 362 192)">
          <rect
            x="225"
            y="46"
            width="292"
            height="291"
            rx="8"
            fill="#afc5ff"
            stroke="#9eb8f5"
          />
        </g>
        <g className="cl-art-calendar">
          <rect
            x="214"
            y="37"
            width="292"
            height="300"
            rx="8"
            fill="#fff"
            stroke="#bdcae7"
          />
          <rect x="214" y="37" width="292" height="61" rx="8" fill="#004dff" />
          <rect x="214" y="87" width="292" height="11" fill="#004dff" />
          <rect
            x="262"
            y="27"
            width="9"
            height="22"
            rx="4"
            fill="#fff"
            stroke="#183b90"
            strokeWidth="2"
          />
          <rect
            x="449"
            y="27"
            width="9"
            height="22"
            rx="4"
            fill="#fff"
            stroke="#183b90"
            strokeWidth="2"
          />
          <text
            x="238"
            y="74"
            fill="#fff"
            fontSize="14"
            fontWeight="500"
            letterSpacing="1.2"
          >
            NOVEMBRO
          </text>
          <text x="479" y="74" fill="#d9e4ff" fontSize="12" textAnchor="end">
            2026
          </text>
          {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
            <text
              key={i}
              x={244 + i * 38}
              y="125"
              textAnchor="middle"
              fill="#68748d"
              fontSize="10"
            >
              {d}
            </text>
          ))}
          {Array.from({ length: 28 }, (_, i) => {
            const x = 244 + (i % 7) * 38,
              y = 158 + Math.floor(i / 7) * 38;
            return (
              <g key={i}>
                {i === 18 && (
                  <rect
                    className="cl-art-date"
                    x={x - 15}
                    y={y - 20}
                    width="30"
                    height="31"
                    rx="5"
                    fill="#004dff"
                  />
                )}
                <text
                  x={x}
                  y={y}
                  fill={i === 18 ? "#fff" : "#172343"}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight={i === 18 ? "600" : "400"}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
          <path d="M236 292H484" stroke="#e5e7eb" />
          <circle cx="241" cy="313" r="3" fill="#004dff" />
          <text x="253" y="317" fontSize="9" fill="#53617d">
            Cada horário no seu lugar.
          </text>
        </g>
        <g transform="translate(51 167)">
          <g className="cl-art-time">
            <rect width="186" height="57" rx="7" fill="#fff" stroke="#b6c7ef" />
            <circle
              cx="25"
              cy="28"
              r="8"
              fill="none"
              stroke="#004dff"
              strokeWidth="1.5"
            />
            <path
              d="M25 23V28L29 30"
              fill="none"
              stroke="#004dff"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <text x="43" y="34" fill="#16294e" fontSize="15" fontWeight="500">
              14:30
            </text>
            <path d="M95 17V40" stroke="#e5e7eb" />
            <text x="108" y="33" fill="#5c6d8e" fontSize="11">
              disponível
            </text>
          </g>
        </g>
        <g transform="translate(364 285)">
          <g className="cl-art-booking">
            <rect width="302" height="73" rx="7" fill="#fff" stroke="#bdc8e3" />
            <rect x="15" y="17" width="39" height="39" rx="6" fill="#e6c5f7" />
            <text
              x="34.5"
              y="42"
              textAnchor="middle"
              fill="#4c276b"
              fontSize="17"
            >
              M
            </text>
            <text x="68" y="32" fill="#122346" fontSize="13" fontWeight="500">
              Marina confirmou.
            </text>
            <text x="68" y="50" fill="#68748d" fontSize="10">
              Corte e finalização · 14:30
            </text>
            <circle cx="272" cy="36.5" r="12" fill="#004dff" />
            <path
              d="M267 36.5L270.5 40L277 33"
              stroke="#fff"
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
        {[
          { x: 138, label: "ESCOLHER", n: "01" },
          { x: 321, label: "RESERVAR", n: "02" },
          { x: 501, label: "ORGANIZAR", n: "03" },
        ].map(({ x, label, n }) => (
          <g key={n} transform={"translate(" + x + " 390)"}>
            <circle r="11" fill={n === "03" ? "#004dff" : "#edf2ff"} />
            <text
              textAnchor="middle"
              y="3"
              fill={n === "03" ? "#fff" : "#004dff"}
              fontSize="8"
              fontWeight="500"
            >
              {n}
            </text>
            <text x="20" y="3" fill="#4e6084" fontSize="9" letterSpacing=".8">
              {label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>Ilustração do fluxo · dados fictícios</figcaption>
    </figure>
  );
}
function LiveAgenda() {
  return (
    <div className="cl-agenda-visual" data-motion>
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
    <div
      className="cl-process-visual"
      data-motion
      aria-label="Três etapas do agendamento"
    >
      <span className="cl-process-label">
        DO PRIMEIRO CLIQUE AO PRÓXIMO ENCONTRO
      </span>
      {[
        {
          I: CalendarDays,
          n: "01",
          title: "Escolha um dia.",
          detail: "No seu ritmo.",
          type: "day",
        },
        {
          I: Clock,
          n: "02",
          title: "Encontre seu horário.",
          detail: "09:00 · 10:30 · 14:30",
          type: "time",
        },
        {
          I: Check,
          n: "03",
          title: "Encontro marcado.",
          detail: "Simples assim.",
          type: "done",
        },
      ].map(({ I, n, title, detail, type }) => (
        <div className={"cl-process-card cl-process-" + type} key={n}>
          <span className="cl-process-icon">
            <I size={25} />
          </span>
          <div>
            <b>{title}</b>
            <small>{detail}</small>
          </div>
          <span className="cl-process-number">{n}</span>
        </div>
      ))}
      <span className="cl-process-footer">
        <ShieldCheck size={14} />
        Cada etapa, no seu lugar.
      </span>
    </div>
  );
}
export default function Landing() {
  const [menu, setMenu] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const [motionPaused, setMotionPaused] = useState(false);
  useEffect(() => {
    const current = root.current;
    if (!current) return;
    const syncMotion = () => {
      current.dataset.motionSuspended = String(motionPaused || document.hidden);
    };
    syncMotion();
    document.addEventListener("visibilitychange", syncMotion);
    const visuals = current.querySelectorAll<HTMLElement>("[data-motion]");
    if (typeof IntersectionObserver === "undefined") {
      visuals.forEach((el) => el.classList.add("is-in-view"));
      return () => document.removeEventListener("visibilitychange", syncMotion);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          entry.target.classList.toggle("is-in-view", entry.isIntersecting);
      },
      { threshold: 0.05 },
    );
    visuals.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncMotion);
    };
  }, [motionPaused]);
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
            AGENDAMENTO ONLINE PARA O SEU NEGÓCIO
          </span>
          <h1>
            Seu dia, <b>em ordem.</b>
            <br />
            Seu tempo, <b>de volta.</b>
          </h1>
          <p>
            Seus clientes reservam pelo link. Você acompanha tudo pelo celular.
            <br />
            Mais clareza para quem atende. Mais facilidade para quem agenda.
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
          <button
            className="cl-motion-toggle"
            aria-pressed={motionPaused}
            onClick={() => setMotionPaused((value) => !value)}
          >
            {motionPaused ? <Play size={13} /> : <Pause size={13} />}{" "}
            {motionPaused ? "Retomar animações" : "Pausar animações"}
          </button>
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
                <Check size={16} /> Sua agenda por dia, semana, mês ou lista.
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
          <div className="cl-pix-illustration" data-motion>
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
                "O compartilhamento abre uma conversa para você enviar. Para confirmações e lembretes automáticos, é preciso conectar o WhatsApp oficial da Meta, aprovar os modelos e ter a autorização do cliente. Sem essa conexão, o site não apresenta mensagens como enviadas.",
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
