export type UserRole = "cashier" | "manager" | "supervisor" | "organization_owner" | "platform_owner";

export type UserBranch = {
  branchId: string;
  branchName: string;
  role: string;
  status: "active" | "inactive";
};

export type CurrentUser = {
  id: string;
  organizationId: string | null;
  email: string;
  fullName: string;
  roles: UserRole[];
  permissions: string[];
  branches: UserBranch[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: CurrentUser;
};

export type SubscriptionFeatureState = {
  planCode: string;
  status: string;
  features: string[];
};

export type CashSession = {
  id: string;
  branchId: string;
  status: "open" | "closing" | "closed";
};
