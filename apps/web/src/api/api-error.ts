export type ApiError = {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
};

export class ApiErrorException extends Error {
  apiError: ApiError;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiErrorException";
    this.apiError = apiError;
  }
}

export const fallbackApiError: ApiError = {
  statusCode: 500,
  error: "UNKNOWN_ERROR",
  message: "No se pudo completar la operación."
};

export function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ApiError>;
  return (
    typeof candidate.statusCode === "number" &&
    typeof candidate.error === "string" &&
    typeof candidate.message === "string"
  );
}

export async function parseApiError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as unknown;
    if (isApiError(payload)) {
      return payload;
    }
  } catch {
    // Keep the fallback below.
  }

  return {
    statusCode: response.status,
    error: response.statusText || fallbackApiError.error,
    message: fallbackApiError.message
  };
}
