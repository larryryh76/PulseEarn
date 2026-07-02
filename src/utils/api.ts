/**
 * Batch 4: Standardized API interaction utility with error guards.
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  try {
    const response = await fetch(url, options);

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      // Successful responses without JSON body (e.g., 204 No Content) are valid
      if (response.ok) {
        return { success: true };
      }

      // Non-ok responses with non-JSON body are errors
      const text = await response.text();
      // Log non-JSON error responses to console in DEV mode only
      if (import.meta.env.DEV) {
          console.error("[API] Non-JSON Response:", text.slice(0, 200));
      }
      return {
        success: false,
        error: "COMMUNICATION_ERROR",
        message: "The system returned an invalid response. Please try again later."
      };
    }

    const data = await response.json();

    if (!response.ok) {
       return {
          ...data,
          success: false,
          error: data.error || "UNKNOWN_ERROR",
          message: data.message || "An unexpected error occurred."
       };
    }

    return { success: true, ...data };
  } catch (err: any) {
    if (import.meta.env.DEV) {
        console.error("[API] Fetch Failure:", err.message);
    }
    return {
      success: false,
      error: "CONNECTIVITY_ERROR",
      message: "Could not connect to the authority node. Check your internet connection."
    };
  }
}
