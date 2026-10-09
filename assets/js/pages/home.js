
/*
|--------------------------------------------------------------------------
| City WASH & Energy Portal
| Home / Dashboard
|--------------------------------------------------------------------------
|
| Responsibilities:
| - Load verified ULB context
| - Load City Profile status
| - Show compact dashboard summary
| - Provide workflow navigation
|
|--------------------------------------------------------------------------
*/

import {
  getCityProfile
} from "../api/client.js";

import {
  getVerifiedContext
} from "../app/session.js";

import {
  navigate
} from "../app/main.js";


/*
|--------------------------------------------------------------------------
| Render Home
|--------------------------------------------------------------------------
*/

export async function renderHome(root) {
  const context = getVerifiedContext();

  if (!context) {
    redirectToVerification();
    return;
  }

  root.innerHTML = renderLoading();

  let cityProfile = null;

  try {
    cityProfile = await loadCityProfileStatus(context);
  } catch (error) {
    console.error("Unable to load dashboard data:", error);
    root.innerHTML = renderError();
    return;
  }

  root.innerHTML = renderDashboard(context, cityProfile);

  attachHomeEvents(root);
}


/*
|--------------------------------------------------------------------------
| Load City Profile
|--------------------------------------------------------------------------
*/

async function loadCityProfileStatus(context) {
  const response = await getCityProfile(
    context.ulbId,
    context.year
  );

  if (!response?.success) {
    throw new Error(
      response?.message || "Unable to load City Profile."
    );
  }

  /*
   * No City Profile means the user is starting for the first time.
   * In that case ULB information must come from the verified session.
   */
  if (!response.data) {
    return null;
  }

  return response.data;
}


/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

