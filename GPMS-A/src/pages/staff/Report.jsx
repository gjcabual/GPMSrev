import { useEffect, useState } from "react";
import PaymentStatusChart from "../../components/report/PaymentStatusChart";
import PaymentStickerChart from "../../components/report/PaymentStickerChart";
import TotalPaymentChart from "../../components/report/TotalPaymentChart";
import VehicleStickersChart from "../../components/report/VehicleStickersChart";
import { buildUrl } from "../../utils/buildUrl";
import { toast } from "sonner";
import { StaffLayout } from "../../layouts/StaffLayout";
import ReportGenerator from "../../components/report/ReportGenerator";

export const Report = () => {
 const [totalVehicleData, setTotalVehicleData] = useState(null);
 const [totalPayment, setTotalPayment] = useState(null);
 const [stickerDistribution, setStickerDistribution] = useState(null);
 const [overallApplications, setOverallApplications] = useState(null);
 const [filterType, setFilterType] = useState("month");
 const [loading, setLoading] = useState(true); // Centralized loading state

 const getReportData = async () => {
  setLoading(true); // Start loading
  try {
   const res = await fetch(
    buildUrl(`/management/reports/dashboard?filter_type=${filterType}`),
    {
     method: "GET",
     headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    }
   );
   const data = await res.json();
   if (res.ok) {
    setTotalVehicleData(data.reports.total_vehicle_stickers);
    setTotalPayment(data.reports.total_payment);
    setStickerDistribution(data.reports.sticker_distribution);
    setOverallApplications(data.reports.overall_applications);
   } else {
    toast.error("An error occurred while fetching data");
   }
  } catch (err) {
   console.error(err);
   toast.info("An error occurred while fetching data");
  } finally {
   setLoading(false); // Stop loading
  }
 };

 useEffect(() => {
  getReportData();
 }, [filterType]);

 if (loading) {
  return (
   <StaffLayout>
    <div className="flex justify-center items-center h-[300px]">
     <p className="text-xl text-gray-500">Loading reports...</p>
    </div>
   </StaffLayout>
  );
 }

 return (
  <StaffLayout>
   <div className="flex items-center justify-between">
    <h1 className="text-2xl font-semibold">Reports</h1>
    <div className="flex items-center gap-2">
     <select
      value={filterType}
      onChange={(e) => setFilterType(e.target.value)}
      className="p-2 border border-gray-200 rounded-md px-8 cursor-pointer"
     >
      <option value="month">Month</option>
      <option value="week">Week</option>
      <option value="year">Year</option>
     </select>
     <ReportGenerator
      reports={{
       total_vehicle_stickers: totalVehicleData,
       total_payment: totalPayment,
       sticker_distribution: stickerDistribution,
       overall_applications: overallApplications,
      }}
     />
    </div>
   </div>
   <div className="mt-5">
    <div className="flex items-start gap-5">
     <VehicleStickersChart data={totalVehicleData} />
     <TotalPaymentChart data={totalPayment} />
    </div>
    <div className="mt-5 flex items-start gap-5 w-full">
     <div className="w-full">
      <PaymentStatusChart data={overallApplications} />
     </div>
    </div>
   </div>
  </StaffLayout>
 );
};
