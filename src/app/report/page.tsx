import { getPotholes } from "@/lib/potholeStore";
import ReportPage from "@/components/dashboard/ReportPage";

export default async function Report() {
  const potholes = await getPotholes();
  return <ReportPage initialPotholes={potholes} />;
}
