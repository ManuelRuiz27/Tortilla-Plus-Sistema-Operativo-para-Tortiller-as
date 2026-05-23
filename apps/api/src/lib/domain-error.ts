export class DomainError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return {
      statusCode: error.statusCode,
      body: {
        statusCode: error.statusCode,
        error: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  console.error("[Unhandled Error]:", error);
  return {
    statusCode: 500,
    body: {
      statusCode: 500,
      error: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor.",
      details: {},
    },
  };
}
