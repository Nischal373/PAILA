import { getPotholes } from "@/lib/potholeStore";
import ReportPage from "@/components/dashboard/ReportPage";
import type { Pothole } from "@/lib/potholeTypes";

export const dynamic = "force-dynamic";

export default async function Report() {
  let potholes: Pothole[] = [];
  try {
    potholes = await getPotholes();
  } catch (error) {
    console.warn("Failed to load potholes for report page", error);
  }

  return <ReportPage initialPotholes={potholes} />;
}
