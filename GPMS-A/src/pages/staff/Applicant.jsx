import { useEffect, useState, useCallback, useRef } from "react";
import { StaffLayout } from "../../layouts/StaffLayout";
import { HeaderManagement } from "../../components/management/HeaderManagement";
import { ApplicationList } from "../../components/management/ApplicationList";
import { buildUrl } from "../../utils/buildUrl";
import { ApplicationLog } from "../../components/applicant/ApplicationLog";
import { toast } from "sonner";

export const Applicant = () => {
 const [applications, setApplications] = useState([]);
 const [selectedApplicant, setSelectedApplicant] = useState(null);
 // Add new state for tracking view mode and application logs
 const [viewMode, setViewMode] = useState("applicant"); // Options: "applicant" or "logs"
 const [applicationLogs, setApplicationLogs] = useState([]);
 const [currentApplicationId, setCurrentApplicationId] = useState(null);
 const [applicantName, setApplicantName] = useState(null);
 const [loading, setLoading] = useState(true);

 // Add filter state for ApplicationLog
 const [logFilters, setLogFilters] = useState({
  vehicle_type: "All",
  sticker_number: "",
  date: "",
 });
 const filterTimeoutRef = useRef(null);

 const pendingApplications = async () => {
  setLoading(true);
  try {
   const res = await fetch(buildUrl("/staff/applications/pending"), {
    method: "GET",
    headers: {
     "Content-Type": "application/json",
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
   });
   const data = await res.json();

   // Format API data to align with component expectations
   const formattedApplications = data.pending_applications.map(
    (app, index) => ({
     id: index + 1,
     application_id: app.application_id,
     applicant: {
      application_id: app.application_id,
      name: app.full_name,
      sex: app.sex.charAt(0) + app.sex.slice(1).toLowerCase(),
      age: app.age,
      profile_img: app.profile_img,
      role: app.application_role,
      appliedDate: new Date(app.applied_date).toISOString().split("T")[0],
      vehicle: {
       sticker: {
        sticker_id: app.sticker_id,
       },
       plate_no: app.plate_number,
       model: app.model,
       brand: app.brand,
       color: app.color,
       vehicle_type: app.vehicle_type,
       front_image: app.front_img || "/sampleimage.png",
       back_image: app.back_img || "/sampleimage.png",
      },
     },
     // Add documents array in the correct format
     documents: app.documents.map((doc) => ({
      document_id: doc.document_id,
      type: doc.type,
      image: doc.image,
     })),
      // Add slip information
      slip: {
       slip_id: app.slip_id,
       image: app.slip_image,
       amount: app.slip_amount,
       official_receipt: app.slip_official_receipt,
       date: app.slip_date,
       nature_of_payment: app.nature_of_payment,
      },
      has_uploaded_receipt: Boolean(app.has_uploaded_receipt),
     })
    );

   setApplications(formattedApplications);

   if (formattedApplications.length > 0 && !selectedApplicant) {
    setSelectedApplicant(formattedApplications[0]);
   } else if (formattedApplications.length === 0) {
    // Clear selected applicant if there are no applications
    setSelectedApplicant(null);
   }
  } catch (err) {
   toast.info("An error occurred, please try again later.");
  } finally {
   setLoading(false);
  }
 };

 // Transform application data to match the format expected by ApplicationLog
 const transformApplicationData = (applications) => {
  // Existing transformation logic
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

   return {
    // Existing transformation code
    application_id: app.application_id,
    brand: app.brand,
    building_name: app.building_name || "Main Building",
    date: app.date_submitted || new Date().toISOString().split("T")[0],
    model: app.model,
    plate_number: app.plate_number,
    processed_date: app.date_submitted,
    vehicle_type: app.vehicle_type,
    role: app.role || app.applicant_role || "Student",
    status: app.is_rejected ? "Rejected" : "Approved",
    sticker_number: app.sticker_number || "Not Assigned",
    // Store images in both formats to ensure compatibility
    vehicle_images: {
     front: frontImage,
     back: backImage,
    },
    // These direct properties are used by the PDF generator
    front_image: frontImage,
    back_image: backImage,
    // Add documents array with proper transformation
    documents: Array.isArray(app.documents)
     ? app.documents.map((doc) => ({
        document_id: doc.document_id,
        type: doc.type,
        image_url: doc.image_url || doc.image, // Handle both possible field names
        registered_at: doc.registered_at || doc.created_at,
        expire_at: doc.expire_at,
       }))
     : [],
    // Add applicant details if available
    applicant_name: app.full_name || app.applicant_name,
    sex: app.sex,
    age: app.age,
    profile_img: app.profile_img,
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
  setLoading(true);

  try {
   const queryParams = new URLSearchParams();

   if (filters.vehicle_type !== "All") {
    queryParams.append("vehicle_type", filters.vehicle_type);
   }

   if (filters.sticker_number) {
    queryParams.append("sticker_number", filters.sticker_number);
   }

   if (filters.date) {
    queryParams.append("date", filters.date);
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
   setLoading(false);
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
  pendingApplications();
 }, []);

 // Function to handle navigation back to main view
 const handleBackToApplicant = () => {
  setViewMode("applicant");
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

 // Add a function to handle application status changes
 const handleApplicationStatusChange = (applicationId, status) => {
  // Remove the application from the list
  const updatedApplications = applications.filter(
   (app) => app.application_id !== applicationId
  );

  setApplications(updatedApplications);

  // If we removed the selected application, select another one
  if (selectedApplicant && selectedApplicant.application_id === applicationId) {
   if (updatedApplications.length > 0) {
    setSelectedApplicant(updatedApplications[0]);
   } else {
    setSelectedApplicant(null);
   }
  }

  // Show a success toast message
  toast.success(`Application ${status.toLowerCase()} successfully`);
 };

 return (
  <StaffLayout>
   <div className="flex items-center justify-between">
    {viewMode === "applicant" ? (
     <h1 className="text-2xl font-semibold">Applicant</h1>
    ) : (
     ""
    )}
    {viewMode === "logs" && (
     <button
      onClick={handleBackToApplicant}
      className="px-4 py-2 bg-primary text-white rounded-md"
     >
      ← Back to Applicants
     </button>
    )}
   </div>
   <div className="mt-5">
    {viewMode === "applicant" ? (
     <>
      {loading ? (
       <div className="p-8 bg-gray-50 rounded-lg shadow-2xs flex items-center justify-center">
        <div className="animate-pulse h-16 w-16 rounded-full bg-primary"></div>
       </div>
      ) : applications.length > 0 ? (
       <>
        {/* Pass data to HeaderManagement */}
        <HeaderManagement
         data={applications}
         selectData={selectedApplicant}
         onApplicationStatusChange={handleApplicationStatusChange}
         hasApplications={applications.length > 0}
        />
        <div className="mt-10">
         <ApplicationList data={applications} onSelect={setSelectedApplicant} />
        </div>
       </>
      ) : (
       <div className="p-8 bg-gray-50 rounded-lg shadow-2xs">
        <div className="flex flex-col items-center justify-center py-16">
         <img
          src="/empty-folder.png"
          alt="No applications"
          className="w-32 h-32 opacity-50 mb-4"
          onError={(e) => {
           e.target.onerror = null;
           e.target.src = "https://img.icons8.com/ios/100/000000/empty-box.png";
          }}
         />
         <h2 className="text-xl font-medium text-gray-500">
          No Gate Pass Applications as of the moment
         </h2>
         <p className="text-gray-400 mt-2">
          Check back later for new applications
         </p>
        </div>
       </div>
      )}
     </>
    ) : (
     <ApplicationLog
      data={applicationLogs}
      isManagement={true}
      name={applicantName}
      showFilters={true}
      onFilterChange={handleLogFilterChange}
      initialFilters={logFilters}
      isLoading={loading}
     />
    )}
   </div>
  </StaffLayout>
 );
};
