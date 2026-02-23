import React from "react";
import Chart from "react-apexcharts";

const PaymentStatusChart = ({ data }) => {
 console.log("overall Application Data: ", data);

 const options = {
  chart: { type: "area", toolbar: { show: false } },
  colors: data.series.map((s) => s.color || "#000"),
  fill: {
   type: "gradient",
   gradient: {
    shadeIntensity: 1,
    opacityFrom: 0.6,
    opacityTo: 0.1,
    stops: [0, 100],
   },
  },
  stroke: { curve: "smooth", width: 2 },
  xaxis: {
   categories: data.categories,
   labels: {
    rotate: -45, // Rotate x-axis labels to prevent overlap
    style: { fontSize: "12px" },
   },
  },
  yaxis: {
   min: data.yAxis?.min ?? 0,
   max: data.yAxis?.max ?? 100,
   tickAmount: 5, // Reduce tick lines for cleaner y-axis
   labels: {
    formatter: (value) => (value % 20 === 0 ? value : ""), // Hide some y-axis labels
   },
  },
  tooltip: {
   enabled: true,
   shared: true, // Make sure all series values are shown in tooltip
   intersect: false, // Show tooltip on nearest point, not just on direct hover
   followCursor: true, // Better user experience
   y: {
    formatter: (value) => `${value}`, // Ensure values are displayed properly
   },
  },
  legend: { show: true, position: "top" },
  grid: { show: true, strokeDashArray: 4 },
 };

 const series = data.series.map(({ name, data }) => ({ name, data }));

 return (
  <div className="bg-white p-4 h-[350px] rounded-lg shadow border border-gray-200 w-full max-w-full overflow-hidden">
   <h3 className="text-lg font-semibold">
    Overall Applications -{" "}
    {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
   </h3>
   <Chart options={options} series={series} type="area" height={300} />
  </div>
 );
};

export default PaymentStatusChart;
