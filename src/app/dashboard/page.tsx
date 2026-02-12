import PotholeDashboard from "@/components/dashboard/PotholeDashboard";
import { getPotholes } from "@/lib/potholeStore";
import type { Pothole } from "@/lib/potholeTypes";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  let potholes: Pothole[] = [];
  try {
    potholes = await getPotholes();
  } catch (error) {
    console.warn("Failed to load potholes for dashboard", error);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 px-4 py-10 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl">
        <PotholeDashboard initialPotholes={potholes} />
      </div>
    </main>
  );
}
