"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "0xbl-theme";

/**
 * El tema es estado externo a React: vive en localStorage y en la media query
 * del sistema. `useSyncExternalStore` es la forma correcta de leerlo — durante
 * la hidratación devuelve `null`, así que el markup del servidor y el del
 * cliente coinciden, y recién después aparece el valor real.
 */

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  // `storage` sincroniza el cambio entre pestañas abiertas.
  media.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);

  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** En el servidor no hay forma de saber el tema. */
function getServerSnapshot(): Theme | null {
  return null;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Único efecto legítimo: empujar el estado de React al DOM, que es el
  // sistema externo. Sin setState acá.
  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function toggle() {
    localStorage.setItem(STORAGE_KEY, theme === "dark" ? "light" : "dark");
    for (const listener of listeners) listener();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // Durante la hidratación todavía no sabemos el tema; anunciar el
      // opuesto equivocado confundiría a quien use lector de pantalla.
      aria-label={
        theme ? `Cambiar a tema ${theme === "dark" ? "claro" : "oscuro"}` : "Cambiar tema"
      }
      className="grid size-8 place-items-center rounded-sm border border-line-subtle text-ink-3 transition-colors hover:border-line hover:text-ink"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="size-4"
        aria-hidden="true"
      >
        {theme === "dark" ? (
          <>
            <circle cx="8" cy="8" r="3.1" />
            <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.95 3.05l-1.13 1.13M4.18 11.82l-1.13 1.13M12.95 12.95l-1.13-1.13M4.18 4.18L3.05 3.05" />
          </>
        ) : (
          <path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z" />
        )}
      </svg>
    </button>
  );
}
