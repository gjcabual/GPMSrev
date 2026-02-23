import { useState, useEffect } from "react";
import DonutChart from "./DonutChart";
import DonutChartv2 from "./DonutChartv2";
import PieChart from "./PieChart";

export const OverviewDashboard = ({ data }) => {

 const [totalApplication, setTotalApplication] = useState([]);
 const [registered, setRegistered] = useState([]);
 const [charges, setCharges] = useState([]);

 useEffect(() => {
  if (data) {
   setTotalApplication(data.application_status || []);
   setRegistered(data.sticker_types || []);
   setCharges(data.charges_summary || []);
  }
 }, [data]);

 return (
  <div className="w-full mt-5 flex flex-nowrap justify-between gap-3">
   <PieChart data={totalApplication} />
   <DonutChart data={registered} />
   <DonutChartv2 data={charges} />
  </div>
 );
};
