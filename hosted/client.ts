import QRCode from "qrcode";
export const configured = true;
export async function api(path: string, body?: unknown, method?: string) {
  const response = await fetch("/api/" + path, {
    method: method ?? (body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error ?? "Não foi possível concluir. Tente novamente.",
    );
  if (path === "pix" && result.code && !result.image) {
    result.image = (
      await QRCode.toDataURL(result.code, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: "M",
      })
    ).split(",")[1];
  }
  return result;
}
class Query implements PromiseLike<any> {
  table: string;
  filters: Record<string, unknown> = {};
  sorting: any = null;
  range: Record<string, string> = {};
  singleRow = false;
  columns = "*";
  constructor(table: string) {
    this.table = table;
  }
  select(columns = "*") {
    this.columns = columns;
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters[key] = value;
    return this;
  }
  gte(key: string, value: string) {
    if (key === "starts_at") this.range.from = value;
    return this;
  }
  lt(key: string, value: string) {
    if (key === "starts_at") this.range.to = value;
    return this;
  }
  order(key: string, options?: any) {
    this.sorting = { key, ascending: options?.ascending ?? true };
    return this;
  }
  maybeSingle() {
    this.singleRow = true;
    return this;
  }
  single() {
    this.singleRow = true;
    return this;
  }
  then<TResult1 = any, TResult2 = never>(
    resolve?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return api("data/query", {
      table: this.table,
      filters: this.filters,
      range: this.range,
      sorting: this.sorting,
      columns: this.columns,
      single: this.singleRow,
    })
      .then((data) => ({ data, error: null }))
      .catch((error) => ({ data: null, error }))
      .then(resolve, reject);
  }
}
export const supabase: any = {
  auth: {
    getSession: async () => ({
      data: {
        session: await api("session").then((user) => (user ? { user } : null)),
      },
    }),
    signOut: async () => {
      location.assign("/signout-with-chatgpt?return_to=%2F");
      return { error: null };
    },
    signInWithPassword: async () => ({
      error: new Error("Use o botão Entrar com ChatGPT."),
    }),
    signUp: async () => ({
      error: new Error("Use o botão Criar agenda com ChatGPT."),
    }),
    resetPasswordForEmail: async () => ({
      error: new Error("Seu acesso é gerenciado pela sua conta ChatGPT."),
    }),
    updateUser: async () => ({
      error: new Error("Gerencie seu acesso na sua conta ChatGPT."),
    }),
  },
  from: (table: string) => new Query(table),
  rpc: async (name: string, args: any) =>
    api("data/rpc", { name, args })
      .then((data) => ({ data, error: null }))
      .catch((error) => ({ data: null, error })),
  storage: {
    from: () => ({
      upload: async (path: string, file: File) => {
        try {
          const response = await fetch(
            "/api/branding?path=" + encodeURIComponent(path),
            {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            },
          );
          const data = await response.json();
          return response.ok
            ? { data, error: null }
            : { data: null, error: new Error(data.error) };
        } catch (error) {
          return { data: null, error };
        }
      },
    }),
  },
};
