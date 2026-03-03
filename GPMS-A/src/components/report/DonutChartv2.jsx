import React from "react";
import ReactApexChart from "react-apexcharts";

const DonutChartv2 = ({ data }) => {
 const approved = Number(data?.approved ?? 0);
 const pending = Number(data?.pending ?? 0);
 const total = approved + pending;

 const chartOptions = {
  series: total > 0 ? [approved, pending] : [0, 0],
  colors: ["#0F4C5C", "#D6D3D1"],
  chart: { type: "donut" },
  stroke: { colors: ["white"] },
  labels: ["Approved", "Pending"],
  dataLabels: { enabled: false },
  legend: { show: false },
  tooltip: {
   enabled: true,
   y: {
    formatter: (val) => `${val} transactions`,
   },
  },
  plotOptions: {
   pie: {
    donut: {
     size: "70%",
     labels: {
      show: true,
      total: {
       show: true,
       label: "Total",
       formatter: () => `${total}`,
       color: "#0F4C5C",
       fontSize: "16px",
       fontWeight: 600,
      },
     },
    },
   },
  },
  responsive: [
   {
    breakpoint: 1024,
    options: {
     chart: { width: "100%" },
     plotOptions: {
      pie: { donut: { labels: { total: { fontSize: "30px" } } } },
     },
    },
   },
   {
    breakpoint: 600,
    options: {
     chart: { height: 150 },
     plotOptions: {
      pie: { donut: { labels: { total: { fontSize: "12px" } } } },
     },
    },
   },
  ],
 };

 return (
  <div className="flex flex-col w-full space-x-4 bg-white p-4 rounded-lg border border-gray-200 shadow max-w-md">
   <h2 className="text-lg font-semibold text-gray-900">Payment Status</h2>
   <div className="flex items-center justify-between">
    {/* Legend with numbers */}
    <div className="flex flex-col space-y-2 pr-4">
     <div className="flex items-center space-x-2">
      <span className="w-4 h-4 bg-[#0F4C5C] rounded-full"></span>
      <span className="text-gray-700 text-sm">Amount Collected: {approved}</span>
     </div>
     <div className="flex items-center space-x-2">
      <span className="w-4 h-4 bg-[#D6D3D1] rounded-full"></span>
      <span className="text-gray-700 text-sm">Pending Amount: {pending}</span>
     </div>
    </div>

    {/* Donut Chart */}
    <div className="w-full md:w-42">
     <ReactApexChart
      options={chartOptions}
      series={chartOptions.series}
      type="donut"
     />
    </div>
   </div>
  </div>
 );
};

export default DonutChartv2;
