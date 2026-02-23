import { useState, useEffect } from "react";
import { Overview } from "../../components/dashboard/Overview";
import { OverviewDashboard } from "../../components/report/OverviewDashboard";
import { AdminLayout } from "../../layouts/AdminLayout";
import { BatchSticker } from "./BatchSticker";
import { buildUrl } from "../../utils/buildUrl";
import { toast } from "sonner";
import { GenerateDashboardReport } from "../reports/dashboardReport.js";

export const Dashboard = () => {
 const [batchPage, setBatchPage] = useState(false);
 const [overviewData, setOverviewData] = useState([]);
 const [timeFilter, setTimeFilter] = useState("month");
 const [vehicleTypeFilter, setVehicleTypeFilter] = useState("All");
 const [isGenerating, setIsGenerating] = useState(false);

 const getDashboardData = async () => {
  try {
   const res = await fetch(
    buildUrl(
     `/management/dashboard?time_filter=${timeFilter}&vehicle_type=${vehicleTypeFilter}`
    ),
    {
     method: "GET",
     headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    }
   );
   const data = await res.json();
   if (res.ok) {
    setOverviewData(data);
   } else {
    toast.info(data.detail);
   }
  } catch (err) {
   toast.info("An error occurred, please try again later!");
  }
 };

 useEffect(() => {
  getDashboardData();
 }, [timeFilter, vehicleTypeFilter]);

 const downloadDashboardReport = async () => {
  await GenerateDashboardReport(
   overviewData,
   timeFilter,
   vehicleTypeFilter,
   setIsGenerating
  );
 };

 return (
  <AdminLayout>
   {!batchPage ? (
    <div className="flex items-center justify-between">
     <h1 className="text-2xl font-semibold">Dashboard</h1>

     <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
       <select
        name=""
        id=""
        className="h-10 px-4 bg-gray-100 rounded-lg"
        onChange={(e) => setVehicleTypeFilter(e.target.value)}
       >
        <option value="All">All</option>
        <option value="Car">Car</option>
        <option value="Motorcycle">Motorcycle</option>
        <option value="Truck">Truck</option>
        <option value="Tricycle">Tricycle</option>
       </select>
       <select
        name=""
        id=""
        className="h-10 bg-gray-100 rounded-lg "
        onChange={(e) => setTimeFilter(e.target.value)}
       >
        <option value="month">Month</option>
        <option value="today">Today</option>
        <option value="week">Week</option>
       </select>
       <div>
        <button
         onClick={downloadDashboardReport}
         disabled={isGenerating}
         className="h-10 border border-primary rounded-md px-4 text-primary hover:bg-primary hover:text-white transition duration-200 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
         {isGenerating ? (
          <>
           <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
           >
            <circle
             className="opacity-25"
             cx="12"
             cy="12"
             r="10"
             stroke="currentColor"
             strokeWidth="4"
            ></circle>
            <path
             className="opacity-75"
             fill="currentColor"
             d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
           </svg>
           Generating...
          </>
         ) : (
          "Download"
         )}
        </button>
       </div>
      </div>
      <button
       onClick={() => setBatchPage(true)}
       className="h-10 px-4 bg-primary text-white rounded-lg"
      >
       Batch Sticker
      </button>
     </div>
    </div>
   ) : (
    ""
   )}
   {batchPage ? (
    <BatchSticker close={() => setBatchPage(false)} />
   ) : (
    <div>
     <div>
      <OverviewDashboard data={overviewData} />
     </div>
     <div className="mt-3">
      <Overview
       data={overviewData}
       timeFilter={timeFilter}
       setTimeFilter={setTimeFilter}
       vehicleTypeFilter={vehicleTypeFilter}
       setVehicleTypeFilter={setVehicleTypeFilter}
      />
     </div>
    </div>
   )}
  </AdminLayout>
 );
};
