import { useEffect, useState } from "react";
import { buildUrl } from "../../utils/buildUrl";
import { IoCloseCircle } from "react-icons/io5";
import { SuccessModal } from "../response/ResponseModal";
import { toast } from "sonner";

export const ApproveModal = ({
 data,
 status: initialStatus,
 close,
 onSuccess,
}) => {
 const [success, setSuccess] = useState(false);
 const [status, setStatus] = useState(initialStatus);
 const [message, setMessage] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [remarks, setRemarks] = useState("");

 // Support both nested (data.applicant.application_id) and flat (data.application_id) shapes
 const applicationId = data?.application_id ?? data?.applicant?.application_id;
 const hasUploadedReceipt = Boolean(
  data?.has_uploaded_receipt ||
   (data?.slip?.image &&
    String(data?.slip?.official_receipt || "").trim() &&
    Number(data?.slip?.amount) > 0)
 );

 useEffect(() => {
  document.body.style.overflow = "hidden";

  return () => {
   document.body.style.overflow = "auto";
  };
 }, []);

 const handleApprove = async () => {
  if (applicationId == null || applicationId === "") {
   console.error("ApproveModal: missing application_id", data);
   toast.error("Application ID is missing. Please select an application again.");
   return;
  }
 if (status === "Approved" && !hasUploadedReceipt) {
  toast.error("Cannot approve yet. Applicant must upload receipt image, OR number, and amount.");
  return;
 }
  if (status === "Rejected" && !String(remarks || "").trim()) {
   toast.error("Remarks are required when rejecting an application.");
   return;
  }
  const formData = new FormData();
  formData.append("status", status);
  formData.append("application_id", String(applicationId));
  formData.append("remarks", String(remarks || "").trim());
  try {
   setIsSubmitting(true);
   const res = await fetch(buildUrl("/staff/application-status/update"), {
    method: "POST",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
   });
   const responseData = await res.json();
   if (res.ok) {
    // First set success to true to render the success modal
    setMessage(`The application was ${status} successfully!`);
    setSuccess(true);

    // Delay the parent callback until AFTER showing the success modal
    setTimeout(() => {
     // Call the success callback to update parent component data
     if (onSuccess) {
      onSuccess(applicationId, status);
     }

     // Close modal only after showing success message
     close();
    }, 3000);
   } else {
    console.error("Approve failed:", responseData);
    const d = responseData?.detail;
    const msg = Array.isArray(d) ? (d[0]?.msg ?? d[0]?.message ?? "Failed to update application.") : (typeof d === "string" ? d : "Failed to update application.");
    toast.error(msg);
   }
   console.log(responseData);
  } catch (err) {
   console.error("Approve error:", err);
   toast.error("Request failed. Please try again.");
  } finally {
   setIsSubmitting(false);
  }
 };

 // If success is true, render success modal instead of the approval modal
 return (
  <>
   <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
    {success ? (
     <SuccessModal
      desc={message}
      close={() => setSuccess(false)}
      hideButton={true}
     />
    ) : (
     <div className="bg-white w-[580px] rounded-2xl shadow-xl transform transition-all relative p-8">
      <div className="flex items-center justify-between">
       <h1 className="text-xl font-semibold">Gate Pass Application</h1>
       <IoCloseCircle
        onClick={close}
        size={26}
        className="text-red-500 cursor-pointer"
       />
      </div>
      <div className="mt-5">
       <h1>
        Are you sure you want to {status === "Approved" ? "Approve" : "Reject"}{" "}
        this applicant?
       </h1>
      </div>
      <div className="mt-10">
       <h1 className="text-sm text-gray-400">Applicant Information</h1>
       <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2">
         <span className="w-24 text-gray-600 font-medium">Name:</span>
         <span className="flex items-center h-10 px-4 rounded-md bg-slate-100 text-md w-full font-medium text-gray-500">
          {data?.applicant?.name ?? data?.full_name ?? "—"}
         </span>
        </div>
        <div className="flex items-center gap-2">
         <span className="w-24 text-gray-600 font-medium">Sticker ID:</span>
         <span className="flex items-center h-10 px-4 rounded-md bg-slate-100 text-md w-full font-medium text-gray-500">
          {data?.applicant?.vehicle?.sticker?.sticker_id ?? data?.sticker_id ?? "##-####"}
         </span>
        </div>
        <div className="flex items-center gap-2">
         <span className="w-24 text-gray-600 font-medium">Plate:</span>
         <span className="flex items-center h-10 px-4 rounded-md bg-slate-100 text-md w-full font-medium text-gray-500">
          {data?.applicant?.vehicle?.plate_no ?? data?.plate_number ?? "—"}
         </span>
        </div>
        <div className="flex items-center gap-2">
         <span className="w-24 text-gray-600 font-medium">Receipt:</span>
         <span className="flex items-center h-10 px-4 rounded-md bg-slate-100 text-md w-full font-medium text-gray-500">
          {hasUploadedReceipt ? "Uploaded" : "Not uploaded"}
         </span>
        </div>
        <div className="flex items-center gap-2">
         <span className="w-24 text-gray-600 font-medium">OR #:</span>
         <span className="flex items-center h-10 px-4 rounded-md bg-slate-100 text-md w-full font-medium text-gray-500">
          {data?.slip?.official_receipt || "N/A"}
         </span>
        </div>
       <div className="flex items-center gap-2">
         <span className="w-24 text-gray-600 font-medium">Amount:</span>
         <span className="flex items-center h-10 px-4 rounded-md bg-slate-100 text-md w-full font-medium text-gray-500">
          {data?.slip?.amount != null ? data.slip.amount : "N/A"}
         </span>
        </div>
        {status === "Rejected" && (
         <div className="flex items-start gap-2">
          <span className="w-24 text-gray-600 font-medium pt-2">Remarks:</span>
          <textarea
           value={remarks}
           onChange={(e) => setRemarks(e.target.value)}
           className="w-full min-h-[90px] px-3 py-2 rounded-md border border-gray-300 outline-none focus:border-primary text-sm"
           placeholder="Enter reason for rejection"
          />
         </div>
        )}
       </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-10">
        <button
         onClick={close}
         className="h-10 px-4 rounded-md text-gray-600 cursor-pointer transition-colors hover:bg-gray-100"
        >
         Cancel
        </button>
        <button
         onClick={handleApprove}
         disabled={isSubmitting}
         className={`h-10 px-4 rounded-md text-white transition-all ${
          isSubmitting
           ? "opacity-70 cursor-not-allowed"
           : "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
         } ${
          status === "Approved"
           ? "bg-green-500 hover:bg-green-600"
           : "bg-red-500 hover:bg-red-600"
         }`}
        >
         {isSubmitting
          ? "Processing..."
          : status === "Approved"
          ? "Approve"
          : "Reject"}
        </button>
      </div>
     </div>
    )}
   </div>
  </>
 );
};
