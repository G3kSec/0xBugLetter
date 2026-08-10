"""
Valida el contenido de data/ antes de que un PR se mergee.

Chequea:
  - Schema de cada writeup (campos requeridos, tipos, enums, formato de fecha)
  - Que el nombre del archivo empiece con la misma fecha que declara adentro
  - URLs duplicadas entre writeups
  - Schema de sources.yaml
  - Alcanzabilidad de las URLs (sólo advertencia: muchos sitios bloquean CI)

Uso:
    python .github/scripts/validate.py           # schema
    python .github/scripts/validate.py --urls    # schema + chequeo de URLs
"""

import re
import sys
from pathlib import Path

import yaml

# La consola de Windows usa cp1252 por defecto y revienta con los emojis del
# output. Los runners de CI son UTF-8, pero esto tiene que correr en local.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"
WRITEUPS_DIR = DATA_DIR / "writeups"

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

errors: list[str] = []
warnings: list[str] = []


def error(where: str, message: str) -> None:
    errors.append(f"{where}: {message}")


def warn(where: str, message: str) -> None:
    warnings.append(f"{where}: {message}")


def load_taxonomy() -> dict:
    with open(DATA_DIR / "taxonomy.yaml", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def check_string(where: str, data: dict, key: str, required: bool = True) -> str | None:
    value = data.get(key)
    if value is None:
        if required:
            error(where, f'falta el campo requerido "{key}"')
        return None
    if not isinstance(value, str) or not value.strip():
        error(where, f'"{key}" tiene que ser un string no vacío')
        return None
    return value.strip()


def check_enum(where: str, data: dict, key: str, allowed: list[str]) -> None:
    value = check_string(where, data, key)
    if value is not None and value not in allowed:
        error(where, f'"{key}" = "{value}" no es válido. Permitidos: {", ".join(allowed)}')


def validate_writeup(path: Path, taxonomy: dict, seen_urls: dict[str, str]) -> None:
    where = path.name

    try:
        with open(path, encoding="utf-8") as handle:
            data = yaml.safe_load(handle)
    except yaml.YAMLError as exc:
        error(where, f"YAML inválido — {exc}")
        return

    if not isinstance(data, dict):
        error(where, "el archivo tiene que contener un objeto YAML")
        return

    check_string(where, data, "title")
    check_string(where, data, "author")
    check_string(where, data, "author_url", required=False)
    check_string(where, data, "source")
    check_string(where, data, "cwe", required=False)
    check_string(where, data, "program", required=False)
    check_string(where, data, "summary", required=False)

    check_enum(where, data, "bug_type", taxonomy["bug_types"])
    check_enum(where, data, "severity", taxonomy["severities"])
    check_enum(where, data, "platform", taxonomy["platforms"])

    date = check_string(where, data, "date")
    if date and not DATE_RE.match(date):
        error(where, f'"date" tiene que estar en formato YYYY-MM-DD (recibí "{date}")')
    elif date and not path.name.startswith(date):
        error(where, f'el nombre del archivo tiene que empezar con "{date}"')

    url = check_string(where, data, "url")
    if url:
        if not url.startswith(("http://", "https://")):
            error(where, '"url" tiene que empezar con http:// o https://')
        elif url in seen_urls:
            error(where, f"URL duplicada — ya está en {seen_urls[url]}")
        else:
            seen_urls[url] = path.name

    amount = data.get("bounty_amount")
    if amount is not None:
        if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount < 0:
            error(where, '"bounty_amount" tiene que ser un número positivo')
        elif data.get("is_paid") is not True:
            # Declarar un monto sin marcar is_paid es casi siempre un descuido,
            # y hace que el writeup quede afuera del filtro "Pagado".
            error(where, 'si declarás "bounty_amount" tenés que poner is_paid: true')

    is_paid = data.get("is_paid")
    if is_paid is not None and not isinstance(is_paid, bool):
        error(where, '"is_paid" tiene que ser true o false')

    tags = data.get("tags")
    if tags is None or not isinstance(tags, list) or not tags:
        error(where, '"tags" tiene que ser una lista con al menos un tag')
    elif not all(isinstance(tag, str) for tag in tags):
        error(where, "todos los tags tienen que ser strings")


def validate_sources(taxonomy: dict) -> list[str]:
    where = "sources.yaml"
    urls: list[str] = []

    with open(DATA_DIR / "sources.yaml", encoding="utf-8") as handle:
        config = yaml.safe_load(handle)

    sources = config.get("sources") if isinstance(config, dict) else None
    if not isinstance(sources, list):
        error(where, 'se esperaba una clave "sources" con una lista')
        return urls

    for index, source in enumerate(sources):
        label = f"{where}[{index}]"
        if not isinstance(source, dict):
            error(label, "cada fuente tiene que ser un objeto")
            continue

        check_string(label, source, "name")
        check_string(label, source, "site")
        check_string(label, source, "note", required=False)
        check_enum(label, source, "category", taxonomy["source_categories"])
        check_enum(label, source, "status", taxonomy["source_statuses"])

        if not isinstance(source.get("verified"), bool):
            error(label, '"verified" tiene que ser true o false')

        url = check_string(label, source, "url")
        if url and source.get("status") != "broken":
            urls.append(url)

    return urls


def check_urls(urls: list[str]) -> None:
    """Chequeo best-effort. Un 403 desde un runner de GitHub no significa que
    el link esté roto, así que esto nunca falla el build — sólo advierte."""
    try:
        import requests
    except ImportError:
        warn("urls", "requests no está instalado, se saltea el chequeo")
        return

    headers = {"User-Agent": "0xBugLetter-CI/1.0 (+https://github.com/G3kSec/0xBugLetter)"}

    for url in urls:
        try:
            response = requests.head(url, timeout=10, allow_redirects=True, headers=headers)
            if response.status_code >= 400:
                response = requests.get(url, timeout=10, headers=headers, stream=True)
            if response.status_code >= 400:
                warn("urls", f"{url} devolvió {response.status_code}")
        except Exception as exc:  # noqa: BLE001
            warn("urls", f"{url} no respondió — {exc}")


def main() -> int:
    taxonomy = load_taxonomy()
    seen_urls: dict[str, str] = {}

    writeups = sorted(WRITEUPS_DIR.glob("*.y*ml")) if WRITEUPS_DIR.exists() else []
    for path in writeups:
        validate_writeup(path, taxonomy, seen_urls)

    source_urls = validate_sources(taxonomy)

    if "--urls" in sys.argv:
        check_urls(list(seen_urls.keys()) + source_urls)

    print(f"Validados {len(writeups)} writeups y {len(source_urls)} fuentes activas.\n")

    for message in warnings:
        print(f"⚠️  {message}")

    if errors:
        print()
        for message in errors:
            print(f"❌ {message}")
        print(f"\n{len(errors)} error(es). El PR no puede mergearse así.")
        return 1

    print("✅ Todo el contenido es válido.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
