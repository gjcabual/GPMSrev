import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { useState, useRef, useEffect } from "react";
import { buildUrl } from "../../../utils/buildUrl";
import { toast } from "sonner";
import { VerifyEmail } from "../../../components/auth/VerifyEmail";
import * as psgcApi from "../../../utils/psgcApi";

const autoFormatMMDDYYYY = (value, prevValue = "") => {
 const raw = String(value ?? "");
 const prev = String(prevValue ?? "");
 const digits = raw.replace(/\D/g, "").slice(0, 8);
 if (digits.length < 2) return digits;
 if (digits.length === 2) {
  if (prev.endsWith("/") && raw === digits) return digits;
  return `${digits}/`;
 }
 if (digits.length < 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
 const base = `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
 if (digits.length === 4) {
  if (prev.endsWith("/") && raw === base) return base;
  return `${base}/`;
 }
 return `${base}/${digits.slice(4)}`;
};

const toISODate = (value) => {
 const s = String(value ?? "").trim();
 const mmddyyyy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
 if (!mmddyyyy) return "";
 return `${mmddyyyy[3]}-${mmddyyyy[1]}-${mmddyyyy[2]}`;
};

const normalizeAddress = (value) =>
 String(value ?? "")
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

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
 const [showAddressPicker, setShowAddressPicker] = useState(false);
 const [phAddress, setPhAddress] = useState({
  regions: [],
  provinces: [],
  cities: [],
  barangays: [],
  regionCode: "",
  regionName: "",
  provinceCode: "",
  provinceName: "",
  cityCode: "",
  cityName: "",
  barangayCode: "",
  barangayName: "",
  street: "",
  loading: false,
 });
 const isSubmittingRef = useRef(false);

 useEffect(() => {
  let cancelled = false;
  setPhAddress((prev) => ({ ...prev, loading: true }));
  psgcApi
   .getRegions()
   .then((data) => {
    if (!cancelled) {
     setPhAddress((prev) => ({
      ...prev,
      regions: data || [],
      loading: false,
     }));
    }
   })
   .catch(() => {
    if (!cancelled) {
     setPhAddress((prev) => ({ ...prev, regions: [], loading: false }));
    }
   });
  return () => {
   cancelled = true;
  };
 }, []);

 const buildPhAddressString = (ph) => {
  const parts = [
   String(ph.street || "").trim(),
   String(ph.barangayName || "").trim(),
   String(ph.cityName || "").trim(),
   String(ph.provinceName || "").trim(),
   String(ph.regionName || "").trim(),
  ].filter(Boolean);
  return parts.join(", ");
 };

 const handlePhRegionChange = (code, name) => {
  setPhAddress((prev) => ({
   ...prev,
   regionCode: code,
   regionName: name || "",
   provinceCode: "",
   provinceName: "",
   cityCode: "",
   cityName: "",
   barangayCode: "",
   barangayName: "",
   provinces: [],
   cities: [],
   barangays: [],
  }));
  if (!code) return;
  psgcApi.getProvinces(code).then((provinces) => {
   setPhAddress((prev) => ({ ...prev, provinces: provinces || [] }));
   if ((provinces || []).length === 0) {
    psgcApi.getCitiesMunicipalitiesByRegion(code).then((cities) => {
     setPhAddress((prev) => ({ ...prev, cities: cities || [] }));
    });
   }
  });
 };

 const handlePhProvinceChange = (code, name) => {
  setPhAddress((prev) => ({
   ...prev,
   provinceCode: code,
   provinceName: name || "",
   cityCode: "",
   cityName: "",
   barangayCode: "",
   barangayName: "",
   cities: [],
   barangays: [],
  }));
  if (!code) return;
  psgcApi.getCitiesMunicipalitiesByProvince(code).then((cities) => {
   setPhAddress((prev) => ({ ...prev, cities: cities || [] }));
  });
 };

 const handlePhCityChange = (code, name) => {
  setPhAddress((prev) => ({
   ...prev,
   cityCode: code,
   cityName: code ? name || "" : "",
   barangayCode: "",
   barangayName: "",
   barangays: [],
  }));
  if (!code) return;
  psgcApi.getBarangays(code).then((barangays) => {
   setPhAddress((prev) => ({ ...prev, barangays: barangays || [] }));
  });
 };

 const handlePhBarangayChange = (code, name) => {
  setPhAddress((prev) => ({
   ...prev,
   barangayCode: code,
   barangayName: code ? name || "" : "",
  }));
 };

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
  const normalizedBirthDate = toISODate(birthDate);
  if (!normalizedBirthDate) {
   toast.error("Please enter Date of Birth in MM/DD/YYYY format");
   isSubmittingRef.current = false;
   setIsSubmitting(false);
   return;
  }

  formData.append("birth_date", normalizedBirthDate);
  formData.append("sex", sex);
  formData.append("address", normalizeAddress(address));
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
   <div className="min-h-screen py-6 px-4 md:py-10 flex flex-col gap-4 md:gap-5 justify-center items-center bg-gray-100">
    <img
     onClick={() => nav("/")}
     src="/main_logo.png"
     alt=""
     className="w-48 md:w-[300px] z-50 cursor-pointer flex-shrink-0"
    />
    <img
     src="/auth/bg_login.png"
     alt=""
     className="fixed top-0 left-0 w-screen h-screen object-cover opacity-50"
    />

    <div className="z-50">
     <p className="text-lg md:text-xl font-semibold text-primary">-- APPLICANT ---</p>
    </div>
    {!showVerifier ? (
     <div className="w-full max-w-[600px] h-auto rounded-xl bg-white z-50 p-4 sm:p-6 md:p-8">
      <h1 className="text-xl md:text-2xl font-semibold">Signup</h1>
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
           type="text"
           value={birthDate}
           onChange={(e) => setBirthDate(autoFormatMMDDYYYY(e.target.value, birthDate))}
           className="w-full text-sm px-4 h-8 border border-primary rounded-md"
           placeholder="MM/DD/YYYY"
           inputMode="numeric"
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
          onClick={() => setShowAddressPicker(true)}
          readOnly
          className="px-4 text-sm h-10 border border-primary rounded-md bg-white cursor-pointer"
          placeholder="Click to select address"
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
       {showAddressPicker && (
        <div
         className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
         onClick={(e) => e.target === e.currentTarget && setShowAddressPicker(false)}
        >
         <div className="bg-white rounded-lg w-full max-w-lg shadow-xl overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
           <h3 className="text-lg font-bold text-primary">Quick address</h3>
           <button
            type="button"
            onClick={() => setShowAddressPicker(false)}
            className="text-gray-500 hover:text-gray-700 p-1"
           >
            <IoClose size={22} />
           </button>
          </div>
          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
           <p className="text-sm text-gray-600">Select location, then click OK to confirm.</p>
           <div>
            <label className="block text-sm text-gray-600 mb-1">Region</label>
            <select
             value={phAddress.regionCode}
             onChange={(e) => {
              const opt = e.target.options[e.target.selectedIndex];
              handlePhRegionChange(e.target.value, opt?.text || "");
             }}
             className="w-full px-3 py-2 border border-gray-300 rounded-md"
             disabled={phAddress.loading}
            >
             <option value="">Select region</option>
             {phAddress.regions.map((r) => (
              <option key={r.code} value={r.code}>{r.name}</option>
             ))}
            </select>
           </div>
           <div>
            <label className="block text-sm text-gray-600 mb-1">Province</label>
            <select
             value={phAddress.provinceCode}
             onChange={(e) => {
              const opt = e.target.options[e.target.selectedIndex];
              handlePhProvinceChange(e.target.value, opt?.text || "");
             }}
             className="w-full px-3 py-2 border border-gray-300 rounded-md"
             disabled={phAddress.provinces.length === 0}
            >
             <option value="">
              {phAddress.provinces.length === 0 ? "Select region first" : "Select province"}
             </option>
             {phAddress.provinces.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
             ))}
            </select>
           </div>
           <div>
            <label className="block text-sm text-gray-600 mb-1">City / Municipality</label>
            <select
             value={phAddress.cityCode}
             onChange={(e) => {
              const opt = e.target.options[e.target.selectedIndex];
              handlePhCityChange(e.target.value, opt?.text || "");
             }}
             className="w-full px-3 py-2 border border-gray-300 rounded-md"
             disabled={phAddress.cities.length === 0}
            >
             <option value="">
              {phAddress.cities.length === 0 ? "Select province first" : "Select city/municipality"}
             </option>
             {phAddress.cities.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
             ))}
            </select>
           </div>
           <div>
            <label className="block text-sm text-gray-600 mb-1">Barangay</label>
            <select
             value={phAddress.barangayCode}
             onChange={(e) => {
              const opt = e.target.options[e.target.selectedIndex];
              handlePhBarangayChange(e.target.value, opt?.text || "");
             }}
             className="w-full px-3 py-2 border border-gray-300 rounded-md"
             disabled={phAddress.barangays.length === 0}
            >
             <option value="">
              {phAddress.barangays.length === 0 ? "Select city/municipality first" : "Select barangay"}
              </option>
             {phAddress.barangays.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
             ))}
            </select>
           </div>
           <div>
            <label className="block text-sm text-gray-600 mb-1">Street / Sitio / Building (optional)</label>
            <input
             type="text"
             value={phAddress.street}
             onChange={(e) => setPhAddress((prev) => ({ ...prev, street: e.target.value }))}
             className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
           </div>
          </div>
          <div className="p-4 border-t flex justify-end">
           <button
            type="button"
            onClick={() => {
             setAddress(normalizeAddress(buildPhAddressString(phAddress)));
             setShowAddressPicker(false);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:opacity-90"
           >
            OK
           </button>
          </div>
         </div>
        </div>
       )}
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
        <p className="text-sm font-light text-gray-500">
         Already have an account?{" "}
         <span
          onClick={() => nav("/applicant-login")}
          className="italic text-primary font-medium cursor-pointer hover:text-primary/80"
         >
          Login here
         </span>
        </p>
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
