/*
|--------------------------------------------------------------------------
| City WASH & Energy Portal
| Session Management
|--------------------------------------------------------------------------
|
| Responsibilities:
| - Store temporary PAS verification request
| - Store verified ULB context
| - Restore verified ULB context
| - Clear session state
|
| IMPORTANT:
| sessionStorage is convenience state only.
| It is NOT a security boundary or authorization mechanism.
|
|--------------------------------------------------------------------------
*/


const SESSION_KEY = "cwep.verifiedContext";

const PENDING_VERIFICATION_KEY =
  "cwep.pendingVerification";


/*
|--------------------------------------------------------------------------
| Pending Verification
|--------------------------------------------------------------------------
|
| Temporary state received from PAS.
|
| Example:
|
| /?ulbId=3011&ulbName=Nadiad&year=2026
|
| The verification page can move these values here and then
| remove them from the browser URL.
|
|--------------------------------------------------------------------------
*/

export function savePendingVerification(request) {

  if (
    !request ||
    typeof request !== "object"
  ) {
    throw new Error(
      "Invalid verification request."
    );
  }


  const normalizedRequest = {

    ulbId:
      String(
        request.ulbId ??
        request.ULB_ID ??
        ""
      ).trim(),

    ulbName:
      String(
        request.ulbName ??
        request.ULB_Name ??
        ""
      ).trim(),

    year:
      Number(
        request.year ??
        request.Year
      )

  };


  if (!normalizedRequest.ulbId) {

    throw new Error(
      "ULB ID is required."
    );

  }


  if (!normalizedRequest.ulbName) {

    throw new Error(
      "ULB Name is required."
    );

  }


  if (
    !Number.isInteger(
      normalizedRequest.year
    )
  ) {

    throw new Error(
      "A valid assessment year is required."
    );

  }


  sessionStorage.setItem(
    PENDING_VERIFICATION_KEY,
    JSON.stringify(
      normalizedRequest
    )
  );


  return normalizedRequest;
}


/*
|--------------------------------------------------------------------------
| Get Pending Verification
|--------------------------------------------------------------------------
*/

export function getPendingVerification() {

  const raw =
    sessionStorage.getItem(
      PENDING_VERIFICATION_KEY
    );


  if (!raw) {
    return null;
  }


  try {

    const request =
      JSON.parse(raw);


    if (
      !request ||
      typeof request !== "object"
    ) {

      clearPendingVerification();

      return null;
    }


    const ulbId =
      String(
        request.ulbId ??
        request.ULB_ID ??
        ""
      ).trim();


    const ulbName =
      String(
        request.ulbName ??
        request.ULB_Name ??
        ""
      ).trim();


    const year =
      Number(
        request.year ??
        request.Year
      );


    if (
      !ulbId ||
      !ulbName ||
      !Number.isInteger(year)
    ) {

      clearPendingVerification();

      return null;
    }


    return {

      ulbId,

      ulbName,

      year

    };


  } catch (error) {

    console.error(
      "Invalid pending verification:",
      error
    );


    clearPendingVerification();

    return null;
  }
}


/*
|--------------------------------------------------------------------------
| Clear Pending Verification
|--------------------------------------------------------------------------
*/

export function clearPendingVerification() {

  sessionStorage.removeItem(
    PENDING_VERIFICATION_KEY
  );

}


/*
|--------------------------------------------------------------------------
| Verified ULB Context
|--------------------------------------------------------------------------
|
| Stores the verified ULB information required throughout the portal.
|
| Stored fields:
|
| - ulbId
| - ulbName
| - ulbClass
| - district
| - state
| - stateCode
| - year
| - verified
| - verifiedAt
|
|--------------------------------------------------------------------------
*/

