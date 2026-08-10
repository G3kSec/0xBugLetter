import type { Metadata } from "next";

import { CodeBlock, Step } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Configurar el bot",
  description:
    "Cómo conectar el bot de 0xBugLetter a tu servidor de Discord con un webhook y un GitHub Action.",
};

export default function SetupPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <p className="label mb-1.5">Bot</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Recibir los writeups en Discord
        </h1>
        <p className="mt-2 max-w-[62ch] text-ink-2">
          El bot corre como GitHub Action, revisa los feeds una vez por día y
          publica lo nuevo en un canal de Discord. No necesita servidor ni
          hosting: corre en la infraestructura gratuita de Actions.
        </p>
      </header>

      <ol className="flex flex-col gap-6">
        <Step n={1} title="Creá un webhook en tu servidor">
          <p>
            En Discord: <strong className="text-ink">Configuración del canal → Integraciones → Webhooks → Nuevo webhook</strong>.
            Ponele un nombre, elegí el canal donde querés los posts y copiá la URL.
          </p>
          <p className="rounded-sm border border-medium/30 bg-medium-bg px-3 py-2 text-medium">
            Esa URL es una credencial. Cualquiera que la tenga puede publicar en
            tu canal — no la pegues en un issue ni la commitees.
          </p>
        </Step>

        <Step n={2} title="Forkeá el repositorio">
          <p>
            Hacé un fork de{" "}
            <a
              href="https://github.com/G3kSec/0xBugLetter"
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent hover:underline"
            >
              G3kSec/0xBugLetter
            </a>
            . El workflow ya viene configurado; sólo le falta la credencial.
          </p>
        </Step>

        <Step n={3} title="Guardá el webhook como secret">
          <p>
            En tu fork:{" "}
            <strong className="text-ink">
              Settings → Secrets and variables → Actions → New repository secret
            </strong>
            .
          </p>
          <CodeBlock title="Secret">
            {`Name:   DISCORD_WEBHOOK
Value:  https://discord.com/api/webhooks/...`}
          </CodeBlock>
        </Step>

        <Step n={4} title="Ajustá la frecuencia (opcional)">
          <p>
            Por defecto corre a la 01:00 UTC y manda hasta 3 artículos por día.
            Se cambia en el workflow:
          </p>
          <CodeBlock title=".github/workflows/post.yml">
            {`on:
  schedule:
    - cron: "0 1 * * *"   # diario, 01:00 UTC
  workflow_dispatch:       # también se puede disparar a mano`}
          </CodeBlock>
          <p>
            El tope diario está en{" "}
            <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
              MAX_DAILY
            </code>{" "}
            dentro de{" "}
            <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
              bot/index.py
            </code>
            .
          </p>
        </Step>

        <Step n={5} title="Probalo">
          <p>
            Andá a la pestaña <strong className="text-ink">Actions</strong> de tu
            fork, elegí el workflow <em>Daily Post</em> y corré{" "}
            <strong className="text-ink">Run workflow</strong>. Si el webhook está
            bien, en unos segundos aparecen los posts en tu canal.
          </p>
        </Step>
      </ol>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Cómo evita repetidos</h2>
        <p className="mt-2 max-w-[62ch] text-ink-2">
          Cada URL publicada se guarda en{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            bot/sent_urls.txt
          </code>{" "}
          y el Action commitea el archivo actualizado al terminar. Por eso el
          workflow necesita permiso de escritura:
        </p>
        <div className="mt-3">
          <CodeBlock title=".github/workflows/post.yml">
            {`permissions:
  contents: write`}
          </CodeBlock>
        </div>
      </section>

      <section className="mt-10 rounded-md border border-line-subtle bg-surface p-5">
        <h2 className="font-semibold tracking-tight">
          ¿Querés que se publique en otro lado?
        </h2>
        <p className="mt-1.5 max-w-[60ch] text-sm text-ink-2">
          Hoy el bot sólo soporta Discord. La lógica de envío está aislada en{" "}
          <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs">
            bot/index.py
          </code>
          , así que agregar otro destino es acotado — y se agradece el PR.
        </p>
      </section>
    </div>
  );
}
