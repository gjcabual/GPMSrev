import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { buildUrl } from "../../utils/buildUrl";
import { IoCloseCircle } from "react-icons/io5";
import { FaSearch } from "react-icons/fa";

// Image display component that fetches image from backend
const ImageDisplay = ({ imageUrl, alt, className, fallback }) => {
 const [image, setImage] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(false);
 const [showModal, setShowModal] = useState(false);

 useEffect(() => {
  if (!imageUrl) {
   setLoading(false);
   setError(true);
   return;
  }

  const fetchImage = async () => {
   try {
    // Remove '/api/v1' from the URL if present to prevent duplication
    let cleanedUrl = imageUrl;
    if (cleanedUrl.includes("/api/v1")) {
     cleanedUrl = cleanedUrl.replace("/api/v1", "");
    }

    // Add a timestamp to prevent caching
    const urlWithTimestamp = `${cleanedUrl}${
     cleanedUrl.includes("?") ? "&" : "?"
    }t=${Date.now()}`;

    const response = await fetch(buildUrl(`${urlWithTimestamp}`), {
     method: "GET",
     headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    });

    if (!response.ok) {
     throw new Error("Failed to fetch image");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    setImage(objectUrl);
    setLoading(false);
   } catch (err) {
    console.error("Error fetching image:", err);
    setError(true);
    setLoading(false);
   }
  };

  fetchImage();

  // Cleanup function to revoke object URL
  return () => {
   if (image) {
    URL.revokeObjectURL(image);
   }
  };
 }, [imageUrl]);

 if (loading) {
  return (
   <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
    <div className="animate-pulse h-8 w-8 rounded-full bg-primary"></div>
   </div>
  );
 }

 if (error || !image) {
  return fallback;
 }

 return (
  <>
   <img
    src={image}
    alt={alt}
    className={`${className} cursor-pointer hover:opacity-90 transition-opacity`}
    onClick={() => setShowModal(true)}
   />
   {showModal && (
    <div
     className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[9999]"
     onClick={() => setShowModal(false)}
    >
     <div
      className="relative max-w-[90vw] max-h-[90vh]"
      onClick={(e) => e.stopPropagation()}
     >
      <button
       onClick={() => setShowModal(false)}
       className="absolute -top-10 right-0 text-white hover:text-gray-300"
      >
       <IoCloseCircle size={30} />
      </button>
      <img
       src={image}
       alt={alt}
       className="max-w-full max-h-[85vh] object-contain rounded-lg"
      />
     </div>
    </div>
   )}
  </>
 );
};

// Transform application data to match the format expected by ApplicationLog
const transformApplicationData = (applications) => {
 return applications.map((app) => {
  // First, determine the correct image paths
  let frontImage = app.front_image || app.front_img;
  let backImage = app.back_image || app.back_img;

  // Remove duplicate /api/v1 prefixes if they exist
  if (frontImage && frontImage.includes("/api/v1")) {
   frontImage = frontImage.replace("/api/v1", "");
  }

  if (backImage && backImage.includes("/api/v1")) {
   backImage = backImage.replace("/api/v1", "");
  }

  // Transform documents array if it exists
  const documents =
   app.documents?.map((doc) => ({
    document_id: doc.document_id,
    type: doc.type,
    image_url: doc.image_url,
    registered_at: doc.registered_at,
    expire_at: doc.expire_at,
   })) || [];

  return {
   application_id: app.application_id,
   brand: app.brand,
   building_name: app.building_name || "Main Building",
   date:
    app.date_submitted || app.date || new Date().toISOString().split("T")[0],
   model: app.model,
   plate_number: app.plate_number,
   processed_date: app.date_submitted || app.processed_date,
   vehicle_type: app.vehicle_type,
   role: app.applicant_name ? "Applicant" : app.role || "Student",
   status: app.is_rejected ? "Rejected" : app.status || "Approved",
   rejection_remarks: app.rejection_remarks || app.remarks || null,
   sticker_number: app.sticker_number || app.sticker_id || "Not Assigned",
   // Store images in both formats to ensure compatibility
   vehicle_images: {
    front: frontImage,
    back: backImage,
   },
   // These direct properties are used by the PDF generator
   front_image: frontImage,
   back_image: backImage,
   // Add documents array
   documents: documents,
  };
 });
};

export const ApplicationLog = ({
 data: initialData,
 isManagement = false,
 name,
 onFilterChange = null,
 showFilters = true,
}) => {
 const [selectedItem, setSelectedItem] = useState(null);
 const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
 const pdfContentRef = useRef(null);
 const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());
 const [filteredData, setFilteredData] = useState(initialData || []);
 const [sortOrder, setSortOrder] = useState("newest");
 const previousSortRef = useRef("newest");

 // Store filter values in ref to persist across re-renders
 const filterValuesRef = useRef({
  vehicle_type: "All",
  sticker_number: "",
  date: "",
 });

 // Use state for controlled inputs
 const [filterValues, setFilterValues] = useState(filterValuesRef.current);

 // Debounce timer reference
 const debounceTimerRef = useRef(null);

 // Update filtered data when initialData changes, but preserve filter values
 useEffect(() => {
  if (initialData) {
   if (!onFilterChange) {
    // Only apply local filters if we're not using external filtering
    applyLocalFilters(initialData, filterValuesRef.current);
   } else {
    setFilteredData(initialData);
   }
  }
 }, [initialData]);

 // Apply filters to local data
 const applyLocalFilters = useCallback((data, filters) => {
  let results = [...data];

  // Filter by vehicle type (case sensitive)
  if (filters.vehicle_type && filters.vehicle_type !== "All") {
   results = results.filter(
    (item) => item.vehicle_type === filters.vehicle_type
   );
  }

  // Filter by sticker number
  if (filters.sticker_number) {
   results = results.filter((item) =>
    (item.sticker_number || item.sticker_id || "")
     .toLowerCase()
     .includes(filters.sticker_number.toLowerCase())
   );
  }

  // Filter by date (YYYY-MM-DD format)
  if (filters.date) {
   const filterDate = new Date(filters.date).toISOString().split("T")[0];
   results = results.filter((item) => {
    if (!item.date) return false;
    const itemDate = new Date(item.date).toISOString().split("T")[0];
    return itemDate === filterDate;
   });
  }

  setFilteredData(results);
 }, []);

 // Handle filter changes with debounce
 const handleFilterChange = useCallback(
  (type, value) => {
   // Update both the ref and state
   const newFilters = {
    ...filterValuesRef.current,
    [type]: value,
   };

   filterValuesRef.current = newFilters;
   setFilterValues(newFilters);

   // Clear any existing timer
   if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
   }

   // Debounce the actual filtering
   debounceTimerRef.current = setTimeout(
    () => {
     if (onFilterChange) {
      // External filtering
      onFilterChange(newFilters);
     } else {
      // Local filtering
      applyLocalFilters(initialData, newFilters);
     }
    },
    type === "sticker_number" ? 500 : 200
   );
  },
  [initialData, onFilterChange, applyLocalFilters]
 );

 // Cleanup debounce timer on unmount
 useEffect(() => {
  return () => {
   if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
   }
  };
 }, []);

 // Update selected item when filtered data changes
 const sortedData = useMemo(() => {
  const list = Array.isArray(filteredData) ? [...filteredData] : [];

  const getSortTimestamp = (item) => {
   const rawDate = item?.processed_date || item?.date;
   const parsed = rawDate ? new Date(rawDate).getTime() : NaN;
   if (!Number.isNaN(parsed)) return parsed;

   const numericId = Number(item?.application_id);
   return Number.isNaN(numericId) ? 0 : numericId;
  };

  list.sort((a, b) => {
   const aTs = getSortTimestamp(a);
   const bTs = getSortTimestamp(b);
   if (aTs === bTs) {
    return sortOrder === "oldest"
     ? (Number(a?.application_id) || 0) - (Number(b?.application_id) || 0)
     : (Number(b?.application_id) || 0) - (Number(a?.application_id) || 0);
   }
   return sortOrder === "oldest" ? aTs - bTs : bTs - aTs;
  });

  return list;
 }, [filteredData, sortOrder]);

 // Update selected item when filtered/sorted data changes
 useEffect(() => {
  if (sortedData && sortedData.length > 0) {
    const sortChanged = previousSortRef.current !== sortOrder;
    previousSortRef.current = sortOrder;

    setSelectedItem((prev) => {
     if (sortChanged || !prev) return sortedData[0];
     const stillExists = sortedData.find(
      (item) => item.application_id === prev.application_id
     );
     return stillExists || sortedData[0];
    });
  } else {
   setSelectedItem(null);
  }
 }, [sortedData]);

 useEffect(() => {
  if (selectedItem) {
   setImageRefreshKey(Date.now());
  }
 }, [selectedItem]);

 const nav = useNavigate();

 const handleViewApplication = (id) => {
  nav(`/applicant/application/review/${id}`, {
   state: {
    isFromLog: true,
    from: "log",
   },
  });
 };

 const generatePDF = async () => {
  if (!selectedItem) {
   toast.error("No application selected to download");
   return;
  }

  try {
   setIsGeneratingPdf(true);
   toast.info("Generating PDF. Please wait...");
   const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
   });

   // Set up the PDF document
   const pageWidth = pdf.internal.pageSize.getWidth();
   const pageHeight = pdf.internal.pageSize.getHeight();
   const margin = 15;
   let yPosition = margin;

   // Add title
   pdf.setFont("helvetica", "bold");
   pdf.setFontSize(18);
   pdf.setTextColor(0, 0, 0);
   pdf.text("Gate Pass Application Details", margin, yPosition);

   yPosition += 15;

   // Add vehicle info header
   pdf.setFontSize(14);
   pdf.text("Vehicle Information", margin, yPosition);

   yPosition += 8;

   // Add horizontal line
   pdf.setDrawColor(200, 200, 200);
   pdf.line(margin, yPosition, pageWidth - margin, yPosition);

   yPosition += 8;

   // Add vehicle details in a table format
   pdf.setFont("helvetica", "normal");
   pdf.setFontSize(11);

   const details = [
    {
     label: "Application ID:",
     value: String(selectedItem?.application_id || "N/A"),
    },
    {
     label: "Sticker Number:",
     value: String(
      selectedItem?.sticker_number || selectedItem?.sticker_id || "N/A"
     ),
    },
    { label: "Brand:", value: String(selectedItem?.brand || "N/A") },
    { label: "Model:", value: String(selectedItem?.model || "N/A") },
    {
     label: "Plate Number:",
     value: String(selectedItem?.plate_number || selectedItem?.plate || "N/A"),
    },
    {
     label: "Application Role:",
     value: String(
      selectedItem?.role || selectedItem?.application_role || "N/A"
     ),
    },
    { label: "Building:", value: String(selectedItem?.building_name || "N/A") },
    {
     label: "Submission Date:",
     value: selectedItem?.date
      ? new Date(selectedItem.date).toLocaleDateString("en-US", {
         year: "numeric",
         month: "short",
         day: "numeric",
        })
      : "N/A",
    },
   { label: "Status:", value: String(selectedItem?.status || "To Submit") },
   ...(String(selectedItem?.status || "").toLowerCase() === "rejected" &&
   String(selectedItem?.rejection_remarks || "").trim()
    ? [
       {
        label: "Rejection Remarks:",
        value: String(selectedItem?.rejection_remarks || ""),
       },
      ]
    : []),
  ];

   // Layout details in two columns
   const colWidth = (pageWidth - margin * 2) / 2;
   let row = 0;
   let col = 0;

   for (const detail of details) {
    const x = margin + col * colWidth;
    pdf.setFont("helvetica", "bold");
    pdf.text(detail.label, x, yPosition);
    pdf.setFont("helvetica", "normal");
    pdf.text(detail.value, x + 35, yPosition);

    col++;
    if (col >= 2) {
     col = 0;
     yPosition += 8;
     row++;
    }
   }

   // If we ended with col=1, move to next row
   if (col === 1) {
    yPosition += 8;
   }

   yPosition += 10;

   // Add vehicle images header
   pdf.setFont("helvetica", "bold");
   pdf.setFontSize(14);
   pdf.text("Vehicle Images", margin, yPosition);
   yPosition += 8;

   // Handle vehicle images
   const frontImageUrl =
    selectedItem?.vehicle_images?.front || selectedItem?.front_image;
   const backImageUrl =
    selectedItem?.vehicle_images?.back || selectedItem?.back_image;

   // Add vehicle images to PDF
   if (frontImageUrl || backImageUrl) {
    const maxWidth = (pageWidth - margin * 3) / 2; // Maximum width for each image
    const maxHeight = 50; // Maximum height for vehicle images

    if (frontImageUrl) {
     try {
      const cleanedUrl = frontImageUrl.replace("/api/v1", "");
      const response = await fetch(buildUrl(cleanedUrl), {
       method: "GET",
       headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
       },
      });
      if (response.ok) {
       const blob = await response.blob();
       const frontImageDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
       });

       // Calculate dimensions maintaining aspect ratio
       const aspectRatio = maxWidth / maxHeight;
       const scaledWidth = maxWidth;
       const scaledHeight = maxWidth / aspectRatio;
       const finalHeight = Math.min(scaledHeight, maxHeight);
       const finalWidth = finalHeight * aspectRatio;

       // Center the image in its allocated space
       const xOffset = margin + (maxWidth - finalWidth) / 2;

       pdf.addImage(
        frontImageDataUrl,
        "JPEG",
        xOffset,
        yPosition,
        finalWidth,
        finalHeight
       );
      }
     } catch (error) {
      console.error("Error fetching front image:", error);
     }
    }

    if (backImageUrl) {
     try {
      const cleanedUrl = backImageUrl.replace("/api/v1", "");
      const response = await fetch(buildUrl(cleanedUrl), {
       method: "GET",
       headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
       },
      });
      if (response.ok) {
       const blob = await response.blob();
       const backImageDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
       });

       // Calculate dimensions maintaining aspect ratio
       const aspectRatio = maxWidth / maxHeight;
       const scaledWidth = maxWidth;
       const scaledHeight = maxWidth / aspectRatio;
       const finalHeight = Math.min(scaledHeight, maxHeight);
       const finalWidth = finalHeight * aspectRatio;

       // Center the image in its allocated space
       const xOffset = margin + maxWidth + margin + (maxWidth - finalWidth) / 2;

       pdf.addImage(
        backImageDataUrl,
        "JPEG",
        xOffset,
        yPosition,
        finalWidth,
        finalHeight
       );
      }
     } catch (error) {
      console.error("Error fetching back image:", error);
     }
    }

    yPosition += maxHeight + 15;
   }

   // Add documents section
   if (selectedItem?.documents?.length > 0) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Required Documents", margin, yPosition);
    yPosition += 10;

    const maxWidth = (pageWidth - margin * 2) / selectedItem.documents.length; // Maximum width for each image
    const maxHeight = 120; // Further increased maximum height for document images

    let xOffset = margin; // Start xOffset at the margin

    for (const doc of selectedItem.documents) {
     try {
      if (doc.image_url) {
       const cleanedUrl = doc.image_url.replace("/api/v1", "");

       const response = await fetch(buildUrl(cleanedUrl), {
        method: "GET",
        headers: {
         Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
       });

       if (response.ok) {
        const blob = await response.blob();
        const docImageDataUrl = await new Promise((resolve) => {
         const reader = new FileReader();
         reader.onloadend = () => resolve(reader.result);
         reader.readAsDataURL(blob);
        });

        // Create a temporary image element to get original dimensions
        const img = new Image();
        await new Promise((resolve) => {
         img.onload = resolve;
         img.src = docImageDataUrl;
        });

        // Calculate dimensions to fit within page while maintaining aspect ratio
        let finalWidth = img.width;
        let finalHeight = img.height;

        // Scale down if image is too large
        if (finalWidth > maxWidth) {
         const scale = maxWidth / finalWidth;
         finalWidth *= scale;
         finalHeight *= scale;
        }
        if (finalHeight > maxHeight) {
         const scale = maxHeight / finalHeight;
         finalWidth *= scale;
         finalHeight *= scale;
        }

        // Add the image to the PDF
        pdf.addImage(
         docImageDataUrl,
         "JPEG",
         xOffset,
         yPosition,
         finalWidth,
         finalHeight
        );

        // Update xOffset for the next image
        xOffset += finalWidth + 5; // Add more padding between images
       } else {
        console.error("Failed to fetch document:", response.status);
       }
      }
     } catch (error) {
      console.error(`Error processing document ${doc.type}:`, error);
     }
    }

    yPosition += maxHeight + 20; // Move yPosition down after all images
   }

   // Add footer
   pdf.setFont("helvetica", "normal");
   pdf.setFontSize(8);
   pdf.setTextColor(100, 100, 100);
   const timestamp = new Date().toLocaleString();
   pdf.text(`Generated on: ${timestamp}`, margin, pageHeight - 10);
   pdf.text(
    `Vehicle Application: ${
     selectedItem.sticker_number || selectedItem.application_id
    }`,
    pageWidth - margin - 70,
    pageHeight - 10
   );

   // Save the PDF
   pdf.save(
    `vehicle-application-${
     selectedItem.sticker_number || selectedItem.application_id
    }.pdf`
   );

   toast.success("PDF generated successfully!");
  } catch (error) {
   console.error("Error generating PDF:", error);
   toast.error("Failed to generate PDF. Please try again.");
  } finally {
   setIsGeneratingPdf(false);
  }
 };

 return (
  <>
   <div>
    {/* Filter Controls - Only show if showFilters is true */}
    {showFilters && (
     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 bg-white">
      <h1 className="text-2xl font-semibold">Application History</h1>
      <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
       <div className="relative w-full sm:w-auto">
        <input
         type="text"
         placeholder="Search sticker number"
         value={filterValues.sticker_number}
         onChange={(e) => handleFilterChange("sticker_number", e.target.value)}
         className="w-full sm:w-auto bg-slate-100 border border-gray-300 rounded-md p-2 pl-8 sm:pl-10 text-sm font-medium"
        />
        <FaSearch className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
       </div>
       <input
        type="date"
        value={filterValues.date}
        onChange={(e) => handleFilterChange("date", e.target.value)}
        className="w-full sm:w-auto bg-slate-100 border border-gray-300 rounded-md p-2 text-sm font-medium"
       />
       <select
         value={filterValues.vehicle_type}
         onChange={(e) => handleFilterChange("vehicle_type", e.target.value)}
         className="w-full sm:w-auto bg-slate-100 border border-gray-300 rounded-md p-2 text-sm font-medium px-4 sm:px-10"
        >
        <option value="All">All</option>
        <option value="Car">Car</option>
        <option value="Truck">Truck</option>
        <option value="Motorcycle">Motorcycle</option>
        <option value="Van">Van</option>
         <option value="Tricycle">Tricycle</option>
        </select>
        <div className="relative w-full sm:w-auto">
         <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-full sm:min-w-[180px] appearance-none bg-white border border-gray-300 rounded-md p-2 pr-10 text-sm font-medium text-primary shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
         >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
         </select>
         <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
          <svg
           xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 20 20"
           fill="currentColor"
           className="h-4 w-4"
          >
           <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
           />
          </svg>
         </span>
        </div>
       </div>
      </div>
     )}

    {/* HEADER */}
    <div className="bg-white p-3 sm:p-4 md:p-6 mb-2 rounded-md border border-gray-200">
     {selectedItem ? (
      <div ref={pdfContentRef}>
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-semibold flex items-center">
         <span>Application Details</span>
         {name && (
          <>
           <span className="mx-2">•</span>
           <span className="text-base sm:text-lg font-light text-gray-500">
            {name}
           </span>
          </>
         )}
        </h2>
        <div className="flex flex-wrap gap-2">
         <button
          onClick={generatePDF}
          disabled={isGeneratingPdf}
          className={`bg-slate-100 border border-primary/30 text-primary text-xs font-medium h-8 sm:h-9 md:h-10 rounded-md px-2 sm:px-3 md:px-4 flex items-center gap-1 sm:gap-2 ${
           isGeneratingPdf
            ? "opacity-70 cursor-not-allowed"
            : "hover:bg-slate-200"
          }`}
         >
          {isGeneratingPdf ? (
           <>
            <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="hidden sm:inline">Generating...</span>
           </>
          ) : (
           <>
            <svg
             xmlns="http://www.w3.org/2000/svg"
             className="h-3 w-3"
             fill="none"
             viewBox="0 0 24 24"
             stroke="currentColor"
            >
             <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
             />
            </svg>
            <span className="hidden sm:inline">Download</span>
           </>
          )}
         </button>
         {!isManagement && (
          <button
           onClick={() => handleViewApplication(selectedItem?.application_id)}
           className="bg-primary text-white text-xs font-medium h-8 sm:h-9 md:h-10 rounded-md px-2 sm:px-3 md:px-4 cursor-pointer flex items-center gap-1 sm:gap-2 hover:bg-primary/90"
          >
           <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
           >
            <path
             strokeLinecap="round"
             strokeLinejoin="round"
             strokeWidth={2}
             d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
             strokeLinecap="round"
             strokeLinejoin="round"
             strokeWidth={2}
             d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
           </svg>
           <span className="hidden sm:inline">View</span>
          </button>
         )}
        </div>
       </div>
       <div className="mt-4 sm:mt-5 flex flex-col gap-4 sm:gap-5 md:flex-row md:gap-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
         <div className="h-[180px] sm:h-[200px] md:h-[250px] bg-slate-100 rounded-lg overflow-hidden">
          <h3 className="font-medium text-xs sm:text-sm pl-2 pt-1">
           Front View
          </h3>
          {(() => {
           const frontImageUrl =
            selectedItem?.vehicle_images?.front ||
            selectedItem.front_image ||
            selectedItem.front_img;

           return frontImageUrl ? (
            <ImageDisplay
             key={`vehicle-front-${imageRefreshKey}`}
             imageUrl={frontImageUrl}
             alt="Vehicle Front View"
             className="h-[150px] sm:h-[170px] md:h-[220px] w-full object-contain bg-white p-2"
             fallback={
              <div className="shrink-0 h-[150px] sm:h-[170px] md:h-[220px] w-full flex flex-col items-center justify-center">
               <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 sm:h-10 sm:w-10 md:h-16 md:w-16 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
               >
                <path
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 strokeWidth={1}
                 d="M3 19.1h18M5 19.1v-6.87a2 2 0 012-2h10a2 2 0 012 2v6.87m-4-6.87V5.66a2 2 0 00-2-2H9a2 2 0 00-2 2v6.57"
                />
                <path
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 strokeWidth={1}
                 d="M8 19.1h8"
                />
               </svg>
               <span className="text-gray-400 text-xs">No front image</span>
              </div>
             }
            />
           ) : (
            <div className="shrink-0 h-[150px] sm:h-[170px] md:h-[220px] w-full flex flex-col items-center justify-center">
             <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 sm:h-10 sm:w-10 md:h-16 md:w-16 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
             >
              <path
               strokeLinecap="round"
               strokeLinejoin="round"
               strokeWidth={1}
               d="M3 19.1h18M5 19.1v-6.87a2 2 0 012-2h10a2 2 0 012 2v6.87m-4-6.87V5.66a2 2 0 00-2-2H9a2 2 0 00-2 2v6.57"
              />
              <path
               strokeLinecap="round"
               strokeLinejoin="round"
               strokeWidth={1}
               d="M8 19.1h8"
              />
             </svg>
             <span className="text-gray-400 text-xs">No front image</span>
            </div>
           );
          })()}
         </div>

         <div className="h-[180px] sm:h-[200px] md:h-[250px] bg-slate-100 rounded-lg overflow-hidden">
          <h3 className="font-medium text-xs sm:text-sm pl-2 pt-1">
           Back View
          </h3>
          {(() => {
           const backImageUrl =
            selectedItem?.vehicle_images?.back ||
            selectedItem.back_image ||
            selectedItem.back_img;

           return backImageUrl ? (
            <ImageDisplay
             key={`vehicle-back-${imageRefreshKey}`}
             imageUrl={backImageUrl}
             alt="Vehicle Back View"
             className="h-[150px] sm:h-[170px] md:h-[220px] w-full object-contain bg-white p-2"
             fallback={
              <div className="shrink-0 h-[150px] sm:h-[170px] md:h-[220px] w-full flex flex-col items-center justify-center">
               <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 sm:h-10 sm:w-10 md:h-16 md:w-16 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
               >
                <path
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 strokeWidth={1}
                 d="M3 19.1h18M5 19.1v-6.87a2 2 0 012-2h10a2 2 0 012 2v6.87m-4-6.87V5.66a2 2 0 00-2-2H9a2 2 0 00-2 2v6.57"
                />
                <path
                 strokeLinecap="round"
                 strokeLinejoin="round"
                 strokeWidth={1}
                 d="M8 19.1h8"
                />
               </svg>
               <span className="text-gray-400 text-xs">No back image</span>
              </div>
             }
            />
           ) : (
            <div className="shrink-0 h-[150px] sm:h-[170px] md:h-[220px] w-full flex flex-col items-center justify-center">
             <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 sm:h-10 sm:w-10 md:h-16 md:w-16 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
             >
              <path
               strokeLinecap="round"
               strokeLinejoin="round"
               strokeWidth={1}
               d="M3 19.1h18M5 19.1v-6.87a2 2 0 012-2h10a2 2 0 012 2v6.87m-4-6.87V5.66a2 2 0 00-2-2H9a2 2 0 00-2 2v6.57"
              />
              <path
               strokeLinecap="round"
               strokeLinejoin="round"
               strokeWidth={1}
               d="M8 19.1h8"
              />
             </svg>
             <span className="text-gray-400 text-xs">No back image</span>
            </div>
           );
          })()}
         </div>
        </div>
        <div className="w-full mt-4 sm:mt-5 md:mt-0">
         <div className="grid gap-3 md:gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
           <div>
            <p className="font-semibold text-xs sm:text-sm md:text-base">
             Application Role:
            </p>
            <p className="mt-1 w-full h-8 sm:h-10 bg-slate-100 rounded-md p-2 sm:p-3 md:p-4 flex items-center text-xs sm:text-sm">
             {selectedItem?.role || selectedItem?.application_role || "N/A"}
            </p>
           </div>
           <div>
            <p className="font-semibold text-xs sm:text-sm md:text-base">
             Building:
            </p>
            <p className="mt-1 w-full h-8 sm:h-10 bg-slate-100 rounded-md p-2 sm:p-3 md:p-4 flex items-center text-xs sm:text-sm">
             {selectedItem?.building_name || "N/A"}
            </p>
           </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
           <div>
            <p className="font-semibold text-xs sm:text-sm md:text-base">
             Vehicle Type:
            </p>
            <p className="mt-1 w-full h-8 sm:h-10 bg-slate-100 rounded-md p-2 sm:p-3 md:p-4 flex items-center text-xs sm:text-sm">
             {selectedItem?.vehicle_type}
            </p>
           </div>
           <div>
            <p className="font-semibold text-xs sm:text-sm md:text-base">
             Processed:
            </p>
            <p className="mt-1 w-full h-8 sm:h-10 bg-slate-100 rounded-md p-2 sm:p-3 md:p-4 flex items-center text-xs sm:text-sm">
             {selectedItem?.processed_date || selectedItem?.date
              ? new Date(
                 selectedItem?.processed_date || selectedItem?.date
                ).toLocaleDateString("en-US", {
                 year: "numeric",
                 month: "short",
                 day: "numeric",
                })
              : "N/A"}
            </p>
           </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
           <div>
            <p className="font-semibold text-xs sm:text-sm md:text-base">
             Plate Number:
            </p>
            <p className="mt-1 w-full h-8 sm:h-10 bg-slate-100 rounded-md p-2 sm:p-3 md:p-4 flex items-center text-xs sm:text-sm">
             {selectedItem?.plate_number || selectedItem?.plate || "N/A"}
            </p>
           </div>
           <div>
            <p className="font-semibold text-xs sm:text-sm md:text-base">
             Status:
            </p>
            <p className="mt-1 w-full h-8 sm:h-10 bg-slate-100 rounded-md p-2 sm:p-3 md:p-4 flex items-center text-xs sm:text-sm">
             <span
              className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
               selectedItem?.status === "Approved"
                ? "bg-green-100 text-green-800"
                : selectedItem?.status === "Rejected"
                ? "bg-red-100 text-red-800"
                : selectedItem?.status === "Pending"
                ? "bg-orange-100 text-orange-700"
                : selectedItem?.status === "Waiting for approval"
                ? "bg-lime-100 text-lime-700"
                : "bg-blue-100 text-blue-800"
              }`}
             >
              {selectedItem?.status || "To Submit"}
             </span>
            </p>
           </div>
          </div>
          {String(selectedItem?.status || "").toLowerCase() === "rejected" &&
           String(selectedItem?.rejection_remarks || "").trim() && (
            <div>
             <p className="font-semibold text-xs sm:text-sm md:text-base">
              Rejection Remarks:
             </p>
             <p className="mt-1 w-full min-h-10 bg-red-50 border border-red-200 rounded-md p-2 sm:p-3 text-xs sm:text-sm text-red-800">
              {selectedItem?.rejection_remarks}
             </p>
            </div>
           )}
         </div>
        </div>
       </div>
      </div>
     ) : (
      <p className="text-gray-500 text-sm">Click on a record to view details</p>
     )}
    </div>
    {/* LIST OF LOGS */}
    <div>
     <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-4 font-bold border-b pb-2 text-xs sm:text-sm md:text-base">
      <h1>Sticker</h1>
      <h1 className="hidden sm:block">Brand</h1>
      <h1>Status</h1>
      <h1 className="hidden sm:block">Type</h1>
      <h1 className="hidden sm:block">Plate</h1>
      <h1>Date</h1>
     </div>
     <div className="mt-3 max-h-[300px] overflow-y-auto">
      {sortedData && sortedData.length > 0 ? (
       sortedData.map((item, index) => (
        <div
         key={index}
         className={`bg-slate-100 rounded-md p-2 sm:p-3 md:p-4 mb-2 cursor-pointer hover:bg-slate-200 transition ${
          selectedItem === item ? "border-2 border-blue-500" : ""
         }`}
         onClick={() => setSelectedItem(item)}
        >
         <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-4 text-xs sm:text-sm md:text-base">
          <p className="truncate">
           {item?.sticker_number || item?.sticker_id || "N/A"}
          </p>
          <p className="hidden sm:block truncate">{item?.brand || "N/A"}</p>
          <p>
           <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
             item?.status === "Approved"
              ? "bg-green-100 text-green-800"
              : item?.status === "Rejected"
              ? "bg-red-100 text-red-800"
              : item?.status === "Pending"
              ? "bg-orange-100 text-orange-700"
              : item?.status === "Waiting for approval"
              ? "bg-lime-100 text-lime-700"
              : "bg-blue-100 text-blue-800"
            }`}
           >
            {item?.status || "To Submit"}
           </span>
          </p>
          <p className="hidden sm:block truncate">
           {item?.vehicle_type || "N/A"}
          </p>
          <p className="hidden sm:block truncate">
           {item?.plate_number || item?.plate || "N/A"}
          </p>
          <p className="truncate">
           {item?.date
            ? new Date(item.date).toLocaleDateString("en-US", {
               year: "numeric",
               month: "short",
               day: "numeric",
              })
            : "N/A"}
          </p>
         </div>
        </div>
       ))
      ) : (
       <div className="flex flex-col items-center justify-center py-8 text-gray-500 bg-slate-50 rounded-md">
        <img
         src="/empty-folder.png"
         alt="No Applications"
         className="w-24 h-24 opacity-50 mb-4"
         onError={(e) => {
          e.target.onerror = null;
          e.target.src = "https://img.icons8.com/ios/100/000000/empty-box.png";
         }}
        />
        <h2 className="text-lg font-medium text-gray-500">
         No Applications Found
        </h2>
        <p className="text-sm text-gray-400 mt-1">
         {filterValues.vehicle_type !== "All"
          ? `No ${filterValues.vehicle_type.toLowerCase()} applications found`
          : "Applications will appear here when available"}
        </p>
       </div>
      )}
     </div>
    </div>
   </div>
  </>
 );
};
