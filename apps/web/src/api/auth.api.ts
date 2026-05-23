import { httpClient } from "./http-client";
import { buildDemoLogin, useMocks } from "./mock-data";
import type { CurrentUser, LoginResponse } from "../shared/types/session.types";

export type LoginPayload = {
  email: string;
  password: string;
};

export function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  if (useMocks) {
    const demoRole = payload.email.toLowerCase().includes("gerente") || payload.email.toLowerCase().includes("manager") ? "manager" : "cashier";
    return Promise.resolve(buildDemoLogin(demoRole, payload.email));
  }

  return httpClient<LoginResponse>("/auth/login", {
    method: "POST",
    body: {
      email: payload.email,
      password: payload.password
    },
    skipAuth: true
  });
}

export function meRequest(): Promise<CurrentUser> {
  return httpClient<CurrentUser>("/auth/me");
}
