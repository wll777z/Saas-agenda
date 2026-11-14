"use client";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
  type ReactNode,
  type CSSProperties,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ArrowUpRight,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Users,
  Scissors,
  Settings,
  Link as LinkIcon,
  Copy,
  Menu,
  X,
  LogOut,
  Search,
  Sun,
  CheckCircle2,
  CalendarCheck,
  Download,
  Wallet,
  ExternalLink,
  ShieldCheck,
  Mail,
  AlertCircle,
  MoreHorizontal,
  Smartphone,
  Globe,
} from "lucide-react";
import { supabase, configured, api } from "@/lib/supabase";
import { money, plans, statusLabel, PIX_KEY } from "@/lib/config";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import QRCode from "qrcode";
import LandingV2 from "./Landing";
import { HostedAuth, Directory } from "./Hosted";
// Demo lives only in memory and never uses production APIs.
type Row = Record<string, any>;
const today = () =>
  formatInTimeZone(new Date(), "America/Sao_Paulo", "yyyy-MM-dd");
const dateLabel = (d: string, zone = "America/Sao_Paulo") =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: zone,
  }).format(new Date(d));
const timeLabel = (d: string, zone = "America/Sao_Paulo") =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
  }).format(new Date(d));
function Brand() {
  return (
    <a className="brand" href="/" aria-label="Agenda Clara início">
      <span className="brand-icon">
        <CalendarDays size={21} />
      </span>
      agenda<span className="brand-light">clara</span>
      <span className="brand-dot">.</span>
    </a>
  );
}
function Button({
  children,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p}>{children}</button>;
}
const brandingUrl = (path: string) =>
  process.env.NEXT_PUBLIC_SITES_RUNTIME === "true"
    ? "/brand/" + path.split("/").map(encodeURIComponent).join("/")
    : process.env.NEXT_PUBLIC_SUPABASE_URL +
      "/storage/v1/object/public/business-branding/" +
      path.split("/").map(encodeURIComponent).join("/");
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice" role="status">
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
  message,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  message?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keyboard(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const controls = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
        );
        if (!controls?.length) return;
        const first = controls[0],
          last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-top">
          <h2>{title}</h2>
          <button
            autoFocus
            className="icon-btn"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {message && <Notice>{message}</Notice>}
        {children}
      </section>
    </div>
  );
}
function Preview() {
  return (
    <div className="preview">
      <div className="preview-top">
        <span className="mini-brand">
          <CalendarDays size={16} /> agenda clara.
        </span>
        <span className="tiny-tag">Sua rotina, mais leve</span>
      </div>
      <div className="preview-body">
        <div className="preview-side">
          <span className="active">
            <Sun size={17} /> Hoje
          </span>
          <span>
            <CalendarDays size={17} /> Agenda
          </span>
          <span>
            <Users size={17} /> Clientes
          </span>
          <span>
            <Scissors size={17} /> Serviços
          </span>
        </div>
        <div className="preview-content">
          <div className="section-top">
            <div>
              <small>QUARTA-FEIRA</small>
              <h3>Um bom dia começa aqui.</h3>
            </div>
            <span className="preview-add">+ Novo agendamento</span>
          </div>
          <div className="preview-stats">
            <div>
              <b>04</b>
              <span>agendamentos</span>
            </div>
            <div>
              <b>R$ 340</b>
              <span>serviços previstos</span>
            </div>
            <div>
              <b>02</b>
              <span>horários livres</span>
            </div>
          </div>
          <div className="preview-week">
            {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
              <span className={i === 2 ? "selected" : ""} key={i}>
                {d}
                <b>{12 + i}</b>
              </span>
            ))}
          </div>
          <div className="preview-appointment">
            <span>09:00</span>
            <i />
            <div>
              <b>Marina Oliveira</b>
              <small>Corte e finalização · 60 min</small>
            </div>
            <span className="status confirmed">Confirmado</span>
          </div>
          <div className="preview-appointment">
            <span>10:30</span>
            <i />
            <div>
              <b>Camila Santos</b>
              <small>Design de sobrancelhas · 30 min</small>
            </div>
            <span className="status confirmed">Confirmado</span>
          </div>
          <div className="preview-free">
            11:00 <span>Um espaço para o próximo cliente.</span>
          </div>
        </div>
      </div>
      <div className="preview-footer">
        <span className="live-dot" /> Demonstração com dados fictícios{" "}
        <span>Feita para simplificar.</span>
      </div>
    </div>
  );
}
function Landing() {
  return (
    <>
      {process.env.NEXT_PUBLIC_PREVIEW_ONLY === "true" && (
        <div className="site-preview-bar">
          <span>Prévia navegável da Agenda Clara</span>
          <a href="/demo">
            Abrir demonstração do painel <ArrowUpRight size={15} />
          </a>
        </div>
      )}
      <header className="landing-nav">
        <Brand />
        <nav>
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
        </nav>
        <div className="nav-actions">
          <a href="/entrar">Entrar</a>
          <a className="button small" href="/cadastro">
            Começar agora <ArrowUpRight size={16} />
          </a>
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="eyebrow">
            <span className="live-dot" /> MENOS GESTÃO. MAIS TEMPO.
          </div>
          <h1>
            Sua agenda organizada.
            <br />
            <span>Seu dia mais leve.</span>
          </h1>
          <p>
            Seus clientes com hora marcada. Você com tempo
            <br className="desktop" /> para fazer o que faz de melhor.
          </p>
          <div className="hero-actions">
            <a className="button" href="/cadastro">
              Criar minha agenda <ArrowUpRight size={19} />
            </a>
            <a className="text-link" href="/demo">
              Conhecer por dentro <ArrowRight size={18} />
            </a>
          </div>
          <div className="hero-note">
            <Check size={14} /> 14 dias grátis <span>·</span> Sem cartão de
            crédito <span>·</span> Pronta no celular
          </div>
          <div className="hero-product">
            <div className="product-label">
              <span>UM OLHAR PARA SUA NOVA ROTINA</span>
              <span>01 / AGENDA CLARA</span>
            </div>
            <Preview />
          </div>
        </section>
        <section className="benefits" id="recursos">
          <div className="eyebrow">ESPAÇO NA AGENDA. ESPAÇO NA CABEÇA.</div>
          <div className="section-heading">
            <h2>
              O essencial.
              <br />
              <span>Muito bem resolvido.</span>
            </h2>
            <p>
              Uma ferramenta que acompanha seu trabalho,
              <br />
              sem deixar sua rotina mais complicada.
            </p>
          </div>
          <div className="benefit-grid">
            {[
              {
                icon: CalendarCheck,
                title: "Seu link. Sua agenda.",
                text: "Compartilhe sua página e deixe o cliente escolher o melhor horário, sem criar conta.",
              },
              {
                icon: Smartphone,
                title: "Tudo na palma da mão.",
                text: "Organize atendimentos, serviços e disponibilidade de onde você estiver.",
              },
              {
                icon: Clock,
                title: "Cada horário no seu lugar.",
                text: "Expediente, intervalos e bloqueios respeitados. Sem duas reservas no mesmo horário.",
              },
            ].map(({ icon: I, title, text }, i) => (
              <article key={title}>
                <div className="benefit-number">
                  0{i + 1}
                  <I size={24} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="how" id="como-funciona">
          <div>
            <div className="eyebrow">DO SEU JEITO, EM POUCOS PASSOS</div>
            <h2>
              Menos idas e vindas.
              <br />
              <span>Mais encontros marcados.</span>
            </h2>
            <a className="text-link" href="/cadastro">
              Vamos organizar seu dia <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="steps">
            {[
              [
                "Crie seu espaço",
                "Nome do negócio, serviços e horários. Só o necessário para começar.",
              ],
              [
                "Compartilhe seu link",
                "Na bio, no WhatsApp ou onde seus clientes já encontram você.",
              ],
              [
                "Receba seus agendamentos",
                "O cliente escolhe. Sua agenda se organiza. Você acompanha tudo.",
              ],
            ].map(([t, d], i) => (
              <div key={t}>
                <span>0{i + 1}</span>
                <section>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </section>
                <Check size={18} />
              </div>
            ))}
          </div>
        </section>
        <section id="planos" className="pricing">
          <div className="eyebrow">SIMPLES ATÉ NA ESCOLHA</div>
          <h2>Um plano para o seu momento.</h2>
          <p>Comece com 14 dias do plano Equipe. Sem cobrança automática.</p>
          <div className="price-grid">
            {Object.entries(plans).map(([key, p]) => (
              <article key={key}>
                <div className="section-top">
                  <h3>{p.name}</h3>
                  <span className="tiny-tag">
                    {key === "solo"
                      ? "Para quem faz acontecer"
                      : "Para crescer junto"}
                  </span>
                </div>
                <div className="price">
                  {money(p.price)}
                  <small>/mês</small>
                </div>
                <p>
                  {key === "solo"
                    ? "Seu negócio, com tudo em ordem."
                    : "Sua equipe, na mesma página."}
                </p>
                <ul>
                  {[
                    `${p.professionals === 1 ? "1 profissional" : `Até ${p.professionals} profissionais`}`,
                    `Até ${p.services} serviços ativos`,
                    `${p.bookings} novos agendamentos por mês`,
                    "Página de agendamento e painel no celular",
                  ].map((x) => (
                    <li key={x}>
                      <Check size={16} />
                      {x}
                    </li>
                  ))}
                </ul>
                <a className="button" href="/cadastro">
                  Experimentar grátis <ArrowUpRight size={17} />
                </a>
              </article>
            ))}
          </div>
          <small>
            Pix mensal, sem renovação automática. Valores iniciais.
            Cancelamentos contam no uso; reagendamentos não.
          </small>
        </section>
        <section className="faq">
          <div>
            <div className="eyebrow">SEM COMPLICAÇÃO</div>
            <h2>Ficou alguma dúvida?</h2>
          </div>
          <div>
            {[
              [
                "Meu cliente precisa criar uma conta?",
                "Não. Ele abre seu link, escolhe serviço e horário e informa nome e e-mail para confirmar.",
              ],
              [
                "Consigo usar só pelo celular?",
                "Sim. Cadastro, agenda, clientes, serviços, equipe e assinatura foram pensados para o celular.",
              ],
              [
                "Como funciona o pagamento por Pix?",
                "A mensalidade é paga remotamente por QR Code ou copia e cola quando o Mercado Pago estiver conectado. O plano é liberado após a confirmação do provedor. Não há débito recorrente automático.",
              ],
              [
                "O que acontece ao terminar o teste?",
                "Sem contratação, novas reservas ficam suspensas. Seus compromissos continuam disponíveis para consulta e gerenciamento.",
              ],
              [
                "Envia mensagens no WhatsApp?",
                "Você pode compartilhar seu link pelo WhatsApp. Isso abre uma conversa; não é envio automático. Confirmações por e-mail dependem do provedor conectado.",
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
        <section className="last-cta">
          <span className="eyebrow">SEU PRÓXIMO CAPÍTULO COMEÇA AQUI</span>
          <h2>
            Abra espaço para
            <br />
            um dia mais claro.
          </h2>
          <a className="button" href="/cadastro">
            Criar minha agenda <ArrowUpRight size={18} />
          </a>
        </section>
      </main>
      <footer>
        <Brand />
        <p>
          Mais clareza na rotina.
          <br />
          Mais tempo para o que importa.
        </p>
        <div>
          <a href="/termos">Termos de uso</a>
          <a href="/privacidade">Privacidade</a>
          <a href="/suporte">Suporte</a>
        </div>
        <small>© {new Date().getFullYear()} Agenda Clara</small>
      </footer>
    </>
  );
}
function Auth({ mode }: { mode: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  useEffect(() => {
    if (mode === "recuperar")
      supabase?.auth
        .getSession()
        .then(({ data }) => setReset(Boolean(data.session)));
  }, [mode]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (!supabase)
        throw Error(
          "Cadastro ainda indisponível: conecte o Supabase para habilitar contas reais.",
        );
      const f = new FormData(e.currentTarget);
      const email = String(f.get("email"));
      const password = String(f.get("password"));
      if (mode === "cadastro") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: location.origin + "/painel" },
        });
        if (error) throw error;
        setMessage(
          "Confira seu e-mail para verificar a conta. Depois entre para configurar sua agenda.",
        );
      } else if (mode === "recuperar") {
        const { error } = reset
          ? await supabase.auth.updateUser({ password })
          : await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: location.origin + "/recuperar",
            });
        if (error) throw error;
        setMessage(
          reset
            ? "Senha atualizada. Você já pode entrar."
            : "Se houver uma conta, você receberá um link de recuperação.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/painel");
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">UM NOVO JEITO DE ORGANIZAR</span>
          <h1>
            Mais leveza
            <br />
            na sua rotina.
          </h1>
          <p>
            O próximo horário marcado é o começo
            <br />
            de um dia mais tranquilo.
          </p>
        </div>
        <span>Seu tempo merece clareza.</span>
      </div>
      <main className="auth-main">
        <a href="/" className="back">
          <ChevronLeft size={17} /> Voltar ao início
        </a>
        <div className="auth-form">
          <span className="eyebrow">AGENDA CLARA</span>
          <h2>
            {mode === "cadastro"
              ? "Vamos abrir sua agenda?"
              : mode === "recuperar"
                ? "Recupere seu acesso."
                : "Bom ter você de volta."}
          </h2>
          <p>
            {mode === "cadastro"
              ? "14 dias grátis para conhecer uma rotina mais simples."
              : "Seu próximo dia organizado começa aqui."}
          </p>
          {!configured && (
            <Notice>
              Conexão com o banco pendente. Conheça a{" "}
              <a href="/demo">demonstração</a> enquanto isso.
            </Notice>
          )}
          <form onSubmit={submit}>
            {!reset && (
              <Field label="E-mail">
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="voce@seunegocio.com.br"
                />
              </Field>
            )}
            {(mode !== "recuperar" || reset) && (
              <Field label="Senha">
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  required
                  autoComplete={
                    mode === "entrar" ? "current-password" : "new-password"
                  }
                  placeholder="Pelo menos 10 caracteres"
                />
              </Field>
            )}
            <Button disabled={busy}>
              {busy
                ? "Aguarde…"
                : mode === "cadastro"
                  ? "Criar minha conta"
                  : mode === "recuperar"
                    ? "Continuar"
                    : "Entrar na minha agenda"}
              <ArrowRight size={18} />
            </Button>
          </form>
          {message && <Notice>{message}</Notice>}
          <p className="auth-links">
            {mode === "entrar" ? (
              <>
                <a href="/recuperar">Esqueci minha senha</a>
                <span>
                  Ainda não tem conta? <a href="/cadastro">Começar grátis</a>
                </span>
              </>
            ) : (
              <a href="/entrar">Já tenho conta. Entrar</a>
            )}
          </p>
          <small>
            Ao continuar, consulte os <a href="/termos">termos</a> e a{" "}
            <a href="/privacidade">política de privacidade</a>.
          </small>
        </div>
      </main>
    </div>
  );
}
function Onboarding({ done }: { done: () => void }) {
  const [step, setStep] = useState(0);
  const [slugTouched, setSlugTouched] = useState(false);
  const [v, setV] = useState<Row>({
    name: "",
    slug: "",
    segment: "Beleza e bem-estar",
    address: "",
    timezone: "America/Sao_Paulo",
    service: "",
    duration: 60,
    price: "",
    start: "09:00",
    end: "18:00",
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const d = sessionStorage.getItem("agenda-onboarding");
    if (d)
      try {
        setV(JSON.parse(d));
      } catch {}
  }, []);
  function update(k: string, value: any) {
    setV((old) => {
      const next = { ...old, [k]: value };
      sessionStorage.setItem("agenda-onboarding", JSON.stringify(next));
      return next;
    });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase!.rpc("create_business", {
        p_name: v.name,
        p_slug: v.slug,
        p_segment: v.segment,
        p_address: v.address,
        p_timezone: v.timezone,
        p_service: v.service,
        p_duration: Number(v.duration),
        p_price: Math.round(Number(v.price) * 100),
        p_start: v.start,
        p_end: v.end,
      });
      if (error) throw error;
      sessionStorage.removeItem("agenda-onboarding");
      done();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="onboarding">
      <Brand />
      <div className="setup-card">
        <span className="eyebrow">
          SEU ESPAÇO, DO SEU JEITO · {step + 1} DE 3
        </span>
        <h1>
          {
            [
              "Vamos conhecer seu negócio.",
              "Seu primeiro serviço.",
              "Abra espaço na agenda.",
            ][step]
          }
        </h1>
        <p>O progresso fica salvo neste navegador até concluir o cadastro.</p>
        <div className="progress">
          {[0, 1, 2].map((x) => (
            <i key={x} className={x <= step ? "filled" : ""} />
          ))}
        </div>
        <form onSubmit={submit}>
          {step === 0 ? (
            <>
              <Field label="Nome do negócio">
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={v.name}
                  onChange={(e) => {
                    update("name", e.target.value);
                    if (!slugTouched)
                      update(
                        "slug",
                        e.target.value
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, ""),
                      );
                  }}
                />
              </Field>
              <Field label="Seu link /a/">
                <input
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={v.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    update("slug", e.target.value);
                  }}
                />
              </Field>
              <Field label="Segmento">
                <select
                  value={v.segment}
                  onChange={(e) => update("segment", e.target.value)}
                >
                  {[
                    "Beleza e bem-estar",
                    "Consultoria",
                    "Serviços pessoais",
                    "Outro",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Endereço ou instruções para atendimento online">
                <input
                  required
                  value={v.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </Field>
              <Field label="Fuso horário">
                <select
                  value={v.timezone}
                  onChange={(e) => update("timezone", e.target.value)}
                >
                  {Array.from(
                    new Set([
                      "America/Sao_Paulo",
                      ...Intl.supportedValuesOf("timeZone"),
                    ]),
                  ).map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </select>
              </Field>
            </>
          ) : step === 1 ? (
            <>
              <Field label="Nome do serviço">
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={v.service}
                  onChange={(e) => update("service", e.target.value)}
                />
              </Field>
              <div className="form-row">
                <Field label="Duração em minutos">
                  <input
                    type="number"
                    required
                    min={5}
                    max={480}
                    value={v.duration}
                    onChange={(e) => update("duration", e.target.value)}
                  />
                </Field>
                <Field label="Preço (R$)">
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    step="0.01"
                    required
                    value={v.price}
                    onChange={(e) => update("price", e.target.value)}
                  />
                </Field>
              </div>
            </>
          ) : (
            <>
              <Notice>
                Expediente inicial de segunda a sexta. Você pode adicionar
                almoço e outros dias em Disponibilidade antes de publicar.
              </Notice>
              <div className="form-row">
                <Field label="Início">
                  <input
                    type="time"
                    required
                    value={v.start}
                    onChange={(e) => update("start", e.target.value)}
                  />
                </Field>
                <Field label="Fim">
                  <input
                    type="time"
                    required
                    value={v.end}
                    onChange={(e) => update("end", e.target.value)}
                  />
                </Field>
              </div>
              <div className="setup-summary">
                <b>{v.name}</b>
                <p>
                  {v.service} · {v.duration} min ·{" "}
                  {money(Math.round(Number(v.price) * 100))}
                </p>
                <small>
                  O link será publicado somente quando você confirmar no painel.
                </small>
              </div>
            </>
          )}
          {msg && <Notice>{msg}</Notice>}
          <div className="section-top">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)}>
                Voltar
              </button>
            )}
            <Button disabled={busy}>
              {busy
                ? "Salvando…"
                : step === 2
                  ? "Criar meu negócio"
                  : "Continuar"}
              <ArrowRight size={17} />
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
const demoTenant = {
  id: "demo",
  name: "Studio Aurora",
  slug: "studio-aurora",
  timezone: "America/Sao_Paulo",
  published: false,
  address: "Rua das Flores, 120 — São Paulo",
  cancel_hours: 24,
};
const demoServices = [
  {
    id: "s1",
    name: "Corte e finalização",
    duration: 60,
    price: 12000,
    active: true,
    buffer_before: 0,
    buffer_after: 15,
  },
  {
    id: "s2",
    name: "Design de sobrancelhas",
    duration: 30,
    price: 5500,
    active: true,
    buffer_before: 0,
    buffer_after: 0,
  },
  {
    id: "s3",
    name: "Hidratação",
    duration: 45,
    price: 9000,
    active: true,
    buffer_before: 0,
    buffer_after: 0,
  },
];
const demoAppointments = () => [
  {
    id: "b1",
    starts_at: today() + "T12:00:00Z",
    ends_at: today() + "T13:00:00Z",
    service_name: "Corte e finalização",
    duration: 60,
    price: 12000,
    status: "confirmed",
    professional_id: "p1",
    customers: { name: "Marina Oliveira", email: "marina@example.com" },
  },
  {
    id: "b2",
    starts_at: today() + "T13:30:00Z",
    ends_at: today() + "T14:00:00Z",
    service_name: "Design de sobrancelhas",
    duration: 30,
    price: 5500,
    status: "confirmed",
    professional_id: "p1",
    customers: { name: "Camila Santos", email: "camila@example.com" },
  },
  {
    id: "b3",
    starts_at: today() + "T17:00:00Z",
    ends_at: today() + "T17:45:00Z",
    service_name: "Hidratação",
    duration: 45,
    price: 9000,
    status: "completed",
    professional_id: "p1",
    customers: { name: "Juliana Costa", email: "juliana@example.com" },
  },
];
function Dashboard({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const dashboardPath = usePathname();
  const [view, setView] = useState(dashboardPath === "/pix" ? "Pix" : "Hoje");
  const [loading, setLoading] = useState(!demo);
  const [tenants, setTenants] = useState<Row[]>(demo ? [demoTenant] : []);
  const [tenantId, setTenantId] = useState(demo ? "demo" : "");
  const [tenant, setTenant] = useState<Row>(demo ? demoTenant : {});
  const [role, setRole] = useState("owner");
  const [bookings, setBookings] = useState<Row[]>(
    demo ? demoAppointments() : [],
  );
  const [services, setServices] = useState<Row[]>(demo ? demoServices : []);
  const [professionals, setProfessionals] = useState<Row[]>(
    demo ? [{ id: "p1", name: "Ana Souza", active: true }] : [],
  );
  const [customers, setCustomers] = useState<Row[]>(
    demo ? demoAppointments().map((b) => ({ id: b.id, ...b.customers })) : [],
  );
  const [sub, setSub] = useState<Row>(
    demo
      ? {
          plan: "trial",
          status: "trial",
          valid_until: new Date(Date.now() + 14 * 86400000).toISOString(),
        }
      : {},
  );
  const [payments, setPayments] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [day, setDay] = useState(today());
  const [week, setWeek] = useState(false);
  const [query, setQuery] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Row>({});
  const [pix, setPix] = useState<Row | null>(null);
  const [pixPlan, setPixPlan] = useState<"solo" | "team">("solo");
  const [pixKey, setPixKey] = useState("");
  const [rules, setRules] = useState<Row[]>([]);
  const [selectedPro, setSelectedPro] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [accent, setAccent] = useState("#0071e3");
  const load = useCallback(async () => {
    if (demo) return;
    setLoading(true);
    try {
      if (!supabase) {
        setMsg("Conecte o Supabase para habilitar o painel real.");
        setLoading(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/entrar");
        return;
      }
      const m = await supabase
        .from("memberships")
        .select("tenant_id,role,tenants(*)")
        .eq("user_id", session.user.id);
      if (m.error) throw m.error;
      if (!m.data?.length) {
        setNeedsSetup(true);
        setLoading(false);
        return;
      }
      const list = m.data.map((x: any) => x.tenants);
      setTenants(list);
      const id = tenantId || list[0].id;
      setTenantId(id);
      setTenant(list.find((x: any) => x.id === id));
      setLogo(list.find((x: any) => x.id === id)?.logo_path ?? null);
      setCover(list.find((x: any) => x.id === id)?.cover_path ?? null);
      setAccent(list.find((x: any) => x.id === id)?.accent ?? "#0071e3");
      setRole(m.data.find((x) => x.tenant_id === id)?.role ?? "professional");
      const results = await Promise.all([
        supabase
          .from("appointments")
          .select("*,customers(name,email,phone)")
          .eq("tenant_id", id)
          .order("starts_at"),
        supabase.from("services").select("*").eq("tenant_id", id).order("name"),
        supabase.from("professionals").select("*").eq("tenant_id", id),
        supabase
          .from("customers")
          .select("*")
          .eq("tenant_id", id)
          .order("name"),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("tenant_id", id)
          .maybeSingle(),
        supabase
          .from("payment_events")
          .select("*")
          .eq("tenant_id", id)
          .order("created_at", { ascending: false }),
      ]);
      for (const r of results) if (r.error) throw r.error;
      setBookings(results[0].data ?? []);
      setServices(results[1].data ?? []);
      setProfessionals(results[2].data ?? []);
      setCustomers(results[3].data ?? []);
      setSub(results[4].data ?? {});
      setPayments(results[5].data ?? []);
      setNeedsSetup(false);
      api("health")
        .then(setHealth)
        .catch(() => {});
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [demo, tenantId, router]);
  useEffect(() => {
    load();
  }, [load]);
  async function action(fn: () => Promise<unknown>) {
    setMsg("");
    setBusy(true);
    try {
      await fn();
      if (!demo) await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function call(name: string, args: Row) {
    const { error } = await supabase!.rpc(name, args);
    if (error) throw error;
  }
  const isAdmin = role !== "professional";
  const ownerRole = role === "owner";
  const tz = tenant.timezone ?? "America/Sao_Paulo";
  const filtered = bookings.filter((b) => {
    const d = formatInTimeZone(new Date(b.starts_at), tz, "yyyy-MM-dd");
    const end = new Date(day + "T12:00:00");
    end.setDate(end.getDate() + 6);
    return (
      (week ? d >= day && d <= end.toISOString().slice(0, 10) : d === day) &&
      `${b.customers?.name} ${b.service_name}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );
  });
  const stats = [
    {
      label: "Agendamentos",
      value: filtered
        .filter((b) => b.status !== "blocked")
        .length.toString()
        .padStart(2, "0"),
      icon: CalendarDays,
    },
    {
      label: "Valor dos serviços realizados",
      value: money(
        filtered
          .filter((b) => b.status === "completed")
          .reduce((a, b) => a + b.price, 0),
      ),
      icon: Wallet,
    },
    {
      label: "Cancelamentos",
      value: filtered
        .filter((b) => b.status === "cancelled")
        .length.toString()
        .padStart(2, "0"),
      icon: CalendarCheck,
    },
    {
      label: "Não compareceram",
      value: filtered
        .filter((b) => b.status === "no_show")
        .length.toString()
        .padStart(2, "0"),
      icon: Users,
    },
  ];
  function shift(n: number) {
    const d = new Date(day + "T12:00:00");
    d.setDate(d.getDate() + n);
    setDay(d.toISOString().slice(0, 10));
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copiado para a área de transferência.");
    } catch {
      setMsg("Não foi possível copiar. Selecione o link manualmente: " + text);
    }
  }
  const publicUrl = () => location.origin + "/a/" + tenant.slug;
  async function serviceSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const row = {
      id: editing?.id ?? crypto.randomUUID(),
      name: String(f.get("name")),
      duration: Number(f.get("duration")),
      price: Math.round(Number(f.get("price")) * 100),
      buffer_before: Number(f.get("before")),
      buffer_after: Number(f.get("after")),
      active: f.get("active") === "on",
    };
    await action(async () => {
      if (demo)
        setServices((s) =>
          editing ? s.map((x) => (x.id === editing.id ? row : x)) : [...s, row],
        );
      else
        await call("save_service", {
          p_tenant: tenantId,
          p_id: editing?.id ?? null,
          p_name: row.name,
          p_duration: row.duration,
          p_price: row.price,
          p_before: row.buffer_before,
          p_after: row.buffer_after,
          p_active: row.active,
        });
      setModal("");
    });
  }
  if (needsSetup)
    return (
      <Onboarding
        done={() => {
          setNeedsSetup(false);
          load();
        }}
      />
    );
  async function uploadBrand(file: File | undefined, kind: "logo" | "cover") {
    if (!file) return;
    setBusy(true);
    try {
      if (demo) throw Error("Upload desabilitado na demonstração.");
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 2097152
      )
        throw Error("Use PNG, JPEG ou WebP com até 2 MB.");
      const path =
        tenantId +
        "/" +
        kind +
        "-" +
        crypto.randomUUID() +
        "." +
        (file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg");
      const { error } = await supabase!.storage
        .from("business-branding")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      if (kind === "logo") setLogo(path);
      else setCover(path);
      setMsg("Arquivo enviado. Toque em Salvar identidade para aplicar.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className="loading">
        <CalendarDays />
        <p>Organizando sua agenda…</p>
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="business-switch">
          <span className="avatar">{tenant.name?.slice(0, 1) ?? "A"}</span>
          <div>
            {tenants.length > 1 ? (
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <b>{tenant.name ?? "Seu negócio"}</b>
            )}
            <small>
              {demo
                ? "Ambiente de demonstração"
                : role === "owner"
                  ? "Seu espaço de trabalho"
                  : role === "admin"
                    ? "Administrador"
                    : "Profissional"}
            </small>
          </div>
        </div>
        <span className="nav-label">SEU DIA A DIA</span>
        <nav>
          {[
            { name: "Hoje", icon: Sun },
            { name: "Agenda", icon: CalendarDays },
            { name: "Clientes", icon: Users },
            { name: "Serviços", icon: Scissors },
            { name: "Mais", icon: MoreHorizontal },
          ].map(({ name, icon: I }) => (
            <button
              className={view === name ? "active" : ""}
              onClick={() => setView(name)}
              key={name}
            >
              <I size={20} />
              <span>{name}</span>
              {name === "Hoje" && (
                <small>
                  {bookings.filter((b) => b.status === "confirmed").length}
                </small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {ownerRole && (
            <button
              onClick={() => setView("Pix")}
              className={view === "Pix" ? "active" : ""}
            >
              <Wallet size={20} /> Pix e assinatura <ArrowUpRight size={16} />
            </button>
          )}
          <div className="trial-card">
            <span className="live-dot" />
            <b>
              {sub.plan === "trial"
                ? "Um começo mais claro"
                : (plans[sub.plan as "solo"]?.name ?? "Seu plano")}
            </b>
            <p>
              {sub.valid_until
                ? `Acesso até ${dateLabel(sub.valid_until, tz)}`
                : "Configure sua assinatura"}
            </p>
            <button onClick={() => setView("Pix")}>
              Ver planos <ArrowRight size={15} />
            </button>
          </div>
          <button
            onClick={() =>
              demo
                ? router.push("/")
                : supabase?.auth.signOut().then(() => router.push("/entrar"))
            }
          >
            <LogOut size={18} />{" "}
            {demo ? "Sair da demonstração" : "Sair da conta"}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="app-header">
          <span>
            Seu espaço <ChevronRight size={14} /> <b>{view}</b>
          </span>
          <div>
            <span className="tz-label">{tz}</span>
            <button
              className="icon-btn"
              onClick={() => setView("Mais")}
              aria-label="Configurações"
            >
              <Settings size={19} />
            </button>
            <span className="avatar small-avatar">
              {tenant.name?.slice(0, 1) ?? "A"}
            </span>
          </div>
        </header>
        <main className="app-main">
          {demo && (
            <div className="demo-banner">
              <span>
                <span className="live-dot" /> Demonstração · Dados fictícios.
                Alterações duram apenas nesta visita.
              </span>
              <a href="/cadastro">
                Criar minha agenda <ArrowUpRight size={14} />
              </a>
            </div>
          )}
          {msg && <Notice>{msg}</Notice>}
          {!demo && !tenant.published && isAdmin && (
            <div className="publish-banner">
              <div>
                <b>Falta pouco para abrir sua agenda.</b>
                <span>
                  Revise seus serviços e disponibilidade e publique seu link.
                </span>
              </div>
              <Button
                disabled={busy}
                onClick={() =>
                  action(async () =>
                    call("publish_business", {
                      p_tenant: tenantId,
                      p_published: true,
                    }),
                  )
                }
              >
                Publicar agenda <ArrowUpRight size={17} />
              </Button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {view === "Hoje"
                  ? new Intl.DateTimeFormat("pt-BR", {
                      weekday: "long",
                      timeZone: tz,
                    })
                      .format(new Date())
                      .toUpperCase()
                  : "SEU NEGÓCIO, EM ORDEM"}
              </span>
              <h1>
                {view === "Hoje"
                  ? "Um bom dia começa aqui."
                  : view === "Pix"
                    ? "Pix e assinatura."
                    : view === "Mais"
                      ? "Do seu jeito."
                      : view + "."}
              </h1>
              <p>
                {
                  (
                    {
                      Hoje: "Um olhar claro para o que vem pela frente.",
                      Agenda: "Cada compromisso no seu lugar.",
                      Clientes: "Quem faz parte da sua história.",
                      Serviços: "O que você faz de melhor.",
                      Mais: "Os detalhes que deixam sua rotina mais simples.",
                      Pix: "Pague remotamente e acompanhe seu plano.",
                    } as Row
                  )[view]
                }
              </p>
            </div>
            {isAdmin && (view === "Hoje" || view === "Agenda") && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setModal("booking");
                }}
              >
                <Plus size={18} /> Novo agendamento
              </Button>
            )}
            {isAdmin && view === "Serviços" && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setModal("service");
                }}
              >
                <Plus size={18} /> Novo serviço
              </Button>
            )}
          </div>
          {(view === "Hoje" || view === "Agenda") && (
            <>
              <div className="stats-grid">
                {stats.map(({ label, value, icon: I }, i) => (
                  <article key={label}>
                    <div>
                      <span>{label}</span>
                      <I size={18} />
                    </div>
                    <strong>{value}</strong>
                    <small>
                      {i === 1
                        ? "Valores concluídos, não recebimentos"
                        : "No período selecionado"}
                    </small>
                  </article>
                ))}
              </div>
              <div className="agenda-layout">
                <section className="agenda-panel">
                  <div className="agenda-toolbar">
                    <div>
                      <button
                        className="icon-btn"
                        aria-label="Dia anterior"
                        onClick={() => shift(-1)}
                      >
                        <ChevronLeft size={19} />
                      </button>
                      <input
                        type="date"
                        aria-label="Data da agenda"
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                      />
                      <button
                        className="icon-btn"
                        aria-label="Próximo dia"
                        onClick={() => shift(1)}
                      >
                        <ChevronRight size={19} />
                      </button>
                      <button className="quiet" onClick={() => setDay(today())}>
                        Hoje
                      </button>
                    </div>
                    <div className="segmented">
                      <button
                        className={!week ? "selected" : ""}
                        onClick={() => setWeek(false)}
                      >
                        Dia
                      </button>
                      <button
                        className={week ? "selected" : ""}
                        onClick={() => setWeek(true)}
                      >
                        Semana
                      </button>
                    </div>
                  </div>
                  <div className="agenda-search">
                    <Search size={17} />
                    <input
                      placeholder="Buscar nome ou serviço"
                      aria-label="Buscar agendamentos"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <small>{filtered.length} compromissos</small>
                  </div>
                  <div className="appointment-list">
                    {filtered.length === 0 ? (
                      <div className="empty">
                        <CalendarDays size={30} />
                        <h3>Espaço para um novo encontro.</h3>
                        <p>Nenhum compromisso neste período.</p>
                      </div>
                    ) : (
                      filtered.map((b) => (
                        <div className="appointment-row" key={b.id}>
                          <div className="appointment-time">
                            <b>{timeLabel(b.starts_at, tz)}</b>
                            <small>
                              {week
                                ? dateLabel(b.starts_at, tz)
                                : `${b.duration} min`}
                            </small>
                          </div>
                          <div className={"appointment-line " + b.status} />
                          <div className="appointment-info">
                            <b>{b.customers?.name ?? "Horário bloqueado"}</b>
                            <span>{b.service_name}</span>
                            <small>
                              {
                                professionals.find(
                                  (p) => p.id === b.professional_id,
                                )?.name
                              }
                            </small>
                          </div>
                          <div className="appointment-right">
                            <span className={"status " + b.status}>
                              {statusLabel[b.status]}
                            </span>
                            <span>{money(b.price)}</span>
                          </div>
                          {(b.status === "confirmed" ||
                            (b.status === "blocked" && isAdmin)) && (
                            <button
                              className="icon-btn"
                              aria-label={
                                "Gerenciar reserva de " + b.customers?.name
                              }
                              onClick={() => {
                                setEditing(b);
                                setModal("status");
                              }}
                            >
                              <MoreHorizontal size={20} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="agenda-bottom">
                    <span className="live-dot" />{" "}
                    {demo
                      ? "Você está em uma demonstração."
                      : "Reservas persistidas no banco."}
                    <span>Uma coisa a menos para se preocupar.</span>
                  </div>
                </section>
                <aside className="day-aside">
                  <div className="share-card">
                    <span className="round-icon">
                      <LinkIcon size={21} />
                    </span>
                    <h3>
                      Sua agenda.
                      <br />A um link de distância.
                    </h3>
                    <p>
                      Compartilhe seu link e deixe seu cliente escolher o
                      próximo horário.
                    </p>
                    <div className="link-display">/a/{tenant.slug}</div>
                    <Button
                      onClick={() =>
                        demo
                          ? setMsg(
                              "Link ilustrativo. Crie uma conta para publicar sua agenda.",
                            )
                          : copy(publicUrl())
                      }
                    >
                      <Copy size={16} /> Copiar meu link
                    </Button>
                    <button
                      className="text-link"
                      onClick={() => {
                        if (demo)
                          setMsg(
                            "Crie uma conta para publicar sua página real.",
                          );
                        else
                          window.open(
                            publicUrl(),
                            "_blank",
                            "noopener,noreferrer",
                          );
                      }}
                    >
                      Ver página pública <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="small-tip">
                    <Sun size={20} />
                    <b>Uma rotina mais leve.</b>
                    <p>
                      Reserve também um tempo para você. Bloqueie intervalos em
                      Disponibilidade.
                    </p>
                    <button
                      className="text-link"
                      onClick={() => setView("Mais")}
                    >
                      Ajustar meus horários <ArrowRight size={15} />
                    </button>
                  </div>
                </aside>
              </div>
            </>
          )}
          {view === "Clientes" && (
            <section className="data-panel">
              <div className="agenda-search">
                <Search size={17} />
                <input
                  aria-label="Buscar clientes"
                  placeholder="Buscar por nome ou e-mail"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {customers
                .filter((c) =>
                  (c.name + " " + c.email)
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((c) => (
                  <div className="customer-row" key={c.id}>
                    <span className="avatar">{c.name[0]}</span>
                    <div>
                      <b>{c.name}</b>
                      <span>{c.email}</span>
                      <small>{c.phone}</small>
                    </div>
                    <span className="tiny-tag">Cliente</span>
                  </div>
                ))}
              {!customers.length && (
                <div className="empty">
                  <Users />
                  <h3>A primeira conexão vem aí.</h3>
                  <p>Os clientes aparecem aqui após o primeiro agendamento.</p>
                </div>
              )}
            </section>
          )}
          {view === "Serviços" && (
            <div className="service-grid">
              {services.map((s) => (
                <article
                  className={"service-card " + (!s.active ? "inactive" : "")}
                  key={s.id}
                >
                  <div className="section-top">
                    <span className="round-icon">
                      <Scissors size={20} />
                    </span>
                    <span className="status">
                      {s.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <h3>{s.name}</h3>
                  <p>
                    <Clock size={16} /> {s.duration} minutos <span>·</span>{" "}
                    {money(s.price)}
                  </p>
                  <small>
                    Intervalos: {s.buffer_before ?? 0} min antes ·{" "}
                    {s.buffer_after ?? 0} min depois
                  </small>
                  {isAdmin && (
                    <Button
                      onClick={() => {
                        setEditing(s);
                        setModal("service");
                      }}
                    >
                      Editar serviço <ArrowUpRight size={16} />
                    </Button>
                  )}
                </article>
              ))}
              {!services.length && (
                <Notice>Cadastre seu primeiro serviço para começar.</Notice>
              )}
            </div>
          )}
          {view === "Mais" && (
            <>
              {health.operator && (
                <a href="/operacao" className="full-link">
                  <ShieldCheck size={22} />
                  <div>
                    <b>Operação da plataforma</b>
                    <p>Conferir Pix recebidos e acompanhar negócios.</p>
                  </div>
                  <ArrowRight size={20} />
                </a>
              )}
              <div className="settings-grid">
                {[
                  {
                    icon: Clock,
                    title: "Disponibilidade",
                    text: "Expediente, pausas, férias e bloqueios.",
                    key: "availability",
                  },
                  {
                    icon: Users,
                    title: "Sua equipe",
                    text: "Convide profissionais e administradores.",
                    key: "team",
                  },
                  {
                    icon: Globe,
                    title: "Seu negócio",
                    text: "Endereço, políticas e página pública.",
                    key: "settings",
                  },
                  {
                    icon: LinkIcon,
                    title: "Compartilhar agenda",
                    text: "Link, WhatsApp e QR Code.",
                    key: "share",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Seus dados",
                    text: "Exporte os dados do seu negócio.",
                    key: "export",
                  },
                  {
                    icon: Mail,
                    title: "Conexões",
                    text: "Status de e-mail e pagamentos.",
                    key: "connections",
                  },
                ]
                  .filter(
                    (x) => isAdmin || ["share", "connections"].includes(x.key),
                  )
                  .map(({ icon: I, title, text, key }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedPro(professionals[0]?.id ?? "");
                        setModal(key);
                      }}
                    >
                      <span className="round-icon">
                        <I size={21} />
                      </span>
                      <h3>{title}</h3>
                      <p>{text}</p>
                      <ArrowUpRight size={20} />
                    </button>
                  ))}
              </div>
              {ownerRole && (
                <button className="full-link" onClick={() => setView("Pix")}>
                  <Wallet size={22} />
                  <div>
                    <b>Pix e assinatura</b>
                    <p>Planos, cobranças e pagamento remoto.</p>
                  </div>
                  <ArrowRight size={20} />
                </button>
              )}
            </>
          )}
          {view === "Pix" && (
            <>
              <Notice>
                {demo
                  ? "Pagamentos desabilitados na demonstração."
                  : health.pix
                    ? health.pixMode === "direct"
                      ? "Pix direto disponível. O responsável confirma o recebimento após conferir o extrato."
                      : "Mercado Pago conectado. A confirmação do provedor libera o plano."
                    : "Falta confirmar o titular e a cidade da chave Pix ou conectar um provedor para habilitar cobranças."}{" "}
                O Pix paga um mês e não renova automaticamente.
              </Notice>
              {health.operator &&
                health.runtime === "sites" &&
                health.pixMode === "direct" && (
                  <details className="pix-settings" open={!health.pix}>
                    <summary>
                      <Settings size={17} />
                      {health.pix
                        ? "Editar dados do meu Pix"
                        : "Configurar meu Pix para receber"}
                    </summary>
                    <p>
                      Chave já preenchida: <b>{PIX_KEY}</b>. Informe o titular e
                      a cidade conforme seu banco. Os clientes poderão pagar o
                      QR Code remotamente; você confere o extrato antes de
                      liberar o plano.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        action(async () => {
                          await api("pix-settings", {
                            name: f.get("name"),
                            city: f.get("city"),
                            registered: f.get("registered") === "on",
                          });
                          setHealth(await api("health"));
                          setMsg(
                            "Pix configurado. Agora você pode gerar QR Code e copia e cola.",
                          );
                        });
                      }}
                    >
                      <div className="form-row">
                        <Field label="Nome do titular da chave">
                          <input
                            name="name"
                            required
                            minLength={2}
                            maxLength={100}
                            defaultValue={health.pixReceiver ?? ""}
                            autoComplete="name"
                          />
                        </Field>
                        <Field label="Cidade da conta">
                          <input
                            name="city"
                            required
                            minLength={2}
                            maxLength={80}
                            defaultValue={health.pixCity ?? ""}
                            autoComplete="address-level2"
                          />
                        </Field>
                      </div>
                      <label className="checkbox">
                        <input name="registered" type="checkbox" required />
                        Confirmo que esta chave está cadastrada no meu banco e
                        posso receber nela.
                      </label>
                      <Button disabled={busy}>
                        Salvar e ativar Pix direto <Check size={17} />
                      </Button>
                    </form>
                  </details>
                )}
              <div className="pix-layout">
                <section className="data-panel padded">
                  <div className="section-top">
                    <span className="eyebrow">SEU PLANO</span>
                    <span className="status">
                      {statusLabel[sub.status] ?? sub.status}
                    </span>
                  </div>
                  <h2>
                    {sub.plan === "trial"
                      ? "14 dias para simplificar"
                      : (plans[sub.plan as "solo"]?.name ?? "Assinatura")}
                  </h2>
                  <p>
                    {sub.valid_until
                      ? "Acesso até " + dateLabel(sub.valid_until, tz)
                      : "Escolha um plano abaixo."}
                  </p>
                  <div className="plan-choices">
                    {Object.entries(plans).map(([k, p]) => (
                      <button
                        className={pixPlan === k ? "chosen" : ""}
                        key={k}
                        onClick={() => {
                          setPixPlan(k as "solo" | "team");
                          setPix(null);
                          setPixKey("");
                        }}
                      >
                        <span>
                          <b>{p.name}</b>
                          <small>
                            {p.professionals} profissional(is) · {p.bookings}{" "}
                            reservas/mês
                          </small>
                        </span>
                        <b>
                          {money(p.price)}
                          <small>/mês</small>
                        </b>
                      </button>
                    ))}
                  </div>
                  <Button
                    disabled={busy || demo || !ownerRole || !health.pix}
                    onClick={() =>
                      action(async () => {
                        const key = pixKey || crypto.randomUUID();
                        setPixKey(key);
                        setPix(
                          await api("pix", {
                            tenant: tenantId,
                            plan: pixPlan,
                            key,
                          }),
                        );
                      })
                    }
                  >
                    <Wallet size={18} />
                    {busy ? "Gerando Pix…" : "Gerar Pix para pagar remotamente"}
                  </Button>
                  <p className="muted small-text">
                    Ao gerar, você contrata um mês do plano selecionado. Sem
                    cobrança automática ou armazenamento de cartão.
                  </p>
                  {pix && (
                    <div className="pix-code">
                      <h3>Escaneie ou copie. Pague de onde estiver.</h3>
                      {pix.mode === "direct" && (
                        <div className="pix-direct-notice">
                          Pix direto para a chave informada. O plano será
                          liberado depois que o responsável conferir o
                          recebimento no banco. Clicar em “Já paguei” não
                          confirma a transferência.
                        </div>
                      )}
                      {pix.receiver && (
                        <div className="pix-receiver">
                          <small>Favorecido informado</small>
                          <b>{pix.receiver}</b>
                          <small>
                            {PIX_KEY} · {pix.city}
                          </small>
                        </div>
                      )}
                      {pix.image && (
                        <img
                          src={"data:image/png;base64," + pix.image}
                          width={220}
                          height={220}
                          alt="QR Code Pix da mensalidade"
                        />
                      )}
                      <textarea
                        readOnly
                        value={pix.code ?? ""}
                        aria-label="Código Pix copia e cola"
                      />
                      <Button onClick={() => copy(pix.code)}>
                        Copiar código Pix <Copy size={17} />
                      </Button>
                      <p>
                        {pix.mode === "direct"
                          ? "Esta referência fica no painel por 24 horas. O código Pix estático não expira no banco. Evite pagar duas vezes."
                          : "Válido até " +
                            timeLabel(pix.expires, tz) +
                            "."}{" "}
                        Confira o favorecido no seu banco antes de concluir.
                      </p>
                      <Button
                        disabled={busy}
                        onClick={() =>
                          action(async () => {
                            const p = await api("payment-status", {
                              tenant: tenantId,
                              id: String(pix.id),
                            });
                            setMsg(
                              p.status === "approved"
                                ? "Pagamento confirmado. Seu plano está ativo."
                                : p.mode === "direct"
                                  ? "O recebimento ainda não foi conferido pelo responsável."
                                  : "Pagamento ainda não confirmado pelo provedor.",
                            );
                          })
                        }
                      >
                        Já paguei · verificar confirmação
                      </Button>
                    </div>
                  )}
                  {sub.plan !== "trial" && ownerRole && (
                    <button
                      className="text-link danger"
                      disabled={demo || busy}
                      onClick={() =>
                        action(async () => {
                          await call("cancel_subscription", {
                            p_tenant: tenantId,
                          });
                          setMsg(
                            "Renovação encerrada. Acesso preservado até o fim do período pago.",
                          );
                        })
                      }
                    >
                      Encerrar assinatura ao fim do período
                    </button>
                  )}
                </section>
                <aside>
                  <div className="share-card">
                    <ShieldCheck size={26} />
                    <h3>
                      Clareza também
                      <br />
                      no pagamento.
                    </h3>
                    <p>
                      {health.pixMode === "direct"
                        ? "No Pix direto, o responsável confere o extrato e libera o plano pelo painel de operação."
                        : "A liberação depende da confirmação segura do provedor."}{" "}
                      Comprovantes e retorno de tela não ativam planos.
                    </p>
                    <hr />
                    <small>Chave Pix do responsável</small>
                    <p className="pix-reference">{PIX_KEY}</p>
                    <small>
                      {health.pixMode === "direct"
                        ? "O QR Code copia e cola é gerado com esta chave. Confira o titular mostrado pelo seu banco."
                        : "Com Mercado Pago conectado, o QR Code é gerado pela conta credenciada no provedor."}
                    </small>
                  </div>
                </aside>
              </div>
              <section className="data-panel padded">
                <h3>Histórico de cobranças</h3>
                {payments.length ? (
                  payments.map((p) => (
                    <div className="payment-row" key={p.id}>
                      <span>{dateLabel(p.created_at, tz)}</span>
                      <span>{plans[p.plan as "solo"]?.name}</span>
                      <b>{money(p.amount)}</b>
                      <span className="status">
                        {statusLabel[p.status] ?? p.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="muted">Nenhuma cobrança gerada.</p>
                )}
              </section>
            </>
          )}
        </main>
        <nav className="mobile-nav">
          {[
            { name: "Hoje", icon: Sun },
            { name: "Agenda", icon: CalendarDays },
            { name: "Clientes", icon: Users },
            { name: "Serviços", icon: Scissors },
            { name: "Mais", icon: Menu },
          ].map(({ name, icon: I }) => (
            <button
              className={view === name ? "active" : ""}
              key={name}
              onClick={() => setView(name)}
            >
              <I size={20} />
              <span>{name}</span>
            </button>
          ))}
        </nav>
      </div>
      {modal === "service" && (
        <Modal
          message={msg}
          title={editing ? "Editar serviço" : "Novo serviço"}
          onClose={() => setModal("")}
        >
          <form onSubmit={serviceSubmit}>
            <Field label="Nome do serviço">
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={editing?.name}
              />
            </Field>
            <div className="form-row">
              <Field label="Duração (minutos)">
                <input
                  name="duration"
                  type="number"
                  required
                  min={5}
                  max={480}
                  defaultValue={editing?.duration ?? 60}
                />
              </Field>
              <Field label="Preço (R$)">
                <input
                  name="price"
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  max={100000}
                  defaultValue={(editing?.price ?? 0) / 100}
                />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Intervalo antes (min)">
                <input
                  name="before"
                  type="number"
                  min={0}
                  max={120}
                  defaultValue={editing?.buffer_before ?? 0}
                />
              </Field>
              <Field label="Intervalo depois (min)">
                <input
                  name="after"
                  type="number"
                  min={0}
                  max={120}
                  defaultValue={editing?.buffer_after ?? 0}
                />
              </Field>
            </div>
            <label className="checkbox">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editing?.active ?? true}
              />{" "}
              Serviço ativo para novas reservas
            </label>
            <small>
              Preço e duração de reservas anteriores serão preservados.
            </small>
            <Button disabled={busy}>
              Salvar serviço <Check size={17} />
            </Button>
          </form>
        </Modal>
      )}
      {modal === "booking" && (
        <Modal
          message={msg}
          title="Novo agendamento"
          onClose={() => setModal("")}
        >
          <Booking
            slug={tenant.slug}
            manual
            demo={demo}
            demoServices={services}
            demoProfessionals={professionals}
            onDemo={(b) => {
              setBookings((x) => [...x, b]);
              setModal("");
            }}
            onBooked={() => {
              setModal("");
              load();
            }}
          />
        </Modal>
      )}
      {modal === "status" && editing && (
        <Modal
          message={msg}
          title="Gerenciar agendamento"
          onClose={() => setModal("")}
        >
          <p>
            <b>{editing.customers?.name}</b>
            <br />
            {editing.service_name} · {timeLabel(editing.starts_at, tz)}
          </p>
          <div className="action-stack">
            {(editing.status === "blocked"
              ? ["unblock"]
              : ["completed", "no_show", "cancelled"]
            ).map((s) => (
              <Button
                key={s}
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    if (demo)
                      setBookings((b) =>
                        s === "unblock"
                          ? b.filter((x) => x.id !== editing.id)
                          : b.map((x) =>
                              x.id === editing.id ? { ...x, status: s } : x,
                            ),
                      );
                    else if (s === "unblock")
                      await call("unblock_time", { p_id: editing.id });
                    else
                      await call("set_appointment_status", {
                        p_id: editing.id,
                        p_status: s,
                      });
                    setModal("");
                  })
                }
              >
                {s === "unblock"
                  ? "Desbloquear horário"
                  : s === "completed"
                    ? "Marcar concluído"
                    : s === "no_show"
                      ? "Registrar falta"
                      : "Cancelar reserva"}
              </Button>
            ))}
          </div>
          {isAdmin && editing.status === "confirmed" && (
            <>
              <hr />
              <h3>Reagendar sem perder a reserva</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  action(async () => {
                    const start = fromZonedTime(
                      String(f.get("start")),
                      tz,
                    ).toISOString();
                    if (demo)
                      setBookings((x) =>
                        x.map((b) =>
                          b.id === editing.id
                            ? {
                                ...b,
                                starts_at: start,
                                ends_at: new Date(
                                  new Date(start).getTime() +
                                    b.duration * 60000,
                                ).toISOString(),
                              }
                            : b,
                        ),
                      );
                    else
                      await api("staff-reschedule", { id: editing.id, start });
                    setModal("");
                    setMsg("Agendamento alterado.");
                  });
                }}
              >
                <Field label={"Novo horário — " + tz}>
                  <input
                    name="start"
                    type="datetime-local"
                    required
                    step={900}
                    defaultValue={formatInTimeZone(
                      new Date(editing.starts_at),
                      tz,
                      "yyyy-MM-dd'T'HH:mm",
                    )}
                  />
                </Field>
                <Button disabled={busy}>Confirmar novo horário</Button>
              </form>
              <p className="muted small-text">
                Se o novo horário estiver indisponível, o original será
                preservado.
              </p>
            </>
          )}
        </Modal>
      )}
      {modal === "availability" && (
        <Modal
          message={msg}
          title="Disponibilidade"
          onClose={() => setModal("")}
        >
          <Field label="Profissional">
            <select
              value={selectedPro}
              onChange={(e) => {
                setSelectedPro(e.target.value);
                setRules([]);
              }}
            >
              {professionals
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Field>
          <Button
            onClick={() =>
              action(async () => {
                if (demo)
                  setRules(
                    [1, 2, 3, 4, 5].map((weekday) => ({
                      weekday,
                      starts: "09:00",
                      ends: "18:00",
                    })),
                  );
                else {
                  const { data, error } = await supabase!
                    .from("availability")
                    .select("*")
                    .eq("professional_id", selectedPro)
                    .order("weekday");
                  if (error) throw error;
                  setRules(data ?? []);
                }
              })
            }
          >
            Carregar expediente atual
          </Button>
          <p className="muted small-text">
            Adicione dois intervalos no mesmo dia para deixar a pausa de almoço
            livre.
          </p>
          {rules.map((r, i) => (
            <div className="rule-row" key={i}>
              <select
                aria-label="Dia da semana"
                value={r.weekday}
                onChange={(e) =>
                  setRules((x) =>
                    x.map((a, j) =>
                      j === i ? { ...a, weekday: Number(e.target.value) } : a,
                    ),
                  )
                }
              >
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                  (s, k) => (
                    <option key={s} value={k}>
                      {s}
                    </option>
                  ),
                )}
              </select>
              <input
                aria-label="Início do expediente"
                type="time"
                value={r.starts}
                onChange={(e) =>
                  setRules((x) =>
                    x.map((a, j) =>
                      j === i ? { ...a, starts: e.target.value } : a,
                    ),
                  )
                }
              />
              <input
                aria-label="Fim do expediente"
                type="time"
                value={r.ends}
                onChange={(e) =>
                  setRules((x) =>
                    x.map((a, j) =>
                      j === i ? { ...a, ends: e.target.value } : a,
                    ),
                  )
                }
              />
              <button
                className="icon-btn"
                aria-label="Remover intervalo"
                onClick={() => setRules((x) => x.filter((_, j) => j !== i))}
              >
                <X size={17} />
              </button>
            </div>
          ))}
          <div className="action-stack">
            <Button
              onClick={() =>
                setRules((x) => [
                  ...x,
                  { weekday: 1, starts: "09:00", ends: "12:00" },
                ])
              }
            >
              Adicionar intervalo <Plus size={16} />
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                action(async () => {
                  if (!demo)
                    await call("save_availability", {
                      p_professional: selectedPro,
                      p_rules: rules.map(({ weekday, starts, ends }) => ({
                        weekday,
                        starts,
                        ends,
                      })),
                    });
                  setMsg("Expediente salvo.");
                  setModal("");
                })
              }
            >
              Salvar horários <Check size={17} />
            </Button>
          </div>
          <hr />
          <h3>Bloqueio pontual ou férias</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              action(async () => {
                if (!demo)
                  await call("block_time", {
                    p_professional: selectedPro,
                    p_start: fromZonedTime(
                      String(f.get("start")),
                      tz,
                    ).toISOString(),
                    p_end: fromZonedTime(
                      String(f.get("end")),
                      tz,
                    ).toISOString(),
                  });
                setMsg("Bloqueio registrado.");
                setModal("");
              });
            }}
          >
            <Field label={"Início — " + tz}>
              <input name="start" required type="datetime-local" />
            </Field>
            <Field label="Fim">
              <input name="end" required type="datetime-local" />
            </Field>
            <Button disabled={busy}>Bloquear horário</Button>
          </form>
        </Modal>
      )}
      {modal === "team" && (
        <Modal message={msg} title="Sua equipe" onClose={() => setModal("")}>
          {professionals.map((p) => (
            <div className="customer-row" key={p.id}>
              <span className="avatar">{p.name[0]}</span>
              <div>
                <b>{p.name}</b>
                <small>{p.active ? "Ativo" : "Inativo"}</small>
              </div>
              {ownerRole && p.active && (
                <button
                  disabled={busy || demo}
                  onClick={() =>
                    action(async () =>
                      call("deactivate_professional", { p_professional: p.id }),
                    )
                  }
                >
                  Desativar
                </button>
              )}
            </div>
          ))}
          {ownerRole && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                action(async () => {
                  if (demo)
                    throw Error(
                      "Convites reais estão desabilitados na demonstração.",
                    );
                  const r = await api("invite", {
                    tenant: tenantId,
                    email: f.get("email"),
                    role: f.get("role"),
                  });
                  setMsg("Compartilhe este convite com a pessoa: " + r.url);
                  setModal("");
                });
              }}
            >
              <Field label="E-mail da pessoa convidada">
                <input type="email" name="email" required />
              </Field>
              <Field label="Permissão">
                <select name="role">
                  <option value="professional">
                    Profissional · própria agenda
                  </option>
                  <option value="admin">Administrador · operação</option>
                </select>
              </Field>
              <Button disabled={busy}>
                Criar convite seguro <ArrowUpRight size={17} />
              </Button>
            </form>
          )}
        </Modal>
      )}
      {modal === "settings" && (
        <Modal message={msg} title="Seu negócio" onClose={() => setModal("")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              action(async () => {
                if (!demo)
                  await call("save_settings", {
                    p_tenant: tenantId,
                    p_name: f.get("name"),
                    p_address: f.get("address"),
                    p_notice: Number(f.get("notice")),
                    p_horizon: Number(f.get("horizon")),
                    p_cancel: Number(f.get("cancel")),
                  });
                setMsg("Configurações salvas.");
                setModal("");
              });
            }}
          >
            <Field label="Nome">
              <input
                name="name"
                minLength={2}
                maxLength={100}
                required
                defaultValue={tenant.name}
              />
            </Field>
            <Field label="Endereço ou instruções online">
              <input name="address" required defaultValue={tenant.address} />
            </Field>
            <Field label="Antecedência mínima (minutos)">
              <input
                name="notice"
                type="number"
                min={0}
                max={43200}
                defaultValue={tenant.min_notice ?? 120}
              />
            </Field>
            <Field label="Reservas com até quantos dias de antecedência?">
              <input
                name="horizon"
                type="number"
                min={1}
                max={365}
                defaultValue={tenant.horizon ?? 60}
              />
            </Field>
            <Field label="Prazo para cancelamento (horas antes)">
              <input
                name="cancel"
                type="number"
                min={0}
                max={168}
                defaultValue={tenant.cancel_hours ?? 24}
              />
            </Field>
            <Button disabled={busy || !ownerRole}>Salvar configurações</Button>
          </form>
          {ownerRole && (
            <>
              <hr />
              <h3>Identidade da página pública</h3>
              <p className="muted small-text">
                Arquivos de marca são públicos. Não envie documentos pessoais.
                PNG, JPEG ou WebP, até 2 MB cada.
              </p>
              <Field label="Cor de destaque acessível">
                <select
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                >
                  <option value="#004dff">Azul cobalto</option>
                  <option value="#0071e3">Azul clássico</option>
                  <option value="#267355">Verde</option>
                  <option value="#7251a1">Violeta</option>
                  <option value="#954f24">Terracota</option>
                </select>
              </Field>
              <Field label="Logo">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy || demo}
                  onChange={(e) => uploadBrand(e.target.files?.[0], "logo")}
                />
              </Field>
              <Field label="Capa">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy || demo}
                  onChange={(e) => uploadBrand(e.target.files?.[0], "cover")}
                />
              </Field>
              {(logo || cover) && (
                <p className="muted small-text">
                  Arquivo(s) selecionado(s): {logo ? "logo " : ""}
                  {cover ? "capa" : ""}
                </p>
              )}
              <Button
                disabled={busy || demo}
                onClick={() =>
                  action(async () => {
                    await call("save_branding", {
                      p_tenant: tenantId,
                      p_accent: accent,
                      p_logo: logo,
                      p_cover: cover,
                    });
                    setMsg("Identidade visual salva.");
                    setModal("");
                  })
                }
              >
                Salvar identidade
              </Button>
            </>
          )}
          {ownerRole && tenant.published && (
            <button
              className="text-link danger"
              onClick={() =>
                action(async () =>
                  call("publish_business", {
                    p_tenant: tenantId,
                    p_published: false,
                  }),
                )
              }
            >
              Suspender página pública
            </button>
          )}
        </Modal>
      )}
      {modal === "share" && (
        <Modal
          message={msg}
          title="Compartilhe sua agenda"
          onClose={() => setModal("")}
        >
          <p className="link-display">
            {typeof location !== "undefined" ? publicUrl() : ""}
          </p>
          <div className="action-stack">
            <Button onClick={() => copy(publicUrl())}>
              Copiar link <Copy size={17} />
            </Button>
            <Button
              disabled={demo}
              onClick={async () => {
                const url = await QRCode.toDataURL(publicUrl(), {
                  width: 600,
                  margin: 2,
                });
                const a = document.createElement("a");
                a.href = url;
                a.download = "minha-agenda.png";
                a.click();
              }}
            >
              Baixar QR Code <Download size={17} />
            </Button>
            <a
              className="button"
              target="_blank"
              rel="noreferrer"
              href={
                "https://wa.me/?text=" +
                encodeURIComponent(
                  "Agende seu horário: " +
                    (typeof location !== "undefined" ? publicUrl() : ""),
                )
              }
            >
              Compartilhar no WhatsApp <ExternalLink size={17} />
            </a>
          </div>
          <p className="muted">
            O WhatsApp abre uma conversa para você enviar. Não é envio
            automático.
          </p>
        </Modal>
      )}
      {modal === "connections" && (
        <Modal
          message={msg}
          title="Status das conexões"
          onClose={() => setModal("")}
        >
          {[
            ["Banco e autenticação", health.database],
            ["Pix · Mercado Pago", health.pix],
            ["Confirmações e lembretes · e-mail", health.email],
          ].map(([label, on]) => (
            <div className="connection-row" key={String(label)}>
              <b>{label}</b>
              <span className="status">
                {!demo && on ? "Configurado" : "Não conectado"}
              </span>
            </div>
          ))}
          <p className="muted">
            Configure segredos somente nas variáveis do servidor. As instruções
            estão no repositório. Mensagens pendentes ficam na fila até a
            conexão.
          </p>
        </Modal>
      )}
      {modal === "export" && (
        <Modal message={msg} title="Seus dados" onClose={() => setModal("")}>
          <p>
            Exporte os dados do seu negócio em JSON, incluindo clientes,
            serviços e compromissos. Guarde o arquivo em local privado.
          </p>
          <Button
            disabled={demo || busy || !ownerRole}
            onClick={() =>
              action(async () => {
                const data = await api("export?tenant=" + tenantId);
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "agenda-clara-dados.json";
                a.click();
                URL.revokeObjectURL(url);
              })
            }
          >
            Exportar dados <Download size={17} />
          </Button>
          <p className="muted">
            Exclusão de dados e encerramento da empresa: solicitação ao
            responsável da plataforma. O canal real deve ser configurado antes
            do lançamento.
          </p>
        </Modal>
      )}
    </div>
  );
}
function Booking({
  slug,
  manual = false,
  demo = false,
  demoServices: ds = [],
  demoProfessionals: dp = [],
  onDemo,
  onBooked,
}: {
  slug: string;
  manual?: boolean;
  demo?: boolean;
  demoServices?: Row[];
  demoProfessionals?: Row[];
  onDemo?: (b: Row) => void;
  onBooked?: () => void;
}) {
  const [biz, setBiz] = useState<Row | null>(
    demo
      ? {
          ...demoTenant,
          services: ds.filter((s) => s.active),
          professionals: dp,
        }
      : null,
  );
  const [service, setService] = useState("");
  const [pro, setPro] = useState("");
  const [day, setDay] = useState(today());
  const [slots, setSlots] = useState<Row[]>([]);
  const [slot, setSlot] = useState<Row | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [key, setKey] = useState("");
  const [success, setSuccess] = useState<Row | null>(null);
  useEffect(() => {
    setKey(crypto.randomUUID());
    if (demo) return;
    let current = true;
    api(
      "business?slug=" + encodeURIComponent(slug) + (manual ? "&manual=1" : ""),
    )
      .then((b) => {
        if (current) {
          setBiz(b);
          if (!b)
            setMsg(
              "Esta agenda não está publicada. Entre em contato com o estabelecimento.",
            );
        }
      })
      .catch((e) => {
        if (current) setMsg(e.message);
      });
    return () => {
      current = false;
    };
  }, [slug, demo]);
  useEffect(() => {
    if (biz?.services?.length === 1) setService(biz.services[0].id);
  }, [biz]);
  const s = biz?.services?.find((x: Row) => x.id === service);
  const tz = biz?.timezone ?? "America/Sao_Paulo";
  useEffect(() => {
    if (!service) return;
    let current = true;
    setSlot(null);
    setLoadingSlots(true);
    setMsg("");
    if (demo) {
      setSlots(
        ["09:00", "10:30", "13:00", "14:30", "16:00"].map((t) => ({
          starts_at: fromZonedTime(day + "T" + t, tz).toISOString(),
          professional_id: pro || dp[0]?.id,
        })),
      );
      setLoadingSlots(false);
      return;
    }
    api(
      `slots?slug=${encodeURIComponent(slug)}&service=${service}&day=${day}${pro ? "&professional=" + pro : ""}${manual ? "&manual=1" : ""}`,
    )
      .then((x) => {
        if (current) setSlots(x);
      })
      .catch((e) => {
        if (current) setMsg(e.message);
      })
      .finally(() => {
        if (current) setLoadingSlots(false);
      });
    return () => {
      current = false;
    };
  }, [service, pro, day, demo, slug, tz]);
  async function confirm() {
    if (!s || !slot) return;
    setBusy(true);
    setMsg("");
    try {
      if (demo) {
        onDemo?.({
          id: key,
          starts_at: slot.starts_at,
          ends_at: new Date(
            new Date(slot.starts_at).getTime() + s.duration * 60000,
          ).toISOString(),
          service_name: s.name,
          duration: s.duration,
          price: s.price,
          status: "confirmed",
          professional_id: slot.professional_id,
          customers: { name, email, phone },
        });
        return;
      }
      const result = await api("book", {
        slug,
        service,
        professional: slot.professional_id,
        start: slot.starts_at,
        name,
        email,
        phone,
        key,
        manual,
      });
      setSuccess(result);
      onBooked?.();
    } catch (e) {
      setMsg((e as Error).message);
      if ((e as Error).message.toLowerCase().includes("horário")) {
        setStep(1);
        api(
          `slots?slug=${encodeURIComponent(slug)}&service=${service}&day=${day}${pro ? "&professional=" + pro : ""}${manual ? "&manual=1" : ""}`,
        )
          .then(setSlots)
          .catch(() => {});
        setSlot(null);
      }
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <div className="booking-success">
        <span className="success-icon">
          <CheckCircle2 size={36} />
        </span>
        <h2>Seu horário está marcado.</h2>
        <p>
          {s.name} · {dateLabel(success.starts_at, tz)} às{" "}
          {timeLabel(success.starts_at, tz)}
        </p>
        <p className="muted">
          Protocolo: {success.id.slice(0, 8).toUpperCase()}. Guarde o link
          abaixo. Guarde este link. Confirmações por e-mail dependem do
          remetente conectado.
        </p>
        <a className="button" href={"/reserva/" + success.token}>
          Gerenciar minha reserva <ArrowRight size={17} />
        </a>
        <button
          onClick={() =>
            downloadIcs({
              id: success.id,
              service_name: s.name,
              starts_at: success.starts_at,
              ends_at: new Date(
                new Date(success.starts_at).getTime() + s.duration * 60000,
              ).toISOString(),
              address: biz?.address,
            })
          }
        >
          Adicionar ao calendário (ICS) <Download size={17} />
        </button>
        <p className="muted small-text">
          O arquivo ICS é uma cópia do compromisso; alterações futuras não são
          sincronizadas.
        </p>
      </div>
    );
  if (!biz)
    return <>{msg ? <Notice>{msg}</Notice> : <p>Carregando agenda…</p>}</>;
  return (
    <div
      className="booking-flow"
      style={{ "--blue": biz.accent ?? "#0071e3" } as CSSProperties}
    >
      {!manual && (
        <div className="public-business">
          {biz.cover_path && (
            <img
              className="business-cover"
              src={brandingUrl(biz.cover_path)}
              alt=""
            />
          )}
          <span className="avatar">
            {biz.logo_path ? (
              <img
                src={brandingUrl(biz.logo_path)}
                alt={"Logo de " + biz.name}
              />
            ) : (
              biz.name[0]
            )}
          </span>
          <span className="eyebrow">SEU PRÓXIMO ENCONTRO</span>
          <h1>{biz.name}</h1>
          <p>{biz.address}</p>
        </div>
      )}
      <div className="booking-progress">
        {["Serviço", "Horário", "Seus dados", "Confirmar"].map((x, i) => (
          <span
            key={x}
            className={step === i ? "current" : step > i ? "finished" : ""}
          >
            <b>{step > i ? <Check size={13} /> : i + 1}</b>
            {x}
          </span>
        ))}
      </div>
      {msg && <Notice>{msg}</Notice>}
      {step === 0 && (
        <>
          <h2>O que vamos agendar?</h2>
          <p className="muted">Escolha o serviço para seu próximo horário.</p>
          <div className="booking-options">
            {biz.services.map((x: Row) => (
              <button
                key={x.id}
                className={service === x.id ? "chosen" : ""}
                onClick={() => setService(x.id)}
              >
                <span>
                  <b>{x.name}</b>
                  <small>
                    <Clock size={14} /> {x.duration} minutos
                  </small>
                </span>
                <b>{money(x.price)}</b>
              </button>
            ))}
          </div>
          <Field label="Profissional">
            <select value={pro} onChange={(e) => setPro(e.target.value)}>
              <option value="">Primeiro disponível</option>
              {biz.professionals
                .filter((p: Row) => !p.services || p.services.includes(service))
                .map((p: Row) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Field>
          <Button disabled={!service} onClick={() => setStep(1)}>
            Escolher horário <ArrowRight size={17} />
          </Button>
        </>
      )}
      {step === 1 && (
        <>
          <h2>Qual o melhor momento?</h2>
          <Field label={"Data · fuso " + tz}>
            <input
              type="date"
              required
              min={formatInTimeZone(new Date(), tz, "yyyy-MM-dd")}
              max={new Date(Date.now() + (biz.horizon ?? 60) * 86400000)
                .toISOString()
                .slice(0, 10)}
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </Field>
          {loadingSlots ? (
            <p role="status">Consultando horários…</p>
          ) : slots.length ? (
            <div className="slot-grid">
              {slots.map((x, i) => (
                <button
                  className={slot === x ? "chosen" : ""}
                  key={x.starts_at + x.professional_id}
                  onClick={() => setSlot(x)}
                >
                  {timeLabel(x.starts_at, tz)}
                  <small>
                    {
                      biz.professionals.find(
                        (p: Row) => p.id === x.professional_id,
                      )?.name
                    }
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <Notice>
              Nenhum horário livre nesta data. Tente outro dia ou profissional.
            </Notice>
          )}
          <div className="section-top">
            <button onClick={() => setStep(0)}>Voltar</button>
            <Button disabled={!slot || loadingSlots} onClick={() => setStep(2)}>
              Continuar <ArrowRight size={17} />
            </Button>
          </div>
        </>
      )}
      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(3);
          }}
        >
          <h2>Como podemos falar com você?</h2>
          <Field label="Seu nome">
            <input
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="E-mail para confirmar e gerenciar a reserva">
            <input
              required
              type="email"
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Telefone (opcional)">
            <input
              type="tel"
              autoComplete="tel"
              maxLength={30}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <p className="muted small-text">
            Usaremos seus dados para organizar este atendimento. Nenhuma
            inscrição em marketing.{" "}
            <a href="/privacidade" target="_blank">
              Saiba sobre privacidade.
            </a>
          </p>
          <div className="section-top">
            <button type="button" onClick={() => setStep(1)}>
              Voltar
            </button>
            <Button>
              Revisar agendamento <ArrowRight size={17} />
            </Button>
          </div>
        </form>
      )}
      {step === 3 && (
        <>
          <h2>Tudo certo para o seu encontro?</h2>
          <div className="booking-review">
            <h3>{s?.name}</h3>
            <p>
              <CalendarDays size={17} /> {dateLabel(slot!.starts_at, tz)} às{" "}
              {timeLabel(slot!.starts_at, tz)}
            </p>
            <p>
              <Clock size={17} /> {s?.duration} minutos · {tz}
            </p>
            <p>
              <Users size={17} />{" "}
              {
                biz.professionals.find(
                  (p: Row) => p.id === slot!.professional_id,
                )?.name
              }
            </p>
            <p>{biz.address}</p>
            <hr />
            <div className="section-top">
              <span>Valor informado do serviço</span>
              <b>{money(s?.price ?? 0)}</b>
            </div>
            <small>
              O pagamento do atendimento é combinado com o estabelecimento. Este
              fluxo não cobra pelo serviço.
            </small>
          </div>
          <p className="muted small-text">
            Cancelamento e reagendamento até {biz.cancel_hours} horas antes do
            atendimento. Contato: {email}.
          </p>
          <div className="section-top">
            <button disabled={busy} onClick={() => setStep(2)}>
              Voltar
            </button>
            <Button disabled={busy} onClick={confirm}>
              {busy ? "Confirmando…" : "Confirmar agendamento"}
              <Check size={17} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
function downloadIcs(b: Row) {
  const stamp = (d: string) =>
    new Date(d)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const clean = (s: string) =>
    String(s ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/[,;]/g, (m) => "\\" + m)
      .replace(/\r/g, "");
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agenda Clara//PT-BR",
    "BEGIN:VEVENT",
    "UID:" + b.id + "@agenda-clara",
    "DTSTAMP:" + stamp(new Date().toISOString()),
    "DTSTART:" + stamp(b.starts_at),
    "DTEND:" + stamp(b.ends_at),
    "SUMMARY:" + clean(b.service_name),
    "LOCATION:" + clean(b.address),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "agendamento.ics";
  a.click();
  URL.revokeObjectURL(url);
}
function Manage({ token }: { token: string }) {
  const [b, setB] = useState<Row | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("");
  const [day, setDay] = useState(today());
  const [slots, setSlots] = useState<Row[]>([]);
  const [slot, setSlot] = useState("");
  const load = useCallback(
    () =>
      api("manage?token=" + encodeURIComponent(token))
        .then(setB)
        .catch((e) => setMsg(e.message)),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (mode === "reschedule" && b) {
      let current = true;
      api(
        `slots?slug=${encodeURIComponent(b.slug)}&service=${b.service_id}&professional=${b.professional_id}&day=${day}`,
      )
        .then((x) => {
          if (current) {
            setSlots(x);
            setSlot("");
          }
        })
        .catch((e) => setMsg(e.message));
      return () => {
        current = false;
      };
    }
  }, [mode, day, b]);
  async function act(action: string) {
    setBusy(true);
    try {
      await api("manage", {
        token,
        action,
        ...(action === "reschedule" ? { start: slot } : {}),
      });
      setMode("");
      setMsg(
        action === "cancel"
          ? "Reserva cancelada."
          : "Agendamento alterado com sucesso.",
      );
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="public-page">
      <header>
        <Brand />
      </header>
      <main className="public-card">
        {msg && <Notice>{msg}</Notice>}
        {b ? (
          <>
            <span className="eyebrow">
              SUA RESERVA · {b.id.slice(0, 8).toUpperCase()}
            </span>
            <h1>{b.business}</h1>
            <div className="booking-review">
              <h2>{b.service_name}</h2>
              <p>
                {dateLabel(b.starts_at, b.timezone)} às{" "}
                {timeLabel(b.starts_at, b.timezone)}
              </p>
              <p>
                {b.duration} minutos · {money(b.price)} · {b.timezone}
              </p>
              <p>{b.address}</p>
              <span className={"status " + b.status}>
                {statusLabel[b.status]}
              </span>
            </div>
            {b.status === "confirmed" && (
              <>
                <Button onClick={() => downloadIcs(b)}>
                  Adicionar ao calendário (ICS) <Download size={16} />
                </Button>
                <div className="form-row">
                  <button onClick={() => setMode("reschedule")}>
                    Reagendar reserva
                  </button>
                  <button className="danger" onClick={() => setMode("cancel")}>
                    Cancelar reserva
                  </button>
                </div>
                <p className="muted small-text">
                  Alterações até {b.cancel_hours} horas antes do atendimento. O
                  estabelecimento pode ajudar após esse prazo.
                </p>
              </>
            )}
            {mode === "cancel" && (
              <Notice>
                <p>Deseja cancelar esta reserva? Esta ação libera o horário.</p>
                <button disabled={busy} onClick={() => act("cancel")}>
                  Sim, cancelar reserva
                </button>
                <button onClick={() => setMode("")}>
                  Manter minha reserva
                </button>
              </Notice>
            )}
            {mode === "reschedule" && (
              <>
                <Field label="Nova data">
                  <input
                    type="date"
                    min={today()}
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  />
                </Field>
                <div className="slot-grid">
                  {slots.map((s) => (
                    <button
                      key={s.starts_at}
                      className={slot === s.starts_at ? "chosen" : ""}
                      onClick={() => setSlot(s.starts_at)}
                    >
                      {timeLabel(s.starts_at, b.timezone)}
                    </button>
                  ))}
                </div>
                {!slots.length && (
                  <p>Nenhum horário disponível. Tente outra data.</p>
                )}
                <Button
                  disabled={!slot || busy}
                  onClick={() => act("reschedule")}
                >
                  Confirmar novo horário
                </Button>
                <p className="muted">
                  Se o novo horário estiver ocupado, a reserva original será
                  preservada.
                </p>
              </>
            )}
          </>
        ) : (
          !msg && <p>Carregando sua reserva…</p>
        )}
      </main>
    </div>
  );
}
function Invite({ token }: { token: string }) {
  const [msg, setMsg] = useState("");
  const router = useRouter();
  return (
    <div className="public-page">
      <header>
        <Brand />
      </header>
      <main className="public-card">
        <h1>Um lugar na equipe.</h1>
        <p>
          Entre ou crie uma conta usando o mesmo e-mail do convite. Depois volte
          a este link para aceitar.
        </p>
        <div className="form-row">
          <a className="button" href="/entrar">
            Entrar
          </a>
          <a className="button" href="/cadastro">
            Criar conta
          </a>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await api("accept-invite", { token, name: f.get("name") });
              router.push("/painel");
            } catch (e) {
              setMsg((e as Error).message);
            }
          }}
        >
          <Field label="Seu nome profissional">
            <input name="name" required minLength={2} maxLength={100} />
          </Field>
          <Button>Aceitar convite</Button>
        </form>
        {msg && <Notice>{msg}</Notice>}
      </main>
    </div>
  );
}
function Legal({ page }: { page: string }) {
  const operator = process.env.NEXT_PUBLIC_OPERATOR_NAME;
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const retention = process.env.NEXT_PUBLIC_RETENTION_POLICY;
  return (
    <div className="public-page">
      <header>
        <Brand />
        <a href="/">Voltar ao início</a>
      </header>
      <main className="legal">
        <span className="eyebrow">TRANSPARÊNCIA DESDE O COMEÇO</span>
        <h1>
          {page === "termos"
            ? "Termos de uso"
            : page === "suporte"
              ? "Suporte"
              : "Privacidade"}
        </h1>
        {(!operator || !support || !retention) && (
          <Notice>
            Lançamento pendente: o responsável precisa completar identidade
            jurídica, contato real e política de retenção antes de abrir o
            serviço a clientes.
          </Notice>
        )}
        {operator && (
          <p>
            Responsável pela plataforma: {operator}
            {process.env.NEXT_PUBLIC_OPERATOR_DOCUMENT
              ? " · " + process.env.NEXT_PUBLIC_OPERATOR_DOCUMENT
              : ""}
            .
          </p>
        )}
        {support && (
          <p>
            Contato e direitos sobre dados:{" "}
            <a href={"mailto:" + support}>{support}</a>.
          </p>
        )}
        {page === "termos" ? (
          <>
            <h2>O serviço</h2>
            <p>
              A Agenda Clara organiza serviços, disponibilidade e reservas de
              estabelecimentos. Cada estabelecimento é responsável pelo
              atendimento, preço e política de cancelamento exibidos na sua
              página.
            </p>
            <h2>Planos e pagamentos</h2>
            <p>
              O teste dura 14 dias, sem cobrança automática. Solo custa R$49 e
              Equipe R$99 por mês. Pix é um pagamento mensal avulso. O Pix
              direto é confirmado pelo responsável após conferir o extrato;
              quando há provedor conectado, a confirmação pode ser automática
              pela API. Não há renovação automática. Reservas canceladas
              continuam na contagem mensal; reagendamentos não contam novamente.
              O período de uso começa no primeiro dia do mês em UTC ou no início
              do ciclo contratado, o que ocorrer depois.
            </p>
            <h2>Encerramento</h2>
            <p>
              O término do teste ou do período pago suspende novas reservas. Os
              registros anteriores são preservados para gerenciamento e
              exportação. Pedidos de exclusão devem ser tratados pelo
              responsável antes do encerramento definitivo.
            </p>
          </>
        ) : page === "privacidade" ? (
          <>
            <h2>Dados necessários</h2>
            <p>
              O agendamento utiliza nome, e-mail e telefone opcional. Esses
              dados permitem organizar o atendimento, enviar comunicações
              operacionais e fornecer o link seguro de gerenciamento. Não
              coletamos dados clínicos ou de cartão.
            </p>
            <h2>Acesso e fornecedores</h2>
            <p>
              O estabelecimento acessa seus próprios registros e restringe o
              acesso de profissionais à agenda necessária ao trabalho.{" "}
              {process.env.NEXT_PUBLIC_SITES_RUNTIME === "true"
                ? "Esta publicação utiliza banco D1 e armazenamento Cloudflare, com login administrativo gerenciado pelo ChatGPT."
                : "A implantação alternativa utiliza Supabase para banco e autenticação."}{" "}
              Mercado Pago pode ser conectado para confirmar mensalidades
              automaticamente; Resend é usado para e-mail quando configurado. No
              Pix direto, o responsável confere o extrato bancário antes de
              liberar o plano.
            </p>
            <h2>Seus direitos</h2>
            <p>
              Solicitações de acesso, correção, exportação ou exclusão devem ser
              feitas ao estabelecimento e ao responsável da plataforma, pelo
              contato informado nesta página. Dados operacionais não são
              inscrição em marketing.
            </p>
            <h2>Retenção</h2>
            <p>
              {retention ??
                "A política de retenção ainda precisa ser definida pelo responsável antes do lançamento."}
            </p>
            <h2>Armazenamento no dispositivo</h2>
            <p>
              A sessão de autenticação é mantida no navegador. O rascunho de
              configuração inicial fica temporariamente na sessão do navegador.
              Clientes e reservas reais são armazenados no banco, não no
              dispositivo.
            </p>
          </>
        ) : (
          <>
            <h2>Precisa de ajuda?</h2>
            <p>
              {support ? (
                <>
                  Envie sua solicitação para{" "}
                  <a href={"mailto:" + support}>{support}</a>.{" "}
                </>
              ) : (
                "O canal de suporte ainda não foi configurado. "
              )}
              Para questões sobre um atendimento, procure diretamente o
              estabelecimento informado na reserva.
            </p>
            <p>
              Para configurar a plataforma, consulte o README e os guias no
              repositório{" "}
              <a href="https://github.com/wll777z/Saas-agenda">Saas-agenda</a>.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
function Operations() {
  const [data, setData] = useState<Row | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api("operations")
      .then(setData)
      .catch((e) => setMsg(e.message));
  }, []);
  return (
    <div className="public-page">
      <header>
        <Brand />
        <a href="/painel">Meu painel</a>
      </header>
      <main className="operations">
        <span className="eyebrow">OPERAÇÃO DA PLATAFORMA</span>
        <h1>Uma visão clara do SaaS.</h1>
        <p>
          Metadados operacionais. Dados privados de clientes e reservas ficam
          restritos aos estabelecimentos.
        </p>
        {msg && <Notice>{msg}</Notice>}
        {data && (
          <>
            <div className="stats-grid">
              {[
                ["Empresas", data.tenants.length],
                [
                  "Assinaturas ativas",
                  data.subscriptions.filter((s: Row) => s.status === "active")
                    .length,
                ],
                ["E-mails com falha", data.failedJobs],
                ["Cobranças pendentes", data.pendingPayments],
              ].map(([label, value]) => (
                <article key={String(label)}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>
            <section className="data-panel padded">
              <h2>Estabelecimentos</h2>
              {data.tenants.map((t: Row) => (
                <div className="customer-row" key={t.id}>
                  <span className="avatar">{t.name[0]}</span>
                  <div>
                    <b>{t.name}</b>
                    <span>/a/{t.slug}</span>
                    <small>{dateLabel(t.created_at)}</small>
                  </div>
                  <span className="status">
                    {t.published ? "Publicado" : "Em configuração"}
                  </span>
                </div>
              ))}
            </section>
            {data.payments && (
              <section className="data-panel padded">
                <h2>Pix recebidos · conferência</h2>
                <p className="muted small-text">
                  Confira valor, remetente e referência no seu extrato antes de
                  aprovar. Nenhum pagamento é confirmado apenas pelo clique do
                  cliente.
                </p>
                {data.payments
                  .filter((p: Row) => p.mode === "direct")
                  .map((p: Row) => (
                    <div className="payment-review" key={p.id}>
                      <div className="section-top">
                        <b>
                          {p.business} · {plans[p.plan as "solo"]?.name}
                        </b>
                        <b>{money(p.amount)}</b>
                      </div>
                      <small>
                        {p.id} · {statusLabel[p.status] ?? p.status}
                      </small>
                      {p.status === "pending" && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                              await api("approve-payment", {
                                id: p.id,
                                confirmed: true,
                              });
                              setData(await api("operations"));
                              setMsg(
                                "Recebimento registrado. Plano liberado uma única vez.",
                              );
                            } catch (error) {
                              setMsg((error as Error).message);
                            }
                          }}
                        >
                          <label className="checkbox">
                            <input type="checkbox" required />
                            Conferi este recebimento no extrato do banco.
                          </label>
                          <Button>
                            Confirmar recebimento e liberar plano{" "}
                            <Check size={16} />
                          </Button>
                        </form>
                      )}
                    </div>
                  ))}
                {!data.payments.some((p: Row) => p.mode === "direct") && (
                  <p>Nenhuma cobrança Pix direta gerada.</p>
                )}
              </section>
            )}
            <Notice>
              Acesso excepcional de suporte a dados privados não é
              disponibilizado por este painel. Falhas precisam ser investigadas
              com acesso administrativo restrito e registro de auditoria.
            </Notice>
          </>
        )}
      </main>
    </div>
  );
}
export default function App() {
  const path = usePathname();
  if (path === "/operacao") return <Operations />;
  if (path === "/") return <LandingV2 />;
  if (path === "/agendar") return <Directory />;
  if (["/entrar", "/cadastro", "/recuperar"].includes(path))
    return process.env.NEXT_PUBLIC_SITES_RUNTIME === "true" ? (
      <HostedAuth mode={path.slice(1)} />
    ) : (
      <Auth mode={path.slice(1)} />
    );
  if (path === "/painel" || path === "/demo" || path === "/pix")
    return <Dashboard demo={path === "/demo"} />;
  if (path.startsWith("/a/"))
    return (
      <div className="public-page">
        <header>
          <Brand />
          <span className="tiny-tag">Agendamento online</span>
        </header>
        <main className="public-card">
          <Booking slug={decodeURIComponent(path.split("/")[2])} />
        </main>
        <p className="powered">
          Agendamento com clareza.{" "}
          <a href="/">
            Conheça a Agenda Clara <ArrowUpRight size={13} />
          </a>
        </p>
      </div>
    );
  if (path.startsWith("/reserva/"))
    return <Manage token={path.split("/")[2]} />;
  if (path.startsWith("/convite/"))
    return <Invite token={path.split("/")[2]} />;
  if (["/termos", "/privacidade", "/suporte"].includes(path))
    return <Legal page={path.slice(1)} />;
  return (
    <div className="public-page">
      <header>
        <Brand />
      </header>
      <main className="public-card">
        <h1>Este caminho não está na agenda.</h1>
        <a className="button" href="/">
          Voltar ao início
        </a>
      </main>
    </div>
  );
}
