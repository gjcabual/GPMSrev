import React, { useState } from "react";
import ReactApexChart from "react-apexcharts";

const DonutChart = ({ data }) => {
 const [hoveredIndex, setHoveredIndex] = useState(null);

 const totalEmployee = data?.total_employee || 0;
 const totalDropoff = data?.total_dropoff || 0;
 const totalStudent = data?.total_student || 0;
 const totalConcessionaire = data?.total_concessionaire || 0;

 const total =
  totalEmployee + totalDropoff + totalStudent + totalConcessionaire;

 const labels = ["Employee", "Drop-off", "Student", "Concessionaire"];
 const seriesData = [
  totalEmployee,
  totalDropoff,
  totalStudent,
  totalConcessionaire,
 ];

 const chartOptions = {
  series: seriesData,
  labels,
  colors: ["#0F4C5C", "#5D0E8A", "#F4D03F", "#F46530"],
  chart: {
   type: "donut",
   events: {
    dataPointMouseEnter: (event, chartContext, config) => {
     setHoveredIndex(config.dataPointIndex);
    },
    dataPointMouseLeave: () => {
     setHoveredIndex(null);
    },
   },
  },
  stroke: {
   colors: ["white"],
   width: 2,
  },
  plotOptions: {
   pie: {
    startAngle: 0,
    endAngle: 360,
    expandOnClick: false,
    offsetX: 0,
    offsetY: 0,
    customScale: 1,
    dataLabels: {
     offset: 0,
     minAngleToShowLabel: 10,
    },
    donut: {
     size: "70%",
     labels: {
      show: true,
      name: {
       show: true, // Hide the segment labels
      },
      value: {
       show: true, // Hide the values
      },
      total: {
       show: true,
       showAlways: true,
       label: "Overall",
       fontSize: "16px",
       fontWeight: 500,
       color: "#373d3f",
       formatter: function () {
        return total;
       },
      },
     },
    },
   },
  },
  dataLabels: {
   enabled: false, // This ensures no labels appear on the segments
  },
  tooltip: {
   enabled: true,
   y: {
    formatter: function (val, { seriesIndex }) {
     return `${seriesData[seriesIndex]}`;
    },
   },
  },
  legend: {
   show: false,
  },
  responsive: [
   {
    breakpoint: 1024,
    options: {
     plotOptions: {
      pie: {
       donut: {
        labels: {
         total: { fontSize: "30px" }, // Large for bigger screens
        },
       },
      },
     },
    },
   },
   {
    breakpoint: 600,
    options: {
     chart: { height: 150 },
     plotOptions: {
      pie: {
       donut: {
        labels: {
         total: { fontSize: "12px" }, // Small for mobile
        },
       },
      },
     },
    },
   },
  ],
 };

 return (
  <div className="flex flex-col w-full space-x-4 bg-white p-4 rounded-lg border border-gray-200 shadow max-w-md">
   <h2 className="text-lg font-semibold text-gray-900">Registered Stickers</h2>
   <div className="flex items-center justify-between">
    <div className="flex flex-col space-y-2">
     {labels.map((label, index) => (
      <div key={index} className="flex items-center space-x-2">
       <span
        className={`w-4 h-4`}
        style={{ backgroundColor: chartOptions.colors[index] }}
       ></span>
       <span className="text-gray-700 text-sm">
        {label}: {seriesData[index]}
       </span>
      </div>
     ))}
    </div>
    <div className="w-full md:w-42">
     <ReactApexChart options={chartOptions} series={seriesData} type="donut" />
    </div>
   </div>
  </div>
 );
};

export default DonutChart;
