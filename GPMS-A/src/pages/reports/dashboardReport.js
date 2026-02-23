import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

const getUniqueVehicleTypes = (data) => {
 const types = new Set();
 data.forEach((row) => {
  Object.keys(row).forEach((key) => {
   // Skip non-vehicle type keys
   if (!["role", "Total"].includes(key)) {
    types.add(key);
   }
  });
 });
 return Array.from(types);
};

export const GenerateDashboardReport = async (
 overviewData,
 timeFilter,
 vehicleTypeFilter,
 setIsGenerating
) => {
 // Debug logging
 console.log("Received data:", {
  overviewData,
  timeFilter,
  vehicleTypeFilter,
 });

 // Enhanced validation
 if (!overviewData || Object.keys(overviewData).length === 0) {
  toast.error("No data available to download");
  return;
 }

 // Validate required data structures
 const requiredStructures = [
  "application_status",
  "sticker_types",
  "charges_summary",
  "vehicle_counts",
 ];

 const missingStructures = requiredStructures.filter(
  (key) => !overviewData[key]
 );
 if (missingStructures.length > 0) {
  console.error("Missing data structures:", missingStructures);
  toast.error(`Missing required data: ${missingStructures.join(", ")}`);
  return;
 }

 // Validate vehicle_counts structure
 if (
  !overviewData.vehicle_counts.headers ||
  !overviewData.vehicle_counts.data
 ) {
  console.error(
   "Invalid vehicle_counts structure:",
   overviewData.vehicle_counts
  );
  toast.error("Invalid vehicle counts data structure");
  return;
 }

 setIsGenerating(true);

 try {
  // Log the specific data being used in tables
  console.log("Vehicle Counts Data:", {
   headers: overviewData.vehicle_counts.headers,
   data: overviewData.vehicle_counts.data,
   summary: overviewData.vehicle_counts.summary,
  });

  // Common styles
  const createStyledContainer = () => {
   const container = document.createElement("div");
   container.style.position = "absolute";
   container.style.left = "-9999px";
   container.style.top = "0";
   container.style.width = "800px";
   container.style.background = "white";
   container.style.padding = "40px";
   container.style.fontFamily = "Arial, sans-serif";
   container.style.fontSize = "12px";
   container.style.boxSizing = "border-box";
   container.style.minHeight = "1120px"; // almost full A4
   container.style.display = "flex";
   container.style.flexDirection = "column";
   container.style.justifyContent = "space-between";
   return container;
  };

  const page1 = createStyledContainer();
  const page2 = createStyledContainer();

  // Build Page 1 Content
  page1.innerHTML = `
  <div>
    <h2 style="text-align:center; color:#2c3e50; font-size: 24px;"><strong>GPMS Dashboard Report</strong></h2>
     <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
     )}</p>
    <p><strong>Time Filter:</strong> ${
     timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)
    }</p>
    <p><strong>Vehicle Type Filter:</strong> ${vehicleTypeFilter}</p>

    ${
     overviewData.application_status
      ? `
        <h3 style="margin-top:30px;">1. Total Applications</h3>
        <table style="width:100%; border-collapse:collapse; margin-top:10px; margin-bottom:20px;">
          <thead>
            <tr style="background-color: #f8f9fc;">
              <th style="border:1px solid #ccc; padding:10px;">Status</th>
              <th style="border:1px solid #ccc; padding:10px;">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #ccc; padding:10px;  width: 400px;">Approved</td>
              <td style="border:1px solid #ccc; padding:10px; text-align:center;">${overviewData.application_status.total_approved}</td>
            </tr>
            <tr>
              <td style="border:1px solid #ccc; padding:10px;  width: 400px;">Rejected</td>
              <td style="border:1px solid #ccc; padding:10px; text-align:center;">${overviewData.application_status.total_rejected}</td>
            </tr>
            <tr>
              <td style="border:1px solid #ccc; padding:10px;  width: 400px;">Pending</td>
              <td style="border:1px solid #ccc; padding:10px; text-align:center;">${overviewData.application_status.total_pending}</td>
            </tr>
          </tbody>
        </table>
      `
      : ""
    }

    ${
     overviewData.sticker_types
      ? `
        <h3 style="margin-top:30px;">2. Sticker Type Distribution</h3>
        <table style="width:100%; border-collapse:collapse; margin-top:10px; margin-bottom:20px;">
          <thead>
            <tr style="background-color: #f8f9fc;">
              <th style="border:1px solid #ccc; padding:10px;">Sticker Type</th>
              <th style="border:1px solid #ccc; padding:10px;">Count</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(overviewData.sticker_types)
             .map(
              ([key, value]) => `
                <tr>
                  <td style="border:1px solid #ccc; padding:10px;  width: 400px;">${key
                   .replace("total_", "")
                   .toUpperCase()}</td>
                  <td style="border:1px solid #ccc; padding:10px; text-align:center;">${value}</td>
                </tr>
              `
             )
             .join("")}
          </tbody>
        </table>
      `
      : ""
    }

    ${
     overviewData.charges_summary
      ? `
        <h3 style="margin-top:30px;">3. Payment Status</h3>
        <table style="width:100%; border-collapse:collapse; margin-top:10px;">
          <thead>
            <tr style="background-color: #f8f9fc;">
              <th style="border:1px solid #ccc; padding:10px;">Status</th>
              <th style="border:1px solid #ccc; padding:10px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #ccc; padding:10px;  width: 400px;">Ammount Collected</td>
              <td style="border:1px solid #ccc; padding:10px; text-align:center;">${overviewData.charges_summary.approved.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="border:1px solid #ccc; padding:10px;  width: 400px;">Pending Amount</td>
              <td style="border:1px solid #ccc; padding:10px; text-align:center;">${overviewData.charges_summary.pending.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="border:1px solid #ccc; padding:10px; font-weight:bold;  width: 400px;">Overall Total</td>
              <td style="border:1px solid #ccc; padding:10px; text-align:center; font-weight:bold;">${overviewData.charges_summary.overall_total.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      `
      : ""
    }
  </div>
`;

  // Update page2 content before the html2canvas calls
  page2.innerHTML = `
  <div>
  <h3 style="margin-top:30px;">4. Vehicle Type Distribution</h3>
    <table style="width:100%; border-collapse:collapse; margin-top:10px;">
      <thead>
        <tr style="background-color: #f8f9fc;">
          <th style="border:1px solid #ccc; padding:10px;">Vehicle Type</th>
          <th style="border:1px solid #ccc; padding:10px;">Count</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(overviewData.vehicle_counts.summary.by_type)
         .map(([type, count]) => {
          console.log(`Processing vehicle type: ${type}, count: ${count}`);
          return `
            <tr>
              <td style="border:1px solid #ccc; padding:10px; width: 400px;">${type}</td>
              <td style="border:1px solid #ccc; padding:10px; text-align:center;">${
               count || 0
              }</td>
            </tr>
          `;
         })
         .join("")}
      </tbody>
    </table>
    
    <h3 style="margin-top:30px;">5. Vehicle Distribution by Role and Type</h3>
    <table style="width:100%; border-collapse:collapse; margin-top:10px;">
      <thead>
        <tr style="background-color: #f8f9fc;">
          <th style="border:1px solid #ccc; padding:10px;">Role</th>
          ${getUniqueVehicleTypes(overviewData.vehicle_counts.data)
           .map(
            (type) =>
             `<th style="border:1px solid #ccc; padding:10px;">${type}</th>`
           )
           .join("")}
          <th style="border:1px solid #ccc; padding:10px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${overviewData.vehicle_counts.data
         .filter((row) => row.role !== "Total")
         .map(
          (row) => `
            <tr>
              <td style="border:1px solid #ccc; padding:10px;">${row.role}</td>
              ${getUniqueVehicleTypes(overviewData.vehicle_counts.data)
               .map(
                (type) => `
                  <td style="border:1px solid #ccc; padding:10px; text-align:center;">
                    ${row[type] ?? 0}
                  </td>
                `
               )
               .join("")}
              <td style="border:1px solid #ccc; padding:10px; text-align:center;">
                ${row.Total ?? 0}
              </td>
            </tr>
          `
         )
         .join("")}
        <tr style="background-color: #f8f9fc; font-weight: bold;">
          <td style="border:1px solid #ccc; padding:10px;">Total</td>
          ${getUniqueVehicleTypes(overviewData.vehicle_counts.data)
           .map(
            (type) => `
              <td style="border:1px solid #ccc; padding:10px; text-align:center;">
                ${overviewData.vehicle_counts.summary.by_type[type] ?? 0}
              </td>
            `
           )
           .join("")}
          <td style="border:1px solid #ccc; padding:10px; text-align:center;">
            ${overviewData.vehicle_counts.summary.total_vehicles ?? 0}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
`;

  // Attach hidden containers
  document.body.appendChild(page1);
  document.body.appendChild(page2);

  const canvas1 = await html2canvas(page1, { scale: 2 });
  const canvas2 = await html2canvas(page2, { scale: 2 });

  const imgData1 = canvas1.toDataURL("image/png");
  const imgData2 = canvas2.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const imgProps1 = pdf.getImageProperties(imgData1);
  const imgProps2 = pdf.getImageProperties(imgData2);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight1 = (imgProps1.height * pdfWidth) / imgProps1.width;
  const pdfHeight2 = (imgProps2.height * pdfWidth) / imgProps2.width;

  pdf.addImage(imgData1, "PNG", 0, 0, pdfWidth, pdfHeight1);
  pdf.addPage();
  pdf.addImage(imgData2, "PNG", 0, 0, pdfWidth, pdfHeight2);

  pdf.save(`gpms_dashboard_report_${new Date().toISOString()}.pdf`);

  document.body.removeChild(page1);
  document.body.removeChild(page2);

  toast.success("PDF generated successfully!");
 } catch (error) {
  console.error("Failed to generate report:", error);
  toast.error("Failed to generate report");
 } finally {
  setIsGenerating(false);
 }
};
