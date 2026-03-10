import { IoCloseCircle } from "react-icons/io5";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { buildUrl } from "../../utils/buildUrl";
import { toast } from "sonner";

const PASSWORD_REGEX =
 /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;
const PASSWORD_POLICY_MESSAGE =
 "Password must be at least 8 characters and include one uppercase, one number, and one special character.";

export const ResetPassword = () => {
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [passwordError, setPasswordError] = useState("");
 const [isLoading, setIsLoading] = useState(false);
 const newPasswordRef = useRef(null);

 const nav = useNavigate();
 const location = useLocation();

 // Get email and otp from location state
 const email = location.state?.email;
 const otp = location.state?.otp;

 // Redirect if email or otp is missing
 useEffect(() => {
  if (!email || !otp) {
   toast.error("Missing verification information. Please try again.");
   nav("/forgot-password");
  } else {
   // Focus on the first input field when component mounts
   newPasswordRef.current?.focus();
  }
 }, [email, otp, nav]);

 const handleSubmit = async (e) => {
  e.preventDefault();

  // Clear previous errors
  setPasswordError("");

  // Validate passwords
  if (!newPassword || !confirmPassword) {
   setPasswordError("Please fill in both password fields");
   return;
  }

  if (newPassword !== confirmPassword) {
   setPasswordError("Passwords do not match");
   return;
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
   setPasswordError(PASSWORD_POLICY_MESSAGE);
   return;
  }

  setIsLoading(true);

  const formData = new FormData();
  formData.append("email", email);
  formData.append("otp", otp);
  formData.append("new_password", newPassword);

  try {
   const res = await fetch(buildUrl("/forgot-password/reset-password"), {
    method: "POST",
    body: formData,
   });

   const data = await res.json();

   if (res.ok) {
    toast.success("Password reset successful!");
    nav("/gpms");
   } else {
    toast.error(data.message || "Failed to reset password. Please try again.");
   }
  } catch (err) {
   console.error(err);
   toast.error("Something went wrong. Please try again.");
  } finally {
   setIsLoading(false);
  }
 };

 return (
  <>
   <div className="min-h-screen flex flex-col gap-6 md:gap-10 justify-center items-center bg-gray-100 px-4 py-6 md:py-10">
    <img src="/main_logo.png" alt="" className="w-48 md:w-[300px] z-50 flex-shrink-0" />
    <img
     src="/auth/bg_login.png"
     alt=""
     className="w-full h-full absolute opacity-50 object-cover pointer-events-none"
    />
    <div className="w-full max-w-[500px] h-auto p-4 sm:p-6 md:p-8 rounded-xl bg-white z-50">
     <div className="flex items-center justify-between gap-2">
      <h1 className="text-xl md:text-2xl font-semibold">Reset Password</h1>
      <IoCloseCircle
       onClick={() => nav(-1)}
       size={24}
       className="text-red-500 cursor-pointer hover:opacity-80 transition-opacity"
       aria-label="Close"
      />
     </div>
     <form onSubmit={handleSubmit} className="mt-10">
      <div className="space-y-4">
       <div>
        <label htmlFor="newPassword" className="block mb-2">
         New Password
        </label>
        <input
         id="newPassword"
         type="password"
         ref={newPasswordRef}
         className="w-full h-10 px-4 border rounded-md outline-none focus:border-primary transition-colors"
         value={newPassword}
         onChange={(e) => setNewPassword(e.target.value)}
         placeholder="Enter new password"
         disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">{PASSWORD_POLICY_MESSAGE}</p>
       </div>
       <div>
        <label htmlFor="confirmPassword" className="block mb-2">
         Confirm Password
        </label>
        <input
         id="confirmPassword"
         type="password"
         className="w-full h-10 px-4 border rounded-md outline-none focus:border-primary transition-colors"
         value={confirmPassword}
         onChange={(e) => setConfirmPassword(e.target.value)}
         placeholder="Confirm new password"
         disabled={isLoading}
         onKeyDown={(e) => {
          if (e.key === "Enter" && newPassword && confirmPassword) {
           handleSubmit(e);
          }
         }}
        />
        {passwordError && (
         <p className="text-red-500 text-sm mt-1">{passwordError}</p>
        )}
       </div>
       <button
        type="submit"
        disabled={isLoading}
        className={`w-full bg-primary text-white py-2 rounded-md cursor-pointer hover:bg-primary-dark transition-colors ${
         isLoading ? "opacity-70" : ""
        }`}
       >
        {isLoading ? "Processing..." : "Reset Password"}
       </button>
      </div>
     </form>
    </div>
   </div>
  </>
 );
};

