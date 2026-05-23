import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserBranch } from "../types/session.types";

type BranchState = {
  activeBranchId: string | null;
  activeBranchName: string | null;
  branches: UserBranch[];
  setBranches: (branches: UserBranch[]) => void;
  setActiveBranch: (branch: UserBranch) => void;
  clearActiveBranch: () => void;
};

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      activeBranchId: null,
      activeBranchName: null,
      branches: [],
      setBranches: (branches) => set({ branches }),
      setActiveBranch: (branch) =>
        set({
          activeBranchId: branch.branchId,
          activeBranchName: branch.branchName
        }),
      clearActiveBranch: () => set({ activeBranchId: null, activeBranchName: null })
    }),
    {
      name: "tp-branch"
    }
  )
);
