import { getAllReports } from "@/services/reportService";

export interface ActiveShift {
  shift: string;
  startedAt: string;
  supervisor: string;
}

export function getActiveShift(): ActiveShift | null {
  const today = new Date().toISOString().split("T")[0];
  const reports = getAllReports().filter((r) => r.Ngay === today);

  const startReports = reports.filter((r) => r.LoaiBaoCao === "NhanSu");
  if (startReports.length === 0) return null;

  // Most recent start-shift first
  startReports.sort((a, b) => b.Created.localeCompare(a.Created));
  const latest = startReports[0];

  // Pill disappears once a matching end-shift (SoLieu) exists for same Ca
  const hasEnded = reports.some(
    (r) => r.LoaiBaoCao === "SoLieu" && r.Ca === latest.Ca,
  );
  if (hasEnded) return null;

  return {
    shift: latest.Ca,
    startedAt: latest.Created,
    supervisor: latest.NguoiLap_HoTen,
  };
}

export function getShiftElapsed(active: ActiveShift): string {
  const diffMs = Date.now() - new Date(active.startedAt).getTime();
  const totalMins = Math.max(0, Math.floor(diffMs / 60_000));
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