function renderDashboard(context, cityProfile) {

  /*
   * ------------------------------------------------------------
   * City Profile status
   * ------------------------------------------------------------
   */

  const profileStatus = getCityProfileStatus(cityProfile);


  /*
   * ------------------------------------------------------------
   * Basic ULB information
   *
   * City_Profile is preferred when available.
   * Verified session context is the fallback.
   *
   * This is important because a new ULB may not have a
   * City_Profile row yet.
   * ------------------------------------------------------------
   */

  const cityName =
    cityProfile?.ULB_Name ||
    context?.ulbName ||
    context?.cityName ||
    context?.ULB_Name ||
    "ULB";

  const year =
    cityProfile?.Year ||
    context?.year ||
    context?.Year ||
    "—";

  const ulbClass =
    cityProfile?.ULB_Class ||
    context?.ulbClass ||
    context?.ULB_Class ||
    context?.ulb_class ||
    "—";

  const district =
    cityProfile?.District ||
    context?.district ||
    context?.District ||
    context?.districtName ||
    "—";

  const state =
    cityProfile?.State ||
    context?.state ||
    context?.State ||
    context?.stateName ||
    "—";


  /*
   * ------------------------------------------------------------
   * Dashboard HTML
   * ------------------------------------------------------------
   */

  return `
    <div class="space-y-6">

      <!-- ========================================================
           DASHBOARD INTRO
           ======================================================== -->

      <section
        class="relative overflow-hidden
               rounded-2xl
               border border-slate-200
               bg-gradient-to-br
               from-white
               via-portal-50/50
               to-sky-50
               shadow-sm"
      >

        <!-- Decorative shapes -->

        <div
          class="pointer-events-none absolute
                 -right-20 -top-20
                 h-48 w-48
                 rounded-full
                 bg-portal-200/30
                 blur-3xl"
          aria-hidden="true"
        ></div>

        <div
          class="pointer-events-none absolute
                 -bottom-24 left-1/3
                 h-40 w-40
                 rounded-full
                 bg-sky-200/30
                 blur-3xl"
          aria-hidden="true"
        ></div>


        <div
          class="relative flex flex-col
                 gap-5
                 px-5 py-6
                 sm:px-7 sm:py-7
                 lg:flex-row
                 lg:items-center
                 lg:justify-between"
        >

          <!-- ULB NAME -->

          <div class="min-w-0">

            <div
              class="mb-3 inline-flex items-center gap-2
                     rounded-full
                     bg-emerald-50
                     px-3 py-1.5
                     text-xs font-semibold
                     text-emerald-700
                     ring-1 ring-emerald-200/70"
            >

              <span
                class="h-1.5 w-1.5
                       rounded-full
                       bg-emerald-500"
              ></span>

              Verified ULB

            </div>


            <h2
              class="text-2xl font-bold
                     tracking-tight
                     text-slate-900
                     sm:text-3xl"
            >
              ${escapeHtml(String(cityName))}
            </h2>

          </div>


          <!-- ASSESSMENT YEAR -->

          <div
            class="flex shrink-0 items-center gap-2
                   rounded-xl
                   border border-white/80
                   bg-white/80
                   px-4 py-3
                   shadow-sm
                   backdrop-blur"
          >

            <div
              class="flex h-9 w-9 items-center justify-center
                     rounded-lg
                     bg-portal-100
                     text-portal-700"
            >
              ${iconClipboard()}
            </div>


            <div>

              <p
                class="text-[11px]
                       font-medium
                       uppercase
                       tracking-wider
                       text-slate-400"
              >
                Assessment
              </p>

              <p
                class="text-sm
                       font-semibold
                       text-slate-800"
              >
                ${escapeHtml(String(year))}
              </p>

            </div>

          </div>

        </div>

      </section>


      <!-- ========================================================
           ULB INFORMATION
           ======================================================== -->

      <section
        class="grid grid-cols-1
               overflow-hidden
               rounded-2xl
               border border-slate-200
               bg-white
               shadow-sm
               sm:grid-cols-3"
      >

        <!-- ULB CLASS -->

        <div
          class="border-b border-slate-200
                 px-6 py-5
                 text-center
                 sm:border-b-0
                 sm:border-r"
        >

          <div
            class="text-xs
                   font-semibold
                   uppercase
                   tracking-wider
                   text-slate-500"
          >
            ULB Class
          </div>

          <div
            class="mt-2
                   text-base
                   font-semibold
                   text-slate-800"
          >
            ${escapeHtml(String(ulbClass))}
          </div>

        </div>


        <!-- DISTRICT -->

        <div
          class="border-b border-slate-200
                 px-6 py-5
                 text-center
                 sm:border-b-0
                 sm:border-r"
        >

          <div
            class="text-xs
                   font-semibold
                   uppercase
                   tracking-wider
                   text-slate-500"
          >
            District
          </div>

          <div
            class="mt-2
                   text-base
                   font-semibold
                   text-slate-800"
          >
            ${escapeHtml(String(district))}
          </div>

        </div>


        <!-- STATE -->

        <div
          class="px-6 py-5
                 text-center"
        >

          <div
            class="text-xs
                   font-semibold
                   uppercase
                   tracking-wider
                   text-slate-500"
          >
            State
          </div>

          <div
            class="mt-2
                   text-base
                   font-semibold
                   text-slate-800"
          >
            ${escapeHtml(String(state))}
          </div>

        </div>

      </section>


      <!-- ========================================================
           WORKFLOW
           ======================================================== -->

      <section>

        <div
          class="mb-4 flex items-end
                 justify-between
                 gap-4"
        >

          <div>

            <p
              class="text-xs
                     font-semibold
                     uppercase
                     tracking-widest
                     text-portal-600"
            >
              Assessment
            </p>

            <h3
              class="mt-1
                     text-lg
                     font-bold
                     tracking-tight
                     text-slate-900"
            >
              Continue your work
            </h3>

          </div>


          <span
            class="hidden
                   text-xs
                   text-slate-400
                   sm:block"
          >
            ${
              profileStatus === "submitted"
                ? "Profile complete"
                : "Action required"
            }
          </span>

        </div>


        <div
          class="grid gap-4
                 lg:grid-cols-2"
        >

          ${renderCityProfileCard(profileStatus)}

          ${renderEnergyCard(profileStatus)}

        </div>

      </section>

    </div>
  `;
}


