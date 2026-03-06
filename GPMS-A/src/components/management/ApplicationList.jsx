import { useState, useEffect } from "react";
import { ApplicationInfo } from "./ApplicationInfo";

export const ApplicationList = ({
 data,
 onSelect,
 isManagement = false,
 onModalStateChange = null,
}) => {
 const [selectedApplication, setSelectedApplication] = useState(null);
 const [applicationInfoId, setApplicationInfoId] = useState(null);

 // Add effect to handle body scrolling
 useEffect(() => {
  if (applicationInfoId) {
   document.body.style.overflow = "hidden";
  } else {
   document.body.style.overflow = "auto";
  }

  if (onModalStateChange) {
   onModalStateChange(Boolean(applicationInfoId));
  }

  return () => {
   document.body.style.overflow = "auto";
   if (onModalStateChange) {
    onModalStateChange(false);
   }
  };
 }, [applicationInfoId, onModalStateChange]);

 // Process the data to handle different formats
 const processApplications = () => {
  if (Array.isArray(data)) {
    // Handle data from Applicant.jsx which is already formatted
    return [...data];
  } else {
    // Handle data from Management.jsx with pending_applications and approved_applications
    return [
     ...(data?.pending_applications || []),
     ...(data?.approved_applications || []),
   ];
  }
 };

 const applications = processApplications();
 const getSortTimestamp = (item) => {
  const rawDate = isManagement
   ? item?.applicant?.approve_at ||
     item?.approve_at ||
     item?.date ||
     item?.appliedDate ||
     item?.applicant?.appliedDate
   : item?.appliedDate || item?.date || item?.applicant?.appliedDate;

  if (!rawDate) return 0;
  const parsed = new Date(rawDate).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
 };

 const sortedApplications = [...applications].sort((a, b) => {
  const aTs = getSortTimestamp(a);
  const bTs = getSortTimestamp(b);
  if (aTs !== bTs) return bTs - aTs; // newest first
  const aId = String(a?.application_id || a?.applicant?.application_id || a?.id || "");
  const bId = String(b?.application_id || b?.applicant?.application_id || b?.id || "");
  return bId.localeCompare(aId);
 });

 // Effect to set the first application as selected when applications change
 useEffect(() => {
  if (sortedApplications.length > 0) {
   const stillExists = selectedApplication
    ? sortedApplications.find(
       (item) => getApplicationId(item) === getApplicationId(selectedApplication)
      )
    : null;
   const nextSelected = stillExists || sortedApplications[0];
   if (
    !selectedApplication ||
    getApplicationId(nextSelected) !== getApplicationId(selectedApplication)
   ) {
    setSelectedApplication(nextSelected);
    onSelect(nextSelected);
   }
  } else {
   setSelectedApplication(null);
   onSelect(null);
  }
 }, [sortedApplications, onSelect, selectedApplication]);

 // Handle row selection
 const handleSelect = (item) => {
  setSelectedApplication(item); // Update the selected application
  onSelect(item); // Notify the parent about the selected application
 };

 // Helper function to get application ID consistently
 const getApplicationId = (item) => {
  return (
   item.application_id || item.applicant?.application_id || item.id || "unknown"
  );
 };

 // Helper function to get sticker ID consistently from different data structures
 const getStickerID = (item) => {
  return (
   item.sticker?.sticker_id ||
   item?.applicant?.vehicle?.sticker?.sticker_id ||
   "N/A"
  );
 };

 const getModel = (item) => {
  return item?.applicant?.vehicle.model || item?.model;
 };

 // Helper function to get applicant name consistently
 const getApplicantName = (item) => {
  return item?.applicant?.name || item?.name || "N/A";
 };

 // Helper function to get vehicle type consistently
 const getVehicleType = (item) => {
  return item?.applicant?.vehicle?.vehicle_type || item?.vehicle_type || "N/A";
 };

 // Helper function to get plate number consistently
 const getPlateNumber = (item) => {
  return item?.applicant?.vehicle?.plate_no || item?.plate_no || "N/A";
 };

 // Helper function to get application date consistently
 const getApplicationDate = (item) => {
  // Select the appropriate date field based on context
  let rawDate;

  if (isManagement) {
   // For management view, prioritize approved date
   rawDate =
    item?.applicant?.approve_at ||
    item?.approve_at ||
    item?.appliedDate ||
    item?.date ||
    item?.applicant?.appliedDate ||
    "N/A";
  } else {
   // For applicant view, prioritize applied date
   rawDate =
    item?.appliedDate ||
    item?.date ||
    item?.applicant?.appliedDate ||
    item?.applicant?.approve_at ||
    "N/A";
  }

  // If the date is N/A or not a valid string, return it as is
  if (rawDate === "N/A" || typeof rawDate !== "string") {
   return rawDate;
  }

  try {
   // Parse the date and format it as YYYY-MM-DD
   const dateObj = new Date(rawDate);
   if (isNaN(dateObj.getTime())) {
    return rawDate; // Return original if parsing failed
   }

   // Format as YYYY-MM-DD
   return dateObj.toISOString().split("T")[0];
  } catch (error) {
   return rawDate; // Return original date if formatting fails
  }
 };

 // Helper function to check if items are selected
 const isItemSelected = (item) => {
  if (!selectedApplication) return false;

  const selectedId = getApplicationId(selectedApplication);
  const itemId = getApplicationId(item);

  return selectedId === itemId;
 };

 // Determine date label based on context
 const dateLabel = isManagement ? "Approved At" : "Applied At";
 const gridColsClass = isManagement ? "grid-cols-7" : "grid-cols-6";

 return (
  <>
   {/* Header Row - now properly aligned with data rows */}
   <div className={`grid ${gridColsClass} gap-1 border-b border-gray-300 pb-2 items-center px-2`}>
    <h1 className="text-lg font-medium text-primary text-left truncate pl-2">
     Plate #
    </h1>
    {isManagement && (
     <h1 className="text-lg font-medium text-primary text-left truncate">
      Sticker
     </h1>
    )}
    <h1 className="text-lg font-medium text-primary text-left truncate">
     Applicant
    </h1>
    <h1 className="text-lg font-medium text-primary text-left truncate">
     Model
    </h1>
    <h1 className="text-lg font-medium text-primary text-left truncate">
     Vehicle Type
    </h1>
    <h1 className="text-lg font-medium text-primary text-left truncate">
     {dateLabel}
    </h1>
     <h1 className="text-lg font-medium text-primary text-right truncate pr-10">
     Actions
    </h1>
   </div>

   {/* Data Rows */}
   <div className="mt-2 space-y-2 overflow-y-auto h-[350px]">
     {sortedApplications.map((item, index) => {
     const isSelected = isItemSelected(item);
     const applicationId = getApplicationId(item);

     return (
      <div
       key={`${applicationId}-${index}`}
       className={`grid ${gridColsClass} gap-1 px-2 h-[60px] rounded-md items-center border border-gray-200 transition duration-200 cursor-pointer 
                      ${isSelected ? "bg-gray-300" : "hover:bg-gray-200"}`}
       onClick={() => handleSelect(item)}
      >
       <div className="text-left truncate pl-2">{getPlateNumber(item)}</div>
       {isManagement && (
        <div className="text-left truncate">{getStickerID(item)}</div>
       )}
       <div className="text-left truncate">{getApplicantName(item)}</div>
       <div className="text-left truncate">{getModel(item)}</div>
       <div className="text-left truncate">{getVehicleType(item)}</div>
       <div className="text-left truncate">{getApplicationDate(item)}</div>
       <div className="text-right pr-6">
        <button
         onClick={(e) => {
          e.stopPropagation();
          handleSelect(item);
          setApplicationInfoId(getApplicationId(item));
         }}
         className="w-[80px] bg-primary text-white rounded-md px-3 h-10 text-sm "
        >
         Open
        </button>
       </div>
      </div>
     );
    })}
   </div>

   {/* Modal with Selected Data */}
   {applicationInfoId && (
    <ApplicationInfo
     close={() => setApplicationInfoId(null)} // Close modal
     applicationId={applicationInfoId} // Pass only the application ID instead of full data
    />
   )}
  </>
 );
};
