// src/components/report/ReportGenerator.jsx
import React, { useState } from "react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const ReportGenerator = ({ reports }) => {
 const [isGenerating, setIsGenerating] = useState(false);

 const downloadReport = async () => {
  if (!reports) {
   toast.error("No data available to download");
   return;
  }

  setIsGenerating(true);

  const { total_vehicle_stickers, total_payment, overall_applications } =
   reports;

  try {
   // Create page 1 content
   const page1Content = document.createElement("div");
   page1Content.style.position = "absolute";
   page1Content.style.left = "-9999px";
   page1Content.style.top = "0";
   page1Content.style.width = "800px"; // Updated width
   page1Content.style.background = "white"; // Added background
   page1Content.style.padding = "40px"; // Added padding
   page1Content.style.fontFamily = "Arial, sans-serif"; // Added font family
   page1Content.innerHTML = `
     <div>
       <h1 style="text-align:center; color:#2c3e50; font-size: 24px;"><strong>GPMS Vehicle Sticker Report</strong></h2>
       <p style="padding-top: 40px;"><strong>Report Generated:</strong> ${new Date().toLocaleDateString(
        "en-US",
        {
         year: "numeric",
         month: "long",
         day: "numeric",
        }
       )}</p>

       <h3 style="margin-top:30px;">1. Vehicle Sticker Distribution</h3>
       <table style="width:100%; border-collapse:collapse; margin-top:10px;">
         <thead>
           <tr style="background-color: #f8f9fc;">
             <th style="border:1px solid #ccc; padding:10px;">Type</th>
             <th style="border:1px solid #ccc; padding:10px;">Available</th>
             <th style="border:1px solid #ccc; padding:10px;">Used</th>
           </tr>
         </thead>
         <tbody>
           ${total_vehicle_stickers.categories
            .map(
             (category, index) => `
             <tr>
               <td style="border:1px solid #ccc; padding:10px;">${category}</td>
               <td style="border:1px solid #ccc; padding:10px; text-align:center;">${total_vehicle_stickers.series[0].data[index]}</td>
               <td style="border:1px solid #ccc; padding:10px; text-align:center;">${total_vehicle_stickers.series[1].data[index]}</td>
             </tr>
           `
            )
            .join("")}
         </tbody>
       </table>

       <h3 style="margin-top:30px;">2. Payment Summary</h3>
       <table style="width:100%; border-collapse:collapse; margin-top:10px;">
         <thead>
           <tr style="background-color: #f8f9fc;">
             <th style="border:1px solid #ccc; padding:10px;">Type</th>
             <th style="border:1px solid #ccc; padding:10px;">Pending Amount</th>
             <th style="border:1px solid #ccc; padding:10px;">Amount Collected</th>
           </tr>
         </thead>
         <tbody>
           ${total_payment.categories
            .map(
             (category, index) => `
             <tr>
               <td style="border:1px solid #ccc; padding:10px;">${category}</td>
               <td style="border:1px solid #ccc; padding:10px; text-align:center;">${total_payment.series[0].data[index]}</td>
               <td style="border:1px solid #ccc; padding:10px; text-align:center;">${total_payment.series[1].data[index]}</td>
             </tr>
           `
            )
            .join("")}
         </tbody>
       </table>
       <div style="text-align:right; margin-top:8px;">
         <span><strong>Expected Total Amount:</strong> ${
          total_payment.summary.expect_total
         }</span>
         <span style="margin-left:15px;"><strong>Total Amount Collected:</strong> ${
          total_payment.summary.sold_total
         }</span>
       </div>
     </div>
   `;

   // Create page 2 content
   const page2Content = document.createElement("div");
   page2Content.style.position = "absolute";
   page2Content.style.left = "-9999px";
   page2Content.style.top = "0";
   page2Content.style.width = "800px"; // Updated width
   page2Content.style.background = "white"; // Added background
   page2Content.style.padding = "40px"; // Added padding
   page2Content.style.fontFamily = "Arial, sans-serif"; // Added font family
   page2Content.innerHTML = `
     <div>
       <h3 style="margin-top:30px;">3. Overall Applications</h3>
       <table style="width:100%; border-collapse:collapse; margin-top:10px;">
         <thead>
           <tr style="background-color: #f8f9fc;">
             <th style="border:1px solid #ccc; padding:10px;">Month</th>
             <th style="border:1px solid #ccc; padding:10px;">Approved</th>
             <th style="border:1px solid #ccc; padding:10px;">Pending</th>
           </tr>
         </thead>
         <tbody>
           ${overall_applications.categories
            .map(
             (month, index) => `
             <tr>
               <td style="border:1px solid #ccc; padding:10px;">${month}</td>
               <td style="border:1px solid #ccc; padding:10px; text-align:center;">${overall_applications.series[0].data[index]}</td>
               <td style="border:1px solid #ccc; padding:10px; text-align:center;">${overall_applications.series[1].data[index]}</td>
             </tr>
           `
            )
            .join("")}
         </tbody>
       </table>
     </div>
   `;

   document.body.appendChild(page1Content);
   document.body.appendChild(page2Content);

   // Wait for fonts and images to load
   await new Promise((resolve) => setTimeout(resolve, 1000));

   // Capture page 1
   const canvas1 = await html2canvas(page1Content, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: 800, // Updated width
    height: 1120, // Adjusted height for A4
   });

   // Capture page 2
   const canvas2 = await html2canvas(page2Content, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: 800, // Updated width
    height: 1120, // Adjusted height for A4
   });

   // Create PDF
   const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: "a4",
    hotfixes: ["px_scaling"],
   });

   // Add page 1
   pdf.addImage(
    canvas1.toDataURL("image/jpeg", 0.98),
    "JPEG",
    0,
    0,
    800, // Updated width
    1120, // Adjusted height for A4
    undefined,
    "FAST"
   );

   // Add page 2
   pdf.addPage();
   pdf.addImage(
    canvas2.toDataURL("image/jpeg", 0.98),
    "JPEG",
    0,
    0,
    800, // Updated width
    1120, // Adjusted height for A4
    undefined,
    "FAST"
   );

   // Save PDF
   pdf.save(`gpms-report-${new Date().toISOString().split("T")[0]}.pdf`);
   toast.success("Report downloaded successfully");
  } catch (error) {
   console.error("Error generating PDF:", error);
   toast.error("Failed to generate PDF report.");
  } finally {
   // Clean up
   const elements = document.querySelectorAll("div[style*='-9999px']");
   elements.forEach((el) => {
    if (document.body.contains(el)) {
     document.body.removeChild(el);
    }
   });
   setIsGenerating(false);
  }
 };

 return (
  <button
   onClick={downloadReport}
   disabled={isGenerating}
   className="h-10 bg-primary text-white font-regular px-4 rounded-md hover:bg-primary/90 transition-colors disabled:bg-primary/70 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
  >
   {isGenerating ? (
    <>
     <svg
      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
    "Download Report"
   )}
  </button>
 );
};

export default ReportGenerator;
