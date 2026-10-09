/*
|--------------------------------------------------------------------------
| City WASH & Energy Portal
| Application Router
|--------------------------------------------------------------------------
|
| Routes:
|
|   /               → PAS Verification
|   /home           → Dashboard
|   /city-profile  → City Profile
|   /energy        → Energy Consumption
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
| Router State
|--------------------------------------------------------------------------
*/

let appRoot = null;
let routerInitialized = false;

/*
|--------------------------------------------------------------------------
| Initialize Router
|--------------------------------------------------------------------------
*/

export function initRouter(root) {
  if (!root) {
    console.error("Router initialization failed: #app root not found.");
    return;
  }

  appRoot = root;

  if (!routerInitialized) {
    window.addEventListener("popstate", () => {
      route(appRoot, window.location.pathname);
    });

    routerInitialized = true;
  }

  route(appRoot, window.location.pathname);
}

/*
|--------------------------------------------------------------------------
| Navigate
|--------------------------------------------------------------------------
*/

export function navigate(path) {
  if (!appRoot) {
    console.error("Router has not been initialized.");
    return;
  }

  const normalizedPath = normalizePath(path);

  /*
  |--------------------------------------------------------------------------
  | Update browser URL without reloading the page
  |--------------------------------------------------------------------------
  */

  if (window.location.pathname !== normalizedPath) {
    window.history.pushState({}, "", normalizedPath);
  }

  /*
  |--------------------------------------------------------------------------
  | Render requested page
  |--------------------------------------------------------------------------
  */

  route(appRoot, normalizedPath);
}

/*
|--------------------------------------------------------------------------
| Route
|--------------------------------------------------------------------------
*/

export async function route(root, path) {
  /*
  |--------------------------------------------------------------------------
  | Remember application root
  |--------------------------------------------------------------------------
  */

  if (root) {
    appRoot = root;
  }

  if (!appRoot) {
    console.error("Router cannot render because app root is missing.");
    return;
  }

  const normalizedPath = normalizePath(path);
  const currentRoute = ROUTES[normalizedPath];

  /*
  |--------------------------------------------------------------------------
  | 404
  |--------------------------------------------------------------------------
  */

  if (!currentRoute) {
    renderNotFound(appRoot);
    return;
  }

  document.title =
    `${currentRoute.title} | City WASH & Energy Portal`;

  /*
  |--------------------------------------------------------------------------
  | Show loading state
  |--------------------------------------------------------------------------
  */

  renderPageLoader(appRoot);

  /*
  |--------------------------------------------------------------------------
  | Render page
  |--------------------------------------------------------------------------
  */

  try {
    await currentRoute.page(appRoot);
  } catch (error) {
    console.error("Route rendering error:", error);
    renderRouteError(appRoot);
  }
}

/*
|--------------------------------------------------------------------------
| Normalize Path
|--------------------------------------------------------------------------
*/

function normalizePath(path) {
  if (!path) {
    return "/";
  }

  path = String(path);

  /*
  |--------------------------------------------------------------------------
  | Remove query string
  |--------------------------------------------------------------------------
  */

  path = path.split("?")[0];

  /*
  |--------------------------------------------------------------------------
  | Remove hash
  |--------------------------------------------------------------------------
  */

  path = path.split("#")[0];

  /*
  |--------------------------------------------------------------------------
  | Remove trailing slash
  |--------------------------------------------------------------------------
  */

  if (path.length > 1) {
    path = path.replace(/\/+$/, "");
  }

  /*
  |--------------------------------------------------------------------------
  | Always start with /
  |--------------------------------------------------------------------------
  */

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

  const button = root.querySelector("[data-nav='/']");

  if (button) {
    button.addEventListener("click", () => {
      navigate("/");
    });
  }
}

/*
|--------------------------------------------------------------------------
| Automatic Application Startup
|--------------------------------------------------------------------------
|
| This is the part your previous router was missing.
|
|--------------------------------------------------------------------------
*/

function startApplication() {
  /*
  |--------------------------------------------------------------------------
  | Find application mount point
  |--------------------------------------------------------------------------
  */

  const root =
    document.getElementById("app") ||
    document.getElementById("root");

  if (!root) {
    console.error(
      'City WASH Portal: Could not find application root. Expected element with id="app" or id="root".'
    );

    return;
  }

  initRouter(root);
}

/*
|--------------------------------------------------------------------------
| Start after DOM is ready
|--------------------------------------------------------------------------
*/

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startApplication,
    { once: true }
  );
} else {
  startApplication();
}
