/*
|--------------------------------------------------------------------------
| City WASH & Energy Portal
| Application Router
|--------------------------------------------------------------------------
|
| Routes:
|
|   /              → PAS Verification
|   /home          → Dashboard
|   /city-profile  → City Profile
|   /energy        → Energy Consumption
|
| Works both locally and on GitHub Pages:
|
|   Local:         http://127.0.0.1:8003/home
|   GitHub Pages:  https://givs01.github.io/Givs-002/home
|
|--------------------------------------------------------------------------
*/

import { renderVerification } from "../pages/verification.js";
import { renderHome } from "../pages/home.js";
import { renderCityProfile } from "../pages/city-profile.js";
import { renderEnergy } from "../pages/energy.js";


/*
|--------------------------------------------------------------------------
| Route Configuration
|--------------------------------------------------------------------------
*/

const ROUTES = {
  "/": {
    title: "ULB Verification",
    page: renderVerification
  },

  "/home": {
    title: "Dashboard",
    page: renderHome
  },

  "/city-profile": {
    title: "City Profile",
    page: renderCityProfile
  },

  "/energy": {
    title: "Energy Consumption",
    page: renderEnergy
  }
};


/*
|--------------------------------------------------------------------------
| Base Path
|--------------------------------------------------------------------------
|
| Local:         http://127.0.0.1:8003/              → ""
| GitHub Pages:  https://givs01.github.io/Givs-002/  → "/Givs-002"
|
| On a custom domain (no repository folder) this is "" automatically.
|
*/

export const BASE_PATH =
  window.location.hostname.endsWith("github.io")
    ? "/" + window.location.pathname.split("/")[1]
    : "";


/*
|--------------------------------------------------------------------------
| App route → browser URL
|--------------------------------------------------------------------------
|
| "/home" → "/Givs-002/home"   (GitHub Pages)
| "/home" → "/home"            (local)
|
*/

export function withBase(path) {
  const appRoute = normalizePath(path);

  return BASE_PATH + (appRoute === "/" ? "/" : appRoute);
}


/*
|--------------------------------------------------------------------------
| Route
|--------------------------------------------------------------------------
|
| Accepts either an app route ("/home") or a full browser path
| ("/Givs-002/home"). The base path is removed before matching.
|
*/

export async function route(root, path) {
  if (!root) {
    console.error("Router cannot render because app root is missing.");
    return;
  }

  const normalizedPath = normalizePath(path);
  const currentRoute = ROUTES[normalizedPath];

  if (!currentRoute) {
    renderNotFound(root);
    return;
  }

  document.title =
    `${currentRoute.title} | City WASH & Energy Portal`;

  /*
  |--------------------------------------------------------------------------
  | Show loading animation while the page is being prepared.
  |--------------------------------------------------------------------------
  */

  renderPageLoader(root);

  try {
    await currentRoute.page(root);
  } catch (error) {
    console.error("Route rendering error:", error);
    renderRouteError(root);
  }
}


/*
|--------------------------------------------------------------------------
| Normalize Path
|--------------------------------------------------------------------------
|
| "/Givs-002/"              → "/"
| "/Givs-002/home/"         → "/home"
| "/home?x=1#top"           → "/home"
|
*/

export function normalizePath(path) {
  if (!path) {
    return "/";
  }

  path = String(path);

  /* Remove query string and hash */
  path = path.split("?")[0].split("#")[0];

  /* Remove repository base path */
  if (
    BASE_PATH &&
    (path === BASE_PATH || path.startsWith(BASE_PATH + "/"))
  ) {
    path = path.slice(BASE_PATH.length);
  }

  /* Remove trailing slash */
  if (path.length > 1) {
    path = path.replace(/\/+$/, "");
  }

  /* Always start with / */
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  return path || "/";
}


/*
|--------------------------------------------------------------------------
| Page Loader
|--------------------------------------------------------------------------
*/

function renderPageLoader(root) {
  root.innerHTML = `
    <section
      class="flex min-h-[60vh] items-center justify-center"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="w-full max-w-md">

        <div
          class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
        >

          <div
            class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-portal-600"
            aria-hidden="true"
          ></div>

          <h2 class="mt-5 text-lg font-bold text-slate-900">
            Checking your data
          </h2>

          <p class="mt-2 text-sm leading-6 text-slate-500">
            Please wait while we securely check your assessment
            information from the server.
          </p>

          <div
            class="mt-5 flex items-center justify-center gap-1"
            aria-hidden="true"
          >
            <span
              class="h-2 w-2 animate-bounce rounded-full bg-portal-600"
            ></span>

            <span
              class="h-2 w-2 animate-bounce rounded-full bg-portal-600"
              style="animation-delay:150ms"
            ></span>

            <span
              class="h-2 w-2 animate-bounce rounded-full bg-portal-600"
              style="animation-delay:300ms"
            ></span>
          </div>

        </div>

      </div>
    </section>
  `;
}


/*
|--------------------------------------------------------------------------
| Route Error
|--------------------------------------------------------------------------
*/

function renderRouteError(root) {
  root.innerHTML = `
    <section
      class="flex min-h-[60vh] items-center justify-center"
    >
      <div class="w-full max-w-lg text-center">

        <div
          class="rounded-2xl border border-red-200 bg-white p-8 shadow-sm"
        >

          <div
            class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600"
          >
            !
          </div>

          <h2 class="mt-5 text-xl font-bold text-slate-900">
            Unable to load this page
          </h2>

          <p class="mt-2 text-sm leading-6 text-slate-500">
            We could not load the requested portal information.
            Please try again.
          </p>

          <button
            type="button"
            onclick="window.location.reload()"
            class="mt-6 inline-flex items-center justify-center rounded-lg bg-portal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-portal-700 focus:outline-none focus:ring-2 focus:ring-portal-500 focus:ring-offset-2"
          >
            Try Again
          </button>

        </div>

      </div>
    </section>
  `;
}


/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
|
| The "Back to Verification" button uses data-nav="/". Clicks on any
| [data-nav] element are handled centrally in main.js, which calls
| navigate() so the base path is applied correctly.
|
*/

function renderNotFound(root) {
  document.title =
    "Page Not Found | City WASH & Energy Portal";

  root.innerHTML = `
    <section
      class="flex min-h-[60vh] items-center justify-center"
    >
      <div class="w-full max-w-lg text-center">

        <div
          class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
        >

          <div class="text-5xl font-bold text-slate-200">
            404
          </div>

          <h2 class="mt-4 text-xl font-bold text-slate-900">
            Page not found
          </h2>

          <p class="mt-2 text-sm text-slate-500">
            The requested portal page could not be found.
          </p>

          <button
            type="button"
            data-nav="/"
            class="mt-6 inline-flex items-center justify-center rounded-lg bg-portal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-portal-700 focus:outline-none focus:ring-2 focus:ring-portal-500 focus:ring-offset-2"
          >
            Back to Verification
          </button>

        </div>

      </div>
    </section>
  `;
}