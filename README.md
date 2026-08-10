# 0xBugLetter

[![Daily Post](https://github.com/G3kSec/0xBugLetter/actions/workflows/post.yml/badge.svg)](https://github.com/G3kSec/0xBugLetter/actions/workflows/post.yml)
[![Validate](https://github.com/G3kSec/0xBugLetter/actions/workflows/validate.yml/badge.svg)](https://github.com/G3kSec/0xBugLetter/actions/workflows/validate.yml)

Archivo curado de writeups y research de bug bounty, más un bot que avisa
en Discord cuando sale algo nuevo.

Todo el contenido vive en el repositorio como YAML. No hay base de datos ni
panel de administración: se contribuye por pull request y el historial de
cambios es el historial de git.

## Estructura

```
├── web/          Sitio Next.js (SSG). Lee data/ en build-time.
├── data/         El contenido. Esto es lo que se contribuye.
│   ├── writeups/     Un archivo YAML por writeup curado
│   ├── sources.yaml  Feeds RSS que monitorea el bot
│   └── taxonomy.yaml Listas cerradas de bug types, severidades, etc.
├── bot/          Bot de Discord (Python). Corre como GitHub Action.
└── .github/
    ├── workflows/    post.yml (bot diario) · validate.yml (CI de PRs)
    └── scripts/      start.sh (bot) · validate.py (validador de contenido)
```

## Desarrollo

```bash
cd web && npm install && npm run dev
```

El sitio queda en `http://localhost:3000`. Los datos se leen desde `../data`,
así que agregar un YAML se refleja al recargar.

Validar el contenido antes de mandar un PR:

```bash
python .github/scripts/validate.py
```

Con `--urls` además chequea que los links respondan.

## Contribuir

La forma más común es agregar un writeup: creás un archivo en
`data/writeups/` y abrís un PR. El CI valida el schema, que la fecha coincida
con el nombre del archivo y que la URL no esté duplicada.

El criterio de inclusión está en [CONTRIBUTING.md](CONTRIBUTING.md) y es
intencionalmente restrictivo — el valor del archivo está en lo que deja afuera.

## El bot

Corre a la 01:00 UTC y publica hasta 3 artículos nuevos por día en Discord.
Para usarlo en tu propio servidor, forkeá el repo y agregá el secret
`DISCORD_WEBHOOK`. Las instrucciones completas están en `/setup` del sitio.

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · Python 3.11 · GitHub Actions
