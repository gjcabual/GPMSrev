import React from "react";
import ReactApexChart from "react-apexcharts";

const VehicleStickersChart = ({ data }) => {


 const chartOptions = {
  series: data.series,
  chart: {
   type: "bar",
   stacked: true,
  },
  colors: ["#1ABC9C", "#E74C3C"], // Green & Red
  plotOptions: {
   bar: {
    horizontal: true,
    borderRadius: 5,
    borderRadiusApplication: "end", // Rounds only the right side
    barHeight: "50%",
   },
  },
  xaxis: {
   categories: data.categories,
  },
  legend: {
   position: "bottom",
  },
 };

 return (
  <div className="bg-white p-4 h-[350px] rounded-lg shadow border border-gray-200 w-full">
   <h2 className="text-lg font-semibold text-gray-900">
    Total Vehicle Stickers
   </h2>
   <ReactApexChart
    options={chartOptions}
    series={chartOptions.series}
    type="bar"
    height={250}
   />
  </div>
 );
};

export default VehicleStickersChart;