/*
|--------------------------------------------------------------------------
| City Profile Card
|--------------------------------------------------------------------------
*/

function renderCityProfileCard(status) {

  const submitted = status === "submitted";

  const title = submitted
    ? "City Profile"
    : status === "draft"
      ? "Continue City Profile"
      : "Start City Profile";

  const action = submitted
    ? "View"
    : status === "draft"
      ? "Continue"
      : "Start";

  const statusText = submitted
    ? "Submitted"
    : status === "draft"
      ? "Draft"
      : "Not started";

  const statusClasses = submitted
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : status === "draft"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : "bg-slate-100 text-slate-600 ring-slate-200";


  return `
    <article
      class="group relative overflow-hidden
             rounded-2xl
             border border-slate-200
             bg-white
             p-5
             shadow-sm
             transition duration-200
             hover:-translate-y-0.5
             hover:shadow-md"
    >

      <!-- Decorative shape -->

      <div
        class="absolute right-0 top-0
               h-32 w-32
               translate-x-1/3
               -translate-y-1/3
               rounded-full
               bg-portal-50
               opacity-70"
        aria-hidden="true"
      ></div>


      <div
        class="relative flex
               items-start
               justify-between
               gap-4"
      >

        <!-- ICON -->

        <div
          class="flex h-12 w-12 shrink-0
                 items-center justify-center
                 rounded-xl
                 bg-portal-50
                 text-portal-700
                 ring-1 ring-portal-100"
        >
          ${iconCity()}
        </div>


        <!-- STATUS -->

        <span
          class="inline-flex
                 items-center
                 rounded-full
                 px-2.5 py-1
                 text-xs
                 font-semibold
                 ring-1
                 ${statusClasses}"
        >
          ${statusText}
        </span>

      </div>


      <div class="relative mt-6">

        <h4
          class="text-lg
                 font-bold
                 tracking-tight
                 text-slate-900"
        >
          ${title}
        </h4>

        <p
          class="mt-1
                 text-sm
                 text-slate-500"
        >
          Facility information
        </p>

      </div>


      <div class="relative mt-6">

        <button
          type="button"
          data-nav="/city-profile"
          class="inline-flex
                 w-full
                 items-center
                 justify-center
                 gap-2
                 rounded-xl
                 bg-portal-700
                 px-4 py-2.5
                 text-sm
                 font-semibold
                 text-white
                 shadow-sm
                 transition
                 hover:bg-portal-800
                 focus-visible:outline-none
                 focus-visible:ring-2
                 focus-visible:ring-portal-500
                 focus-visible:ring-offset-2"
        >

          ${action}

          ${iconArrow()}

        </button>

      </div>

    </article>
  `;
}


/*
|--------------------------------------------------------------------------
| Energy Card
|--------------------------------------------------------------------------
*/

