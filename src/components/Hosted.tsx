"use client";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Globe,
  Search,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/supabase";
export function HostedAuth({ mode }: { mode: string }) {
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    api("session")
      .then((u) => setSigned(Boolean(u)))
      .catch(() => {});
  }, []);
  return (
    <div className="hosted-auth">
      <a className="cl-brand" href="/">
        <CalendarDays size={23} />
        <span>
          agenda<b>clara</b>
          <i>.</i>
        </span>
      </a>
      <main>
        <span className="cl-eyebrow">SEU ESPAÇO, DO SEU JEITO</span>
        <h1>
          {mode === "recuperar" ? (
            <>
              Seu acesso,
              <br />
              <b>sempre com você.</b>
            </>
          ) : mode === "cadastro" ? (
            <>
              Seu próximo dia
              <br />
              <b>mais organizado.</b>
            </>
          ) : (
            <>
              Bom ter você
              <br />
              <b>de volta.</b>
            </>
          )}
        </h1>
        <p>
          {mode === "recuperar"
            ? "Nesta hospedagem, o acesso é feito pela sua conta ChatGPT. Recupere sua conta pelo fluxo de acesso do ChatGPT."
            : "Entre com sua conta ChatGPT para criar o negócio e administrar sua agenda. Seus clientes agendam sem criar conta."}
        </p>
        <a
          className="cl-button cl-button-primary"
          href={signed ? "/painel" : "/signin-with-chatgpt?return_to=%2Fpainel"}
          target="_top"
        >
          {signed
            ? "Abrir minha agenda"
            : mode === "cadastro"
              ? "Criar agenda com ChatGPT"
              : "Entrar com ChatGPT"}
          <ArrowRight size={18} />
        </a>
        <div className="hosted-auth-security">
          <ShieldCheck size={17} />
          <span>Login seguro. Reservas persistidas no servidor.</span>
        </div>
        <a className="cl-text-link" href="/agendar">
          Sou cliente. Quero agendar <ArrowUpRight size={16} />
        </a>
        <small>
          Ao continuar, consulte os <a href="/termos">termos</a> e a{" "}
          <a href="/privacidade">política de privacidade</a>.
        </small>
      </main>
    </div>
  );
}
export function Directory() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    api("directory")
      .then(setList)
      .catch((e) => setMsg(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="directory-page">
      <header>
        <a className="cl-brand" href="/">
          <CalendarDays size={23} />
          <span>
            agenda<b>clara</b>
            <i>.</i>
          </span>
        </a>
        <a href="/painel" className="cl-button cl-button-outline">
          Meu negócio <ArrowUpRight size={16} />
        </a>
      </header>
      <main>
        <span className="cl-eyebrow">SEU PRÓXIMO ENCONTRO</span>
        <h1>
          Encontre sua agenda.
          <br />
          <b>Escolha seu horário.</b>
        </h1>
        <p>Selecione o estabelecimento e reserve sem criar conta.</p>
        <div className="directory-search">
          <Search size={19} />
          <input
            aria-label="Buscar negócio"
            placeholder="Nome do negócio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <p role="status">Carregando agendas…</p>
        ) : msg ? (
          <div role="alert" className="notice">
            {msg}
          </div>
        ) : list.length ? (
          <div className="directory-grid">
            {list
              .filter((t) =>
                (t.name + " " + t.segment)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((t) => (
                <a href={"/a/" + t.slug} key={t.slug}>
                  <span className="directory-initial">{t.name[0]}</span>
                  <small>{t.segment}</small>
                  <h2>{t.name}</h2>
                  <p>{t.address}</p>
                  <span>
                    Escolher horário <ArrowRight size={17} />
                  </span>
                </a>
              ))}
          </div>
        ) : (
          <div className="directory-empty">
            <CalendarDays size={35} />
            <h2>A primeira agenda está chegando.</h2>
            <p>
              Nenhum negócio publicou horários ainda. Se você é o proprietário,
              configure seu negócio e publique a agenda pelo painel.
            </p>
            <a className="cl-button cl-button-primary" href="/painel">
              Configurar minha agenda <ArrowRight size={17} />
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
