import React from "react";
import ReactApexChart from "react-apexcharts";

const TotalPaymentChart = ({ data }) => {
 const { expect_total, sold_total } = data.summary;

 const renamedSeries = data.series.map((s) => ({
  ...s,
  name:
   s.name === "Pending"
    ? "Pending Amount"
    : s.name === "Sold"
    ? "Amount Collected"
    : s.name,
 }));

 const chartOptions = {
  series: renamedSeries,
  chart: {
   type: "bar",
  },
  colors: ["#1ABC9C", "#A5A3A1"], // Green & Gray
  plotOptions: {
   bar: {
    columnWidth: "50%",
    borderRadius: 5, // Rounded corners
   },
  },
  xaxis: {
   categories: data.categories,
  },
  legend: {
   position: "bottom",
   labels: {
    useSeriesColors: true,
   },
  },
 };

 return (
  <div className="bg-white p-4 h-[350px] rounded-lg shadow border border-gray-200 w-full">
   <h2 className="text-lg font-semibold text-gray-900">Total Payment</h2>
   <p className="text-sm text-gray-700">
    Expected Total Amount: <strong>₱{expect_total.toFixed(2)}</strong> &nbsp; |
    &nbsp; Amount Collected: <strong>₱{sold_total.toFixed(2)}</strong>
   </p>
   <ReactApexChart
    options={chartOptions}
    series={chartOptions.series}
    type="bar"
    height={250}
   />
  </div>
 );
};

export default TotalPaymentChart;
