import { build } from "esbuild";
import { mkdir, writeFile, readFile, rm, copyFile, cp } from "node:fs/promises";
import { resolve } from "node:path";
await rm("dist", { recursive: true, force: true });
await mkdir("dist/client/assets", { recursive: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await build({
  entryPoints: ["preview/main.tsx"],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
  outdir: "dist/client/assets",
  entryNames: "agenda",
  assetNames: "[name]-[hash]",
  jsx: "automatic",
  alias: {
    "next/navigation": resolve("preview/navigation.ts"),
    "@/lib/supabase": resolve("hosted/client.ts"),
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_PREVIEW_ONLY": '"false"',
    "process.env.NEXT_PUBLIC_SITES_RUNTIME": '"true"',
    "process.env.NEXT_PUBLIC_SUPABASE_URL": '""',
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""',
    "process.env.NEXT_PUBLIC_OPERATOR_NAME": '""',
    "process.env.NEXT_PUBLIC_OPERATOR_DOCUMENT": '""',
    "process.env.NEXT_PUBLIC_SUPPORT_EMAIL": '""',
    "process.env.NEXT_PUBLIC_RETENTION_POLICY": '""',
  },
});
const js = await readFile("dist/client/assets/agenda.js", "utf8"),
  css = await readFile("dist/client/assets/agenda.css", "utf8");
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="theme-color" content="#ffffff"/><meta name="description" content="Seu dia em ordem. Seu tempo de volta. Agendamento online para profissionais e pequenos negócios."/><title>Agenda Clara — Seu tempo de volta</title><link rel="stylesheet" href="/assets/agenda.css"/></head><body><div id="root"></div><noscript>Ative o JavaScript para acessar a agenda.</noscript><script type="module" src="/assets/agenda.js"></script></body></html>`;
await build({
  entryPoints: ["hosted/worker.ts"],
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/server/index.js",
  plugins: [
    {
      name: "agenda-assets",
      setup(b) {
        b.onResolve({ filter: /^virtual:agenda-assets$/ }, () => ({
          path: "agenda-assets",
          namespace: "agenda",
        }));
        b.onLoad({ filter: /.*/, namespace: "agenda" }, () => ({
          contents:
            "export const html=" +
            JSON.stringify(html) +
            ";export const assets=" +
            JSON.stringify({
              "/assets/agenda.js": {
                content: js,
                type: "text/javascript; charset=utf-8",
              },
              "/assets/agenda.css": {
                content: css,
                type: "text/css; charset=utf-8",
              },
            }) +
            ";",
          loader: "js",
        }));
      },
    },
  ],
});
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
await cp("drizzle", "dist/drizzle", { recursive: true });
await writeFile(
  "dist/server/wrangler.json",
  JSON.stringify(
    {
      name: "agenda-clara",
      main: "index.js",
      compatibility_date: "2026-10-01",
      d1_databases: [
        {
          binding: "DB",
          database_name: "agenda-clara",
          database_id: "00000000-0000-0000-0000-000000000000",
          migrations_dir: "../drizzle",
        },
      ],
      r2_buckets: [{ binding: "BUCKET", bucket_name: "agenda-clara-branding" }],
    },
    null,
    2,
  ),
);
console.log("Sites Worker gerado com frontend, API, banco D1 e migração.");
