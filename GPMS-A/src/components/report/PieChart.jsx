import React from "react";
import ReactApexChart from "react-apexcharts";

const PieChart = ({ data }) => {
 // Convert object to array [approved, rejected, pending]
 const seriesData = data
  ? [
     data.total_approved || 0,
     data.total_rejected || 0,
     data.total_pending || 0,
    ]
  : [0, 0, 0];

 const chartOptions = {
  series: seriesData, // Raw values (not percentages)
  colors: ["#0F4C5C", "#F46530", "#D6D3D1"], // Approved, Rejected, Pending colors
  chart: {
   type: "pie",
  },
  stroke: {
   colors: ["white"],
   width: 2,
  },
  labels: ["Approved", "Rejected", "Pending"], // Labels should match data order
  dataLabels: {
   enabled: true,
   formatter: (val, { seriesIndex }) => `${seriesData[seriesIndex]}`, // Show actual count
   style: {
    fontSize: "16px",
    fontWeight: 600,
    colors: ["#ffffff"],
   },
   textAnchor: "middle",
   distributed: true,
   offsetX: 0,
   offsetY: 0,
   position: "center",
  },
  plotOptions: {
   pie: {
    dataLabels: {
     offset: -20, // Negative value moves labels toward center
     minAngleToShowLabel: 10,
    },
    donut: {
     size: "0%",
    },
   },
  },
  legend: {
   show: false, // Hide default legend
  },
  responsive: [
   {
    breakpoint: 1024,
    options: {
     chart: {
      width: "30%",
     },
     dataLabels: {
      style: {
       fontSize: "14px",
      },
     },
    },
   },
   {
    breakpoint: 600,
    options: {
     chart: {
      height: 200,
     },
     dataLabels: {
      style: {
       fontSize: "12px",
      },
     },
    },
   },
  ],
 };

 return (
  <div className="flex flex-col w-full space-x-4 bg-white p-4 rounded-lg border border-gray-200 shadow max-w-md">
   <h2 className="text-lg font-semibold text-gray-900">Total Applications</h2>
   <div className="flex items-center justify-between">
    {/* Legend Section */}
    <div className="flex flex-col space-y-2">
     <div className="flex items-center space-x-2">
      <span className="w-4 h-4 bg-[#0F4C5C] rounded-sm"></span>
      <span className="text-gray-700 text-sm">Approved: {seriesData[0]}</span>
     </div>
     <div className="flex items-center space-x-2">
      <span className="w-4 h-4 bg-[#F46530] rounded-sm"></span>
      <span className="text-gray-700 text-sm">Rejected: {seriesData[1]}</span>
     </div>
     <div className="flex items-center space-x-2">
      <span className="w-4 h-4 bg-[#D6D3D1] rounded-sm"></span>
      <span className="text-gray-700 text-sm">Pending: {seriesData[2]}</span>
     </div>
    </div>
    {/* Pie Chart Section */}
    <div className="w-full md:w-38">
     <ReactApexChart
      options={chartOptions}
      series={seriesData} // Use raw count
      type="pie"
     />
    </div>
   </div>
  </div>
 );
};

export default PieChart;
