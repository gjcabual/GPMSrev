import { useNavigate } from "react-router-dom";
import { MdMarkEmailRead } from "react-icons/md";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useState, useRef } from "react";
import { buildUrl } from "../../../utils/buildUrl";
import { toast } from "sonner";
import { VerifyEmail } from "../../../components/auth/VerifyEmail";

export const ApplicantSignup = () => {
 const nav = useNavigate();
 const [showVerifier, setShowVerifier] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [showPassword, setShowPassword] = useState(false);
 const [showConfirmPassword, setShowConfirmPassword] = useState(false);

 //
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [firstName, setFirstName] = useState("");
 const [lastName, setLastName] = useState("");
 const [birthDate, setBirthDate] = useState("");
 const [sex, setSex] = useState("");
 const [contactNo, setContactNo] = useState("");
 const [confirmPass, setConfirmPass] = useState("");
 const [address, setAddress] = useState("");
 const isSubmittingRef = useRef(false);

 const handleSignup = async () => {
  if (isSubmittingRef.current) return;
  // Validation
  if (
   !email ||
   !password ||
   !firstName ||
   !lastName ||
   !birthDate ||
   !sex ||
   !address ||
   !contactNo ||
   !confirmPass
  ) {
   toast.error("Please fill in all fields");
   return;
  }

  // Email validation for Gmail accounts only
  if (!email.toLowerCase().endsWith("@gmail.com")) {
   toast.error("Please use a Gmail account (@gmail.com)");
   return;
  }

  if (password !== confirmPass) {
   toast.error("Passwords do not match");
   return;
  }

  // Password validation
  if (password.length < 8) {
   toast.error("Password must be at least 8 characters long");
   return;
  }

  // Phone number validation - must be exactly 11 digits
  if (!/^\d{11}$/.test(contactNo)) {
   toast.error("Phone number must be exactly 11 digits");
   return;
  }

  // Set submitting state to true to show spinner
  isSubmittingRef.current = true;
  setIsSubmitting(true);

  const formData = new FormData();
  formData.append("email", email);
  formData.append("password", password);
  formData.append("first_name", firstName);
  formData.append("last_name", lastName);
  formData.append("birth_date", birthDate);
  formData.append("sex", sex);
  formData.append("address", address);
  formData.append("contact_no", contactNo);

  try {
   // Make sure the endpoint is correct
   const res = await fetch(buildUrl("/applicant/signup"), {
    method: "POST",
    body: formData,
   });

   const data = await res.json();
   console.log("Response:", data);

   if (res.ok) {
    const successMsg = data?.message || "Registration successful. Please verify your email account.";
    toast.success(successMsg, { duration: 5000 });
    setShowVerifier(true);
   } else {
    // Extract the actual error message if available
    const errorMessage =
     data.detail || data.message || "There was an error creating your account";
    toast.error(errorMessage);
    console.error("Signup error:", data);
   }
  } catch (err) {
   console.error("Fetch error:", err);
   toast.error("Could not connect to the server. Please try again later.");
  } finally {
   isSubmittingRef.current = false;
   setIsSubmitting(false);
  }
 };

 const handleVerificationComplete = (success) => {
  if (success) {
   nav("/applicant-login");
  }
 };

 return (
  <>
   <div className="m-5 md:m-0 min-h-screen py-5 flex flex-col gap-5 justify-center items-center bg-gray-100">
    <img
     onClick={() => nav("/gpms")}
     src="/main_logo.png"
     alt=""
     className="w-[300px] z-50 cursor-pointer"
    />
    <img
     src="/auth/bg_login.png"
     alt=""
     className="fixed top-0 left-0 w-screen h-screen object-cover opacity-50"
    />

    <div>
     <p className="text-xl font-semibold text-primary z-50">-- APPLICANT ---</p>
    </div>
    {!showVerifier ? (
     <div className="w-full md:w-[600px] h-auto rounded-xl bg-white z-50 p-8">
      <h1 className="text-2xl font-semibold">Signup</h1>
      <p className="text-sm font-light text-gray-400">
       Fill-up the information below to proceed
      </p>
      <div className="space-y-3 mt-5">
       <div className="flex flex-col md:flex-row items-start justify-between gap-3">
        <div className="w-full flex flex-col">
         <label htmlFor="" className="text-sm text-gray-600">
          First Name
         </label>
         <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="px-4 text-sm h-8 border border-primary rounded-md"
         />
        </div>
        <div className="w-full flex flex-col">
         <label htmlFor="" className="text-sm text-gray-600">
          Last Name
         </label>
         <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="px-4 text-sm h-8 border border-primary rounded-md"
         />
        </div>
       </div>
       <div className="w-full flex flex-col">
        <label htmlFor="" className="text-sm text-gray-600">
         Email
        </label>
        <input
         type="email"
         value={email}
         required={true}
         onChange={(e) => setEmail(e.target.value)}
         className="px-4 text-sm h-8 border border-primary rounded-md"
        />
       </div>
       <div className="w-full flex flex-col md:flex-row items-start justify-between gap-3">
        <div className="w-full flex flex-col">
         <label htmlFor="" className="text-sm text-gray-600">
          Date of Birth
         </label>
         <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full text-sm px-6 h-8 border border-primary rounded-md"
         />
        </div>
        <div className="w-full flex flex-col">
         <label htmlFor="" className="text-sm text-gray-600">
          Phone Number
         </label>
         <input
          type="tel"
          value={contactNo}
          onChange={(e) => setContactNo(e.target.value)}
          className="px-4 text-sm h-8 border border-primary rounded-md"
         />
        </div>
       </div>
       <div className="w-full flex flex-col">
        <label htmlFor="" className="text-sm text-gray-600">
         Address
        </label>
        <input
         type="text"
         value={address}
         onChange={(e) => setAddress(e.target.value)}
         className="px-4 text-sm h-8 border border-primary rounded-md"
        />
       </div>
       <div className="w-full flex flex-col">
        <label htmlFor="" className="text-sm text-gray-600">
         Sex
        </label>
        <select
         value={sex}
         onChange={(e) => setSex(e.target.value)}
         className="px-4 text-xs h-8 border border-primary rounded-md"
        >
         <option value="">Select Sex</option>
         <option value="MALE">Male</option>
         <option value="FEMALE">Female</option>
         <option value="PREFER NOT TO SAY">Prefer not to say</option>
        </select>
       </div>
       <div className="w-full flex flex-col md:flex-row items-start justify-between gap-3">
        <div className="w-full flex flex-col">
         <label htmlFor="" className="text-sm text-gray-600">
          Password
         </label>
         <div className="relative">
          <input
           type={showPassword ? "text" : "password"}
           value={password}
           onChange={(e) => setPassword(e.target.value)}
           className="w-full px-4 text-sm h-8 border border-primary rounded-md"
          />
          <button
           type="button"
           onClick={() => setShowPassword(!showPassword)}
           className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
          >
           {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
          </button>
         </div>
        </div>
        <div className="w-full flex flex-col">
         <label htmlFor="" className="text-sm text-gray-600">
          Confirm Password
         </label>
         <div className="relative">
          <input
           type={showConfirmPassword ? "text" : "password"}
           value={confirmPass}
           onChange={(e) => setConfirmPass(e.target.value)}
           className="w-full px-4 text-sm h-8 border border-primary rounded-md"
          />
          <button
           type="button"
           onClick={() => setShowConfirmPassword(!showConfirmPassword)}
           className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
          >
           {showConfirmPassword ? (
            <FaEyeSlash size={14} />
           ) : (
            <FaEye size={14} />
           )}
          </button>
         </div>
        </div>
       </div>
      </div>
      <div className="mt-10 text-center flex flex-col gap-2">
       <button
        onClick={handleSignup}
        disabled={isSubmitting}
        className="w-full text-lg text-white bg-primary h-10 rounded-md cursor-pointer hover:bg-primary/90 disabled:bg-gray-300 flex items-center justify-center"
       >
        {isSubmitting ? (
         <>
          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
          Signing up...
         </>
        ) : (
         "Signup"
        )}
       </button>
       <button
        onClick={() => nav("/applicant-login")}
        className="text-sm font-light text-gray-500 cursor-pointer hover:text-gray-700"
       >
        Already have an account?{" "}
        <span className="italic text-primary font-medium hover:text-primary/80">
         click here to login
        </span>
       </button>
      </div>
     </div>
    ) : (
     <VerifyEmail
      email={email}
      onClose={() => setShowVerifier(false)}
      onVerificationComplete={handleVerificationComplete}
     />
    )}
   </div>
  </>
 );
};