export const VerifyResetPassword = () => {
 const nav = useNavigate();
 const location = useLocation();
 const email = location.state?.email;
 const [isLoading, setIsLoading] = useState(false);
 const [errorMessage, setErrorMessage] = useState("");
 const inputRefs = useRef([]);

 useEffect(() => {
  if (!email) {
   toast.error("Email address is missing. Please try again.");
   nav("/forgot-password");
  } else {
   // Focus on the first input field when component mounts
   inputRefs.current[0]?.focus();
  }
 }, [email, nav]);

 const [verificationCode, setVerificationCode] = useState([
  "",
  "",
  "",
  "",
  "",
  "",
 ]);

 // Initialize refs for each input
 useEffect(() => {
  inputRefs.current = inputRefs.current.slice(0, 6);
 }, []);

 const handleCodeChange = (index, value) => {
  if (value.length > 1) {
   // If pasting multiple characters, distribute them across inputs
   const characters = value.split("").slice(0, 6); // Ensure we don't exceed 6 characters
   const newCode = [...verificationCode];

   for (let i = 0; i < characters.length && index + i < 6; i++) {
    newCode[index + i] = characters[i];
   }

   setVerificationCode(newCode);

   // Focus on the next empty input or last input if all are filled
   const nextEmptyIndex = newCode.findIndex((digit) => !digit);
   const nextIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : 5;
   inputRefs.current[nextIndex]?.focus();
  } else {
   // Normal single character input
   const newCode = [...verificationCode];
   newCode[index] = value.replace(/[^0-9]/g, ""); // Only allow numbers
   setVerificationCode(newCode);

   // Auto-focus next input if a digit was entered
   if (newCode[index] && index < 5) {
    inputRefs.current[index + 1]?.focus();
   }
  }
 };

 const handleKeyDown = (index, e) => {
  // Handle backspace
  if (e.key === "Backspace") {
   if (!verificationCode[index] && index > 0) {
    // If current field is empty, move to previous field
    inputRefs.current[index - 1]?.focus();
   } else if (verificationCode[index]) {
    // If current field has a value, clear it but stay in the same field
    const newCode = [...verificationCode];
    newCode[index] = "";
    setVerificationCode(newCode);
   }
  }
  // Handle left arrow
  else if (e.key === "ArrowLeft" && index > 0) {
   inputRefs.current[index - 1]?.focus();
   e.preventDefault();
  }
  // Handle right arrow
  else if (e.key === "ArrowRight" && index < 5) {
   inputRefs.current[index + 1]?.focus();
   e.preventDefault();
  }
  // Handle Enter key to submit
  else if (e.key === "Enter" && verificationCode.every((digit) => digit)) {
   handleSubmit(e);
  }
 };

 const handlePaste = (e) => {
  e.preventDefault();
  const pasteData = e.clipboardData.getData("text/plain").trim();
  if (pasteData && pasteData.match(/^\d{6}$/)) {
   const newCode = pasteData.split("").slice(0, 6);
   setVerificationCode(newCode);
   inputRefs.current[5]?.focus(); // Focus on last input after paste
  }
 };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setErrorMessage("");

  const otpValue = verificationCode.join("");

  if (otpValue.length !== 6) {
   setErrorMessage("Please enter all 6 digits");
   // Find the first empty input and focus on it
   const emptyIndex = verificationCode.findIndex((digit) => !digit);
   if (emptyIndex !== -1) {
    inputRefs.current[emptyIndex]?.focus();
   }
   return;
  }

  setIsLoading(true);

  const formData = new FormData();
  formData.append("otp", otpValue);
  formData.append("email", email);

  try {
   const res = await fetch(buildUrl("/forgot-password/verify-otp"), {
    method: "POST",
    body: formData,
   });

   const data = await res.json();

   if (res.ok) {
    toast.success("OTP verified successfully");
    nav("/reset-password", {
     state: {
      email: email,
      otp: otpValue,
     },
    });
   } else {
    setErrorMessage(data.message || "Invalid verification code");
    // Clear all inputs and focus on first one
    setVerificationCode(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
   }
  } catch (err) {
   console.error(err);
   setErrorMessage("An error occurred. Please try again.");
  } finally {
   setIsLoading(false);
  }
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
    <div className="w-[550px] h-auto p-10 rounded-xl bg-white z-50">
     <div className="flex items-start justify-between">
      <div className="flex flex-col">
       <h1 className="text-2xl font-semibold">Verify One-Time-Password</h1>
       <p className="text-sm font-light text-gray-500 mt-1">
        Enter the 6-digit code sent to{" "}
        <span className="font-medium">{email}</span>
       </p>
      </div>
      <IoCloseCircle
       onClick={() => nav("/forgot-password")}
       size={32}
       className="text-red-500 cursor-pointer hover:opacity-80 transition-opacity"
       aria-label="Close"
      />
     </div>
     <form onSubmit={handleSubmit} className="mt-10" onPaste={handlePaste}>
      <div className="flex justify-between gap-2 mb-6">
       {verificationCode.map((digit, index) => (
        <input
         key={index}
         type="text"
         inputMode="numeric"
         pattern="[0-9]*"
         name={`code-${index}`}
         maxLength={1}
         ref={(el) => (inputRefs.current[index] = el)}
         className="w-16 h-16 text-center text-xl font-semibold border rounded-md focus:border-primary focus:outline-none transition-colors"
         value={digit}
         onChange={(e) => handleCodeChange(index, e.target.value)}
         onKeyDown={(e) => handleKeyDown(index, e)}
         onFocus={(e) => e.target.select()}
         disabled={isLoading}
         autoComplete="one-time-code"
        />
       ))}
      </div>

      {errorMessage && (
       <p className="text-red-500 text-sm mb-4 text-center">{errorMessage}</p>
      )}

      <button
       type="submit"
       disabled={isLoading}
       className={`w-full bg-primary text-white py-3 rounded-md cursor-pointer font-medium hover:bg-primary-dark transition-colors ${
        isLoading ? "opacity-70" : ""
       }`}
      >
       {isLoading ? "Verifying..." : "Verify OTP"}
      </button>

      <div className="mt-4 text-center">
       <p className="text-gray-600">
        Didn't receive the code?{" "}
        <button
         type="button"
         onClick={() => nav("/forgot-password")}
         className="text-primary font-medium cursor-pointer hover:underline"
         disabled={isLoading}
        >
         Resend OTP
        </button>
       </p>
      </div>
     </form>
    </div>
   </div>
  </>
 );
};
