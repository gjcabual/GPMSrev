import React from "react";
import ReactApexChart from "react-apexcharts";

const PaymentStickerChart = ({ data }) => {


  const chartOptions = {
    series: data.series,
    colors: data.colors,
    chart: {
      type: "donut",
    },
    labels: data.labels,
    dataLabels: {
      enabled: false,
    },
    legend: {
      position: "bottom",
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: "Overall",
              fontSize: "14px",
              fontWeight: 600,
            },
          },
        },
      },
    },
  };

  return (
    <div className="bg-white p-4 w-[300px] h-[350px] rounded-lg shadow border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-700 text-center mb-4">
        Payment by Sticker
      </h2>
      <ReactApexChart options={chartOptions} series={chartOptions.series} type="donut" height={260} />
    </div>
  );
};

export default PaymentStickerChart;
