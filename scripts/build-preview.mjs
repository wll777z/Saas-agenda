import {build} from 'esbuild';
import {mkdir,writeFile,readFile,rm,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
await rm('dist',{recursive:true,force:true});await mkdir('dist/assets',{recursive:true});
await build({entryPoints:['preview/main.tsx'],bundle:true,minify:true,format:'esm',target:'es2022',outdir:'dist/assets',entryNames:'agenda',assetNames:'[name]-[hash]',jsx:'automatic',alias:{'next/navigation':resolve('preview/navigation.ts')},define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_PREVIEW_ONLY':'"true"','process.env.NEXT_PUBLIC_SUPABASE_URL':'""','process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':'""','process.env.NEXT_PUBLIC_OPERATOR_NAME':'""','process.env.NEXT_PUBLIC_OPERATOR_DOCUMENT':'""','process.env.NEXT_PUBLIC_SUPPORT_EMAIL':'""','process.env.NEXT_PUBLIC_RETENTION_POLICY':'""'}});
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="theme-color" content="#fdfdfd"/><meta name="description" content="Agenda Clara — Sua agenda organizada, seu dia mais leve. Conheça o site e navegue pela demonstração."/><title>Agenda Clara — Sua agenda organizada</title><link rel="stylesheet" href="/assets/agenda.css"/></head><body><div id="root"></div><noscript>Ative o JavaScript para navegar na Agenda Clara.</noscript><script type="module" src="/assets/agenda.js"></script></body></html>`;
await writeFile('dist/index.html',html);
for(const path of ['demo','cadastro','entrar','recuperar','painel','termos','privacidade','suporte','operacao']){await mkdir('dist/'+path,{recursive:true});await writeFile('dist/'+path+'/index.html',html)}
console.log('Prévia estática construída com o mesmo código React da aplicação.');