function renderEnergyCard(status) {

  const enabled = status === "submitted";


  return `
    <article
      class="group relative overflow-hidden
             rounded-2xl
             border
             ${
               enabled
                 ? "border-slate-200 bg-white"
                 : "border-slate-200/80 bg-slate-50/70"
             }
             p-5
             shadow-sm
             transition duration-200
             ${
               enabled
                 ? "hover:-translate-y-0.5 hover:shadow-md"
                 : ""
             }"
    >

      <!-- Decorative shape -->

      <div
        class="absolute right-0 top-0
               h-32 w-32
               translate-x-1/3
               -translate-y-1/3
               rounded-full
               bg-amber-50"
        aria-hidden="true"
      ></div>


      <div
        class="relative flex
               items-start
               justify-between
               gap-4"
      >

        <!-- ENERGY ICON -->

        <div
          class="flex h-12 w-12 shrink-0
                 items-center justify-center
                 rounded-xl
                 ${
                   enabled
                     ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                     : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                 }"
        >
          ${iconEnergy()}
        </div>


        <!-- STATUS -->

        ${
          enabled
            ? `
              <span
                class="inline-flex
                       items-center
                       rounded-full
                       bg-sky-50
                       px-2.5 py-1
                       text-xs
                       font-semibold
                       text-portal-700
                       ring-1 ring-portal-100"
              >
                Next step
              </span>
            `
            : `
              <span
                class="inline-flex
                       items-center
                       rounded-full
                       bg-slate-100
                       px-2.5 py-1
                       text-xs
                       font-semibold
                       text-slate-500
                       ring-1 ring-slate-200"
              >
                Locked
              </span>
            `
        }

      </div>


      <div class="relative mt-6">

        <h4
          class="text-lg
                 font-bold
                 tracking-tight
                 ${
                   enabled
                     ? "text-slate-900"
                     : "text-slate-500"
                 }"
        >
          Energy Consumption
        </h4>

        <p
          class="mt-1
                 text-sm
                 ${
                   enabled
                     ? "text-slate-500"
                     : "text-slate-400"
                 }"
        >
          Consumption &amp; energy data
        </p>

      </div>


      <div class="relative mt-6">

        <button
          type="button"
          data-nav="/energy"
          ${enabled ? "" : "disabled"}
          class="inline-flex
                 w-full
                 items-center
                 justify-center
                 gap-2
                 rounded-xl
                 px-4 py-2.5
                 text-sm
                 font-semibold
                 transition
                 focus-visible:outline-none
                 focus-visible:ring-2
                 focus-visible:ring-offset-2
                 ${
                   enabled
                     ? `
                       bg-slate-900
                       text-white
                       shadow-sm
                       hover:bg-slate-800
                       focus-visible:ring-slate-500
                     `
                     : `
                       cursor-not-allowed
                       bg-slate-200
                       text-slate-400
                     `
                 }"
        >

          ${enabled ? "Open Energy" : "Complete Profile First"}

          ${
            enabled
              ? iconArrow()
              : iconLock()
          }

        </button>

      </div>

    </article>
  `;
}


/*
|--------------------------------------------------------------------------
| City Profile Status
|--------------------------------------------------------------------------
*/

function getCityProfileStatus(profile) {

  if (!profile) {
    return "not_started";
  }

  const status = String(
    profile.Status || ""
  ).toLowerCase();


  if (
    status === "submitted" ||
    status === "submit" ||
    status === "final"
  ) {
    return "submitted";
  }


  if (
    status === "draft" ||
    status === "in progress" ||
    status === "in_progress"
  ) {
    return "draft";
  }


  return "draft";
}


/*
|--------------------------------------------------------------------------
| Loading
|--------------------------------------------------------------------------
*/

function renderLoading() {

  return `
    <div class="space-y-6">

      <!-- Header -->

      <div
        class="h-44
               animate-pulse
               rounded-2xl
               bg-slate-200"
      ></div>


      <!-- ULB Information -->

      <div
        class="grid grid-cols-1
               overflow-hidden
               rounded-2xl
               bg-slate-200
               sm:grid-cols-3"
      >

        <div
          class="h-20
                 animate-pulse
                 bg-white"
        ></div>

        <div
          class="h-20
                 animate-pulse
                 bg-white"
        ></div>

        <div
          class="h-20
                 animate-pulse
                 bg-white"
        ></div>

      </div>


      <!-- Workflow -->

      <div
        class="grid gap-4
               lg:grid-cols-2"
      >

        <div
          class="h-64
                 animate-pulse
                 rounded-2xl
                 bg-slate-200"
        ></div>

        <div
          class="h-64
                 animate-pulse
                 rounded-2xl
                 bg-slate-200"
        ></div>

      </div>

    </div>
  `;
}


/*
|--------------------------------------------------------------------------
| Error
|--------------------------------------------------------------------------
*/

