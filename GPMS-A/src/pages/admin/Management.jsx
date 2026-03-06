import { useEffect, useState, useCallback, useRef } from "react";
import { ApplicationList } from "../../components/management/ApplicationList";
import { HeaderManagement } from "../../components/management/HeaderManagement";
import { AdminLayout } from "../../layouts/AdminLayout";
import { buildUrl } from "../../utils/buildUrl";
import { ApplicationLog } from "../../components/applicant/ApplicationLog";

export const Management = () => {
 const [applications, setApplications] = useState([]);
 const [filteredApplications, setFilteredApplications] = useState([]);
 const [selectedApplicant, setSelectedApplicant] = useState(null);
 const [searchQuery, setSearchQuery] = useState("");
 const [vehicleType, setVehicleType] = useState("All");
 const [timeFilter, setTimeFilter] = useState("year");
 // Add new state for tracking view mode and application logs
 const [viewMode, setViewMode] = useState("management"); // Options: "management" or "logs"
 const [applicationLogs, setApplicationLogs] = useState([]);
 const [currentApplicationId, setCurrentApplicationId] = useState(null);
 const [applicantName, setApplicantName] = useState(null);
 const [isLoading, setIsLoading] = useState(false);
 const [isInputActive, setIsInputActive] = useState(false);

 // Add filter state for ApplicationLog
 const [logFilters, setLogFilters] = useState({
  vehicle_type: "All",
  sticker_number: "",
  date: "",
 });
 const filterTimeoutRef = useRef(null);

 const getApprovedApplications = async () => {
  setIsLoading(true);
  try {
   const queryParams = new URLSearchParams({
    sticker_id: searchQuery, // Search by sticker ID
    vehicle_type: vehicleType, // Selected vehicle type
    time_filter: timeFilter, // Selected time filter
   });

   const res = await fetch(
    buildUrl(`/management/approved-applications?${queryParams}`),
    {
     method: "GET",
     headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    }
   );

   if (!res.ok) throw new Error("Failed to fetch applications");

   const data = await res.json();
   setApplications(data);
   setFilteredApplications(data);
  } catch (err) {
   console.error("Error fetching applications:", err);
  } finally {
   setIsLoading(false);
  }
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

   // Transform documents if they exist
   const documents =
    app.documents?.map((doc) => ({
     document_id: doc.document_id,
     type: doc.type,
     image_url: doc.image_url || doc.image, // Handle both possible image field names
     registered_at: doc.registered_at,
     expire_at: doc.expire_at,
    })) || [];

   // Include uploaded payment slip in logs/documents (for viewer + PDF).
   if (app.slip?.image) {
    documents.unshift({
     document_id: `slip-${app.slip.slip_id || app.application_id}`,
     type: "Payment Slip",
     image_url: app.slip.image,
     registered_at: app.slip.date || null,
     expire_at: null,
    });
   }

    const resolvedStatus =
     app.status ||
     (app.is_rejected ? "Rejected" : "Pending");

    return {
    application_id: app.application_id,
    brand: app.brand,
    building_name: app.building_name || "Main Building",
    date: app.date_submitted || new Date().toISOString().split("T")[0],
    model: app.model,
    plate_number: app.plate_number,
    vehicle_type: app.vehicle_type,
    processed_date: app.date_submitted,
    role: app.applicant_name ? "Applicant" : "Student",
     status: resolvedStatus,
    sticker_number: app.sticker_number || "Not Assigned",
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

 // Handle ApplicationLog filter changes
 const handleLogFilterChange = useCallback(
  (newFilters) => {
   // Clear any existing timeout
   if (filterTimeoutRef.current) {
    clearTimeout(filterTimeoutRef.current);
   }

   setLogFilters(newFilters);

   // Debounce the API call
   filterTimeoutRef.current = setTimeout(() => {
    getApplicationLogs(currentApplicationId, applicantName, newFilters);
   }, 500);
  },
  [currentApplicationId, applicantName]
 );

 // Update getApplicationLogs to handle filters
 const getApplicationLogs = async (id, fullname, filters = logFilters) => {
  setViewMode("logs");
  setApplicantName(fullname);
  setIsLoading(true);

  try {
   const queryParams = new URLSearchParams();

   if (filters.sticker_number) {
    queryParams.append("sticker_number", filters.sticker_number);
   }
   if (filters.date) {
    queryParams.append("date_filter", filters.date);
   }
   if (filters.vehicle_type !== "All") {
    queryParams.append("vehicle_type", filters.vehicle_type);
   }

   const res = await fetch(
    buildUrl(`/management/applicant/history/${id}?${queryParams.toString()}`),
    {
     method: "GET",
     headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    }
   );

   if (!res.ok) throw new Error("Failed to fetch application logs");

   const data = await res.json();
   const rawLogsData = data.applications || data;
   const transformedLogs = transformApplicationData(rawLogsData);

   setApplicationLogs(transformedLogs);
   setCurrentApplicationId(id);
  } catch (err) {
   console.error("Error fetching application logs:", err);
   setApplicationLogs([]);
  } finally {
   setIsLoading(false);
  }
 };

 // Cleanup on unmount
 useEffect(() => {
  return () => {
   if (filterTimeoutRef.current) {
    clearTimeout(filterTimeoutRef.current);
   }
  };
 }, []);

 useEffect(() => {
  getApprovedApplications();
 }, [searchQuery, vehicleType, timeFilter]); // Re-fetch when filters change

 useEffect(() => {
  const POLL_MS = 30000;
  let intervalId = null;

  const refreshCurrentView = () => {
   if (document.visibilityState !== "visible") return;
   if (isInputActive) return;
   if (viewMode === "management") {
    getApprovedApplications();
    return;
   }
   if (currentApplicationId && applicantName) {
    getApplicationLogs(currentApplicationId, applicantName, logFilters);
   }
  };

  const startPolling = () => {
   if (intervalId) clearInterval(intervalId);
   intervalId = setInterval(refreshCurrentView, POLL_MS);
  };

  const stopPolling = () => {
   if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
   }
  };

  const handleVisibilityChange = () => {
   if (document.visibilityState === "visible") {
    refreshCurrentView();
    startPolling();
   } else {
    stopPolling();
   }
  };

  startPolling();
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
   stopPolling();
   document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
 }, [viewMode, currentApplicationId, applicantName, logFilters, searchQuery, vehicleType, timeFilter, isInputActive]);

 // Function to handle navigation back to main view
 const handleBackToManagement = () => {
  setViewMode("management");
 };

 // Make this function available globally in this component
 // for ApplicationInfo component to access via window events
 useEffect(() => {
  const handleApplicationLogsRequest = (event) => {
   if (event.detail && event.detail.id) {
    getApplicationLogs(event.detail.id, event.detail.fullname);
   }
  };

  // Register the event listener
  window.addEventListener("showApplicationLogs", handleApplicationLogsRequest);

  // Clean up
  return () => {
   window.removeEventListener(
    "showApplicationLogs",
    handleApplicationLogsRequest
   );
  };
 }, []);

 return (
  <AdminLayout>
   <div className="flex items-center justify-between">
    {viewMode === "management" ? (
     <h1 className="text-2xl font-semibold">Management</h1>
    ) : (
     ""
    )}
    {viewMode === "management" ? (
     <div className="flex gap-2">
      {/* Search Input */}
      <div className="relative w-full max-w-sm">
       <input
        type="text"
        placeholder="Search sticker number..."
        className="h-10 w-full bg-gray-200 rounded-md outline-none px-10"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
       />
       <svg
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
       >
        <path
         strokeLinecap="round"
         strokeLinejoin="round"
         strokeWidth={2}
         d="M21 21l-4.35-4.35m2.35-6.65a7 7 0 11-14 0 7 7 0 0114 0z"
        />
       </svg>
      </div>

      {/* Vehicle Type Dropdown */}
      <select
       className="h-10 bg-gray-200 rounded-md outline-none px-6"
       value={vehicleType}
       onChange={(e) => setVehicleType(e.target.value)}
      >
       <option value="All">All Vehicles</option>
       <option value="Truck">Truck</option>
       <option value="Motorcycle">Motor Cycle</option>
       <option value="Car">Car</option>
       <option value="Tricycle">Tricycle</option>
      </select>

      {/* Time Filter Dropdown */}
      <select
       className="h-10 bg-gray-200 rounded-md outline-none px-5"
       value={timeFilter}
       onChange={(e) => setTimeFilter(e.target.value)}
      >
       <option value="today">Today</option>
       <option value="week">This Week</option>
       <option value="month">This Month</option>
       <option value="year">This Year</option>
      </select>
     </div>
    ) : (
     <button
      onClick={handleBackToManagement}
      className="px-4 py-2 bg-primary text-white rounded-md"
     >
      ← Back to Management
     </button>
    )}
   </div>

   <div className="mt-5">
    {viewMode === "management" ? (
     <>
      {/* Pass filtered data to Header */}
      <HeaderManagement
       data={filteredApplications}
       selectData={selectedApplicant}
      />

      <div className="mt-10">
       {isLoading ? (
        <div className="flex items-center justify-center py-10">
         <div className="animate-spin h-10 w-10 rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
       ) : (
        /* Pass filtered data to ApplicationList */
         <ApplicationList
          data={filteredApplications}
          onSelect={setSelectedApplicant}
          isManagement={true}
          onModalStateChange={setIsInputActive}
         />
       )}
      </div>
     </>
    ) : (
     /* Render ApplicationLog when in logs view mode */
     <ApplicationLog
      data={applicationLogs}
      isManagement={true}
      name={applicantName}
      showFilters={true}
      onFilterChange={handleLogFilterChange}
      initialFilters={logFilters}
      isLoading={isLoading}
     />
    )}
   </div>
  </AdminLayout>
 );
};
