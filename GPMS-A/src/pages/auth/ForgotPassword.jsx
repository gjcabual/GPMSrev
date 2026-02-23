import { IoClose, IoCloseCircle } from "react-icons/io5";
import { Form, useNavigate } from "react-router-dom";
import { buildUrl } from "../../utils/buildUrl";
import { useState } from "react";
import { toast } from "sonner";

export const ForgotPassword = () => {
 const nav = useNavigate();

 const [email, setEmail] = useState("");
 const [showOtpModal, setShowOtpModal] = useState(false);
 const [isLoading, setIsLoading] = useState(false);

 const formData = new FormData();
 const handleForgotPassword = async () => {
  if (!email || !email.includes("@")) {
   toast.error("Please enter a valid email address");
   return;
  }

  setIsLoading(true);
  formData.append("email", email);

  try {
   const res = await fetch(buildUrl("/forgot-password/request-otp"), {
    method: "POST",
    body: formData,
   });

   const data = await res.json();
   console.log(data);
   if (res.ok) {
    toast.success(
     "An email has been sent to your email address. Please check your email to reset your password."
    );
    setShowOtpModal(true);
   } else {
    toast.error(
     data.message || "Failed to send verification code. Please try again."
    );
   }
  } catch (err) {
   console.log(err);
   toast.error("Something went wrong. Please try again.");
  } finally {
   setIsLoading(false);
  }
 };

 const handleProceedToVerify = () => {
  nav("/verify-reset-password", { state: { email } });
 };

 return (
  <>
   <div className="h-screen flex flex-col gap-10 justify-center items-center bg-gray-100">
    <img src="/main_logo.png" alt="" className="w-[300px] z-50" />
    <img
     src="/auth/bg_login.png"
     alt=""
     className="w-full h-full absolute opacity-50"
    />
    <div className="w-[700px] h-auto p-8 rounded-xl bg-white z-50">
     <div className="flex items-center justify-between">
      <h1 className="text-xl font-medium">Forgot Password?</h1>
      <IoCloseCircle
       onClick={() => nav(-1)}
       size={24}
       className="text-red-500 cursor-pointer"
      />
     </div>
     <div className="mt-5">
      <p className="text-gray-500 font-light">
       No worries! As long as you have your email account, you can always
       retrieve it anytime.
      </p>
      <div className="flex flex-col mt-5 gap-2">
       <label htmlFor="email">Email</label>
       <input
        type="email"
        id="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-10 border border-gray-500 outline-none px-4 rounded-md"
        placeholder="Enter your email address"
       />
      </div>
      <div className="mt-10">
       <button
        onClick={handleForgotPassword}
        disabled={isLoading}
        className="w-full h-10 px-4 bg-primary rounded-md text-white text-md font-medium cursor-pointer flex items-center justify-center"
       >
        {isLoading ? (
         <>
          <Spinner />
          <span className="ml-2">Processing...</span>
         </>
        ) : (
         "Proceed"
        )}
       </button>
      </div>
     </div>
    </div>
   </div>

   {/* OTP Sent Modal */}
   {showOtpModal && (
    <OtpSent
     email={email}
     onClose={() => setShowOtpModal(false)}
     onProceed={handleProceedToVerify}
    />
   )}
  </>
 );
};

const Spinner = () => {
 return (
  <svg
   className="animate-spin h-5 w-5 text-white"
   xmlns="http://www.w3.org/2000/svg"
   fill="none"
   viewBox="0 0 24 24"
  >
   <circle
    className="opacity-25"
    cx="12"
    cy="12"
    r="10"
    stroke="currentColor"
    strokeWidth="4"
   ></circle>
   <path
    className="opacity-75"
    fill="currentColor"
    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
   ></path>
  </svg>
 );
};

const OtpSent = ({ email, onClose, onProceed }) => {
 return (
  <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100]">
   <div className="w-[500px] bg-white rounded-xl p-6">
    <div className="flex items-center justify-between">
     <h2 className="text-xl font-medium">Email Sent</h2>
     <IoClose
      onClick={onClose}
      size={24}
      className="text-gray-500 cursor-pointer"
     />
    </div>
    <div className="mt-5 flex flex-col items-center text-center">
     <div className="bg-green-100 p-4 rounded-full">
      <svg
       xmlns="http://www.w3.org/2000/svg"
       className="h-12 w-12 text-green-600"
       fill="none"
       viewBox="0 0 24 24"
       stroke="currentColor"
      >
       <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
       />
      </svg>
     </div>
     <h3 className="text-lg font-medium mt-4">Check Your Email</h3>
     <p className="text-gray-600 mt-2">
      We've sent an OTP to <span className="font-medium">{email}</span>
     </p>
     <p className="text-gray-500 mt-1 text-sm">
      Please check your email to get the verification code
     </p>
     <div className="mt-6 w-full">
      <button
       onClick={onProceed}
       className="w-full h-10 px-4 bg-primary rounded-md text-white font-medium cursor-pointer"
      >
       Proceed to Verification
      </button>
     </div>
    </div>
   </div>
  </div>
 );
};
