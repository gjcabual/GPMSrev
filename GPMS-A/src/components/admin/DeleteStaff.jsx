import { useState } from "react";
import { IoCloseCircle } from "react-icons/io5";
import { SuccessModal } from "../response/ResponseModal";
import { buildUrl } from "../../utils/buildUrl";
import { toast } from "sonner";

export const DeleteStaff = ({ staff, staffId, close, refreshData }) => {
 const [success, setSucccess] = useState(false);
 const [loading, setLoading] = useState(false);

 const handleDelete = async () => {
  setLoading(true);
  try {
   const res = await fetch(buildUrl(`/admin/admin/accounts/${staffId}`), {
    method: "DELETE",
    headers: {
     "Content-Type": "application/json",
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
   });

   if (res.ok) {
    setSucccess(true);
    setLoading(false);
    // Refresh the staff list after successful deletion
    if (refreshData) refreshData();
   } else {
    const data = await res.json();
    toast.error(data.detail || "Failed to delete staff");
    setLoading(false);
   }
  } catch (err) {
   console.log(err);
   toast.error("An error occurred, please try again later!");
   setLoading(false);
  }
 };

 return (
  <>
   <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="bg-white w-[500px] rounded-2xl shadow-xl transform transition-all relative p-8">
     <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-primary">Delete Staff</h1>
      <IoCloseCircle
       onClick={() => close(false)}
       size={26}
       className="text-red-500 cursor-pointer"
      />
     </div>
     <div className="mt-5">
      <p className="text-sm text-gray-500 font-light">
       <span className="text-red-500 font-medium">
        REMOVE {staff.name} AS STAFF?
       </span>{" "}
       Are you sure you want to remove this staff? Removing staff would delete
       all of its data.
      </p>
     </div>
     <div className="mt-10 flex items-center justify-end gap-2">
      <button
       onClick={() => close(false)}
       className="text-sm text-gray-500 font-light cursor-pointer"
       disabled={loading}
      >
       Close
      </button>
      <button
       onClick={handleDelete}
       disabled={loading}
       className="h-10 px-4 bg-red-500 rounded-md text-white font-medium cursor-pointer disabled:opacity-50"
      >
       {loading ? "Deleting..." : "Delete"}
      </button>
     </div>
    </div>
   </div>
   {success && (
    <SuccessModal
     desc="Staff has been deleted successfully"
     close={() => {
      setSucccess(false);
      close(false);
     }}
    />
   )}
  </>
 );
};
