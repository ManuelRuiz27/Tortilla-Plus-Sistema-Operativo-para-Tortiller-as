import { ApiErrorException, parseApiError } from "./api-error";
import { useAuthStore } from "../shared/stores/auth.store";

const defaultBaseUrl = "http://localhost:3000/api/v1";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
};

function getBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;
}

export async function httpClient<TResponse>(
  path: string,
  options: RequestOptions = {}
): Promise<TResponse> {
  const { body, headers, skipAuth, ...rest } = options;
  const accessToken = useAuthStore.getState().accessToken;

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && !skipAuth ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
  }

  if (!response.ok) {
    throw new ApiErrorException(await parseApiError(response));
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const payload = (await response.json()) as unknown;
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: TResponse }).data;
  }

  return payload as TResponse;
}
