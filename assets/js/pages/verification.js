/*
|--------------------------------------------------------------------------
| City WASH & Energy Portal
| PAS Verification
|--------------------------------------------------------------------------
*/

import {
  verifyULB
} from "../api/client.js";

import {
  getPendingVerification,
  savePendingVerification,
  clearPendingVerification,
  saveVerifiedContext
} from "../app/session.js";

import {
  navigate
} from "../app/main.js";


/**
 * --------------------------------------------------------------------------
 * Render the PAS / ULB verification page.
 * --------------------------------------------------------------------------
 *
 * PAS may initially open this page with:
 *
 * /?ulbId=3011&ulbName=Nadiad&year=2006
 *
 * The parameters are read immediately, moved into sessionStorage and then
 * removed from the browser URL.
 *
 * After that, the verification process uses only the pending session state.
 */
export async function renderVerification(root) {

  // ------------------------------------------------------------------------
  // Read PAS parameters immediately.
  // ------------------------------------------------------------------------
  const params =
    new URLSearchParams(
      window.location.search
    );

  const urlUlbId =
    (params.get("ulbId") || "").trim();

  const urlUlbName =
    (params.get("ulbName") || "").trim();

  const urlYearValue =
    (params.get("year") || "").trim();

  const urlYear =
    Number(urlYearValue);


  // ------------------------------------------------------------------------
  // If PAS supplied parameters, save them immediately.
  // ------------------------------------------------------------------------
  //
  // This happens before rendering the page so the URL parameters are
  // converted into temporary session state as early as possible.
  //
  // The backend remains the authority for actual verification.
  //
  if (
    urlUlbId ||
    urlUlbName ||
    urlYearValue
  ) {

    try {

      savePendingVerification({
        ulbId: urlUlbId,
        ulbName: urlUlbName,
        year: urlYear
      });

    } catch (error) {

      console.error(
        "Unable to save PAS verification request:",
        error
      );

    }

    // ----------------------------------------------------------------------
    // Immediately remove query parameters from the browser URL.
    // ----------------------------------------------------------------------
    //
    // Example:
    //
    // Before:
    // /?ulbId=3011&ulbName=Nadiad&year=2006
    //
    // After:
    // /
    //
    // replaceState does NOT reload the page.
    //
    const cleanUrl =
      window.location.pathname;

    window.history.replaceState(
      {},
      document.title,
      cleanUrl
    );
  }


  // ------------------------------------------------------------------------
  // Read the pending verification request.
  // ------------------------------------------------------------------------
  const pendingVerification =
    getPendingVerification();


  const ulbId =
    pendingVerification?.ulbId || "";

  const ulbName =
    pendingVerification?.ulbName || "";

  const year =
    pendingVerification?.year;


  // ------------------------------------------------------------------------
  // Render page.
  // ------------------------------------------------------------------------
  root.innerHTML = `
    <div class="mx-auto max-w-3xl">

      <div class="mb-6">

        <p class="text-sm font-semibold text-portal-600">
          ULB Verification
        </p>

        <h2 class="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Verify City Assessment
        </h2>

        <p class="mt-2 text-sm leading-6 text-slate-600">
          The city information received from PAS will be verified
          against the portal's master ULB database.
        </p>

      </div>


      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div class="grid gap-4 sm:grid-cols-3">

          <div>

            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              ULB ID
            </p>

            <p class="mt-1 font-semibold text-slate-900">
              ${escapeHtml(ulbId || "Not provided")}
            </p>

          </div>


          <div>

            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              ULB Name
            </p>

            <p class="mt-1 font-semibold text-slate-900">
              ${escapeHtml(ulbName || "Not provided")}
            </p>

          </div>


          <div>

            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Assessment Year
            </p>

            <p class="mt-1 font-semibold text-slate-900">
              ${
                Number.isInteger(year)
                  ? year
                  : "Not provided"
              }
            </p>

          </div>

        </div>


        <!-- Verification Status -->

        <div
          id="verification-status"
          class="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5"
        >

          <div class="flex items-center gap-4">

            <!-- Loader -->

            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-portal-50"
              aria-hidden="true"
            >

              <span
                class="h-5 w-5 animate-spin rounded-full border-2 border-portal-200 border-t-portal-600"
              ></span>

            </div>


            <div>

              <p class="font-semibold text-slate-900">
                Verifying ULB
              </p>

              <p class="mt-1 text-sm leading-6 text-slate-600">
                Please wait while we verify the ULB details with the portal database.
              </p>

            </div>

          </div>

        </div>


        <div
          id="verification-action"
          class="mt-6"
        ></div>

      </div>

    </div>
  `;


  // ------------------------------------------------------------------------
  // Validate pending verification request.
  // ------------------------------------------------------------------------

  if (!pendingVerification) {

    showError(
      "No PAS verification request was received."
    );

    return;
  }


  if (!ulbId) {

    showError(
      "ULB ID is missing from the PAS request."
    );

    return;
  }


  if (!ulbName) {

    showError(
      "ULB Name is missing from the PAS request."
    );

    return;
  }


  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {

    showError(
      "A valid assessment year is required."
    );

    return;
  }


  // ------------------------------------------------------------------------
  // Call backend verification.
  // ------------------------------------------------------------------------

  try {

    /*
     * Year is deliberately passed to the backend.
     *
     * The backend decides whether the verification module is available
     * for the supplied financial year.
     *
     * Currently the verification module accepts 2006 only.
     */

    const result =
      await verifyULB(
        ulbId,
        ulbName,
        year
      );


    if (
      !result ||
      result.success !== true ||
      result.verified !== true ||
      !result.data
    ) {

      /*
       * Backend error responses use:
       *
       * {
       *   success: false,
       *   error: "...",
       *   message: "..."
       * }
       */

      const message =
        result?.message ||
        result?.error?.message ||
        "The ULB could not be verified.";

      showError(message);

      return;
    }


    const verifiedData =
      result.data;


    // ----------------------------------------------------------------------
    // Save trusted backend context.
    // ----------------------------------------------------------------------

    const verifiedContext =
      saveVerifiedContext({

        ulbId:
          verifiedData.ULB_ID,

        ulbName:
          verifiedData.ULB_Name,

        ulbClass:
          verifiedData.ULB_Class,

        year:
          year,

        verified:
          true,

        verifiedAt:
          result.verifiedAt ||
          new Date().toISOString()

      });


    // ----------------------------------------------------------------------
    // Verification succeeded.
    // ----------------------------------------------------------------------
    //
    // The temporary PAS request is no longer needed.
    //
    clearPendingVerification();


    // ----------------------------------------------------------------------
    // Show successful verification.
    // ----------------------------------------------------------------------

    showSuccess(
      verifiedContext
    );


    // ----------------------------------------------------------------------
    // Open dashboard.
    // ----------------------------------------------------------------------

    navigate("/home");


  } catch (error) {

    console.error(
      "ULB verification error:",
      error
    );

    showError(
      "Unable to connect to the verification service. " +
      "Please try again."
    );

  }


  // ==========================================================
  // STATUS HELPERS
  // ==========================================================

  function showError(message) {

    const status =
      document.getElementById(
        "verification-status"
      );

    const action =
      document.getElementById(
        "verification-action"
      );


    if (status) {

      status.className =
        "mt-6 rounded-xl border border-red-200 bg-red-50 p-4";

      status.innerHTML = `
        <div class="flex items-start gap-3">

          <div
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-700"
            aria-hidden="true"
          >
            !
          </div>

          <div>

            <p class="font-semibold text-red-900">
              Verification Failed
            </p>

            <p class="mt-1 text-sm leading-6 text-red-700">
              ${escapeHtml(message)}
            </p>

          </div>

        </div>
      `;
    }


    if (action) {

      action.innerHTML = `
        <button
          type="button"
          class="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          data-retry
        >
          Try Again
        </button>
      `;


      const retryButton =
        action.querySelector(
          "[data-retry]"
        );


      retryButton?.addEventListener(
        "click",
        () => window.location.reload()
      );

    }

  }


  function showSuccess(context) {

    const status =
      document.getElementById(
        "verification-status"
      );

    const action =
      document.getElementById(
        "verification-action"
      );


    if (status) {

      status.className =
        "mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4";

      status.innerHTML = `
        <div class="flex items-start gap-3">

          <div
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700"
            aria-hidden="true"
          >
            ✓
          </div>

          <div class="min-w-0">

            <p class="font-semibold text-emerald-900">
              ULB Verified
            </p>

            <p class="mt-1 text-sm leading-6 text-emerald-700">

              ${escapeHtml(context.ulbName)}
              (${escapeHtml(context.ulbId)})
              has been verified successfully.

            </p>


            <div class="mt-3 grid gap-2 text-sm sm:grid-cols-3">

              <div>

                <span class="text-emerald-700">
                  ULB Class
                </span>

                <span class="ml-1 font-semibold text-emerald-900">

                  ${escapeHtml(
                    context.ulbClass ||
                    "Not available"
                  )}

                </span>

              </div>


              <div>

                <span class="text-emerald-700">
                  Year
                </span>

                <span class="ml-1 font-semibold text-emerald-900">
                  ${context.year}
                </span>

              </div>


              <div>

                <span class="font-semibold text-emerald-800">
                  Verified
                </span>

              </div>

            </div>

          </div>

        </div>
      `;
    }


    if (action) {

      action.innerHTML = `
        <div class="flex items-center gap-2 text-sm text-slate-600">

          <span
            class="inline-block h-2 w-2 animate-pulse rounded-full bg-portal-600"
            aria-hidden="true"
          ></span>

          Opening your dashboard...

        </div>
      `;

    }

  }


  // ==========================================================
  // HTML ESCAPE
  // ==========================================================

  function escapeHtml(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }

}
