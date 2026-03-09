import { useState } from "react";
import { IoCloseCircle } from "react-icons/io5";
import { toast } from "sonner";
import { buildUrl } from "../../utils/buildUrl";

const getLoginPathFromCurrentRoute = () => {
 const segment = window.location.pathname.split("/").filter(Boolean)[0];
 if (segment === "admin") return "/admin-login";
 if (segment === "staff") return "/staff-login";
 return "/applicant-login";
};

export const ChangeEmail = ({ close, currentEmail = "" }) => {
 const [newEmail, setNewEmail] = useState("");
 const [currentPassword, setCurrentPassword] = useState("");
 const [otpCode, setOtpCode] = useState("");
 const [step, setStep] = useState(1);
 const [requestLoading, setRequestLoading] = useState(false);
 const [verifyLoading, setVerifyLoading] = useState(false);
 const [resendLoading, setResendLoading] = useState(false);

 const handleRequest = async () => {
  if (requestLoading) return;
  if (!newEmail || !newEmail.includes("@")) {
   toast.error("Please enter a valid new email");
   return;
  }
  if (!currentPassword) {
   toast.error("Current password is required");
   return;
  }

  setRequestLoading(true);
  try {
   const formData = new FormData();
   formData.append("new_email", newEmail.trim());
   formData.append("current_password", currentPassword);
   const res = await fetch(buildUrl("/profile/email/change/request"), {
    method: "POST",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
   });
   const data = await res.json();
   if (!res.ok) {
    toast.error(data?.detail || "Failed to request email change");
    return;
   }
   toast.success(data?.message || "Verification code sent");
   setStep(2);
  } catch (err) {
   toast.error("Failed to request email change");
  } finally {
   setRequestLoading(false);
  }
 };

 const handleResend = async () => {
  if (resendLoading) return;
  setResendLoading(true);
  try {
   const res = await fetch(buildUrl("/profile/email/change/resend"), {
    method: "POST",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
   });
   const data = await res.json();
   if (!res.ok) {
    toast.error(data?.detail || "Failed to resend code");
    return;
   }
   toast.success(data?.message || "Verification code resent");
  } catch (err) {
   toast.error("Failed to resend code");
  } finally {
   setResendLoading(false);
  }
 };

 const handleVerify = async () => {
  if (verifyLoading) return;
  if (!otpCode.trim()) {
   toast.error("Please enter the OTP code");
   return;
  }

  setVerifyLoading(true);
  try {
   const formData = new FormData();
   formData.append("otp_code", otpCode.trim());
   const res = await fetch(buildUrl("/profile/email/change/verify"), {
    method: "POST",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
   });
   const data = await res.json();
   if (!res.ok) {
    toast.error(data?.detail || "Failed to verify email change");
    return;
   }

   toast.success(data?.message || "Email changed successfully");
   localStorage.clear();
   close(false);
   setTimeout(() => {
    window.location.href = getLoginPathFromCurrentRoute();
   }, 1200);
  } catch (err) {
   toast.error("Failed to verify email change");
  } finally {
   setVerifyLoading(false);
  }
 };

 return (
  <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
   <div className="bg-white w-full max-w-[500px] rounded-2xl shadow-xl p-6 md:p-8">
    <div className="flex items-center justify-between">
     <h1 className="text-lg font-semibold text-primary">Change Email</h1>
     <IoCloseCircle
      onClick={() => close(false)}
      size={24}
      className="text-red-500 cursor-pointer"
     />
    </div>

    {step === 1 ? (
     <div className="mt-5 space-y-3">
      <div className="flex flex-col gap-1">
       <label className="text-sm text-gray-600">Current Email</label>
       <input
        type="text"
        value={currentEmail}
        readOnly
        className="h-10 px-4 rounded-md border border-gray-300 bg-gray-100 text-gray-700"
       />
      </div>
      <div className="flex flex-col gap-1">
       <label className="text-sm text-gray-600">New Email</label>
       <input
        type="email"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        className="h-10 px-4 rounded-md border border-gray-300 outline-none"
        placeholder="Enter your new email address"
       />
      </div>
      <div className="flex flex-col gap-1">
       <label className="text-sm text-gray-600">Current Password</label>
       <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        onKeyDown={(e) => {
         if (e.key === "Enter") handleRequest();
        }}
        className="h-10 px-4 rounded-md border border-gray-300 outline-none"
       />
      </div>
      <p className="text-xs text-gray-500">
       A verification code will be sent to your new email. Your current email stays active until verification is complete.
      </p>
      <button
       onClick={handleRequest}
       disabled={requestLoading}
       className={`w-full h-10 rounded-md text-white flex items-center justify-center gap-2 ${
        requestLoading ? "bg-primary/80 cursor-not-allowed" : "bg-primary cursor-pointer"
       }`}
      >
       {requestLoading && (
        <span className="inline-block h-4 w-4 rounded-full border-2 border-white/70 border-t-white animate-spin" />
       )}
       {requestLoading ? "Requesting..." : "Send Verification Code"}
      </button>
     </div>
    ) : (
     <div className="mt-5 space-y-3">
      <div className="flex flex-col gap-1">
       <label className="text-sm text-gray-600">OTP Code</label>
       <input
        type="text"
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value)}
        onKeyDown={(e) => {
         if (e.key === "Enter") handleVerify();
        }}
        className="h-10 px-4 rounded-md border border-gray-300 outline-none"
        placeholder="Enter code sent to your new email"
       />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
       <button
        onClick={handleResend}
        disabled={resendLoading}
        className={`h-10 rounded-md border border-primary text-primary flex items-center justify-center gap-2 ${
         resendLoading ? "opacity-80 cursor-not-allowed" : "cursor-pointer"
        }`}
       >
        {resendLoading && (
         <span className="inline-block h-4 w-4 rounded-full border-2 border-primary/70 border-t-primary animate-spin" />
        )}
        {resendLoading ? "Resending..." : "Resend Code"}
       </button>
       <button
        onClick={handleVerify}
        disabled={verifyLoading}
        className={`h-10 rounded-md text-white flex items-center justify-center gap-2 ${
         verifyLoading ? "bg-primary/80 cursor-not-allowed" : "bg-primary cursor-pointer"
        }`}
       >
        {verifyLoading && (
         <span className="inline-block h-4 w-4 rounded-full border-2 border-white/70 border-t-white animate-spin" />
        )}
        {verifyLoading ? "Verifying..." : "Verify & Change Email"}
       </button>
      </div>
      <p className="text-xs text-gray-500">
       You will be signed out from all sessions after successful email change.
      </p>
     </div>
    )}
   </div>
  </div>
 );
};