function renderError() {

  return `
    <div
      class="flex
             min-h-[420px]
             items-center
             justify-center"
    >

      <div
        class="w-full
               max-w-md
               rounded-2xl
               border border-red-200
               bg-white
               p-6
               text-center
               shadow-sm"
      >

        <div
          class="mx-auto
                 flex h-12 w-12
                 items-center
                 justify-center
                 rounded-full
                 bg-red-50
                 text-red-600"
        >
          ${iconAlert()}
        </div>


        <h2
          class="mt-4
                 text-lg
                 font-bold
                 text-slate-900"
        >
          Dashboard unavailable
        </h2>


        <p
          class="mt-1
                 text-sm
                 text-slate-500"
        >
          Please refresh and try again.
        </p>


        <button
          type="button"
          onclick="window.location.reload()"
          class="mt-5
                 inline-flex
                 items-center
                 justify-center
                 rounded-xl
                 bg-slate-900
                 px-4 py-2.5
                 text-sm
                 font-semibold
                 text-white
                 hover:bg-slate-800
                 focus-visible:outline-none
                 focus-visible:ring-2
                 focus-visible:ring-slate-500
                 focus-visible:ring-offset-2"
        >
          Refresh
        </button>

      </div>

    </div>
  `;
}


/*
|--------------------------------------------------------------------------
| Events
|--------------------------------------------------------------------------
*/

function attachHomeEvents(root) {

  root
    .querySelectorAll("[data-nav]")
    .forEach((element) => {

      element.addEventListener("click", () => {

        const path = element.dataset.nav;

        if (
          path &&
          !element.disabled
        ) {
          navigate(path);
        }

      });

    });

}


/*
|--------------------------------------------------------------------------
| Redirect
|--------------------------------------------------------------------------
*/

function redirectToVerification() {

  const basePath =
    getApplicationBasePath();

  navigate(`${basePath}/`);
}


/*
|--------------------------------------------------------------------------
| Application Base Path
|--------------------------------------------------------------------------
*/

function getApplicationBasePath() {

  const pathname =
    window.location.pathname;

  if (
    pathname === "/ea" ||
    pathname.startsWith("/ea/")
  ) {
    return "/ea";
  }

  return "";
}


/*
|--------------------------------------------------------------------------
| HTML Escaping
|--------------------------------------------------------------------------
*/

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/*
|--------------------------------------------------------------------------
| Icons
|--------------------------------------------------------------------------
*/

function iconCity() {

  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      class="h-6 w-6"
      aria-hidden="true"
    >

      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M3 21h18M5 21V9l7-4 7 4v12M9 21v-4h6v4M8 11h.01M12 11h.01M16 11h.01M8 14h.01M16 14h.01"
      />

    </svg>
  `;
}


function iconClipboard() {

  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      class="h-5 w-5"
      aria-hidden="true"
    >

      <rect
        x="5"
        y="4"
        width="14"
        height="17"
        rx="2"
      />

      <path
        stroke-linecap="round"
        d="M9 4.5V3h6v1.5M9 9h6M9 13h6M9 17h3"
      />

    </svg>
  `;
}


function iconEnergy() {

  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      class="h-6 w-6"
      aria-hidden="true"
    >

      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M13 2 4.5 13H11l-1 9L19.5 11H13l0-9Z"
      />

    </svg>
  `;
}


function iconArrow() {

  return `
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      class="h-4 w-4 transition-transform group-hover:translate-x-0.5"
      aria-hidden="true"
    >

      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M4 10h11M11 5l5 5-5 5"
      />

    </svg>
  `;
}


function iconLock() {

  return `
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      class="h-4 w-4"
      aria-hidden="true"
    >

      <rect
        x="4.5"
        y="8"
        width="11"
        height="8.5"
        rx="1.5"
      />

      <path
        stroke-linecap="round"
        d="M7 8V6a3 3 0 0 1 6 0v2"
      />

    </svg>
  `;
}


function iconAlert() {

  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      class="h-6 w-6"
      aria-hidden="true"
    >

      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 8v4M12 16h.01"
      />

      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M10.3 3.8 2.9 17a2 2 0 0 0 1.75 3h14.7a2 2 0 0 0 1.75-3L13.7 3.8a2 2 0 0 0-3.4 0Z"
      />

    </svg>
  `;
}