export function saveVerifiedContext(context) {

  if (
    !context ||
    typeof context !== "object"
  ) {

    throw new Error(
      "Invalid verification context."
    );

  }


  /*
   * Support both frontend camelCase and backend PascalCase.
   *
   * Example backend response:
   *
   * {
   *   ULB_ID,
   *   ULB_Name,
   *   ULB_Class,
   *   District,
   *   State,
   *   State_Code,
   *   Year
   * }
   *
   * Example frontend context:
   *
   * {
   *   ulbId,
   *   ulbName,
   *   ulbClass,
   *   district,
   *   state,
   *   stateCode,
   *   year
   * }
   */


  const normalizedContext = {

    /*
     * ULB ID
     */

    ulbId:
      String(
        context.ulbId ??
        context.ULB_ID ??
        ""
      ).trim(),


    /*
     * ULB Name
     */

    ulbName:
      String(
        context.ulbName ??
        context.ULB_Name ??
        ""
      ).trim(),


    /*
     * ULB Class
     */

    ulbClass:
      context.ulbClass ??
      context.ULB_Class ??
      null
        ? String(
            context.ulbClass ??
            context.ULB_Class
          ).trim()
        : null,


    /*
     * District
     */

    district:
      context.district ??
      context.District ??
      null
        ? String(
            context.district ??
            context.District
          ).trim()
        : null,


    /*
     * State
     */

    state:
      context.state ??
      context.State ??
      null
        ? String(
            context.state ??
            context.State
          ).trim()
        : null,


    /*
     * State Code
     */

    stateCode:
      context.stateCode ??
      context.State_Code ??
      null
        ? String(
            context.stateCode ??
            context.State_Code
          ).trim()
        : null,


    /*
     * Assessment Year
     */

    year:
      Number(
        context.year ??
        context.Year
      ),


    /*
     * Verification flag
     */

    verified:
      context.verified === true,


    /*
     * Verification timestamp
     */

    verifiedAt:
      context.verifiedAt ||
      new Date().toISOString()

  };


  /*
  |--------------------------------------------------------------------------
  | Required validation
  |--------------------------------------------------------------------------
  */

  if (!normalizedContext.ulbId) {

    throw new Error(
      "ULB ID is required."
    );

  }


  if (!normalizedContext.ulbName) {

    throw new Error(
      "ULB Name is required."
    );

  }


  if (
    !Number.isInteger(
      normalizedContext.year
    )
  ) {

    throw new Error(
      "A valid assessment year is required."
    );

  }


  if (!normalizedContext.verified) {

    throw new Error(
      "ULB context has not been verified."
    );

  }


  /*
  |--------------------------------------------------------------------------
  | Save context
  |--------------------------------------------------------------------------
  */

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(
      normalizedContext
    )
  );


  return normalizedContext;
}


/*
|--------------------------------------------------------------------------
| Get Verified Context
|--------------------------------------------------------------------------
*/

export function getVerifiedContext() {

  const raw =
    sessionStorage.getItem(
      SESSION_KEY
    );


  if (!raw) {
    return null;
  }


  try {

    const context =
      JSON.parse(raw);


    /*
     * Basic object validation
     */

    if (
      !context ||
      typeof context !== "object"
    ) {

      clearVerifiedContext();

      return null;
    }


    /*
     * Verification validation
     */

    if (
      context.verified !== true
    ) {

      clearVerifiedContext();

      return null;
    }


    /*
     * ULB validation
     */

    if (
      !context.ulbId ||
      !context.ulbName
    ) {

      clearVerifiedContext();

      return null;
    }


    /*
     * Year validation
     */

    if (
      !Number.isInteger(
        Number(context.year)
      )
    ) {

      clearVerifiedContext();

      return null;
    }


    /*
     * Return normalized context.
     *
     * District and State are intentionally retained.
     */

    return {

      ...context,

      ulbId:
        String(
          context.ulbId
        ),

      ulbName:
        String(
          context.ulbName
        ),

      ulbClass:
        context.ulbClass
          ? String(
              context.ulbClass
            )
          : null,

      district:
        context.district
          ? String(
              context.district
            )
          : null,

      state:
        context.state
          ? String(
              context.state
            )
          : null,

      stateCode:
        context.stateCode
          ? String(
              context.stateCode
            )
          : null,

      year:
        Number(
          context.year
        )

    };


  } catch (error) {

    console.error(
      "Invalid session context:",
      error
    );


    clearVerifiedContext();

    return null;
  }
}


/*
|--------------------------------------------------------------------------
| Has Verified Context
|--------------------------------------------------------------------------
*/

export function hasVerifiedContext() {

  return (
    getVerifiedContext() !== null
  );

}


/*
|--------------------------------------------------------------------------
| Clear Verified Context
|--------------------------------------------------------------------------
*/

export function clearVerifiedContext() {

  sessionStorage.removeItem(
    SESSION_KEY
  );

}


/*
|--------------------------------------------------------------------------
| Require Verified Context
|--------------------------------------------------------------------------
*/

export function requireVerifiedContext() {

  const context =
    getVerifiedContext();


  if (!context) {
    return null;
  }


  return context;
}
