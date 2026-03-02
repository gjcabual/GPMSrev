import {
 FaCarSide,
 FaEye,
 FaClock,
 FaCheck,
 FaTimes,
 FaSpinner,
 FaRegCheckSquare,
 FaCheckSquare,
} from "react-icons/fa";
import { buildUrl } from "../../utils/buildUrl";
import { useEffect, useState, useRef } from "react";
import { IoCarSport, IoClose } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BiInfoCircle } from "react-icons/bi";

// #region agent log helper
const agentLog = (payload) => {
 fetch("http://127.0.0.1:7242/ingest/083cd7ac-27ab-49c8-accd-3eca228db809", {
  method: "POST",
  headers: {
   "Content-Type": "application/json",
   "X-Debug-Session-Id": "6cd765",
  },
  body: JSON.stringify({
   sessionId: "6cd765",
   runId: payload.runId || "pre-fix",
   hypothesisId: payload.hypothesisId,
   location: payload.location,
   message: payload.message,
   data: payload.data || {},
   timestamp: Date.now(),
  }),
 }).catch(() => {});
};
// #endregion

// Image display component that fetches image from backend
const ImageDisplay = ({ imageUrl, alt, className, fallback }) => {
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(false);
 const [imageSrc, setImageSrc] = useState(null);

 useEffect(() => {
  if (!imageUrl) {
   setLoading(false);
   setError(true);
   return;
  }

  const controller = new AbortController();
  const signal = controller.signal;

  const fetchImage = async () => {
   try {
    let cleanedUrl = imageUrl;
    if (cleanedUrl.startsWith("/api/v1")) {
     cleanedUrl = cleanedUrl.substring(7);
    }

    const token = localStorage.getItem("token");
    if (!token) {
     throw new Error("No authentication token found");
    }

    const response = await fetch(buildUrl(cleanedUrl), {
     method: "GET",
     headers: {
      Authorization: `Bearer ${token}`,
     },
     signal,
    });

    if (!response.ok) {
     throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    setImageSrc(objectUrl);
    setLoading(false);
   } catch (err) {
    if (err.name === "AbortError") {
     return;
    }
    console.error("Error fetching image:", err);
    setError(true);
    setLoading(false);
   }
  };

  fetchImage();

  return () => {
   controller.abort();
   if (imageSrc) {
    URL.revokeObjectURL(imageSrc);
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

 if (error || !imageSrc) {
  return (
   fallback || (
    <div
     className={`flex items-center justify-center bg-gray-100 ${className}`}
    >
     <span className="text-gray-400">Image not available</span>
    </div>
   )
  );
 }

 return <img src={imageSrc} alt={alt} className={className} />;
};

export const ApplicationInfo = ({ refreshTrigger = 0, onSlipUploaded }) => {
 const [applications, setApplications] = useState([]);
 const [isLoading, setIsLoading] = useState(true);
 const [filter, setFilter] = useState("All");
 const [uploadSlipModal, setUploadSlipModal] = useState(false);
 const navigate = useNavigate();

 const getMyApplications = async () => {
  try {
   setIsLoading(true);
   const response = await fetch(
    buildUrl(`/applicant/applications/to-submit?vehicle_type=${filter}`),
    {
     method: "GET",
     headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    }
   );

   if (!response.ok) {
    throw new Error("Failed to fetch applications");
   }

   const data = await response.json();
   setApplications(data);
   // #region agent log
   agentLog({
    hypothesisId: "H2_H4",
    location: "ApplicationInfo.jsx:getMyApplications",
    message: "Fetched applications for Application tab",
    data: {
     filter,
     count: Array.isArray(data) ? data.length : 0,
     sample:
      Array.isArray(data) && data.length > 0
       ? {
          application_id: data[0].application_id,
          status: data[0].status,
          vehicle_type: data[0].vehicle_type,
         }
       : null,
    },
   });
   // #endregion
  } catch (error) {
   console.error("Error fetching applications:", error);
   toast.error("Failed to load applications. Please try again.");
  } finally {
   setIsLoading(false);
  }
 };

 useEffect(() => {
  getMyApplications();
 }, [refreshTrigger, filter]);

 // Filter applications based on selected filter
 const filteredApplications = applications;

 const getStatusBadge = (status) => {
  return {
   bg: "bg-blue-100",
   text: "text-blue-700",
   label: "Pending",
   icon: <FaClock className="mr-1" />,
  };
 };

 if (isLoading) {
  return (
   <div className="flex justify-center items-center h-64">
    <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
   </div>
  );
 }

 const ApplicationCard = ({ application }) => {
  if (!application) {
   return null;
  }

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGetSlipConfirm, setShowGetSlipConfirm] = useState(false);
  const initialStatus = application.status || "Pending";
  const [statusLabel, setStatusLabel] = useState(initialStatus);
  const [hasRequestedSlip, setHasRequestedSlip] = useState(initialStatus === "Waiting for approval");

  // #region agent log
  useEffect(() => {
   agentLog({
    hypothesisId: "H1_H3",
    location: "ApplicationInfo.jsx:ApplicationCard:init",
    message: "Initialized ApplicationCard",
    data: {
     application_id: application.application_id,
     backend_status: application.status,
     statusLabel,
     hasRequestedSlip,
    },
   });
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // #endregion

  const handleDelete = async () => {
   try {
    setIsDeleting(true);
    const response = await fetch(
     buildUrl(`/applicant/application/${application.application_id}`),
     {
      method: "DELETE",
      headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
     }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
     toast.error(data.detail || data.message || "Failed to delete application.");
     return;
    }

    toast.success("Application deleted successfully.");
    setShowDeleteModal(false);
    // Refresh list after delete
    getMyApplications();
   } catch (error) {
    console.error("Error deleting application:", error);
    toast.error("Failed to delete application. Please try again.");
   } finally {
    setIsDeleting(false);
   }
  };

  return (
   <div className="rounded-lg border border-gray-200 bg-white overflow-hidden transition-transform hover:shadow-md">
    <div className="h-1 bg-primary" />
     <div className="p-3 sm:p-4">
     <div className="flex items-center justify-between mb-2 sm:mb-3">
      <div className="flex items-center gap-1.5 sm:gap-2">
       <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center">
        <IoCarSport size={16} className="sm:size-5 text-primary" />
       </div>
       <div>
        <h3 className="font-medium text-base sm:text-lg">
         <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
           statusLabel === "Pending"
            ? "bg-orange-100 text-orange-700"
            : statusLabel === "Waiting for approval"
            ? "bg-lime-100 text-lime-700"
            : "bg-blue-100 text-blue-700"
          }`}
         >
          {statusLabel}
         </span>
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Status</p>
       </div>
      </div>
     </div>

     <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
      <div className="grid grid-cols-2 gap-2 flex-1">
       <div className="bg-gray-50 p-2 sm:p-4 rounded-md">
        <p className="text-sm sm:text-base text-gray-500">Brand</p>
        <p className="font-medium text-base sm:text-lg truncate">
         {application?.brand || "N/A"}
        </p>
       </div>
       <div className="bg-gray-50 p-2 sm:p-4 rounded-md">
        <p className="text-sm sm:text-base text-gray-500">Model</p>
        <p className="font-medium text-base sm:text-lg truncate">
         {application?.model || "N/A"}
        </p>
       </div>
       <div className="bg-gray-50 p-2 sm:p-4 rounded-md">
        <p className="text-sm sm:text-base text-gray-500">Vehicle Type</p>
        <p className="font-medium text-base sm:text-lg truncate">
         {application?.vehicle_type || "N/A"}
        </p>
       </div>
       <div className="bg-gray-50 p-2 sm:p-4 rounded-md">
        <p className="text-sm sm:text-base text-gray-500">Application Role</p>
        <p className="font-medium text-base sm:text-lg truncate">
         {application?.application_role || "N/A"}
        </p>
       </div>
      </div>

      <div className="flex-none">
       <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div>
         <p className="text-xs text-gray-500 mb-1 sm:mb-2">Front View</p>
         <ImageDisplay
          imageUrl={application?.front_image}
          alt="Vehicle Front"
          className="w-full h-32 sm:h-48 object-cover rounded-md"
          fallback={
           <div className="w-full h-32 sm:h-48 bg-gray-100 rounded-md flex items-center justify-center">
            <span className="text-xs sm:text-sm text-gray-400">
             No front image
            </span>
           </div>
          }
         />
        </div>
        <div>
         <p className="text-xs text-gray-500 mb-1 sm:mb-2">Back View</p>
         <ImageDisplay
          imageUrl={application?.back_image}
          alt="Vehicle Back"
          className="w-full h-32 sm:h-48 object-cover rounded-md"
          fallback={
           <div className="w-full h-32 sm:h-48 bg-gray-100 rounded-md flex items-center justify-center">
            <span className="text-xs sm:text-sm text-gray-400">
             No back image
            </span>
           </div>
          }
         />
        </div>
       </div>
      </div>
     </div>
     <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div className="flex items-center gap-2">
       {!hasRequestedSlip && (
        <>
         <button
          type="button"
          onClick={() => setShowGetSlipConfirm(true)}
          className="h-7 sm:h-8 text-xs sm:text-sm font-medium text-white flex items-center bg-primary rounded-md px-3 sm:px-4 hover:bg-primary/90"
         >
          Get Payment Slip
         </button>
         <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="border border-red-500 text-red-600 rounded-md px-4 h-8 text-sm hover:bg-red-50"
         >
          Delete
         </button>
        </>
       )}
       {hasRequestedSlip && (
        <button
         onClick={() => setShowUploadModal(true)}
         className="border border-primary rounded-md px-4 h-8 text-sm text-primary"
        >
         Upload Receipt
        </button>
       )}
      </div>
      <div className="flex items-start gap-2">
       <BiInfoCircle size={20} className=" text-gray-500 flex-shrink-0" />
       <p className="text-xs sm:text-sm text-gray-500">
        {hasRequestedSlip
         ? "Check your email for the slip, pay at the cashier, upload your receipt, then proceed to OCSSS Office."
         : "Click Get Payment Slip to receive your slip by email. After payment, upload your receipt, then proceed to OCSSS Office."}
       </p>
      </div>
     </div>
     {showUploadModal && (
      <UploadSlipModal
       close={() => setShowUploadModal(false)}
       applicationId={application.application_id}
       applicationRole={application.application_role}
       onSuccess={onSlipUploaded}
      />
     )}
     {showDeleteModal && (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
       <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative">
        <button
         type="button"
         onClick={() => setShowDeleteModal(false)}
         className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
         <IoClose size={20} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
         Delete application?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
         This will permanently remove this pending application. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
         <button
          type="button"
          onClick={() => setShowDeleteModal(false)}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
         >
          Cancel
         </button>
         <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className={`px-4 py-2 text-sm rounded-md text-white ${
           isDeleting ? "bg-red-300 cursor-not-allowed" : "bg-red-500 hover:bg-red-600"
          }`}
         >
          {isDeleting ? "Deleting..." : "Delete"}
         </button>
        </div>
       </div>
      </div>
     )}
     {showGetSlipConfirm && (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
       <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative">
        <button
         type="button"
         onClick={() => setShowGetSlipConfirm(false)}
         className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
         <IoClose size={20} />
        </button>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
         Get payment slip?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
         After you get the payment slip, this application can no longer be deleted. The status will change to
         {" "}“Waiting for approval” and you will be able to upload your receipt.
        </p>
        <div className="flex justify-end gap-2">
         <button
          type="button"
          onClick={() => setShowGetSlipConfirm(false)}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
         >
          Cancel
         </button>
         <button
          type="button"
          onClick={async () => {
           try {
            const response = await fetch(
             buildUrl(`/applicant/application/${application.application_id}/payment-slip`),
             {
              method: "POST",
              headers: {
               "Content-Type": "application/json",
               Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
             }
            );
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
             toast.error(data.detail || data.message || "Failed to send payment slip.");
             return;
            }
            setHasRequestedSlip(true);
            setStatusLabel("Waiting for approval");
            // #region agent log
            agentLog({
             hypothesisId: "H1_H2",
             location: "ApplicationInfo.jsx:ApplicationCard:GetPaymentSlip",
             message: "Requested payment slip for application",
             data: {
              application_id: application.application_id,
              prevStatus: initialStatus,
              newStatusLabel: "Waiting for approval",
              responseMessage: data.message || null,
             },
            });
            // #endregion
            setShowGetSlipConfirm(false);
            toast.success(data.message || "Payment slip has been sent. Please check your email.");
           } catch (e) {
            console.error("Error requesting payment slip:", e);
            toast.error("Failed to request payment slip. Please try again.");
           }
          }}
          className="px-4 py-2 text-sm rounded-md text-white bg-primary hover:bg-primary/90"
         >
          Confirm
         </button>
        </div>
       </div>
      </div>
     )}
    </div>
   </div>
  );
 };

 return (
  <div className="space-y-4 sm:space-y-5">
   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2 sm:gap-4">
     <div>
      <h1 className="text-2xl font-semibold">Applications</h1>
      <p className="text-xs sm:text-sm text-gray-500 font-light">
       Monitor created and submitted gate pass applications
      </p>
     </div>
     <div className="w-full sm:w-auto">
      <select
       value={filter}
       onChange={(e) => setFilter(e.target.value)}
       className="w-full sm:w-auto bg-slate-100 border border-gray-300 rounded-md p-2 text-xs sm:text-sm font-medium px-4 sm:px-10"
      >
       <option value="All">All</option>
       <option value="Car">Car</option>
       <option value="Truck">Truck</option>
       <option value="Motorcycle">Motorcycle</option>
       <option value="Van">Van</option>
       <option value="Tricycle">Tricycle</option>
      </select>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-1 gap-3 sm:gap-4">
    {filteredApplications.length > 0 ? (
     filteredApplications.map((application, index) => (
      <ApplicationCard key={index} application={application} />
     ))
    ) : (
     <div className="bg-gray-50 rounded-lg p-4 sm:p-6 text-center">
      <p className="text-sm sm:text-base text-gray-500">
       No applications found.
      </p>
     </div>
    )}
   </div>
  </div>
 );
};

// Change the formatORNumber function to handle 7 digits without dash
const formatORNumber = (value) => {
 // Remove all non-digit characters
 const numbers = value.replace(/\D/g, "");

 // Limit total length to 7 digits
 return numbers.slice(0, 7);
};

const UploadSlipModal = ({
 close,
 applicationId,
 applicationRole,
 onSuccess,
}) => {
 const [selectedFile, setSelectedFile] = useState(null);
 const [previewUrl, setPreviewUrl] = useState(null);
 const [isUploading, setIsUploading] = useState(false);
 const [orNumber, setOrNumber] = useState(""); // Add this line
 const fileInputRef = useRef(null);

 // Prevent background scrolling when modal is open
 useEffect(() => {
  document.body.style.overflow = "hidden";
  return () => {
   document.body.style.overflow = "auto";
  };
 }, []);

 const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
   setSelectedFile(file);
   const reader = new FileReader();
   reader.onloadend = () => {
    setPreviewUrl(reader.result);
   };
   reader.readAsDataURL(file);
  }
 };

 const handleRemoveFile = () => {
  setSelectedFile(null);
  setPreviewUrl(null);
  if (fileInputRef.current) {
   fileInputRef.current.value = "";
  }
 };

 const handleDrop = (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) {
   setSelectedFile(file);
   const reader = new FileReader();
   reader.onloadend = () => {
    setPreviewUrl(reader.result);
   };
   reader.readAsDataURL(file);
  }
 };

 const handleDragOver = (e) => {
  e.preventDefault();
 };

 const handleUpload = async (e) => {
  e.preventDefault();

  if (!selectedFile) {
   toast.error("Please select a file to upload");
   return;
  }

  // Update regex to require exactly 7 digits
  const orNumberRegex = /^\d{7}$/;
  if (!orNumber || !orNumberRegex.test(orNumber)) {
   toast.error("OR Number must be exactly 7 digits");
   return;
  }

  if (!applicationId) {
   toast.error("Application ID is missing");
   return;
  }

  try {
   setIsUploading(true);
   const formData = new FormData();
   formData.append("application_ids", applicationId);
   formData.append("slip_image", selectedFile);
   formData.append("official_receipt", orNumber);
   const response = await fetch(
    buildUrl("/applicant/applications/submit-pending"),
    {
     method: "POST",
     headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
     body: formData,
    }
   );

   const data = await response.json();

   if (!response.ok) {
    throw new Error(data.message || "Failed to upload slip");
   }

   toast.success(`Slip uploaded successfully for ${applicationRole}`);

   // Call the success callback instead of reloading the page
   if (onSuccess) {
    onSuccess();
   }

   // Close the modal
   close();
  } catch (error) {
   console.error("Error uploading slip:", error);
   toast.error(error.message || "Failed to upload slip. Please try again.");
  } finally {
   setIsUploading(false);
  }
 };

 // Inside UploadSlipModal component, modify the input handler:
 const handleORNumberChange = (e) => {
  const formatted = formatORNumber(e.target.value);
  setOrNumber(formatted);
 };

 return (
  <>
   <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="bg-white w-[580px] rounded-2xl shadow-xl transform transition-all relative p-8">
     <div className="flex items-center justify-between">
      <h1 className="text-xl font-medium text-gray-500">
       Upload Official Receipt
      </h1>
      <IoClose
       onClick={close}
       size={24}
       className="text-red-500 cursor-pointer"
      />
     </div>
     <div className="mt-3">
      <p className="text-gray-400">Please upload your official receipt here</p>
     </div>

     <form onSubmit={handleUpload}>
      {/* Upload Area */}
      <div
       className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-6"
       onDrop={handleDrop}
       onDragOver={handleDragOver}
      >
       {!selectedFile ? (
        <div className="text-center">
         <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*"
          ref={fileInputRef}
         />
         <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center justify-center"
         >
          <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
           <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
           >
            <path
             strokeLinecap="round"
             strokeLinejoin="round"
             strokeWidth={2}
             d="M12 4v16m8-8H4"
            />
           </svg>
          </div>
          <span className="text-gray-500">
           Click to upload or drag and drop
          </span>
          <span className="text-sm text-gray-400 mt-1">
           PNG, JPG up to 10MB
          </span>
         </label>
        </div>
       ) : (
        <div className="relative">
         <div className="absolute -top-2 -right-2 z-10">
          <button
           type="button"
           onClick={handleRemoveFile}
           className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          >
           <IoClose size={16} />
          </button>
         </div>
         <div className="relative w-full h-[300px] rounded-lg overflow-hidden">
          <img
           src={previewUrl}
           alt="Preview"
           className="w-full h-full object-contain"
          />
         </div>
         <p className="mt-2 text-sm text-gray-500 text-center">
          {selectedFile.name}
         </p>
        </div>
       )}
      </div>

      <div className="flex flex-col gap-2 mt-5">
       <label htmlFor="or_number" className="text-gray-400">
        Official Receipt Number:
       </label>
       <input
        id="or_number"
        type="text"
        className={`px-4 h-10 rounded-md border ${
         orNumber && !/^\d{7}$/.test(orNumber)
          ? "border-red-500"
          : "border-gray-300"
        } text-primary`}
        value={orNumber}
        onChange={handleORNumberChange}
        placeholder="ex. 34XXXXX"
        maxLength={7} // 7 digits only
       />
       {orNumber && !/^\d{7}$/.test(orNumber) && (
        <p className="text-xs text-red-500 mt-1">Must be exactly 7 digits</p>
       )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end gap-3">
       <button
        type="button"
        onClick={close}
        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        disabled={isUploading}
       >
        Cancel
       </button>
       <button
        type="submit"
        disabled={!selectedFile || !orNumber || isUploading}
        className={`px-4 py-2 rounded-md text-white ${
         selectedFile && orNumber && !isUploading
          ? "bg-primary hover:bg-primary/90"
          : "bg-gray-300 cursor-not-allowed"
        } transition-colors`}
       >
        {isUploading ? (
         <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Uploading...
         </div>
        ) : (
         "Upload"
        )}
       </button>
      </div>
     </form>
    </div>
   </div>
  </>
 );
};
