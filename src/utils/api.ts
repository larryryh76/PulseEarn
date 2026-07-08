/**
 * Batch 4: Standardized API interaction utility with error guards.
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  try {
    const response = await fetch(url, options);

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("[API] Non-JSON Response:", {
        status: response.status,
        statusText: response.statusText,
        contentType,
        body: text.slice(0, 500)
      });
      return {
        success: false,
        error: "COMMUNICATION_ERROR",
        message: `Server error (${response.status}): ${text.slice(0, 100) || 'No response body'}`
      };
    }

    const data = await response.json();

    if (!response.ok) {
       return {
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
