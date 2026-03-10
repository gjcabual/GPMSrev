import { useState, useRef, useEffect } from "react";
import { MdMarkEmailRead } from "react-icons/md";
import { buildUrl } from "../../utils/buildUrl";
import { toast } from "sonner";

export const VerifyEmail = ({ email, onClose, onVerificationComplete }) => {
 const [otp, setOtp] = useState(["", "", "", "", "", ""]);
 const [isResending, setIsResending] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const inputRefs = useRef([]);

 useEffect(() => {
  // Initialize refs array
  inputRefs.current = inputRefs.current.slice(0, 6);
 }, []);

 const handleInputChange = (index, value) => {
  if (value.length > 1) {
   // If user pastes multiple characters, distribute them
   const newOtp = [...otp];
   const chars = value.split("").slice(0, 6 - index);
   chars.forEach((char, i) => {
    if (index + i < 6) {
     newOtp[index + i] = char;
    }
   });
   setOtp(newOtp);

   // Move focus to the next empty input or the last input
   const nextIndex = Math.min(index + chars.length, 5);
   if (inputRefs.current[nextIndex]) {
    inputRefs.current[nextIndex].focus();
   }
   return;
  }

  const newOtp = [...otp];
  newOtp[index] = value;
  setOtp(newOtp);

  // Move to next input if value is entered
  if (value && index < 5) {
   inputRefs.current[index + 1].focus();
  }
 };

 const handleKeyDown = (index, e) => {
  // Handle backspace
  if (e.key === "Backspace" && !otp[index] && index > 0) {
   inputRefs.current[index - 1].focus();
  }
 };

 const handleVerifyAccount = async () => {
  const otpString = otp.join("");
  if (otpString.length !== 6) {
   toast.error("Please enter the complete OTP code");
   return;
  }

  setIsSubmitting(true);

  const formData = new FormData();
  formData.append("email", email);
  formData.append("otp", otpString);
  try {
   const res = await fetch(buildUrl("/applicant/verify-email"), {
    method: "POST",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
   });

   const data = await res.json();
   if (res.ok) {
    toast.success("Email verified successfully");
    onVerificationComplete?.(true);
   } else {
    toast.error(data.message || "Failed to verify email");
   }
  } catch (err) {
   console.error(err);
   toast.error("An error occurred while verifying email");
  } finally {
   setIsSubmitting(false);
  }
 };

 const handleResendOTP = async () => {
  const formData = new FormData();
  formData.append('email', email)
  setIsResending(true);
  try {
   const res = await fetch(buildUrl("/applicant/resend-verification"), {
    method: "POST",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
   });

   const data = await res.json();
   if (res.ok) {
    toast.success("OTP has been resent to your email");
   } else {
    toast.error(data.message || "Failed to resend OTP");
   }
  } catch (err) {
   console.error(err);
   toast.error("An error occurred while resending OTP");
  } finally {
   setIsResending(false);
  }
 };

 return (
  <div className="w-full md:w-[600px] h-auto bg-white rounded-lg z-50">
   <div className="h-6 bg-primary rounded-t-lg" />
   <div className="p-6">
    <div className="flex items-start justify-between">
     <div className="flex flex-col items-start gap-2">
      <MdMarkEmailRead size={60} className="text-primary" />
     </div>
     <p
      type="button"
      onClick={onClose}
      className="text-primary font-medium cursor-pointer hover:text-primary/80"
     >
      back
     </p>
    </div>
    <h1 className="text-xl text-primary font-medium">Verify Email</h1>
    <p className="text-md font-light text-gray-500">
     Please verify your email to continue
    </p>
    <p className="text-sm text-gray-600">
     An OTP or One-Time-Password has been sent to your email account.
    </p>
    <div className="mt-5">
     <div className="flex gap-2 justify-center">
      {otp.map((digit, index) => (
       <input
        key={index}
        ref={(el) => (inputRefs.current[index] = el)}
        type="text"
        maxLength={6}
        value={digit}
        onChange={(e) => handleInputChange(index, e.target.value)}
        onKeyDown={(e) => handleKeyDown(index, e)}
        className="w-12 h-12 text-center text-xl border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
       />
      ))}
     </div>
     <div className="mt-5 flex items-center justify-between">
      <button
       onClick={handleVerifyAccount}
       disabled={isSubmitting}
       className="bg-primary h-10 px-6 text-white rounded-md cursor-pointer hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
       {isSubmitting ? "Verifying..." : "Submit"}
      </button>
      <p
       type="button"
       onClick={handleResendOTP}
       disabled={isResending}
       className="text-primary hover:text-primary/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
       {isResending ? "Resending..." : "Resend OTP"}
      </p>
     </div>
    </div>
   </div>
  </div>
 );
};
