import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useBranchStore } from "../stores/branch.store";

type BranchGuardProps = {
  children: ReactNode;
};

export function BranchGuard({ children }: BranchGuardProps) {
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const location = useLocation();

  if (!activeBranchId) {
    return <Navigate replace to="/app/select-branch" state={{ from: location.pathname }} />;
  }

  return children;
}
