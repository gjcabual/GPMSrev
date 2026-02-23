import { IoCloseCircle } from "react-icons/io5";
import { FailModal, SuccessModal } from "../response/ResponseModal";
import { useState } from "react";
import { buildUrl } from "../../utils/buildUrl";
import { toast } from "sonner"; // Ensure you have this imported

export const ChangePassword = ({ close }) => {
 const [success, setSuccess] = useState(false);
 const [error, setError] = useState(false);
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [desc, setDesc] = useState("");

 const formData = new FormData();

 const changePassword = async () => {
  if (!newPassword || !confirmPassword) {
   toast.error("Please fill in both password fields.");
   return;
  }

  if (newPassword !== confirmPassword) {
   toast.error("Passwords do not match.");
   return;
  }

  formData.append("new_password", newPassword);

  try {
   const res = await fetch(buildUrl("/reset-password"), {
    method: "POST",
    headers: {
     // "Content-Type": "application/json",
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
   });

   const data = await res.json();

   if (res.ok) {
    // Set success modal to true
    setSuccess(true);
    setDesc("Password changed successfully!");

    // Toast notification
    toast.success("Password changed successfully!");

    // Close the change password modal after successful change
    setTimeout(() => {
     close(false);
    }, 1500); // Short delay to let the toast be seen
   } else {
    setSuccess(false);
    setError(true);
    setDesc(data.detail);
    toast.error(data.message || "Failed to change password.");
   }
  } catch (err) {
   console.error(err);
   setSuccess(false);
   setError(true);
   toast.error("An error occurred. Please try again.");
  }
 };

 return (
  <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
   <div className="bg-white w-[500px] rounded-2xl shadow-xl transform transition-all relative p-8">
    <div className="flex items-center justify-between">
     <h1 className="text-lg font-semibold text-primary">Change Password</h1>
     <IoCloseCircle
      onClick={() => close(false)}
      size={24}
      className="text-red-500 cursor-pointer"
     />
    </div>
    <div className="mt-5 space-y-3">
     <div className="flex flex-col gap-1">
      <label className="text-md font-medium text-gray-500">New Password</label>
      <input
       type="password"
       value={newPassword}
       onChange={(e) => setNewPassword(e.target.value)}
       className="h-10 px-4 rounded-md border border-gray-300 outline-none"
      />
     </div>
     <div className="flex flex-col gap-1">
      <label className="text-md font-medium text-gray-500">
       Confirm Password
      </label>
      <input
       type="password"
       value={confirmPassword}
       onKeyDown={(e) => {
        if (e.key === "Enter") {
         changePassword();
        }
       }}
       onChange={(e) => setConfirmPassword(e.target.value)}
       className="h-10 px-4 rounded-md border border-gray-300 outline-none"
      />
     </div>
    </div>
    <div className="mt-10">
     <button
     onClick={changePassword}
      className="w-full text-sm bg-primary h-10 px-4 rounded-md text-white font-medium cursor-pointer"
     >
      Change Password
     </button>
    </div>

    {error && <FailModal desc={desc} close={() => setError(false)} />}
    {success && <SuccessModal desc={desc} close={() => setSuccess(false)} />}
   </div>
  </div>
 );
};
