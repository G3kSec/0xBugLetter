# Contribuir a 0xBugLetter

Gracias por querer sumar. Hay tres tipos de contribución, ordenados por lo
seguido que pasan.

**La mayoría de las entradas del archivo las agrega el bot solo**, todos los
días, desde las fuentes marcadas `verified: true` en `data/sources.yaml` —
ver [bot/README.md](bot/README.md#classification-read-this-part) para cómo
funciona eso. Lo de acá abajo aplica cuando querés agregar algo que el bot no
va a encontrar solo (una fuente que todavía no está en la lista, un artículo
puntual, o corregir una clasificación que el bot adivinó mal).

---

## 1. Agregar un writeup a mano

### Criterio de inclusión

Esto es lo único que realmente importa, y es restrictivo a propósito. El valor
de un archivo curado está en lo que deja afuera.

**Se acepta:**

- Writeups de autores reconocidos en la comunidad, o con resultados
  demostrables: bounties pagados, CVEs asignados, reportes divulgados en
  plataformas oficiales.
- Research original de labs y equipos con trayectoria (PortSwigger, Assetnote,
  ProjectDiscovery, Detectify, y equivalentes).
- Episodios de podcast y charlas con contenido técnico verificable.

**No se acepta:**

- Artículos tipo «gané $10.000 en una semana» sin PoC, sin reporte público y
  sin nada que respalde el número.
- Contenido regenerado con IA que reexplica el OWASP Top 10 por enésima vez.
- Montos de bounty estimados, inferidos o «aproximados». Si el monto no es
  público, **el campo se deja vacío**. Un dato inventado envenena las métricas
  de todo el archivo.

### Cómo

1. Creá `data/writeups/YYYY-MM-DD-titulo-corto.yaml`. La fecha es la de
   publicación del artículo, no la de hoy — y tiene que coincidir con el campo
   `date` de adentro (el CI lo verifica).

2. Completá los campos:

```yaml
title: "Blind SSRF via PDF export"
author: "@handle"
author_url: "https://twitter.com/handle"   # opcional
date: "2026-07-15"
url: "https://ejemplo.com/writeup"
source: "HackerOne"

# Clasificación
bug_type: "SSRF"
severity: "High"
cwe: "CWE-918"                             # opcional

# Programa
platform: "HackerOne"
program: "Ejemplo Inc."                    # opcional

# Bounty — sólo si el monto es público
is_paid: true
bounty_amount: 5000
currency: "USD"

summary: "Una o dos frases propias, no el copy del artículo."  # opcional

tags:
  - "ssrf"
  - "pdf-export"
```

3. Validá localmente y abrí el PR:

```bash
python .github/scripts/validate.py
```

### Sobre `severity`

Para un reporte concreto, es la severidad que se le asignó. Para research que
describe una técnica, es el impacto típico de esa clase de bug. Si el artículo
es una guía o una reflexión sin un bug puntual, va `Info`.

---

## 2. Agregar o arreglar una fuente

Sumá un bloque a `data/sources.yaml`:

```yaml
- name: "Nombre de la fuente"
  url: "https://ejemplo.com/feed.xml"
  site: "https://ejemplo.com"
  category: blog          # blog | platform | researcher | podcast | news
  status: active          # active | stale | broken | no-feed
  verified: true          # ¿autor u organización reconocida?
  note: "Contexto opcional."
```

`verified: true` no es un detalle menor acá: es lo único que hace de filtro
de calidad antes de que el bot empiece a archivar de esa fuente
automáticamente. No lo marques así sin haber revisado quién publica ahí.

**Reportar un feed roto también cuenta**, y es la contribución más rápida de
revisar. Si una fuente marcada `broken` tiene URL nueva, cambiala y sacale la
marca. Si un feed no expone una URL propia por artículo (algunos hosts de
podcast hacen esto), el bot la salta automáticamente — mirá la nota de
Critical Thinking Podcast en `data/sources.yaml` como ejemplo de cómo
documentarlo.

---

## Corregir una entrada auto-archivada

El bot clasifica por keywords, no lee el artículo — se equivoca. Cualquier
YAML en `data/writeups/` que empiece con el comentario `# Auto-archived by
bot/index.py` viene sin revisión humana. Si `bug_type` o `severity` están
mal, o falta `bounty_amount` porque el bot no puede inferirlo, es un archivo
normal: editalo y mandá el PR, como cualquier otro cambio.

---

## 3. Cambios en el sitio

PR normal de desarrollo sobre `web/`. Antes de mandarlo:

```bash
cd web
npx tsc --noEmit
npx eslint .
npm run build
```

---

## Agregar un valor a la taxonomía

Las listas de `bug_type`, `severity` y `platform` están cerradas. Si cada
writeup inventa su propia categoría, los filtros dejan de servir para algo.

Para sumar un valor hay que tocar **dos archivos en el mismo PR**:

1. `data/taxonomy.yaml` — lo lee el validador de Python
2. `web/src/lib/types.ts` — lo lee el sitio

El build falla a propósito si las dos listas no coinciden. Eso es lo que
fuerza la discusión sobre si la categoría nueva hace falta.
