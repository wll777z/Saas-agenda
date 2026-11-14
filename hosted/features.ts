import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
type Row = Record<string, any>;
type Deps = {
  one: Function;
  rows: Function;
  stmt: Function;
  member: Function;
  audit: Function;
  iso: () => string;
};
export function featureHandlers({ one, rows, stmt, member, audit, iso }: Deps) {
  return async function (req: Request, env: any, path: string, body?: Row) {
    const db = env.DB,
      url = new URL(req.url);
    if (path === "customer") {
      const customerId = z
        .string()
        .uuid()
        .parse(req.method === "GET" ? url.searchParams.get("id") : body?.id);
      const customer = await one(
        db,
        "SELECT * FROM customers WHERE id=?",
        customerId,
      );
      if (!customer) throw Error("Cliente não encontrado");
      const m = await member(db, req, customer.tenant_id);
      const professional = m.role === "professional";
      if (
        professional &&
        !(await one(
          db,
          "SELECT 1 FROM appointments a JOIN professionals p ON p.id=a.professional_id WHERE a.customer_id=? AND p.user_id=?",
          customer.id,
          m.id,
        ))
      )
        throw Error("Acesso negado a este cliente");
      if (req.method === "POST") {
        if (professional)
          throw Error(
            "Somente proprietário ou administrador pode editar observações",
          );
        const notes = z.string().trim().max(2000).parse(body?.notes);
        await db.batch([
          stmt(
            db,
            "UPDATE customers SET notes=? WHERE id=? AND tenant_id=?",
            notes,
            customer.id,
            customer.tenant_id,
          ),
          audit(
            db,
            customer.tenant_id,
            m.id,
            "customer.notes_updated",
            customer.id,
          ),
        ]);
        return { saved: true };
      }
      const args = [customer.id, ...(professional ? [m.id] : [])];
      const where =
        "a.customer_id=?" + (professional ? " AND p.user_id=?" : "");
      const history = await rows(
        db,
        "SELECT a.id,a.service_name,a.starts_at,a.duration,a.price,a.status,p.name professional_name FROM appointments a JOIN professionals p ON p.id=a.professional_id WHERE " +
          where +
          " ORDER BY a.starts_at DESC LIMIT 200",
        ...args,
      );
      const stats = await one(
        db,
        "SELECT count(*) appointments,sum(CASE WHEN a.status='completed' THEN 1 ELSE 0 END) completed,sum(CASE WHEN a.status='cancelled' THEN 1 ELSE 0 END) cancelled,sum(CASE WHEN a.status='no_show' THEN 1 ELSE 0 END) no_show,coalesce(sum(CASE WHEN a.status='completed' THEN a.price ELSE 0 END),0) service_value FROM appointments a JOIN professionals p ON p.id=a.professional_id WHERE " +
          where,
        ...args,
      );
      const preferred = await rows(
        db,
        "SELECT a.service_name,count(*) visits FROM appointments a JOIN professionals p ON p.id=a.professional_id WHERE " +
          where +
          " AND a.status='completed' GROUP BY a.service_name ORDER BY visits DESC,a.service_name LIMIT 3",
        ...args,
      );
      return {
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          notes: customer.notes,
          whatsapp_opt_in: Boolean(customer.whatsapp_opt_in),
        },
        stats,
        preferred,
        history,
        can_edit: !professional,
        history_limit: 200,
      };
    }
    const tenant = z.string().uuid().parse(url.searchParams.get("tenant"));
    const m = await member(db, req, tenant);
    if (path === "updates") {
      const clause =
        m.role === "professional"
          ? " AND record_id IN(SELECT a.id FROM appointments a JOIN professionals p ON p.id=a.professional_id WHERE p.user_id=?)"
          : "";
      const args = [tenant, ...(m.role === "professional" ? [m.id] : [])];
      const revision = await one(
        db,
        "SELECT count(*) count,coalesce(max(created_at),'') latest FROM audit_log WHERE tenant_id=?" +
          clause,
        ...args,
      );
      const events = await rows(
        db,
        "SELECT event,record_id,created_at FROM audit_log WHERE tenant_id=?" +
          clause +
          " ORDER BY created_at DESC LIMIT 5",
        ...args,
      );
      return {
        revision: revision.count + ":" + revision.latest,
        events,
        checked_at: iso(),
        interval_seconds: 15,
      };
    }
    if (path === "reports") {
      if (m.role === "professional")
        throw Error(
          "Relatórios gerenciais são restritos ao proprietário e administrador",
        );
      const from = z.iso.date().parse(url.searchParams.get("from")),
        to = z.iso.date().parse(url.searchParams.get("to"));
      if (to < from) throw Error("Período inválido");
      const t = await one(
        db,
        "SELECT timezone FROM tenants WHERE id=?",
        tenant,
      );
      const next = new Date(to + "T12:00:00Z");
      next.setUTCDate(next.getUTCDate() + 1);
      const start = fromZonedTime(from + "T00:00:00", t.timezone).toISOString(),
        end = fromZonedTime(
          next.toISOString().slice(0, 10) + "T00:00:00",
          t.timezone,
        ).toISOString();
      const stats = await one(
        db,
        "SELECT count(*) total,coalesce(sum(CASE WHEN status='completed' THEN 1 ELSE 0 END),0) completed,coalesce(sum(CASE WHEN status='cancelled' THEN 1 ELSE 0 END),0) cancelled,coalesce(sum(CASE WHEN status='no_show' THEN 1 ELSE 0 END),0) noShow,coalesce(sum(CASE WHEN status='completed' THEN price ELSE 0 END),0) value FROM appointments WHERE tenant_id=? AND status<>'blocked' AND starts_at>=? AND starts_at<?",
        tenant,
        start,
        end,
      );
      const services = await rows(
        db,
        "SELECT service_name name,count(*) count,sum(price) value FROM appointments WHERE tenant_id=? AND status='completed' AND starts_at>=? AND starts_at<? GROUP BY service_name ORDER BY value DESC",
        tenant,
        start,
        end,
      );
      return { ...stats, services, from, to, timezone: t.timezone };
    }
    if (path === "setup") {
      if (m.role === "professional") return null;
      const t = await one(
        db,
        "SELECT name,slug,published FROM tenants WHERE id=?",
        tenant,
      );
      const service = Boolean(
        await one(
          db,
          "SELECT 1 FROM services WHERE tenant_id=? AND active=1",
          tenant,
        ),
      );
      const availability = Boolean(
        await one(
          db,
          "SELECT 1 FROM availability a JOIN professionals p ON p.id=a.professional_id WHERE a.tenant_id=? AND p.active=1",
          tenant,
        ),
      );
      return {
        steps: [
          {
            id: "services",
            title: "Cadastre seu primeiro serviço",
            done: service,
          },
          {
            id: "availability",
            title: "Revise dias e horários de atendimento",
            done: availability,
          },
          {
            id: "share",
            title: "Publique e compartilhe seu link",
            done: Boolean(t.published),
          },
        ],
        published: Boolean(t.published),
        can_publish: m.role === "owner",
        public_path: "/a/" + t.slug,
      };
    }
    throw Error("Rota não encontrada");
  };
}
