/**
 * City WASH & Energy Consumption Data Portal
 * Backend API Client
 */

const API_BASE_URL =
  "https://script.google.com/macros/s/AKfycbzEhL7rjUkyKk52H-ObkyLMWSFhSx-VyL3teuzdduKoAEGUca4tgRZm2pO44R28Egyj/exec";


/**
 * Build an API URL with query parameters.
 */
function buildApiUrl(params = {}) {

  const url = new URL(API_BASE_URL);

  Object.entries(params).forEach(([key, value]) => {

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      url.searchParams.set(key, String(value));
    }

  });

  return url.toString();
}


/**
 * Perform a GET request to the backend.
 */
export async function apiGet(params = {}) {

  const url = buildApiUrl(params);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {

    throw new Error(
      `API request failed with HTTP ${response.status}.`
    );

  }

  let data;

  try {

    data = await response.json();

  } catch (error) {

    throw new Error(
      "The backend returned an invalid JSON response."
    );

  }

  return data;
}


/**
 * Verify a ULB against ULB_Master.
 */
export async function verifyULB(ulbId, ulbName, year) {
  return apiGet({
    action: "verifyULB",
    ulbId,
    ulbName,
    year
  });
}


/**
 * Check API health.
 */
export async function checkHealth() {

  return apiGet({
    action: "health"
  });

}


/**
 * Get an existing City Profile.
 */
export async function getCityProfile(
  ulbId,
  year
) {

  return apiGet({
    action: "getCityProfile",
    ulbId,
    year
  });

}


/**
 * Perform a POST request to the backend.
 */
export async function apiPost(
  action,
  payload = {}
) {

  const response = await fetch(API_BASE_URL, {

    method: "POST",

    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },

    body: JSON.stringify({
      action,
      ...payload
    })

  });


  if (!response.ok) {

    throw new Error(
      `API request failed with HTTP ${response.status}.`
    );

  }


  let data;

  try {

    data = await response.json();

  } catch (error) {

    throw new Error(
      "The backend returned an invalid JSON response."
    );

  }


  return data;

}


/**
 * Save City Profile.
 */
export async function saveCityProfile(
  payload
) {

  return apiPost(
    "saveCityProfile",
    payload
  );

}
