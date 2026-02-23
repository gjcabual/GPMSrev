import { useEffect, useState } from "react";
import { buildUrl } from "../../utils/buildUrl";
import { IoCloseCircle } from "react-icons/io5";
import { SuccessModal } from "../response/ResponseModal";

export const ApproveModal = ({
 data,
 status: initialStatus,
 close,
 onSuccess,
}) => {
 const [success, setSuccess] = useState(false);
 const [status, setStatus] = useState(initialStatus);
 const [message, setMessage] = useState("");

 useEffect(() => {
  document.body.style.overflow = "hidden";

  return () => {
   document.body.style.overflow = "auto";
  };
 }, []);

 const handleApprove = async () => {
  const formData = new FormData();
  formData.append("status", status);
  formData.append("application_id", data.applicant.application_id);
  try {
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
      onSuccess(data.applicant.application_id, status);
     }

     // Close modal only after showing success message
     close();
    }, 3000);
   }
   console.log(responseData);
  } catch (err) {
   console.log(err);
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
          {data.applicant.name}
         </span>
        </div>
        <div className="flex items-center gap-2">
         <span className="w-24 text-gray-600 font-medium">Sticker ID:</span>
         <span className="flex items-center h-10 px-4 rounded-md bg-slate-100 text-md w-full font-medium text-gray-500">
          {data.applicant.vehicle.sticker &&
          data.applicant.vehicle.sticker.sticker_id
           ? data.applicant.vehicle.sticker.sticker_id
           : "##-####"}
         </span>
        </div>
        <div className="flex items-center gap-2">
         <span className="w-24 text-gray-600 font-medium">Plate:</span>
         <span className="flex items-center h-10 px-4 rounded-md bg-slate-100 text-md w-full font-medium text-gray-500">
          {data.applicant.vehicle.plate_no}
         </span>
        </div>
       </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-10">
       <button
        onClick={close}
        className="h-10 px-4 rounded-md text-gray-600 cursor-pointer"
       >
        Cancel
       </button>
       <button
        onClick={handleApprove}
        className={`h-10 px-4 rounded-md text-white cursor-pointer ${
         status === "Approved" ? "bg-green-500" : "bg-red-500"
        }`}
       >
        {status === "Approved" ? "Approve" : "Reject"}
       </button>
      </div>
     </div>
    )}
   </div>
  </>
 );
};
