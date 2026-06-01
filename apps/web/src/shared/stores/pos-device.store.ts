import { create } from "zustand";
import { persist } from "zustand/middleware";

type PosDeviceState = {
  activePosDeviceId: string | null;
  activePosDeviceName: string | null;
  setActivePosDevice: (device: { id: string; name: string }) => void;
  clearActivePosDevice: () => void;
};

export const usePosDeviceStore = create<PosDeviceState>()(
  persist(
    (set) => ({
      activePosDeviceId: null,
      activePosDeviceName: null,
      setActivePosDevice: (device) =>
        set({
          activePosDeviceId: device.id,
          activePosDeviceName: device.name,
        }),
      clearActivePosDevice: () => set({ activePosDeviceId: null, activePosDeviceName: null }),
    }),
    {
      name: "tp-pos-device",
    },
  ),
);
