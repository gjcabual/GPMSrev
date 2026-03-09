import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IoMdCloudUpload } from "react-icons/io";
import { buildUrl } from "../../../utils/buildUrl";
import * as psgcApi from "../../../utils/psgcApi";
import { toast } from "sonner";
import { IoMdAdd } from "react-icons/io";
import { IoClose } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import { BiInfoCircle } from "react-icons/bi";

const steps = [
 "Personal Information",
 "Confirm Email Address",
 "Documents",
 "Vehicle Information",
 "Confirm details",
];

/** Normalize date string to YYYY-MM-DD for input type="date". */
function toDateInputValue(str) {
 if (str == null || String(str).trim() === "") return "";
 const s = String(str).trim();
 const slash = s.split("/");
 const dash = s.split("-");
 if (slash.length === 3) {
  const [a, b, c] = slash.map((n) => n.padStart(2, "0"));
  if (a.length === 4) return `${a}-${b}-${c}`;
  if (c.length === 4) return `${c}-${a}-${b}`;
 }
 if (dash.length === 3) {
  const [a, b, c] = dash.map((n) => n.padStart(2, "0"));
  if (a.length === 4) return `${a}-${b}-${c}`;
  if (c.length === 4) return `${c}-${b}-${a}`;
 }
 return s;
}

/** Normalize to YYYY-MM for input type="month" (e.g. OR expiration). */
function toMonthInputValue(str) {
 if (str == null || String(str).trim() === "") return "";
 const s = String(str).trim();
 const parts = s.split("/").length >= 2 ? s.split("/") : s.split("-");
 if (parts.length >= 2) {
  const p0 = parts[0].trim();
  const p1 = parts[1].trim().padStart(2, "0");
  if (p0.length === 4) return `${p0}-${p1}`;
  if (p1.length === 4) return `${p1}-${p0.padStart(2, "0")}`;
 }
 return s;
}

/** Normalize common date formats to MM/DD/YYYY for UI fields. */
function toMMDDYYYYValue(str) {
 if (str == null || String(str).trim() === "") return "";
 const s = String(str).trim();

 if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
 if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s.replace(/-/g, "/");

 const iso = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
 if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;

 const my = s.match(/^(\d{2})[-/](\d{4})$/); // MM/YYYY
 if (my) return `${my[1]}/01/${my[2]}`;

 return s;
}

function normalizeToMMYYYY(value) {
 if (!value) return "";
 const s = String(value).trim();
 if (/^\d{2}\/\d{4}$/.test(s)) return s;

 const mmddyyyy = s.match(/^(\d{2})\/\d{2}\/(\d{4})$/);
 if (mmddyyyy) return `${mmddyyyy[1]}/${mmddyyyy[2]}`;

 if (/^\d{4}-\d{2}$/.test(s)) {
  const [yyyy, mm] = s.split("-");
  return `${mm}/${yyyy}`;
 }
 if (/^\d{4}\/\d{2}$/.test(s)) {
  const [yyyy, mm] = s.split("/");
  return `${mm}/${yyyy}`;
 }
 if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
  const [yyyy, mm] = s.split("-");
  return `${mm}/${yyyy}`;
 }
 return s;
}

function normalizeDateToISO(value) {
 if (!value) return "";
 const s = String(value).trim();
 if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
 if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replace(/\//g, "-");
 const mmddyyyy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
 if (mmddyyyy) return `${mmddyyyy[3]}-${mmddyyyy[1]}-${mmddyyyy[2]}`;
 return s;
}

function autoFormatMMDDYYYYInput(value, prevValue = "") {
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
}

function autoFormatLicenseNumberInput(value, prevValue = "") {
 const raw = String(value ?? "").toUpperCase();
 const prev = String(prevValue ?? "");
 const compact = raw.replace(/[^A-Z0-9]/g, "");
 if (!compact) return "";

 // Optional leading letter format: e.g. K19-10-004489
 const hasPrefixLetter = /^[A-Z]/.test(compact);
  if (hasPrefixLetter) {
  const prefix = compact.charAt(0);
  const digits = compact.slice(1).replace(/\D/g, "").slice(0, 10);
  if (digits.length < 2) return `${prefix}${digits}`;
  if (digits.length === 2) {
   const candidate = `${prefix}${digits}`;
   if (prev.endsWith("-") && raw === candidate) return candidate;
   return `${candidate}-`;
  }
  if (digits.length < 4) return `${prefix}${digits.slice(0, 2)}-${digits.slice(2)}`;
  if (digits.length === 4) {
   const candidate = `${prefix}${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
   if (prev.endsWith("-") && raw === candidate) return candidate;
   return `${candidate}-`;
  }
  return `${prefix}${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
 }

 // Pure numeric format: e.g. 19-10-004489
 const digits = compact.replace(/\D/g, "").slice(0, 10);
 if (digits.length < 2) return digits;
 if (digits.length === 2) {
  const candidate = `${digits}`;
  if (prev.endsWith("-") && raw === candidate) return candidate;
  return `${candidate}-`;
 }
 if (digits.length < 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
 if (digits.length === 4) {
  const candidate = `${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
  if (prev.endsWith("-") && raw === candidate) return candidate;
  return `${candidate}-`;
 }
 return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export const Application = () => {
 const nav = useNavigate();
 const [selected, setSelected] = useState("Employee Parking");
 const [currentStep, setCurrentStep] = useState(0);
 const [profileEmail, setProfileEmail] = useState("");
 const [isRequestingOTP, setIsRequestingOTP] = useState(false);
 const [profileData, setProfileData] = useState(null);
 const [profileImage, setProfileImage] = useState(null);
 const [vehicleData, setVehicleData] = useState(null);
 const [selectedDrivers, setSelectedDrivers] = useState([]);
 const [documentFiles, setDocumentFiles] = useState({
  or: null,
  cr: null,
  dl: null,
 });
 const [buildingLocation, setBuildingLocation] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [hasApiError, setHasApiError] = useState(false);
 const [isEmailVerified, setIsEmailVerified] = useState(false);
 const [agreedToTerms, setAgreedToTerms] = useState(false);
 const [useAccountDetailsAsApplicant] = useState(true);
 const [documentFilesRef, setDocumentFilesRef] = useState({
  or: null,
  cr: null,
  dl: null,
 });
 const [documentStepIndex, setDocumentStepIndex] = useState(0);
 const [reopenDocAt, setReopenDocAt] = useState(null);
 const [extractedDocDetails, setExtractedDocDetails] = useState({
  OR: { file_number: "", registration_date: "", expiration_date: "" },
  CR: { file_number: "", date: "", owner_name: "", owner_address: "", plate_number: "", make: "", year_model: "", body_type: "", piston_displacement: "" },
  DL: { expiration_date: "", name: "", license_number: "" },
 });
 const [confirmedDocDetails, setConfirmedDocDetails] = useState({
  or_file_number: "",
  or_registered: "",
  cr_file_number: "",
  or_expiration: "",
  dl_expiration: "",
  cr_date: "",
  cr_owner_name: "",
  cr_owner_address: "",
  cr_plate_number: "",
  cr_plate_number_blank_or_temp: false,
  cr_make: "",
  cr_year_model: "",
  cr_body_type: "",
  cr_piston_displacement: "",
  dl_name: "",
  dl_license_number: "",
 });
 const [detailsConfirmed, setDetailsConfirmed] = useState(false);
 const [isExtracting, setIsExtracting] = useState(false);
 const [vehicleFormData, setVehicleFormData] = useState({
  plate_no: "",
  model: "",
  brand: "",
  color: "",
  vehicle_type: "",
  front_image: null,
  back_image: null,
 });

 const handleApplicantProfileData = useCallback((data) => {
  setProfileData(data);
 }, []);

 const choice = ["Employee Parking", "Student", "Drop Off", "Concessionaire"];

 // Show sticker purpose selection first; after "Proceed" show application steps
 const [type, setType] = useState(true);

 // Update vehicleData when vehicleFormData changes
 useEffect(() => {
  const userPlate = (vehicleFormData.plate_no ?? "").trim();
  const plateOk =
   userPlate !== "" || confirmedDocDetails.cr_plate_number_blank_or_temp;

  if (plateOk && vehicleFormData.model && vehicleFormData.brand) {
   // If the user provided a plate number, always keep it;
   // the "blank or temporary" flag only controls auto-fill behavior from CR.
   setVehicleData({
    ...vehicleFormData,
    plate_no: userPlate,
   });
  }
 }, [vehicleFormData, confirmedDocDetails.cr_plate_number_blank_or_temp]);

 // Prefill plate number from submitted CR details (Step 4 / Vehicle Information)
 useEffect(() => {
  if (currentStep !== 3) return;
  setVehicleFormData((prev) => {
   const isTemp = !!confirmedDocDetails.cr_plate_number_blank_or_temp;
   // If CR plate is blank/temporary, do NOT auto-clear or override the user's input;
   // simply skip auto-fill and let the user type a new plate number.
   if (isTemp) {
    return prev;
   }
   const submitted = (confirmedDocDetails.cr_plate_number ?? "").trim();
   if (!submitted) return prev;
   if ((prev.plate_no ?? "").trim() !== "") return prev;
   return { ...prev, plate_no: submitted };
  });
 }, [
  currentStep,
  confirmedDocDetails.cr_plate_number,
  confirmedDocDetails.cr_plate_number_blank_or_temp,
  setVehicleFormData,
 ]);

// Prefill brand and vehicle type from CR (Step 4 / Vehicle Information)
useEffect(() => {
 if (currentStep !== 3) return;
 setVehicleFormData((prev) => {
  const next = { ...prev };
  const crMake = (confirmedDocDetails.cr_make ?? "").trim();
  if (!next.brand && crMake) {
   next.brand = crMake;
  }
  const crBody = (confirmedDocDetails.cr_body_type ?? "").trim();
  if (!next.vehicle_type && crBody) {
   if (crBody === "Motorcycle") next.vehicle_type = "Motorcycle";
   else if (crBody === "Truck") next.vehicle_type = "Truck";
   else if (crBody === "Van") next.vehicle_type = "Van";
   else if (crBody === "Tricycle") next.vehicle_type = "Tricycle";
   else next.vehicle_type = "Car";
  }
  return next;
 });
}, [currentStep, confirmedDocDetails.cr_make, confirmedDocDetails.cr_body_type, setVehicleFormData]);

 const renderStepContent = () => {
  switch (currentStep) {
   case 0:
    return (
     <Step1
       setProfileEmail={setProfileEmail}
       setProfileData={handleApplicantProfileData}
       setProfileImage={setProfileImage}
       setHasApiError={setHasApiError}
       setAgreedToTerms={setAgreedToTerms}
       useAccountDetailsAsApplicant={useAccountDetailsAsApplicant}
      />
    );
   case 1:
    return (
     <Step2
      email={profileEmail}
      onChangeEmail={() => setCurrentStep(0)}
      onVerificationSuccess={() => {
       setIsEmailVerified(true);
       setCurrentStep(2);
      }}
      setHasApiError={setHasApiError}
     />
    );
   case 2:
    return (
      <Step4
       setDocumentFiles={setDocumentFilesRef}
       documentFiles={documentFilesRef}
       extractedDocDetails={extractedDocDetails}
       confirmedDocDetails={confirmedDocDetails}
       currentDocIndex={documentStepIndex}
       setCurrentDocIndex={setDocumentStepIndex}
       reopenDocAt={reopenDocAt}
       onReopenHandled={() => setReopenDocAt(null)}
       setHasApiError={setHasApiError}
       setExtractedDocDetails={setExtractedDocDetails}
       setConfirmedDocDetails={setConfirmedDocDetails}
      />
    );
   case 3:
    return (
     <Step3
      vehicleFormData={vehicleFormData}
      setVehicleFormData={setVehicleFormData}
      selectedDrivers={selectedDrivers}
      setSelectedDrivers={setSelectedDrivers}
      buildingLocation={buildingLocation}
      setBuildingLocation={setBuildingLocation}
      setHasApiError={setHasApiError}
     />
    );
   case 4:
    return (
     <Step5ConfirmDetails
      extractedDocDetails={extractedDocDetails}
      confirmedDocDetails={confirmedDocDetails}
      setConfirmedDocDetails={setConfirmedDocDetails}
      detailsConfirmed={detailsConfirmed}
      setDetailsConfirmed={setDetailsConfirmed}
     />
    );
   default:
    return null;
  }
 };

 const getMissingConfirmedDetailFields = () => {
 const requiredFields = [
   { key: "cr_file_number", label: "CR file number" },
   { key: "cr_date", label: "CR date issued" },
   { key: "cr_owner_name", label: "CR owner's name" },
   { key: "or_file_number", label: "OR file number" },
   { key: "or_registered", label: "OR registration date" },
   { key: "or_expiration", label: "OR expiration" },
   { key: "dl_expiration", label: "DL expiration" },
  ];

  return requiredFields
   .filter(({ key }) => String(confirmedDocDetails?.[key] ?? "").trim() === "")
   .map(({ label }) => label);
 };

 const handleSubmit = async () => {
  const missingConfirmedFields = getMissingConfirmedDetailFields();
  if (missingConfirmedFields.length > 0) {
   toast.error(
    `Please fill in all required confirmation fields: ${missingConfirmedFields.join(", ")}.`
   );
   return;
  }

  // Remove driver selection requirement from validation
  if (!selected || !vehicleData) {
   toast.error("Missing required information. Please check all fields.");
   return;
  }

  // Check for required documents using documentFilesRef
  if (!documentFilesRef.or || !documentFilesRef.cr || !documentFilesRef.dl) {
   toast.error(
    "Please upload all required documents (OR, CR, and DL) before submitting."
   );
   return;
  }

  // Only check if OR and CR file numbers match (normalized)
  const normalizeFileNumber = (v) =>
   String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
  const orNo = normalizeFileNumber(confirmedDocDetails.or_file_number);
  const crNo = normalizeFileNumber(confirmedDocDetails.cr_file_number);
  if (orNo && crNo && orNo !== crNo) {
   toast.error("OR and CR file numbers must match.");
   return;
  }

  try {
   setIsSubmitting(true);
   setHasApiError(false);

   const formData = new FormData();

    // Add application type from choice selection
    formData.append("role", selected);
    formData.append("use_account_details_as_applicant", "true");

   // Add vehicle data
   Object.entries(vehicleData).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
     // Ensure we're using plate_no instead of plate_number
     const fieldName = key === "plate_number" ? "plate_no" : key;
     formData.append(fieldName, value);
    }
   });

   // Add building location
   if (buildingLocation) {
    formData.append("building_name", buildingLocation);
   }

   // Add app_type (hardcoded to "NEW" for new applications)
   formData.append("app_type", "NEW");

   // Add document registration and expiration dates
   const currentDate = new Date();
   const expireDate = new Date(currentDate);
   expireDate.setFullYear(expireDate.getFullYear() + 1);

   // Format dates as YYYY-MM-DD
   const formatDateString = (date) => {
    return date.toISOString().split("T")[0];
   };

   // Create dates for registration and expiration
   const regDateString = [
    formatDateString(currentDate),
    formatDateString(currentDate),
    formatDateString(currentDate),
   ].join(",");

   const expDateString = [
    formatDateString(expireDate),
    formatDateString(expireDate),
    formatDateString(expireDate),
   ].join(",");

   formData.append("doc_reg_dates", regDateString);
   formData.append("doc_exp_dates", expDateString);
   formData.append("doc_types", "OR,CR,DL");

  if (confirmedDocDetails.or_file_number && confirmedDocDetails.cr_file_number &&
      confirmedDocDetails.or_registered && confirmedDocDetails.cr_date &&
      confirmedDocDetails.or_expiration && confirmedDocDetails.dl_expiration) {
   formData.append("confirmed_or_file_number", confirmedDocDetails.or_file_number);
   formData.append("confirmed_cr_file_number", confirmedDocDetails.cr_file_number);
   formData.append("confirmed_or_registered", normalizeDateToISO(confirmedDocDetails.or_registered));
   formData.append("confirmed_cr_registered", normalizeDateToISO(confirmedDocDetails.cr_date));
   formData.append("confirmed_or_expiration", normalizeDateToISO(confirmedDocDetails.or_expiration));
   formData.append("confirmed_dl_expiration", normalizeDateToISO(confirmedDocDetails.dl_expiration));
  }

   // Add document files
   if (documentFilesRef.or) formData.append("doc_files", documentFilesRef.or);
   if (documentFilesRef.cr) formData.append("doc_files", documentFilesRef.cr);
   if (documentFilesRef.dl) formData.append("doc_files", documentFilesRef.dl);

   const applicationResponse = await fetch(buildUrl("/applicant/application"), {
    method: "POST",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
   });

   const applicationData = await applicationResponse.json();

   if (applicationResponse.status === 400) {
    const msg = typeof applicationData.detail === "string" ? applicationData.detail : applicationData.detail?.message || "Please check your input and try again.";
    toast.error(msg, { duration: 5000 });
    setHasApiError(true);
    return;
   }

   if (!applicationResponse.ok) {
    setHasApiError(true);
    throw new Error(
     applicationData.detail?.message || "Failed to submit application"
    );
   }

   // Get the application ID from the response
   const applicationId = applicationData.id || applicationData.application_id;

   if (applicationId && selectedDrivers.length > 0) {
    try {
     const driverFormData = new FormData();
     const driverIds = selectedDrivers
      .map((driver) => driver.auth_driver_id)
      .join(",");
     driverFormData.append("driver_ids", driverIds);

     const driverResponse = await fetch(
       buildUrl(`/applicant/application/${applicationId}/assign-drivers`),
       {
        method: "POST",
       headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
       },
       body: driverFormData,
      }
      );

      if (!driverResponse.ok) {
       const assignError = await driverResponse.json().catch(() => ({}));
       console.error("Failed to assign drivers:", assignError);
       toast.error(
        assignError?.detail ||
         assignError?.message ||
         "Application was created, but assigning selected drivers failed."
       );
      }
     } catch (driverError) {
      console.error("Error assigning drivers:", driverError);
      toast.error(
       "Application was created, but assigning selected drivers failed."
      );
     }
    }

   toast.success("Application submitted successfully!");

   // Navigate back to dashboard after submit; review page is for History > View only.
   setTimeout(() => {
    nav("/applicant/dashboard");
   }, 1200);
  } catch (error) {
   console.error("Error submitting application:", error);
   toast.error(
    error.message || "Failed to submit application. Please try again."
   );
   setHasApiError(true);
  } finally {
   setIsSubmitting(false);
  }
 };

 const handleBack = () => {
  if (!type) {
   if (currentStep === 0) {
    setType(true);
   } else {
    if (currentStep === 2 && documentStepIndex === 0) {
     nav("/applicant/dashboard");
     return;
    }
    if (currentStep === 2 && documentStepIndex > 0) {
     const target = Math.max(0, documentStepIndex - 1);
     setDocumentStepIndex(target);
     setReopenDocAt(target);
     return;
    }
    // Clear vehicle images when navigating back to Vehicle step from Confirm step
    if (currentStep === 4) {
     setVehicleFormData((prev) => ({
      ...prev,
      front_image: null,
      back_image: null,
     }));
    }

    setCurrentStep((prev) => prev - 1);
   }
  } else {
   nav(-1);
  }
 };

 const handleNextStep = async () => {
  if (currentStep === 0) {
   // Check if user has agreed to terms
   if (!agreedToTerms) {
    toast.error(
     "Please confirm that you have reviewed and agree to the terms before proceeding."
    );
    return;
   }

   // Check if profile image is uploaded
   if (!profileImage && (!profileData || !profileData.has_image)) {
    toast.error("Please upload a profile image before proceeding.");
    return;
   }

   const formData = new FormData();
   formData.append("email", profileEmail);
   try {
    setIsRequestingOTP(true);
    setHasApiError(false);
    const response = await fetch(
     buildUrl("/applicant/request-email-verification"),
     {
      method: "POST",
      headers: {
       Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
     }
    );
    const data = await response.json();

    if (!response.ok) {
     setHasApiError(true);
     toast.error(data.detail);
     return;
    }

    toast.success(
     "A One-Time-Password has been sent to your account, please use it to verify your email"
    );

    // Reset isRequestingOTP before navigation
    setIsRequestingOTP(false);

    // Navigate after small delay
    setCurrentStep((prev) => prev + 1);
   } catch (error) {
    console.error("Error requesting OTP:", error);
    toast.error("Failed to send verification code. Please try again.");
    setHasApiError(true);
   } finally {
    setIsRequestingOTP(false); // Ensure this is reset in case of error
   }
  } else if (currentStep === 1) {
   // Prevent going to the next step if email is not verified
   if (!isEmailVerified) {
    toast.error("Please verify your email address before proceeding");
    return;
   }
  } else if (currentStep === 2) {
    // Documents step: require all docs before proceeding to Vehicle
    if (!documentFilesRef?.or || !documentFilesRef?.cr || !documentFilesRef?.dl) {
     toast.error("Please upload and confirm all required documents (OR, CR, DL) before proceeding.");
     return;
    }
    setDocumentStepIndex(DOC_ORDER.length);
    setCurrentStep(3);
  } else if (currentStep === 3) {
   // Vehicle step: validate and submit vehicle, then go to Confirm
   if (!vehicleData) {
    toast.error("Please complete all vehicle information");
    return;
   }

   if (!vehicleData.front_image) {
    toast.error("Please upload a front image of your vehicle");
    return;
   }

   if (!vehicleData.back_image) {
    toast.error("Please upload a back image of your vehicle");
    return;
   }

   if (!buildingLocation || buildingLocation.trim() === "") {
    toast.error("Please enter a building location");
    return;
   }

   try {
    setIsRequestingOTP(true);
    setHasApiError(false);
    const vehicleFormData = new FormData();

    // Always send plate_no so backend Form(...) field is present
    vehicleFormData.append("plate_no", vehicleData.plate_no ?? "");
    vehicleFormData.append("model", vehicleData.model);
    vehicleFormData.append("brand", vehicleData.brand);
    vehicleFormData.append("vehicle_type", vehicleData.vehicle_type);
    vehicleFormData.append("color", vehicleData.color);

    if (buildingLocation) {
     vehicleFormData.append("building_name", buildingLocation);
    }

    vehicleFormData.append("doc_types", "OR,CR,DL");

    const currentDate = new Date();
    const expireDate = new Date(currentDate);
    expireDate.setFullYear(expireDate.getFullYear() + 1);

    const formatDateString = (date) => date.toISOString().split("T")[0];

    const regDateString = [
     formatDateString(currentDate),
     formatDateString(currentDate),
     formatDateString(currentDate),
    ].join(",");

    const expDateString = [
     formatDateString(expireDate),
     formatDateString(expireDate),
     formatDateString(expireDate),
    ].join(",");

    vehicleFormData.append("doc_reg_dates", regDateString);
    vehicleFormData.append("doc_exp_dates", expDateString);
    vehicleFormData.append("app_type", "NEW");

    if (vehicleData.front_image) {
     vehicleFormData.append("front_image", vehicleData.front_image);
    }
    if (vehicleData.back_image) {
     vehicleFormData.append("back_image", vehicleData.back_image);
    }

    const vehicleResponse = await fetch(buildUrl("/applicant/vehicle"), {
     method: "POST",
     headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
     body: vehicleFormData,
    });

    const responseData = await vehicleResponse.json();

    if (!vehicleResponse.ok) {
     setHasApiError(true);
     // Normalize backend error detail so we never show "[object Object]"
     let message = "Failed to submit vehicle information";
     const detail = responseData?.detail;
     if (typeof detail === "string") {
      message = detail;
     } else if (Array.isArray(detail) && detail.length > 0) {
      // FastAPI / Pydantic validation errors list
      const first = detail[0];
      const loc = first?.loc;
      const field = Array.isArray(loc) ? loc[loc.length - 1] : undefined;
      if (first?.msg && field) {
       message = `${field.replace(/_/g, " ")}: ${first.msg}`;
      } else if (first?.msg) {
       message = first.msg;
      } else {
       message = JSON.stringify(detail);
      }
     } else if (detail && typeof detail === "object") {
      message =
       detail.message ||
       detail.error ||
       detail.msg ||
       JSON.stringify(detail);
     }
     throw new Error(message);
    }

    toast.success("Vehicle information saved successfully");
    setCurrentStep(4);
   } catch (error) {
    console.error("Error submitting vehicle data:", error);
    toast.error(
     error.message || "Failed to save vehicle information. Please try again."
    );
    setHasApiError(true);
   } finally {
    setIsRequestingOTP(false);
   }
  } else {
   setCurrentStep((prev) => prev + 1);
  }
 };

 return (
  <>
   <div className="m-5 min-h-screen flex flex-col items-center justify-start py-4">
    {type && (
     <div className="w-full md:w-[700px] h-auto bg-white border broder-gray-100 flex flex-col rounded-lg p-4 md:p-8 text-center space-y-5">
      <h1 className="text-xl md:text-3xl font-bold text-primary">
       What type of application are you planning to submit?
      </h1>
      <p className="text-sm font-light text-gray-500">
       -- Please Choose One --
      </p>
      <div className="mt-1 md:mt-4 grid grid-cols md:grid-cols-2 gap-1 md:gap-2">
       {choice.map((item, index) => (
        <label
         key={index}
         className="w-full flex items-center gap-3 p-1 md:p-3 rounded-md cursor-pointer"
        >
         <input
          type="radio"
          name="option"
          value={item}
          checked={selected === item}
          onChange={() => setSelected(item)}
          className="peer hidden"
         />
         <div className="w-5 h-5 border-2 border-gray-400 rounded-full flex items-center justify-center peer-checked:border-primary">
          {selected === item && (
           <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
          )}
         </div>
         <span className="text-gray-700 text-left">{item}</span>
        </label>
       ))}
      </div>
      <div className="mt-6 flex flex-col gap-2">
       <button
        className="bg-primary h-10 px-4 rounded-md text-white font-medium disabled:bg-gray-300"
        disabled={!selected}
        onClick={() => setType(false)}
       >
        Proceed
       </button>
       <p
       type="button"
        onClick={handleBack}
        className="text-sm font-light text-gray-500 hover:text-primary transition-colors cursor-pointer hover:text-primary/80"
       >
        Back
       </p>
      </div>
     </div>
    )}
    <div className="hidden md:block">
     {" "}
     {!type && <Timeline currentStep={currentStep} steps={steps} />}
    </div>
    {!type && <div className="my-5">{renderStepContent()}</div>}
    {!type && (
     <div className="py-5 flex gap-2">
      <button
       className="bg-gray-500 h-10 px-4 rounded-md text-white font-medium hover:bg-gray-600 transition-colors disabled:bg-gray-300 cursor-pointer"
       onClick={handleBack}
      >
       Back
      </button>
      {currentStep === steps.length - 1 ? (
       <button
        className="bg-primary h-10 px-4 rounded-md text-white font-medium disabled:bg-gray-300 flex items-center gap-2 cursor-pointer"
        onClick={handleSubmit}
        disabled={
         isSubmitting ||
         (currentStep === 4 &&
          (!detailsConfirmed || getMissingConfirmedDetailFields().length > 0))
        }
       >
        {isSubmitting ? (
         <>
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          Creating...
         </>
        ) : (
          "Submit"
         )}
        </button>
      ) : (
       // Only show next button if not on step 2 (verification step)
       currentStep !== 1 && (
        <button
         className="bg-primary h-10 px-4 rounded-md text-white font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
         onClick={handleNextStep}
         disabled={
          (currentStep === 0 && !agreedToTerms) ||
          (currentStep === 2 && (!documentFilesRef?.or || !documentFilesRef?.cr || !documentFilesRef?.dl)) ||
          ((isRequestingOTP || isExtracting) && !hasApiError)
         }
        >
         {isRequestingOTP || isExtracting ? (
          <>
           <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
           {isExtracting ? "Extracting..." : "Sending..."}
          </>
         ) : (
          "Next"
         )}
        </button>
       )
      )}
     </div>
    )}
   </div>
  {/* Removed submit VerifyModal; only file-number match is validated on submit */}
  </>
 );
};

const Timeline = ({ currentStep, steps }) => {
 return (
  <div className="mx-2 my-3 flex items-center justify-between">
   {steps.map((step, index) => (
    <div key={index} className="flex items-center">
     <div className="w-[15px] md:w-[120px] flex flex-col items-center gap-1">
      <div
       className={`h-5 w-5 md:h-6 md:w-6 rounded-full flex items-center justify-center text-white text-xs ${
        index <= currentStep ? "bg-primary" : "bg-gray-300"
       }`}
      >
       {index + 1}
      </div>
      <h1 className="hidden md:block text-[10px] font-medium">{step}</h1>
     </div>
     {index < steps.length - 1 && (
      <div
       className={`h-[1px] md:h-[2px] ${
        index < currentStep ? "bg-primary" : "bg-gray-300"
       } w-[40px] md:w-[60px]`}
      />
     )}
    </div>
   ))}
  </div>
 );
};

const emptyProfileForm = {
  first_name: "",
  last_name: "",
  email: "",
  contact_no: "",
  address: "",
  birth_date: "",
  sex: "",
  image_url: null,
  has_image: false,
};

const normalizeProfilePayload = (data) => {
 if (!data || typeof data !== "object" || Array.isArray(data)) {
  return { ...emptyProfileForm };
 }
 return {
  ...emptyProfileForm,
  ...data,
 };
};

const Step1 = ({
 setProfileEmail,
 setProfileData,
 setProfileImage,
 setHasApiError,
 setAgreedToTerms,
 useAccountDetailsAsApplicant,
}) => {
 const [image, setImage] = useState(null);
 const [previewImage, setPreviewImage] = useState(null);
 const [profileData, setLocalProfileData] = useState({ ...emptyProfileForm });
 const [loading, setLoading] = useState(true);
 const [agreeToTerms, setAgreeToTerms] = useState(false);
 const [fetchError, setFetchError] = useState(false);
 const fetchedProfileRef = useRef(null);

 // Update parent when agreeToTerms changes
 useEffect(() => {
  setAgreedToTerms?.(agreeToTerms);
 }, [agreeToTerms, setAgreedToTerms]);

 // Update parent component when fetchError changes
 useEffect(() => {
  setHasApiError(fetchError);
 }, [fetchError, setHasApiError]);

 // Fetch profile data on component mount (for autofill option)
 useEffect(() => {
  const fetchProfileData = async () => {
   try {
    setLoading(true);
    setFetchError(false);
    const response = await fetch(buildUrl("/profile"), {
     method: "GET",
     headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    });

    if (!response.ok) {
     setFetchError(true);
     throw new Error("Failed to fetch profile data");
    }

     const data = await response.json();
     const normalizedData = normalizeProfilePayload(data);
     fetchedProfileRef.current = normalizedData;

     setLocalProfileData(normalizedData);
     setProfileData(normalizedData);
     if (normalizedData.email) setProfileEmail(normalizedData.email);
   } catch (error) {
    console.error("Error fetching profile data:", error);
    toast.error(
     "Failed to load your profile data. Please try refreshing the page."
    );
    setFetchError(true);
   } finally {
    setLoading(false);
   }
  };

  fetchProfileData();
 }, [setProfileEmail, setProfileData]);

 // Keep step 1 in account-details mode only (verification)
 useEffect(() => {
  if (loading) return;
  if (fetchedProfileRef.current) {
   const data = normalizeProfilePayload(fetchedProfileRef.current);
   setLocalProfileData(data);
   setProfileData(data);
   if (data.email) setProfileEmail(data.email);
  }
 }, [useAccountDetailsAsApplicant]);

 // Agreement checkbox can only be checked when all fields are filled (or when using account details)
 const hasProfileImage = !!(previewImage || (profileData && profileData.has_image));
 const allFieldsFilled = useAccountDetailsAsApplicant
  ? hasProfileImage && profileData?.first_name && profileData?.last_name && profileData?.email
  : hasProfileImage &&
    (profileData?.first_name || "").trim() !== "" &&
    (profileData?.last_name || "").trim() !== "" &&
    (profileData?.email || "").trim() !== "" &&
    (profileData?.contact_no || "").trim() !== "" &&
    (profileData?.address || "").trim() !== "" &&
    (profileData?.birth_date || "").trim() !== "" &&
    (profileData?.sex || "").trim() !== "";

 const prevAllFieldsFilledRef = useRef(true);
 useEffect(() => {
  if (prevAllFieldsFilledRef.current && !allFieldsFilled && agreeToTerms) {
   setAgreeToTerms(false);
  }
  prevAllFieldsFilledRef.current = allFieldsFilled;
 }, [allFieldsFilled, agreeToTerms]);

 useEffect(() => {
  if (loading) return;
  toast.info(
   "Your profile details are used for this application. Update them in the Profile section if needed.",
   { duration: 5000 }
  );
 }, [loading]);

 const handleConfirmCheckboxClick = (e) => {
  if (!allFieldsFilled) {
   e.preventDefault();
   e.stopPropagation();
   toast.warning("Please fill in all fields above (including profile image) before you can confirm and proceed.", { duration: 5000 });
  }
 };

 const handleImageChange = (event) => {
  const file = event.target.files[0];
  if (file) {
   setImage(file);
   setProfileImage(file); // Pass the image file to parent component
   const imageUrl = URL.createObjectURL(file);
   setPreviewImage(imageUrl);
  }
 };

 const handleInputChange = (e) => {
  const { name, value } = e.target;
  const updatedData = {
   ...profileData,
   [name]: value,
  };

  setLocalProfileData(updatedData);
  setProfileData(updatedData); // Update parent component's state

  // Update parent component's email state if email changes
  if (name === "email") {
   setProfileEmail(value);
  }
 };

 // Image display component that fetches image from backend
 const ImageDisplay = ({ imageUrl, alt, className, fallback }) => {
  const [displayImage, setDisplayImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
   if (!imageUrl) {
    setImageLoading(false);
    setError(true);
    return;
   }

   const fetchImage = async () => {
    try {
     setImageLoading(true);
     // Remove '/api/v1' from the URL if present
     const cleanedUrl = imageUrl.replace("/api/v1", "");

     // Add a timestamp to prevent caching
     const urlWithTimestamp = `${cleanedUrl}${
      cleanedUrl.includes("?") ? "&" : "?"
     }t=${Date.now()}`;

     const response = await fetch(buildUrl(urlWithTimestamp), {
      method: "GET",
      headers: {
       Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
     });

     if (!response.ok) {
      throw new Error("Failed to fetch image");
     }

     const blob = await response.blob();
     const objectUrl = URL.createObjectURL(blob);
     setDisplayImage(objectUrl);
     setImageLoading(false);
    } catch (err) {
     console.error("Error fetching image:", err);
     setError(true);
     setImageLoading(false);
    }
   };

   fetchImage();

   // Cleanup function to revoke object URL
   return () => {
    if (displayImage) {
     URL.revokeObjectURL(displayImage);
    }
   };
  }, [imageUrl]);

  if (imageLoading) {
   return (
    <div
     className={`flex items-center justify-center bg-gray-200 ${className}`}
    >
     <div className="animate-pulse h-6 w-6 rounded-full bg-primary"></div>
    </div>
   );
  }

  if (error || !displayImage) {
   return fallback;
  }

  return <img src={displayImage} alt={alt} className={className} />;
 };

 return (
  <div className="w-full md:w-[650px] shadow border border-gray-400 rounded-lg">
   <div className="h-6 bg-primary rounded-t-lg" />
   <div className="p-4 md:p-5 flex flex-col justify-between h-full">
    <h1 className="text-lg md:text-xl font-bold">Personal Information</h1>

    

    {loading ? (
     <div className="flex justify-center items-center h-40">
      <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full"></div>
     </div>
    ) : (
     <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-2 mt-3">
      <div className="flex flex-col items-center p-3">
       <label
        htmlFor={useAccountDetailsAsApplicant ? undefined : "profile"}
         className={`h-[70px] w-[70px] ${
          !previewImage && !profileData?.has_image
           ? "border-2 border-red-400"
           : ""
         } ${useAccountDetailsAsApplicant ? "cursor-default" : "cursor-pointer"} bg-gray-300 rounded-full flex items-center justify-center overflow-hidden ${useAccountDetailsAsApplicant ? "opacity-90" : ""}`}
        >
        {previewImage ? (
         <img
          src={previewImage}
          alt="Profile Preview"
          className="w-full h-full object-cover rounded-full"
         />
         ) : profileData?.has_image && profileData?.image_url ? (
          <ImageDisplay
           key={profileData?.image_url + Date.now()}
           imageUrl={profileData?.image_url}
          alt="Profile Image"
          className="w-full h-full object-cover rounded-full"
          fallback={
           <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 font-semibold">
            {profileData.first_name?.[0]}
            {profileData.last_name?.[0]}
           </div>
          }
         />
        ) : (
         <span className="text-gray-500 text-sm text-center">Click to upload</span>
        )}
       </label>
       <p
         className={`text-xs mt-1 text-center w-full ${
          !previewImage && !profileData?.has_image
           ? "text-red-500"
           : "text-gray-500"
         }`}
       >
        Profile Image 
       </p>
       <input
        type="file"
        id="profile"
        className="hidden"
        accept="image/*"
        onChange={handleImageChange}
        disabled={useAccountDetailsAsApplicant}
       />
      </div>
      <div className="flex flex-col gap-2 w-full">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
         <label htmlFor="first_name" className="text-xs">
          First Name
         </label>
         <input
          type="text"
          name="first_name"
          id="first_name"
          value={profileData.first_name || ""}
          onChange={handleInputChange}
          readOnly={useAccountDetailsAsApplicant}
          className={`h-8 rounded-md px-3 text-sm border border-primary ${useAccountDetailsAsApplicant ? "bg-gray-100 cursor-not-allowed" : ""}`}
         />
        </div>
        <div className="flex flex-col gap-1">
         <label htmlFor="last_name" className="text-xs">
          Last Name
         </label>
         <input
          type="text"
          name="last_name"
          id="last_name"
          value={profileData.last_name || ""}
          onChange={handleInputChange}
          readOnly={useAccountDetailsAsApplicant}
          className={`h-8 rounded-md px-3 text-sm border border-primary ${useAccountDetailsAsApplicant ? "bg-gray-100 cursor-not-allowed" : ""}`}
         />
        </div>

        <div className="flex flex-col gap-1">
         <label htmlFor="email" className="text-xs">
          Email
         </label>
         <input
          type="email"
          name="email"
          id="email"
          value={profileData.email || ""}
          onChange={handleInputChange}
          readOnly={useAccountDetailsAsApplicant}
          className={`h-8 rounded-md px-3 text-sm border border-primary ${useAccountDetailsAsApplicant ? "bg-gray-100 cursor-not-allowed" : ""}`}
          title={useAccountDetailsAsApplicant ? "Edit in Profile to update this information." : ""}
         />
        </div>
        <div className="flex flex-col gap-1">
         <label htmlFor="contact_no" className="text-xs">
          Phone
         </label>
         <input
          type="text"
          name="contact_no"
          id="contact_no"
          value={profileData.contact_no || ""}
          onChange={handleInputChange}
          readOnly={useAccountDetailsAsApplicant}
          className={`h-8 rounded-md px-3 text-sm border border-primary ${useAccountDetailsAsApplicant ? "bg-gray-100 cursor-not-allowed" : ""}`}
         />
        </div>
       </div>

       <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-xs">
         Address
        </label>
        <textarea
         name="address"
         id="address"
         value={profileData.address || ""}
         onChange={handleInputChange}
         readOnly={useAccountDetailsAsApplicant}
         className={`min-h-[72px] rounded-md px-3 py-2 text-sm border border-primary resize-y ${useAccountDetailsAsApplicant ? "bg-gray-100 cursor-not-allowed" : ""}`}
         placeholder="House/Unit No., Street, Barangay, City/Municipality, Province"
        />
        <p className="text-[11px] text-gray-500">
         Format: House/Unit, Street, Barangay, City/Municipality, Province
        </p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
        <div className="flex flex-col gap-1">
         <label htmlFor="birth_date" className="text-xs">
          Date of Birth
         </label>
         <input
          type="text"
          name="birth_date"
          id="birth_date"
          value={toMMDDYYYYValue(profileData.birth_date || "")}
          onChange={(e) =>
           handleInputChange({
            target: {
             name: "birth_date",
             value: autoFormatMMDDYYYYInput(e.target.value, toMMDDYYYYValue(profileData.birth_date || "")),
            },
           })
          }
          readOnly={useAccountDetailsAsApplicant}
          className={`h-8 px-3 text-sm border border-primary rounded-md ${useAccountDetailsAsApplicant ? "bg-gray-100 cursor-not-allowed" : ""}`}
          placeholder="MM/DD/YYYY"
          inputMode="numeric"
         />
        </div>
        <div className="flex flex-col gap-1">
         <label htmlFor="sex" className="text-xs">
          Gender
         </label>
         <select
          name="sex"
          id="sex"
          value={profileData.sex || ""}
          onChange={handleInputChange}
          disabled={useAccountDetailsAsApplicant}
          className={`h-8 px-3 text-sm border border-primary rounded-md ${useAccountDetailsAsApplicant ? "bg-gray-100 cursor-not-allowed" : ""}`}
         >
          <option value="">Select</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
         </select>
        </div>
       </div>

       <div className="mt-2">
        <div className="flex items-center gap-2" onClick={handleConfirmCheckboxClick}>
         <input
          type="checkbox"
          id="agree"
          checked={agreeToTerms}
          onChange={(e) => allFieldsFilled && setAgreeToTerms(e.target.checked)}
          disabled={!allFieldsFilled}
          className={!allFieldsFilled ? "cursor-not-allowed opacity-60" : ""}
         />
         <label
          htmlFor="agree"
          className={`text-xs select-none ${!allFieldsFilled ? "text-gray-400 cursor-not-allowed" : "text-gray-500 cursor-pointer"}`}
         >
          I confirm that I have reviewed and agree that the data entered is
          accurate and complete.
         </label>
        </div>
       </div>
      </div>
     </div>
    )}
   </div>
  </div>
 );
};

const Step2 = ({
 email,
 onChangeEmail,
 onVerificationSuccess,
 setHasApiError,
}) => {
 const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
 const [isVerifying, setIsVerifying] = useState(false);
 const [verifyError, setVerifyError] = useState(false);
 const [otpComplete, setOtpComplete] = useState(false);
 const [resendDisabled, setResendDisabled] = useState(false);
 const [countdown, setCountdown] = useState(0);
 const inputRefs = [
  useRef(null),
  useRef(null),
  useRef(null),
  useRef(null),
  useRef(null),
  useRef(null),
 ];

 // Update parent component when verifyError changes
 useEffect(() => {
  setHasApiError(verifyError);
 }, [verifyError, setHasApiError]);

 // Check if OTP is complete
 useEffect(() => {
  // Check if all OTP fields are filled and valid
  const isComplete = otpValues.every(
   (value) => value !== "" && /^\d$/.test(value)
  );
  setOtpComplete(isComplete);
 }, [otpValues]);

 // Handle countdown timer for resend OTP
 useEffect(() => {
  let timer;
  if (countdown > 0) {
   timer = setTimeout(() => setCountdown(countdown - 1), 1000);
  } else {
   setResendDisabled(false);
  }
  return () => clearTimeout(timer);
 }, [countdown]);

 // When component mounts, start a countdown timer
 useEffect(() => {
  setResendDisabled(true);
  setCountdown(30); // 30 seconds initial countdown
 }, []);

 const handleOtpChange = (index, value) => {
  if (value.length > 1) {
   value = value.charAt(0);
  }

  // Only accept digits
  if (!/^\d*$/.test(value) && value !== "") {
   return;
  }

  const newOtpValues = [...otpValues];
  newOtpValues[index] = value;
  setOtpValues(newOtpValues);

  // Reset verify error when user is typing
  if (verifyError) {
   setVerifyError(false);
   setHasApiError(false);
  }

  // Auto focus to next input
  if (value !== "" && index < 5) {
   inputRefs[index + 1].current.focus();
  }
 };

 const handleKeyDown = (index, e) => {
  // Handle backspace to go to previous input
  if (e.key === "Backspace" && index > 0 && otpValues[index] === "") {
   inputRefs[index - 1].current.focus();
  }
 };

 const handleResendOtp = async () => {
  if (resendDisabled) return;

  try {
   setResendDisabled(true);
   setCountdown(60); // 60 seconds cooldown after resend

   const formData = new FormData();
   formData.append("email", email);

   const response = await fetch(
    buildUrl("/applicant/request-email-verification"),
    {
     method: "POST",
     headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
     body: formData,
    }
   );

   const data = await response.json();

   if (response.ok) {
    toast.success("A new verification code has been sent to your email");
    // Reset OTP fields
    setOtpValues(["", "", "", "", "", ""]);
    // Focus on first input
    inputRefs[0].current.focus();
   } else {
    toast.error(data.detail || "Failed to resend verification code");
   }
  } catch (error) {
   console.error("Error resending OTP:", error);
   toast.error("Failed to resend verification code. Please try again later.");
  }
 };

 const submitConfirmationCode = async () => {
  const otpCode = otpValues.join("");
  if (otpCode.length !== 6) {
   toast.error("Please enter a valid 6-digit verification code");
   return;
  }

  try {
   setIsVerifying(true);
   setVerifyError(false);

   const formData = new FormData();
   formData.append("otp", otpCode);

   const response = await fetch(
    buildUrl("/applicant/verify-email-otp"),
    {
     method: "POST",
     headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
     body: formData,
    }
   );

   const data = await response.json();

   if (!response.ok) {
    setVerifyError(true);
    console.error("Server response:", data);
    toast.error(data.detail || "Verification failed. Please try again.");
    return;
   }

   toast.success("Email verified successfully.");
   onVerificationSuccess();
  } catch (err) {
   console.error("Error during verification:", err);
   toast.error("An error occurred during verification. Please try again.");
   setVerifyError(true);
  } finally {
   setIsVerifying(false);
  }
 };

 return (
  <div className="w-full md:w-[650px] shadow border border-gray-400 rounded-lg">
   <div className="h-6 bg-primary rounded-t-lg" />
   <div className="p-4 md:p-5 flex flex-col justify-between h-full text-center">
    <h1 className="text-lg md:text-xl font-bold text-primary">
     OTP Verification
    </h1>
    <p className="text-sm font-medium text-primary">
     Please enter one-time password
    </p>
    <div className="mt-1">
     <p className="text-xs font-light text-gray-500">
      A one-time password has been sent to{" "}
      <span className="font-medium text-gray-500">{email}</span>
     </p>
    </div>
    <div>
     <div className="mt-3 md:mt-4 flex items-center justify-center gap-1 md:gap-2">
      {otpValues.map((value, index) => (
       <input
        key={index}
        ref={inputRefs[index]}
        type="text"
        maxLength={1}
        value={value}
        onChange={(e) => handleOtpChange(index, e.target.value)}
        onKeyDown={(e) => handleKeyDown(index, e)}
        className={`h-8 md:h-10 w-8 md:w-10 text-sm border ${
         verifyError ? "border-red-500" : "border-primary"
        } rounded-md text-center focus:outline-none focus:ring-1 ${
         verifyError ? "focus:ring-red-200" : "focus:ring-primary-light"
        }`}
       />
      ))}
     </div>
     <div className="mt-4 flex justify-center">
      <button
       onClick={submitConfirmationCode}
       disabled={isVerifying || !otpComplete}
       className="bg-primary text-white rounded-md px-4 py-1.5 text-sm disabled:bg-gray-300"
      >
       {isVerifying ? "Verifying..." : "Verify Code"}
      </button>
     </div>
     {!isVerifying && otpComplete && !verifyError && (
      <p className="mt-2 text-green-600 text-xs">
       OTP code complete. Click "Verify Code" to proceed.
      </p>
     )}
     {verifyError && (
      <p className="mt-2 text-red-600 text-xs">
       Verification failed. Please check your code and try again.
      </p>
     )}
     <div className="mt-3 flex flex-col items-center justify-center gap-2">
      <p
      type="button"
       onClick={handleResendOtp}
       disabled={resendDisabled}
       className="text-xs font-medium text-primary disabled:text-gray-400 cursor-pointer hover:text-primary/80"
      >
       {resendDisabled
        ? `Resend code ${countdown > 0 ? `(${countdown}s)` : ""}`
        : "Didn't receive a code? Resend"}
      </p>
      
     </div>
    </div>
   </div>
  </div>
 );
};

const Step3 = ({
 vehicleFormData,
 setVehicleFormData,
 selectedDrivers,
 setSelectedDrivers,
 buildingLocation,
 setBuildingLocation,
 setHasApiError,
}) => {
 const [loading, setLoading] = useState(true);
 const [showAddDriverModal, setShowAddDriverModal] = useState(false);
 const [showLicenseModal, setShowLicenseModal] = useState(false);
 const [selectedLicense, setSelectedLicense] = useState(null);
 const [licenseImageLoading, setLicenseImageLoading] = useState(false);
 const [fetchError, setFetchError] = useState(false);
 const [deletingDriverId, setDeletingDriverId] = useState(null);
 const [showDeleteDriverConfirm, setShowDeleteDriverConfirm] = useState(false);
 const [driverToDelete, setDriverToDelete] = useState(null);
 const [authorizedDrivers, setAuthorizedDrivers] = useState([]);
 const [driverTab, setDriverTab] = useState("valid");

 // Update parent component when fetchError changes
 useEffect(() => {
  setHasApiError(fetchError);
 }, [fetchError, setHasApiError]);

 // Fetch authorized drivers on mount
 useEffect(() => {
  fetchAuthorizedDrivers();
 }, []);

 const fetchAuthorizedDrivers = async () => {
  try {
   setLoading(true);
   setFetchError(false);
   const response = await fetch(buildUrl("/applicant/authorized-drivers"), {
    method: "GET",
    headers: {
     "Content-Type": "application/json",
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
   });

   if (!response.ok) {
    setFetchError(true);
    throw new Error("Failed to fetch authorized drivers");
   }

   const data = await response.json();
   setAuthorizedDrivers(data);
  } catch (error) {
   console.error("Error fetching authorized drivers:", error);
   toast.error(
    "Failed to load authorized drivers. Please try refreshing the page."
   );
   setFetchError(true);
  } finally {
   setLoading(false);
  }
 };

 const handleInputChange = (e) => {
  const { name, value } = e.target;
  if (name === "building_location") {
   setBuildingLocation(value);
  } else {
   setVehicleFormData((prev) => ({
    ...prev,
    [name]: value,
   }));
  }
 };

 const handleImageChange = (type, file) => {
  if (file) {
   if (file.size > 10 * 1024 * 1024) {
    toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
    return;
   }
   setVehicleFormData((prev) => ({
    ...prev,
    [type]: file,
   }));
  }
 };

 const handleDriverSelection = (driver) => {
  setSelectedDrivers((prevDrivers) => {
   // Check if driver is already selected
   const isSelected = prevDrivers.some(
    (d) => d.auth_driver_id === driver.auth_driver_id
   );

   if (isSelected) {
    // Remove the driver if already selected
    return prevDrivers.filter(
     (d) => d.auth_driver_id !== driver.auth_driver_id
    );
   } else {
    // Add the driver if not selected
    return [...prevDrivers, driver];
   }
  });
 };

 const handleDeleteAuthorizedDriver = async () => {
  if (!driverToDelete) return;
  try {
   setDeletingDriverId(driverToDelete.auth_driver_id);
   setFetchError(false);
   const response = await fetch(
    buildUrl(`/applicant/authorized-driver/${driverToDelete.auth_driver_id}`),
    {
     method: "DELETE",
     headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    }
   );
   const data = await response.json().catch(() => ({}));
   if (!response.ok) {
    throw new Error(data?.detail || "Failed to delete authorized driver");
   }

   setSelectedDrivers((prev) =>
    prev.filter((d) => d.auth_driver_id !== driverToDelete.auth_driver_id)
   );
   setAuthorizedDrivers((prev) =>
    prev.filter((d) => d.auth_driver_id !== driverToDelete.auth_driver_id)
   );
   setShowDeleteDriverConfirm(false);
   setDriverToDelete(null);
   toast.success("Authorized driver deleted.");
  } catch (error) {
   console.error("Error deleting authorized driver:", error);
   toast.error(error.message || "Failed to delete authorized driver.");
   setFetchError(true);
  } finally {
   setDeletingDriverId(null);
  }
 };

 const calculateAge = (birthDate) => {
  if (!birthDate) return "N/A";
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
   age--;
  }
  return age;
 };

 const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
   year: "numeric",
   month: "short",
   day: "numeric",
  });
 };

 const filteredDrivers = authorizedDrivers.filter((driver) =>
  driverTab === "valid" ? !!driver.is_valid : !driver.is_valid
 );

 const viewDriverLicense = async (driver) => {
  if (!driver.document?.image) return;

  try {
   setLicenseImageLoading(true);
   setShowLicenseModal(true);
   setFetchError(false);

   // Remove '/api/v1' from the URL if present
   const cleanedUrl = driver.document.image.replace("/api/v1", "");

   const response = await fetch(buildUrl(cleanedUrl), {
    method: "GET",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
   });

   if (!response.ok) {
    setFetchError(true);
    throw new Error("Failed to fetch license image");
   }

   const blob = await response.blob();
   const imageUrl = URL.createObjectURL(blob);
   setSelectedLicense({
    imageUrl,
    driverName: `${driver.first_name} ${driver.last_name}`,
    documentType: driver.document?.type || "Driver's License",
    expiryDate: driver.document?.expired_at,
    isValid: driver.is_valid,
   });
  } catch (error) {
   console.error("Error fetching license image:", error);
   toast.error("Failed to load license image");
   setFetchError(true);
  } finally {
   setLicenseImageLoading(false);
  }
 };

 const closeLicenseModal = () => {
  setShowLicenseModal(false);
  if (selectedLicense?.imageUrl) {
   URL.revokeObjectURL(selectedLicense.imageUrl);
  }
  setSelectedLicense(null);
 };

 // Add a reusable image fetching component in the Step3 component
 const ProfileImageDisplay = ({ imageUrl, alt, className }) => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
   if (!imageUrl) {
    setLoading(false);
    setError(true);
    return;
   }

   const fetchImage = async () => {
    try {
     // Remove '/api/v1' from the URL if present
     let processedUrl = imageUrl.replace("/api/v1", "");

     // Add a timestamp to prevent caching
     processedUrl = `${processedUrl}${
      processedUrl.includes("?") ? "&" : "?"
     }t=${Date.now()}`;

     const response = await fetch(buildUrl(processedUrl), {
      method: "GET",
      headers: {
       Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
     });

     if (!response.ok) {
      throw new Error("Failed to fetch image");
     }

     const blob = await response.blob();
     const objectUrl = URL.createObjectURL(blob);
     setImage(objectUrl);
     setLoading(false);
    } catch (err) {
     console.error("Error fetching image:", err);
     setError(true);
     setLoading(false);
    }
   };

   fetchImage();

   // Cleanup function to revoke object URL
   return () => {
    if (image) {
     URL.revokeObjectURL(image);
    }
   };
  }, [imageUrl]);

  if (loading) {
   return (
    <div
     className={`flex items-center justify-center bg-gray-100 ${className}`}
    >
     <div className="animate-pulse h-8 w-8 rounded-full bg-primary"></div>
    </div>
   );
  }

  if (error || !image) {
   return <FaUserCircle className={`text-gray-400 ${className}`} />;
  }

  return <img src={image} alt={alt} className={className} />;
 };

 return (
  <div className="w-full md:w-[650px] shadow border border-gray-400 rounded-lg">
   <div className="h-6 bg-primary rounded-t-lg" />
   <div className="p-4 md:p-5 flex flex-col justify-between h-full">
    <h1 className="text-lg font-bold text-primary text-center">
     Vehicle Information
    </h1>
    <div className="w-full mt-3 flex flex-col md:flex-row items-start gap-2 md:gap-4">
     <div className="w-full flex-1 flex flex-col space-y-2">
      <div className="w-full flex flex-col gap-1">
       <label htmlFor="plate_no" className="text-xs">
        Plate Number
       </label>
       <input
        type="text"
        id="plate_no"
        name="plate_no"
        value={vehicleFormData.plate_no}
        onChange={handleInputChange}
        className="h-8 border border-primary rounded-md px-3 text-sm w-full"
       />
      </div>
      <div className="w-full flex flex-col gap-1">
       <label htmlFor="model" className="text-xs">
        Model
       </label>
       <input
        type="text"
        id="model"
        name="model"
        value={vehicleFormData.model}
        onChange={handleInputChange}
        className="h-8 border border-primary rounded-md px-3 text-sm w-full"
       />
      </div>
      <div className="w-full flex flex-col gap-1">
       <label htmlFor="brand" className="text-xs">
        Brand
       </label>
       <input
        type="text"
        id="brand"
        name="brand"
        value={vehicleFormData.brand}
        onChange={handleInputChange}
        className="h-8 border border-primary rounded-md px-3 text-sm w-full"
       />
      </div>
      <div className="w-full flex flex-col gap-1">
       <label htmlFor="color" className="text-xs">
        Color
       </label>
       <input
        type="text"
        id="color"
        name="color"
        value={vehicleFormData.color}
        onChange={handleInputChange}
        className="h-8 border border-primary rounded-md px-3 text-sm w-full"
       />
      </div>
     </div>
     <div className="flex-1 flex flex-col space-y-2">
      <div className="flex flex-col gap-1">
       <label htmlFor="vehicle_type" className="text-xs">
        Vehicle Type
       </label>
       <select
        id="vehicle_type"
        name="vehicle_type"
        value={vehicleFormData.vehicle_type}
        onChange={handleInputChange}
        className="h-8 border border-primary rounded-md px-3 text-sm w-full"
       >
        <option value="">Select Vehicle Type</option>
        <option value="Car">Car</option>
        <option value="Truck">Truck</option>
        <option value="Motorcycle">Motorcycle</option>
        <option value="Van">Van</option>
        <option value="Tricycle">Tricycle</option>
       </select>
      </div>
      <div className="flex flex-col gap-1">
       <label htmlFor="front_image" className="text-xs">
        Front Image
       </label>
       <input
        type="file"
        id="front_image"
        name="front_image"
        accept="image/*"
        onChange={(e) => handleImageChange("front_image", e.target.files[0])}
        className="h-8 border border-primary rounded-md px-3 text-sm w-full"
       />
      </div>
      <div className="flex flex-col gap-1">
       <label htmlFor="back_image" className="text-xs">
        Back Image
       </label>
       <input
        type="file"
        id="back_image"
        name="back_image"
        accept="image/*"
        onChange={(e) => handleImageChange("back_image", e.target.files[0])}
        className="h-8 border border-primary rounded-md px-3 text-sm w-full"
       />
      </div>
      <div className="flex flex-col gap-1">
       <label htmlFor="building_location" className="text-xs">
        Building Location
       </label>
       <input
        type="text"
        id="building_location"
        name="building_location"
        value={buildingLocation}
        onChange={handleInputChange}
        placeholder="ex. Hiraya, Hinang"
        className="h-8 border border-primary rounded-md px-3 text-sm w-full"
       />
      </div>
     </div>
    </div>

    <div className="mt-4">
     <div className="flex justify-between items-center">
      <h1 className="text-sm font-bold text-primary">Assigned Drivers</h1>
      <div className="flex items-center gap-2">
       <span className="text-xs text-gray-500">
        {selectedDrivers.length} selected
       </span>
       <button
        onClick={() => setShowAddDriverModal(true)}
        className="bg-primary text-white rounded-full p-1"
       >
        <IoMdAdd size={16} />
       </button>
      </div>
     </div>

      {/* Tabs for Valid/Expired drivers */}
      <div className="mt-2 border-b border-gray-200">
       <div className="flex space-x-4">
        <button
         type="button"
         onClick={() => setDriverTab("valid")}
         className={`py-1 px-3 text-xs font-medium ${
          driverTab === "valid"
           ? "border-b-2 border-primary text-primary"
           : "text-gray-500"
         }`}
        >
         Valid
        </button>
        <button
         type="button"
         onClick={() => setDriverTab("expired")}
         className={`py-1 px-3 text-xs font-medium ${
          driverTab === "expired"
           ? "border-b-2 border-primary text-primary"
           : "text-gray-500"
         }`}
        >
         Expired
        </button>
       </div>
      </div>

     {/* Driver Cards */}
     <div className="mt-2 max-h-[200px] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {loading ? (
       <div className="flex justify-center items-center py-6">
        <div className="animate-spin h-6 w-6 border-3 border-primary border-t-transparent rounded-full"></div>
       </div>
      ) : filteredDrivers.length > 0 ? (
       filteredDrivers.map((driver) => (
        <div
         key={driver.auth_driver_id}
         className={`border rounded-lg p-2 mb-2 cursor-pointer ${
          selectedDrivers.some(
           (d) => d.auth_driver_id === driver.auth_driver_id
          )
           ? "border-primary"
           : "border-gray-200"
         }`}
         onClick={() => handleDriverSelection(driver)}
        >
         <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
           <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
            {driver.profile_image ? (
             <ProfileImageDisplay
              key={driver.auth_driver_id}
              imageUrl={driver.profile_image}
              alt={`${driver.first_name} ${driver.last_name}`}
              className="w-full h-full object-cover"
             />
            ) : (
             <FaUserCircle className="w-full h-full text-gray-400" />
            )}
           </div>
           <div>
            <h3 className="text-xs font-medium">
             {driver.first_name} {driver.last_name}
            </h3>
            <div className="flex space-x-1 text-[10px] text-gray-500">
             <span>{calculateAge(driver.birth_date)} y/o</span>
             <span>| {driver.document?.type || "No document"}</span>
            </div>
           </div>
          </div>

          <div className="h-4 w-4">
           <input
            type="checkbox"
            checked={selectedDrivers.some(
             (d) => d.auth_driver_id === driver.auth_driver_id
            )}
            onChange={() => {}}
            className="h-4 w-4"
           />
          </div>
         </div>

          <div className="mt-1 flex justify-between items-center">
           <span className="text-[10px] text-gray-500">
            {driver.relationship_status || "N/A"}
           </span>
           {driver.document?.image && (
            <button
             onClick={(e) => {
              e.stopPropagation();
              viewDriverLicense(driver);
             }}
             className="text-[10px] text-primary hover:underline"
            >
             View License
            </button>
           )}
          </div>

          {driver.document && (
           <div className="mt-1 text-[10px] text-gray-500">
            <div className="flex justify-between">
            <span>Exp: {formatDate(driver.document.expired_at)}</span>
            <span
             className={driver.is_valid ? "text-green-500" : "text-red-500"}
             >
              {driver.is_valid ? "Valid" : "Expired"}
             </span>
            </div>
            {selectedDrivers.some(
             (d) => d.auth_driver_id === driver.auth_driver_id
            ) && (
             <div className="mt-1 flex justify-start">
              <button
               onClick={(e) => {
                e.stopPropagation();
                setDriverToDelete(driver);
                setShowDeleteDriverConfirm(true);
               }}
               disabled={deletingDriverId === driver.auth_driver_id}
               className="text-[10px] text-red-400 hover:text-red-500 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
              >
               {deletingDriverId === driver.auth_driver_id
                ? "Deleting..."
                : "Delete"}
              </button>
             </div>
            )}
           </div>
          )}
        </div>
       ))
      ) : (
        <div className="text-center py-4 text-gray-500 text-xs">
         <p>
          {driverTab === "valid"
           ? "No valid authorized drivers found."
           : "No expired authorized drivers found."}
         </p>
         {driverTab === "valid" && (
          <p className="text-xs mt-1">Click the + button to add a driver.</p>
         )}
        </div>
      )}
     </div>
    </div>

    {/* License Modal */}
    {showLicenseModal && (
     <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg p-5 relative">
       <button
        onClick={closeLicenseModal}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
       >
        <IoClose size={24} />
       </button>

       <h2 className="text-xl font-semibold text-center mb-4">
        {selectedLicense?.documentType}
       </h2>

       <div className="text-center mb-2">
        <p className="font-medium">{selectedLicense?.driverName}</p>
        <div className="flex justify-center items-center gap-2 text-sm text-gray-600">
         <span>
          Expires:{" "}
          {selectedLicense?.expiryDate
           ? formatDate(selectedLicense.expiryDate)
           : "N/A"}
         </span>
         <span
          className={
           selectedLicense?.isValid ? "text-green-500" : "text-red-500"
          }
         >
          ({selectedLicense?.isValid ? "Valid" : "Expired"})
         </span>
        </div>
       </div>

       <div className="rounded-md border border-gray-300 overflow-hidden">
        {licenseImageLoading ? (
         <div className="h-[300px] w-full flex items-center justify-center bg-gray-100">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
         </div>
        ) : selectedLicense?.imageUrl ? (
         <img
          src={selectedLicense.imageUrl}
          alt="Driver's License"
          className="w-full max-h-[400px] object-contain"
         />
        ) : (
         <div className="h-[300px] w-full flex items-center justify-center bg-gray-100">
          <p className="text-gray-500">Image not available</p>
         </div>
        )}
       </div>
      </div>
     </div>
    )}
    {showDeleteDriverConfirm && driverToDelete && (
     <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative">
       <button
        type="button"
        onClick={() => {
         if (deletingDriverId) return;
         setShowDeleteDriverConfirm(false);
         setDriverToDelete(null);
        }}
        disabled={!!deletingDriverId}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
       >
        <IoClose size={20} />
       </button>
       <h2 className="text-lg font-semibold text-gray-800 mb-2">
        Delete authorized driver?
       </h2>
       <p className="text-sm text-gray-600 mb-4">
        This will permanently remove{" "}
        <span className="font-medium">
         {`${driverToDelete.first_name || ""} ${driverToDelete.last_name || ""}`.trim() ||
          `Driver #${driverToDelete.auth_driver_id}`}
        </span>{" "}
        and associated details. Do you want to proceed?
       </p>
       <div className="flex justify-end gap-2">
        <button
         type="button"
         onClick={() => {
          setShowDeleteDriverConfirm(false);
          setDriverToDelete(null);
         }}
         disabled={!!deletingDriverId}
         className={`px-4 py-2 text-sm rounded-md border ${
          deletingDriverId
           ? "border-gray-200 text-gray-400 cursor-not-allowed"
           : "border-gray-300 text-gray-700 hover:bg-gray-50"
         }`}
        >
         Cancel
        </button>
        <button
         type="button"
         onClick={handleDeleteAuthorizedDriver}
         disabled={!!deletingDriverId}
         className={`px-4 py-2 text-sm rounded-md text-white ${
          deletingDriverId
           ? "bg-red-300 cursor-not-allowed"
           : "bg-red-500 hover:bg-red-600"
         }`}
        >
         {deletingDriverId ? "Deleting..." : "Confirm"}
        </button>
       </div>
      </div>
     </div>
    )}

    {/* Add Driver Modal */}
    {showAddDriverModal && (
     <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-5 relative">
       <button
        onClick={() => setShowAddDriverModal(false)}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
       >
        <IoClose size={24} />
       </button>

        <AddDriverForm
         onSuccess={() => {
          setShowAddDriverModal(false);
          fetchAuthorizedDrivers();
         }}
         onCancel={() => setShowAddDriverModal(false)}
        />
      </div>
     </div>
    )}
   </div>
  </div>
 );
};

const DOC_ORDER = ["CR", "OR", "DL"];
const DOC_LABELS = { CR: "Certificate of Registration", OR: "Official Receipt", DL: "Driver's License" };

const Step4 = ({
 setDocumentFiles,
 documentFiles,
 extractedDocDetails,
 confirmedDocDetails,
 currentDocIndex,
 setCurrentDocIndex,
 reopenDocAt,
 onReopenHandled,
 setHasApiError,
 setExtractedDocDetails,
 setConfirmedDocDetails,
}) => {
 const nav = useNavigate();
 const [showDocModal, setShowDocModal] = useState(false);
 const [modalFile, setModalFile] = useState(null);
 const [modalDocType, setModalDocType] = useState(null);
 const [modalForm, setModalForm] = useState({
  file_number: "",
  registration_date: "",
  expiration_date: "",
  name: "",
  license_number: "",
  date: "",
  owner_name: "",
  owner_address: "",
  plate_number: "",
  plate_number_blank_or_temp: false,
  make: "",
  year_model: "",
  body_type: "",
  body_type_other: "",
  make_other: "",
  piston_displacement: "",
 });
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
 const [showPhAddressModal, setShowPhAddressModal] = useState(false);
 const [isExtractingOne, setIsExtractingOne] = useState(false);
 const [fileError, setFileError] = useState(false);
 const [modalDrafts, setModalDrafts] = useState({ CR: null, OR: null, DL: null });
 const [modalSequentialNav, setModalSequentialNav] = useState(false);
 const [showDocFullscreen, setShowDocFullscreen] = useState(false);
 const [fullscreenZoom, setFullscreenZoom] = useState(100);
 const [fullscreenPan, setFullscreenPan] = useState({ x: 0, y: 0 });
 const [fullscreenPanning, setFullscreenPanning] = useState(false);
 const fullscreenDragRef = useRef({ isDragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
 const fullscreenPanRef = useRef(fullscreenPan);
 fullscreenPanRef.current = fullscreenPan;
const fileInputRef = useRef(null);
  const extractedPayloadRef = useRef(null);
  const [pendingExtractedData, setPendingExtractedData] = useState(null);
  const fullscreenOverlayRef = useRef(null);

 const FS_ZOOM_MIN = 25;
 const FS_ZOOM_MAX = 300;
 const FS_ZOOM_STEP = 10;
 const handleDocPreviewClick = () => {
  setFullscreenZoom(100);
  setFullscreenPan({ x: 0, y: 0 });
  setShowDocFullscreen(true);
 };
 const handleFullscreenPanStart = (e) => {
  if (e.button !== 0) return;
  const pan = fullscreenPanRef.current;
  fullscreenDragRef.current = {
   isDragging: true,
   startX: e.clientX,
   startY: e.clientY,
   startPanX: pan.x,
   startPanY: pan.y,
  };
  setFullscreenPanning(true);
 };
 const handleFullscreenPanMove = (e) => {
  const d = fullscreenDragRef.current;
  if (!d.isDragging) return;
  setFullscreenPan({
   x: d.startPanX + (e.clientX - d.startX),
   y: d.startPanY + (e.clientY - d.startY),
  });
 };
 const handleFullscreenPanEnd = () => {
  fullscreenDragRef.current.isDragging = false;
  setFullscreenPanning(false);
 };
 const handleFullscreenZoomIn = () => setFullscreenZoom((z) => Math.min(FS_ZOOM_MAX, z + FS_ZOOM_STEP));
 const handleFullscreenZoomOut = () => setFullscreenZoom((z) => Math.max(FS_ZOOM_MIN, z - FS_ZOOM_STEP));
 const handleFullscreenZoomReset = () => setFullscreenZoom(100);

 useEffect(() => {
  const el = fullscreenOverlayRef.current;
  if (!el || !showDocFullscreen) return;
  const onWheel = (e) => {
   e.preventDefault();
   if (e.deltaY < 0) handleFullscreenZoomIn();
   else if (e.deltaY > 0) handleFullscreenZoomOut();
  };
  el.addEventListener("wheel", onWheel, { passive: false });
  return () => el.removeEventListener("wheel", onWheel, { passive: false });
 }, [showDocFullscreen]);

 useEffect(() => {
  if (!showDocFullscreen) return;
  const onMove = (e) => handleFullscreenPanMove(e);
  const onEnd = () => handleFullscreenPanEnd();
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);
  return () => {
   window.removeEventListener("mousemove", onMove);
   window.removeEventListener("mouseup", onEnd);
  };
 }, [showDocFullscreen]);

 useEffect(() => {
  setHasApiError(fileError);
 }, [fileError, setHasApiError]);

 useEffect(() => {
  if (!showDocModal || !pendingExtractedData) return;
  const raw = pendingExtractedData;
  const data = raw.payload || raw;
  const docType = raw._docType;
  const toStr = (v) => (v != null && v !== "" ? String(v).trim() : "");
  if (docType === "CR") {
   setModalForm({
    file_number: toStr(data.file_number),
    expiration_date: "",
    date: toDateInputValue(data.date) || toStr(data.date),
    owner_name: toStr(data.owner_name),
    owner_address: toStr(data.owner_address),
    plate_number: toStr(data.plate_number),
    plate_number_blank_or_temp: false,
    make: toStr(data.make),
    year_model: toStr(data.year_model),
    body_type: toStr(data.body_type),
    body_type_other: "",
    make_other: "",
    piston_displacement: toStr(data.piston_displacement),
   });
  } else if (docType === "OR" || docType === "DL") {
   const exp = toStr(data.expiration_date);
   const reg = toStr(data.registration_date);
   setModalForm((prev) => ({
    ...prev,
    file_number: toStr(data.file_number),
    registration_date: docType === "OR" ? (toMMDDYYYYValue(reg) || reg) : prev.registration_date,
    expiration_date: toMMDDYYYYValue(exp) || exp,
    name: docType === "DL" ? toStr(data.name) : prev.name,
    license_number: docType === "DL"
     ? autoFormatLicenseNumberInput(toStr(data.license_number))
     : prev.license_number,
   }));
  }
 }, [showDocModal, pendingExtractedData]);

 useEffect(() => {
  if (!showDocModal || modalDocType !== "CR") return;
  let cancelled = false;
  setPhAddress((prev) => ({ ...prev, loading: true }));
  psgcApi.getRegions()
   .then((data) => { if (!cancelled) setPhAddress((prev) => ({ ...prev, regions: data || [], loading: false })); })
   .catch(() => { if (!cancelled) setPhAddress((prev) => ({ ...prev, regions: [], loading: false })); });
  return () => { cancelled = true; };
 }, [showDocModal, modalDocType]);

 function buildPhAddressString(ph) {
  const cleanPart = (value) => {
   const v = String(value ?? "").trim();
   if (!v) return "";
   return /^select\s+/i.test(v) ? "" : v;
  };
  const parts = [
   cleanPart(ph.street),
   cleanPart(ph.barangayName),
   cleanPart(ph.cityName),
   cleanPart(ph.provinceName),
   cleanPart(ph.regionName),
  ].filter(Boolean);
  return parts.join(", ");
 }

 function applyPhAddressToForm(nextPh) {
  const str = buildPhAddressString(nextPh);
  setModalForm((prev) => ({ ...prev, owner_address: str }));
 }

 function handlePhRegionChange(code, name) {
  const next = {
   ...phAddress,
   regionCode: code,
   regionName: name || "",
   provinces: [],
   cities: [],
   barangays: [],
   provinceCode: "",
   provinceName: "",
   cityCode: "",
   cityName: "",
   barangayCode: "",
   barangayName: "",
  };
  setPhAddress(next);
  if (!code) return;
  psgcApi.getProvinces(code).then((provinces) => {
   setPhAddress((prev) => ({ ...prev, provinces: provinces || [] }));
   if ((provinces || []).length === 0) {
    psgcApi.getCitiesMunicipalitiesByRegion(code).then((cities) => {
     setPhAddress((prev) => ({ ...prev, cities: cities || [] }));
    });
   }
  });
 }

 function handlePhProvinceChange(code, name) {
  const next = {
   ...phAddress,
   provinceCode: code,
   provinceName: name || "",
   cities: [],
   barangays: [],
   cityCode: "",
   cityName: "",
   barangayCode: "",
   barangayName: "",
  };
  setPhAddress(next);
  if (!code) return;
  psgcApi.getCitiesMunicipalitiesByProvince(code).then((cities) => {
   setPhAddress((prev) => ({ ...prev, cities: cities || [] }));
  });
 }

 function handlePhCityChange(code, name) {
  const next = {
   ...phAddress,
   cityCode: code,
   cityName: code ? (name || "") : "",
   barangays: [],
   barangayCode: "",
   barangayName: "",
  };
  setPhAddress(next);
  if (!code) return;
  psgcApi.getBarangays(code).then((barangays) => {
   setPhAddress((prev) => ({ ...prev, barangays: barangays || [] }));
  });
 }

 function handlePhBarangayChange(code, name) {
  const next = {
   ...phAddress,
   barangayCode: code,
   barangayName: code ? (name || "") : "",
  };
  setPhAddress(next);
 }

 function handlePhStreetChange(value) {
  const next = { ...phAddress, street: value };
  setPhAddress(next);
 }

 const buildModalPayloadFromState = useCallback((docType) => {
  if (docType === "CR") {
   return {
    _docType: "CR",
    file_number: confirmedDocDetails?.cr_file_number || extractedDocDetails?.CR?.file_number || "",
    date: confirmedDocDetails?.cr_date || extractedDocDetails?.CR?.date || "",
    owner_name: confirmedDocDetails?.cr_owner_name || extractedDocDetails?.CR?.owner_name || "",
    owner_address: confirmedDocDetails?.cr_owner_address || extractedDocDetails?.CR?.owner_address || "",
    plate_number: confirmedDocDetails?.cr_plate_number || extractedDocDetails?.CR?.plate_number || "",
    make: confirmedDocDetails?.cr_make || extractedDocDetails?.CR?.make || "",
    year_model: confirmedDocDetails?.cr_year_model || extractedDocDetails?.CR?.year_model || "",
    body_type: confirmedDocDetails?.cr_body_type || extractedDocDetails?.CR?.body_type || "",
    piston_displacement:
     confirmedDocDetails?.cr_piston_displacement ||
     extractedDocDetails?.CR?.piston_displacement ||
     "",
   };
  }
  if (docType === "OR") {
    return {
     _docType: "OR",
     file_number: confirmedDocDetails?.or_file_number || extractedDocDetails?.OR?.file_number || "",
     registration_date:
      confirmedDocDetails?.or_registered || extractedDocDetails?.OR?.registration_date || "",
     expiration_date:
      confirmedDocDetails?.or_expiration || extractedDocDetails?.OR?.expiration_date || "",
    };
   }
   return {
    _docType: "DL",
    name: confirmedDocDetails?.dl_name || extractedDocDetails?.DL?.name || "",
    license_number:
     confirmedDocDetails?.dl_license_number || extractedDocDetails?.DL?.license_number || "",
    expiration_date:
     confirmedDocDetails?.dl_expiration || extractedDocDetails?.DL?.expiration_date || "",
   };
  }, [confirmedDocDetails, extractedDocDetails]);
 
  const buildModalFormFromState = useCallback((docType) => {
   const payload = buildModalPayloadFromState(docType);
   if (docType === "CR") {
    return {
     file_number: String(payload.file_number || "").trim(),
     expiration_date: "",
     date: toMMDDYYYYValue(payload.date || ""),
     owner_name: String(payload.owner_name || "").trim(),
     owner_address: String(payload.owner_address || "").trim(),
     plate_number: String(payload.plate_number || "").trim(),
     plate_number_blank_or_temp: !!confirmedDocDetails?.cr_plate_number_blank_or_temp,
     make: String(payload.make || "").trim(),
     year_model: String(payload.year_model || "").trim(),
     body_type: String(payload.body_type || "").trim(),
     body_type_other: "",
     make_other: "",
     piston_displacement: String(payload.piston_displacement || "").trim(),
    };
   }
  return {
   file_number: String(payload.file_number || "").trim(),
   registration_date: docType === "OR" ? toMMDDYYYYValue(payload.registration_date || "") : "",
   expiration_date: toMMDDYYYYValue(payload.expiration_date || ""),
    name: docType === "DL" ? String(payload.name || "").trim() : "",
    license_number:
     docType === "DL"
      ? autoFormatLicenseNumberInput(String(payload.license_number || ""))
      : "",
    date: "",
    owner_name: "",
    owner_address: "",
    plate_number: "",
    plate_number_blank_or_temp: false,
    make: "",
    year_model: "",
    body_type: "",
    body_type_other: "",
    make_other: "",
    piston_displacement: "",
   };
  }, [buildModalPayloadFromState, confirmedDocDetails?.cr_plate_number_blank_or_temp]);
 
  const openDocModalFromState = useCallback((docType) => {
   const lower = docType.toLowerCase();
   const existingFile = documentFiles?.[lower];
   if (!existingFile) return;
   const idx = DOC_ORDER.indexOf(docType);
   if (idx >= 0) setCurrentDocIndex(idx);
   const draft = modalDrafts?.[docType];
   const payload = buildModalPayloadFromState(docType);
   setModalDocType(docType);
   setModalFile(existingFile);
   extractedPayloadRef.current = payload;
   setPendingExtractedData({ ...payload, payload });
   setModalForm(draft || buildModalFormFromState(docType));
   setShowDocModal(true);
  }, [buildModalFormFromState, buildModalPayloadFromState, documentFiles, modalDrafts, setCurrentDocIndex]);

  useEffect(() => {
   if (reopenDocAt == null) return;
   const docType = DOC_ORDER[reopenDocAt];
   if (docType && documentFiles?.[docType.toLowerCase()]) {
    setModalSequentialNav(true);
    openDocModalFromState(docType);
   }
   onReopenHandled?.();
  }, [reopenDocAt, documentFiles, openDocModalFromState, onReopenHandled]);

  const safeDocIndex = Math.max(0, Math.min(currentDocIndex, DOC_ORDER.length - 1));
  const currentDocType = DOC_ORDER[safeDocIndex];
  const currentLabel = DOC_LABELS[currentDocType];

 const handleFileChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
   toast.error("File is too large. Maximum size is 10MB.");
   setFileError(true);
   return;
  }
  setFileError(false);
  setIsExtractingOne(true);
  try {
   const formData = new FormData();
   formData.append("doc_type", currentDocType);
   formData.append("doc_file", file);
   const res = await fetch(buildUrl("/applicant/application/extract-one"), {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    body: formData,
   });
   let data = await res.json();
   if (!res.ok) {
    if (res.status === 401) {
     toast.error("Your session expired. Please log in again to continue uploading documents.");
     localStorage.removeItem("token");
     nav("/applicant-login");
     return;
    }
     toast.error(data.detail || "Failed to extract document details.");
     setHasApiError(true);
     return;
   }
   if (data && typeof data === "object" && data.data != null && !("file_number" in data) && !("owner_name" in data)) {
    data = data.data;
   }
   const docType = currentDocType;
   const toStr = (v) => (v != null && v !== "" ? String(v).trim() : "");
  const payload = docType === "CR"
   ? {
      _docType: docType,
      file_number: data.file_number,
     owner_name: data.owner_name,
     plate_number: data.plate_number,
     year_model: data.year_model,
     piston_displacement: data.piston_displacement,
    }
    : {
      _docType: docType,
      file_number: data.file_number,
      expiration_date: data.expiration_date,
      name: docType === "DL" ? data.name : undefined,
      license_number: docType === "DL" ? data.license_number : undefined,
     };
  const hasExtractedData = docType === "CR"
    ? (toStr(payload.file_number) || toStr(payload.owner_name) || toStr(payload.plate_number) || toStr(payload.year_model) || toStr(payload.piston_displacement))
    : docType === "DL"
     ? (toStr(payload.expiration_date) || toStr(payload.name) || toStr(payload.license_number))
     : (toStr(payload.file_number) || toStr(payload.registration_date) || toStr(payload.expiration_date));
   if (!hasExtractedData) {
    toast.info("No data was extracted from the document. Please enter the details manually.");
   }
    setModalSequentialNav(false);
    setModalFile(file);
   setModalDocType(docType);
   extractedPayloadRef.current = payload;
   setPendingExtractedData({ ...payload, payload: payload });
   setShowDocFullscreen(false);
   setShowDocModal(true);
   setTimeout(() => {
    setModalForm((prev) => {
     if (docType === "CR") {
      return {
       file_number: toStr(payload.file_number),
       expiration_date: "",
       date: "",
       owner_name: toStr(payload.owner_name),
       owner_address: "",
       plate_number: toStr(payload.plate_number),
       plate_number_blank_or_temp: false,
       make: "",
       year_model: toStr(payload.year_model),
       body_type: "",
       body_type_other: "",
       make_other: "",
       piston_displacement: toStr(payload.piston_displacement),
      };
     }
     const exp = toStr(payload.expiration_date);
     return {
       ...prev,
       file_number: toStr(payload.file_number),
       registration_date: docType === "OR" ? (toMMDDYYYYValue(toStr(payload.registration_date)) || toStr(payload.registration_date)) : prev.registration_date,
       expiration_date: toMMDDYYYYValue(exp) || exp,
       name: docType === "DL" ? toStr(payload.name) : prev.name,
       license_number: docType === "DL"
        ? autoFormatLicenseNumberInput(toStr(payload.license_number))
        : prev.license_number,
      };
     });
    }, 0);
  } catch (err) {
   console.error(err);
   toast.error("Failed to extract document details. Please try again.");
   setHasApiError(true);
  } finally {
   setIsExtractingOne(false);
   if (fileInputRef.current) fileInputRef.current.value = "";
  }
 };

  const handleProceed = () => {
  const doc = modalDocType;
  const lower = doc.toLowerCase();
  const pd = extractedPayloadRef.current || pendingExtractedData?.payload || pendingExtractedData;
  const hasManualValue = (key) =>
   Object.prototype.hasOwnProperty.call(modalForm, key);
  const effective = (key) => {
    const m = modalForm[key];
    // For plate_number, treat an explicitly cleared value ("") as the final value
    if (key === "plate_number") {
     if (m != null) return String(m).trim();
     const p = pd && pd[key];
     return p != null && p !== "" ? String(p).trim() : "";
    }
    if (key === "license_number") {
     if (m != null) return autoFormatLicenseNumberInput(String(m));
     const p = pd && pd[key];
     return p != null && p !== "" ? autoFormatLicenseNumberInput(String(p)) : "";
    }
    if (m != null && String(m).trim() !== "") return String(m).trim();
    const p = pd && pd[key];
    return p != null && p !== "" ? String(p).trim() : "";
   };

   setExtractedDocDetails((prev) => {
    const resolvedDlLicense = effective("license_number");
    const dlLicenseForState = hasManualValue("license_number")
     ? resolvedDlLicense
     : (resolvedDlLicense || prev.DL?.license_number || "");
    return ({
    ...prev,
    [doc]: doc === "CR"
     ? {
      file_number: effective("file_number") || prev.CR?.file_number,
      date: effective("date") || prev.CR?.date,
      owner_name: effective("owner_name") || prev.CR?.owner_name,
      owner_address: effective("owner_address") || prev.CR?.owner_address,
      plate_number: effective("plate_number") || prev.CR?.plate_number,
      make: (modalForm.make === "Other" && (modalForm.make_other ?? "").trim()) ? modalForm.make_other.trim() : (effective("make") || prev.CR?.make),
      year_model: effective("year_model") || prev.CR?.year_model,
      body_type: effective("body_type") || prev.CR?.body_type,
      piston_displacement: effective("piston_displacement") || prev.CR?.piston_displacement,
     }
     : {
       file_number: doc !== "DL" ? (effective("file_number") || prev[doc]?.file_number) : prev[doc]?.file_number,
        registration_date: doc === "OR"
         ? (effective("registration_date") || prev[doc]?.registration_date || "")
         : prev[doc]?.registration_date,
        expiration_date: (effective("expiration_date") || prev[doc]?.expiration_date) ?? "",
        name: doc === "DL" ? (effective("name") || prev.DL?.name || "") : prev[doc]?.name,
        license_number: doc === "DL"
         ? dlLicenseForState
         : prev[doc]?.license_number,
       },
   })});
   setConfirmedDocDetails((prev) => {
    const resolvedDlLicense = effective("license_number");
    const dlLicenseForState = hasManualValue("license_number")
     ? resolvedDlLicense
     : (resolvedDlLicense || prev.dl_license_number || "");
    return ({
    ...prev,
    ...(doc === "CR" && {
     cr_file_number: effective("file_number") || prev.cr_file_number,
    cr_date: effective("date") || prev.cr_date,
    cr_owner_name: effective("owner_name") || prev.cr_owner_name,
    cr_owner_address: effective("owner_address") || prev.cr_owner_address,
    cr_plate_number: modalForm.plate_number_blank_or_temp
     ? ""
     : (modalForm.plate_number ?? "").trim(),
    cr_plate_number_blank_or_temp: modalForm.plate_number_blank_or_temp ?? prev.cr_plate_number_blank_or_temp,
    cr_make: (modalForm.make === "Other" && (modalForm.make_other ?? "").trim()) ? modalForm.make_other.trim() : (effective("make") || prev.cr_make),
    cr_year_model: effective("year_model") || prev.cr_year_model,
    cr_body_type: effective("body_type") || prev.cr_body_type,
    cr_piston_displacement: effective("piston_displacement") || prev.cr_piston_displacement,
   }),
   ...(doc === "OR" && {
    or_file_number: effective("file_number") || prev.or_file_number,
    or_registered: effective("registration_date") || prev.or_registered,
    or_expiration: effective("expiration_date") || prev.or_expiration,
   }),
    ...(doc === "DL" && {
     dl_expiration: effective("expiration_date") || prev.dl_expiration,
     dl_name: effective("name") || prev.dl_name,
      dl_license_number: dlLicenseForState,
     }),
    })});
  setDocumentFiles((prev) => ({ ...prev, [lower]: modalFile }));
  const nextIndex = DOC_ORDER.indexOf(doc) + 1;
  const nextDocType = DOC_ORDER[nextIndex];
  const hasNextUploadedDoc =
   !!nextDocType && !!documentFiles?.[nextDocType.toLowerCase()];
  if (hasNextUploadedDoc) {
   setShowDocFullscreen(false);
   setShowPhAddressModal(false);
   setModalDrafts((prev) => ({ ...prev, [doc]: null }));
   openDocModalFromState(nextDocType);
   return;
  }
  setShowDocFullscreen(false);
  setShowDocModal(false);
  setModalFile(null);
  setModalDocType(null);
  extractedPayloadRef.current = null;
  setPendingExtractedData(null);
  setModalForm({
   file_number: "", registration_date: "", expiration_date: "", name: "", license_number: "", date: "", owner_name: "", owner_address: "",
   plate_number: "", plate_number_blank_or_temp: false,
   make: "", year_model: "", body_type: "", body_type_other: "", make_other: "", piston_displacement: "",
  });
  setPhAddress({
   regions: [], provinces: [], cities: [], barangays: [],
   regionCode: "", regionName: "", provinceCode: "", provinceName: "",
   cityCode: "", cityName: "", barangayCode: "", barangayName: "", street: "", loading: false,
  });
  setShowPhAddressModal(false);
  setModalDrafts((prev) => ({ ...prev, [doc]: null }));
  setCurrentDocIndex(Math.min(DOC_ORDER.length, nextIndex));
  setModalSequentialNav(false);
 };

 const handleModalBack = () => {
  const current = DOC_ORDER.indexOf(modalDocType);
  if (current <= 0) return;
  const prevDocType = DOC_ORDER[current - 1];
  if (!documentFiles?.[prevDocType.toLowerCase()]) return;
  setModalDrafts((prev) => ({
   ...prev,
   [modalDocType]: { ...modalForm },
  }));
  openDocModalFromState(prevDocType);
 };

 const isProceedDisabled = () => {
  const doc = modalDocType;
  const pd =
   extractedPayloadRef.current ||
   pendingExtractedData?.payload ||
   pendingExtractedData ||
   {};
  const valueOf = (key) => {
   const mv = modalForm?.[key];
   if (mv !== undefined && mv !== null && String(mv).trim() !== "") {
    return String(mv).trim();
   }
   const pv = pd?.[key];
   return pv !== undefined && pv !== null ? String(pv).trim() : "";
  };

  if (doc === "OR") {
   return !valueOf("file_number") || !valueOf("registration_date") || !valueOf("expiration_date");
  }

  if (doc === "DL") {
   return !valueOf("name") || !valueOf("license_number") || !valueOf("expiration_date");
  }

  if (doc === "CR") {
   const plateRequired = !modalForm?.plate_number_blank_or_temp;
   return (
    !valueOf("owner_name") ||
    !valueOf("owner_address") ||
    !valueOf("file_number") ||
    !valueOf("date") ||
    !valueOf("year_model") ||
    !valueOf("body_type") ||
    !valueOf("make") ||
    !valueOf("piston_displacement") ||
    (plateRequired && !valueOf("plate_number"))
   );
  }

  return false;
 };

 const proceedButtonLabel = () => {
  if (modalDocType === "CR") return "Proceed to Official Receipt";
  if (modalDocType === "OR") return "Proceed to Driver's License";
  return "Proceed";
 };

 const allDone = currentDocIndex >= DOC_ORDER.length;
 const hasPreviousModalDoc = (() => {
  const idx = DOC_ORDER.indexOf(modalDocType);
  if (idx <= 0) return false;
  const prev = DOC_ORDER[idx - 1]?.toLowerCase();
  return !!documentFiles?.[prev];
 })();

 return (
  <>
   <div className="w-full md:w-[900px] h-auto shadow border border-gray-400 rounded-lg">
    <div className="h-8 bg-primary rounded-t-lg" />
    <div className="p-8 flex flex-col justify-between h-full">
     <h1 className="text-primary text-2xl font-bold text-center">
      Upload a proof of your identity
     </h1>
     <p className="pt-3 text-sm font-light text-gray-500 text-center">
      Upload documents one at a time. Start with Certificate of Registration, then Official Receipt, then Driver&apos;s License.
     </p>

     {!allDone && (
      <div className="mt-5 flex flex-col items-center justify-center">
       <p className="text-sm text-gray-600 mb-3">
        Step {currentDocIndex + 1} of 3: Upload your <strong>{currentLabel}</strong>
       </p>
       <label className="cursor-pointer">
        <div className="w-[200px] h-[170px] p-2 border border-dashed border-gray-500 rounded-md bg-gray-100 flex flex-col items-center justify-center text-center hover:border-primary transition-colors">
         {isExtractingOne ? (
          <div className="flex flex-col items-center gap-2">
           <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
           <span className="text-sm text-gray-600">Extracting...</span>
          </div>
         ) : (
          <>
           <IoMdCloudUpload size={40} className="text-gray-500" />
           <p className="text-xs font-light text-gray-400 mt-2">
            Click to upload your {currentLabel}
           </p>
           <p className="text-xs font-light text-gray-400 pt-1">PNG or JPG (Min 1080 x 720)</p>
          </>
         )}
        </div>
        <input
         ref={fileInputRef}
         type="file"
         className="hidden"
         accept="image/*"
         onChange={handleFileChange}
         disabled={isExtractingOne}
        />
       </label>
      </div>
     )}

     {allDone && (
      <div className="mt-5 text-center text-green-600 font-medium">
       All documents uploaded. Click Next to confirm details.
      </div>
     )}
    </div>
   </div>

   {showDocModal && modalFile && (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
      <div className="p-4 border-b flex-shrink-0 flex justify-between items-center">
       <h2 className="text-lg font-bold text-primary">
        Confirm {DOC_LABELS[modalDocType]} details
       </h2>
       <button
         type="button"
         onClick={() => {
          setShowDocFullscreen(false);
          setShowDocModal(false);
         setShowPhAddressModal(false);
         setModalFile(null);
          setModalDocType(null);
          extractedPayloadRef.current = null;
          setPendingExtractedData(null);
          setModalSequentialNav(false);
         }}
        className="text-gray-500 hover:text-gray-700 p-1"
        aria-label="Close"
       >
        <IoClose size={24} />
       </button>
      </div>
       <div className="flex-1 min-h-0 flex flex-col md:flex-row">
       <div className="flex-shrink-0 md:w-1/2 min-h-0 flex flex-col border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50/50">
        <div className="flex-1 min-h-0 flex items-center justify-center p-2">
         <div
          className="cursor-zoom-in w-full h-full flex items-center justify-center"
          onClick={handleDocPreviewClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleDocPreviewClick()}
          aria-label="Open document in fullscreen"
         >
          <img
           src={URL.createObjectURL(modalFile)}
           alt={DOC_LABELS[modalDocType]}
           className="max-w-full max-h-full w-auto h-auto object-contain select-none pointer-events-none"
           draggable={false}
          />
         </div>
        </div>
       </div>
       <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(() => {
         const pd = extractedPayloadRef.current || pendingExtractedData?.payload || pendingExtractedData;
         const hasExtractedData = pd && (modalDocType === "CR"
          ? (pd.file_number || pd.owner_name || pd.plate_number || pd.year_model || pd.piston_displacement)
          : modalDocType === "DL"
           ? (pd.expiration_date || pd.name || pd.license_number)
           : (pd.file_number || pd.expiration_date));
        const f = (key) => {
         const v = modalForm[key];
         // If the user has typed anything (including an empty string), always prefer it.
         // Only fall back to extracted payload when the modalForm field is truly undefined.
         if (v !== undefined) return String(v ?? "").trim();
         const p = pd && pd[key];
         return p != null && p !== "" ? String(p).trim() : "";
        };
         return (
          <>
        <p className="text-sm font-medium text-blue-600 mb-3">
         {hasExtractedData
          ? "Fields were filled from your document. Please review and correct any errors or add missing information, then click Proceed."
          : "No data was extracted from your document. Please enter the details manually."}
        </p>
        {modalDocType === "OR" && (
         <div>
          <label className="block text-sm text-gray-600 mb-1">File number</label>
          <input
           type="text"
            value={f("file_number")}
           onChange={(e) => setModalForm((prev) => ({ ...prev, file_number: e.target.value }))}
           className="w-full px-3 py-2 border border-gray-300 rounded-md"
           placeholder="e.g. 150100000342937"
          />
         </div>
        )}
        {modalDocType === "OR" && (
         <div>
          <label className="block text-sm text-gray-600 mb-1">Registration date</label>
          <input
           type="text"
           value={toMMDDYYYYValue(f("registration_date"))}
           onChange={(e) =>
            setModalForm((prev) => ({
             ...prev,
             registration_date: autoFormatMMDDYYYYInput(
              e.target.value,
              toMMDDYYYYValue(f("registration_date"))
             ),
            }))
           }
           className="w-full px-3 py-2 border border-gray-300 rounded-md"
           placeholder="MM/DD/YYYY"
          />
         </div>
        )}
        {modalDocType === "CR" && (
         <div className="space-y-4">
          <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Owner&apos;s name</label>
           <input
            type="text"
            value={modalForm.owner_name ?? ""}
            onChange={(e) =>
             setModalForm((prev) => ({
              ...prev,
              owner_name: hasExtractedData
               ? e.target.value
               : String(e.target.value || "").toUpperCase(),
             }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Same as on the CR"
           />
          </div>
          <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Owner&apos;s address</label>
           <input
            type="text"
            value={modalForm.owner_address ?? ""}
            onChange={(e) => setModalForm((prev) => ({ ...prev, owner_address: e.target.value }))}
            onClick={() => setShowPhAddressModal(true)}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white cursor-pointer"
           />
          </div>
          <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Plate number</label>
           <input
            type="text"
            value={f("plate_number")}
            onChange={(e) => setModalForm((prev) => ({ ...prev, plate_number: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:opacity-70"
            placeholder="Leave blank if not on CR"
            disabled={modalForm.plate_number_blank_or_temp}
           />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
           <input
            type="checkbox"
            checked={modalForm.plate_number_blank_or_temp}
            onChange={(e) => setModalForm((prev) => ({ ...prev, plate_number_blank_or_temp: e.target.checked, plate_number: e.target.checked ? "" : prev.plate_number }))}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20"
           />
           <span className="text-sm text-gray-700">Plate number on CR is blank or temporary</span>
          </label>
          <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">MV file number</label>
           <input
            type="text"
            value={f("file_number")}
            onChange={(e) => setModalForm((prev) => ({ ...prev, file_number: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="e.g. 150100000342937"
           />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
             <span className="inline-flex items-center gap-1">
              Date issued
              <span
               className="inline-flex items-center text-blue-600 cursor-help"
               title="Use the date printed in the upper-right corner of the CR document."
              >
               <BiInfoCircle size={14} />
              </span>
             </span>
            </label>
             <input
             type="text"
             value={toMMDDYYYYValue(f("date"))}
            onChange={(e) =>
             setModalForm((prev) => ({
              ...prev,
               date: autoFormatMMDDYYYYInput(e.target.value, toMMDDYYYYValue(f("date"))),
             }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="MM/DD/YYYY"
            />
          </div>
          <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Year model</label>
           <input
            type="text"
            value={f("year_model")}
            onChange={(e) => setModalForm((prev) => ({ ...prev, year_model: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="e.g. 2023"
           />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body type</label>
            <input
             type="text"
             list="cr-body-type-suggestions"
             value={f("body_type")}
             onChange={(e) => setModalForm((prev) => ({ ...prev, body_type: e.target.value }))}
             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
             placeholder="Type or select body type"
            />
            <datalist id="cr-body-type-suggestions">
             {["Sedan", "SUV", "Hatchback", "Wagon", "Van", "Pickup", "Truck", "Motorcycle", "Tricycle", "Jeepney", "Other"].map((bt) => (
              <option key={bt} value={bt} />
             ))}
            </datalist>
           </div>
           {f("body_type") === "Other" && (
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specify body type (optional)</label>
           <input
            type="text"
            value={modalForm.body_type_other ?? ""}
            onChange={(e) => setModalForm((prev) => ({ ...prev, body_type_other: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="e.g. Coupe, MPV"
           />
          </div>
          )}
         <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
           {(() => {
            const bodyType = f("body_type");
            const carMakes = [
             "Toyota", "Honda", "Nissan", "Mitsubishi", "Ford", "Isuzu", "Hyundai", "Kia", "Suzuki",
             "Mazda", "Chevrolet", "Fuso", "Hino", "Foton", "JAC", "BMW", "Mercedes-Benz", "Audi",
             "Volkswagen", "Subaru",
            ];
            const motoMakes = [
             "Yamaha", "Honda", "Suzuki", "Kawasaki", "Vespa", "Hatasu", "Husqavarna", "KTM", "Rusi", "Skygo", "MotorStar", "Bajaj", "TVS", "Ecooter",
             "Bristol", "Ducati", "CFMoto", "Kymco", "SYM", "Keeway", "NWOW", "Triumph", "Mitsukoshi", "Other"
            ];
            const makes = bodyType === "Motorcycle" ? motoMakes : carMakes;
            return (
             <>
              <input
               type="text"
               list="cr-make-suggestions"
               value={f("make")}
               onChange={(e) => setModalForm((prev) => ({ ...prev, make: e.target.value }))}
               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
               placeholder="Type or select make/brand"
              />
              <datalist id="cr-make-suggestions">
               {makes.map((m) => (
                <option key={m} value={m} />
               ))}
              </datalist>
             </>
            );
           })()}
          </div>
         {f("make") === "Other" && (
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Specify make (optional)</label>
          <input
           type="text"
           value={modalForm.make_other ?? ""}
           onChange={(e) => setModalForm((prev) => ({ ...prev, make_other: e.target.value }))}
           className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
           placeholder="e.g. Rare brand name"
          />
         </div>
         )}
          <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Displacement</label>
           <input
            type="text"
            value={modalForm.piston_displacement ?? ""}
            onChange={(e) => setModalForm((prev) => ({ ...prev, piston_displacement: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="e.g. 150cc"
           />
          </div>
         </div>
        )}
        {modalDocType === "DL" && (
         <>
          <div>
           <label className="block text-sm text-gray-600 mb-1">Name</label>
           <input
            type="text"
            value={f("name")}
            onChange={(e) => setModalForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Name as shown on the license"
           />
          </div>
          <div>
           <label className="block text-sm text-gray-600 mb-1">License number</label>
           <input
            type="text"
            value={f("license_number")}
            onChange={(e) =>
             setModalForm((prev) => ({
              ...prev,
              license_number: autoFormatLicenseNumberInput(
               e.target.value,
               f("license_number")
              ),
             }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="e.g. K19-10-004489"
           />
          </div>
         </>
        )}
        {(modalDocType === "OR" || modalDocType === "DL") && (
         <div>
          <label className="block text-sm text-gray-600 mb-1">
           <span className="inline-flex items-center gap-1">
            Expiration date
            {modalDocType === "OR" && (
             <span
              className="inline-flex items-center text-blue-600 cursor-help"
              title="Use the last date of expiration date shown on the OR."
             >
              <BiInfoCircle size={14} />
             </span>
            )}
           </span>
          </label>
          <input
           type="text"
           value={toMMDDYYYYValue(f("expiration_date"))}
           onChange={(e) =>
            setModalForm((prev) => ({
             ...prev,
              expiration_date: autoFormatMMDDYYYYInput(e.target.value, toMMDDYYYYValue(f("expiration_date"))),
            }))
           }
           className="w-full px-3 py-2 border border-gray-300 rounded-md"
           placeholder="MM/DD/YYYY"
          />
         </div>
        )}
        <button
         type="button"
         onClick={handleProceed}
         disabled={isProceedDisabled()}
         className={`mt-2 font-medium py-2 px-4 rounded-md ${
          isProceedDisabled()
           ? "bg-gray-300 text-gray-500 cursor-not-allowed"
           : "bg-primary text-white hover:opacity-90"
         }`}
        >
         {proceedButtonLabel()}
        </button>
        <button
         type="button"
         onClick={handleModalBack}
         disabled={!hasPreviousModalDoc}
         className={`mt-2 font-medium py-2 px-4 rounded-md ${
          hasPreviousModalDoc
           ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
           : "bg-gray-300 text-gray-500 cursor-not-allowed"
         }`}
        >
         Back
        </button>
           </>
          );
         })()}
       </div>
      </div>
     </div>
    </div>
   )}

   {showPhAddressModal && (
    <div
     className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
     onClick={(e) => e.target === e.currentTarget && setShowPhAddressModal(false)}
     role="dialog"
     aria-modal="true"
     aria-label="Quick address (Philippine locations)"
    >
     <div className="bg-white rounded-lg w-full max-w-lg shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="p-4 border-b flex justify-between items-center">
       <h3 className="text-lg font-bold text-primary">Quick address</h3>
       <button
        type="button"
        onClick={() => setShowPhAddressModal(false)}
        className="text-gray-500 hover:text-gray-700 p-1"
        aria-label="Close"
       >
        <IoClose size={24} />
       </button>
      </div>
      <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
       <p className="text-sm text-gray-600">Select location, then click OK to confirm.</p>
       <div>
        <label className="block text-sm text-gray-600 mb-1">Region</label>
        <select
         value={phAddress.regionCode}
         onChange={(e) => {
          const o = e.target.options[e.target.selectedIndex];
          handlePhRegionChange(e.target.value, o?.text ?? "");
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
          const o = e.target.options[e.target.selectedIndex];
          handlePhProvinceChange(e.target.value, o?.text ?? "");
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
          const o = e.target.options[e.target.selectedIndex];
          handlePhCityChange(e.target.value, o?.text ?? "");
         }}
         className="w-full px-3 py-2 border border-gray-300 rounded-md"
         disabled={phAddress.cities.length === 0}
        >
         <option value="">
          {phAddress.cities.length === 0 ? "Select province first" : "Select city/municipality"}
         </option>
         {phAddress.cities.map((c) => (
          <option key={c.code} value={c.code}>{c.name}{c.zip_code ? ` (${c.zip_code})` : ""}</option>
         ))}
        </select>
       </div>
       <div>
        <label className="block text-sm text-gray-600 mb-1">Barangay</label>
        <select
         value={phAddress.barangayCode}
         onChange={(e) => {
          const o = e.target.options[e.target.selectedIndex];
          handlePhBarangayChange(e.target.value, o?.text ?? "");
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
         onChange={(e) => handlePhStreetChange(e.target.value)}
         className="w-full px-3 py-2 border border-gray-300 rounded-md"
         placeholder="e.g. Purok 5, Bldg name"
        />
       </div>
      </div>
      <div className="p-4 border-t flex justify-end">
       <button
        type="button"
        onClick={() => {
         const str = buildPhAddressString(phAddress);
         setModalForm((prev) => ({ ...prev, owner_address: str }));
         setShowPhAddressModal(false);
        }}
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:opacity-90"
       >
        OK
       </button>
      </div>
     </div>
    </div>
   )}

   {showDocFullscreen && modalFile && (
    <div
     ref={fullscreenOverlayRef}
     className="fixed inset-0 bg-black/90 flex flex-col z-[60]"
     onClick={(e) => e.target === e.currentTarget && setShowDocFullscreen(false)}
     role="dialog"
     aria-modal="true"
     aria-label="Document fullscreen view"
    >
     <div className="flex items-center justify-between p-3 bg-black/50 gap-4">
      <div className="flex items-center gap-2">
       <button
        type="button"
        onClick={handleFullscreenZoomOut}
        disabled={fullscreenZoom <= FS_ZOOM_MIN}
        className="h-9 w-9 rounded bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
        aria-label="Zoom out"
       >
        −
       </button>
       <span className="text-sm text-white min-w-[3.5rem] text-center tabular-nums">{fullscreenZoom}%</span>
       <button
        type="button"
        onClick={handleFullscreenZoomIn}
        disabled={fullscreenZoom >= FS_ZOOM_MAX}
        className="h-9 w-9 rounded bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
        aria-label="Zoom in"
       >
        +
       </button>
       {fullscreenZoom !== 100 && (
        <button
         type="button"
         onClick={handleFullscreenZoomReset}
         className="text-xs text-white/90 hover:text-white underline"
        >
         Reset
        </button>
       )}
      </div>
      <button
       type="button"
       onClick={() => setShowDocFullscreen(false)}
       className="h-9 w-9 rounded bg-white/10 text-white hover:bg-white/20 flex items-center justify-center"
       aria-label="Close fullscreen"
      >
       <IoClose size={24} />
      </button>
     </div>
     <div
      className={`flex-1 overflow-hidden flex items-center justify-center p-4 min-h-0 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${fullscreenPanning ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ overscrollBehavior: "none" }}
      onMouseDown={handleFullscreenPanStart}
     >
      <img
       src={URL.createObjectURL(modalFile)}
       alt={DOC_LABELS[modalDocType]}
       className="max-w-full max-h-full w-auto object-contain pointer-events-none"
       style={{
        transform: `translate(${fullscreenPan.x}px, ${fullscreenPan.y}px) scale(${fullscreenZoom / 100})`,
        transformOrigin: "center center",
       }}
       draggable={false}
      />
     </div>
    </div>
   )}
  </>
 );
};

const Step5ConfirmDetails = ({
 extractedDocDetails,
 confirmedDocDetails,
 setConfirmedDocDetails,
 detailsConfirmed,
 setDetailsConfirmed,
}) => {
  const fromOcr = (key) => {
  const v = key === "or_file_number" ? extractedDocDetails?.OR?.file_number
    : key === "or_registered" ? extractedDocDetails?.OR?.registration_date
    : key === "cr_file_number" ? extractedDocDetails?.CR?.file_number
    : key === "cr_owner_name" ? extractedDocDetails?.CR?.owner_name
    : key === "or_expiration" ? extractedDocDetails?.OR?.expiration_date
    : key === "dl_expiration" ? extractedDocDetails?.DL?.expiration_date
    : key === "dl_name" ? extractedDocDetails?.DL?.name
    : key === "dl_license_number" ? extractedDocDetails?.DL?.license_number
    : "";
  return v != null && String(v).trim() !== "";
 };

 return (
  <div className="w-full md:w-[900px] h-auto shadow border border-gray-400 rounded-lg">
   <div className="h-8 bg-primary rounded-t-lg" />
   <div className="p-8 flex flex-col gap-6">
    <h1 className="text-primary text-2xl font-bold text-center">
     Confirm document details
    </h1>
    <p className="text-sm text-gray-600 text-center">
     User-assisted: the fields below were filled from your uploaded documents.
     Please review, correct any errors, or add missing information, then confirm and submit.
    </p>

     <div className="space-y-6 mt-2">
     {/* CR section */}
     <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-800">Certificate of Registration (CR)</h2>
      <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
        CR file number (should match OR)
       </label>
       <input
        type="text"
        value={confirmedDocDetails.cr_file_number ?? ""}
        onChange={(e) =>
         setConfirmedDocDetails((prev) => ({
          ...prev,
          cr_file_number: e.target.value,
         }))
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder={fromOcr("cr_file_number") ? "" : "Not extracted – please enter (e.g. 1501-00000342937)"}
       />
       {fromOcr("cr_file_number") && (
         <p className="text-xs text-blue-600 mt-0.5">Filled from your document – edit if wrong.</p>
       )}
      </div>
      <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
        CR owner&apos;s name
       </label>
        <input
         type="text"
         value={confirmedDocDetails.cr_owner_name ?? ""}
         onChange={(e) =>
          setConfirmedDocDetails((prev) => ({
           ...prev,
           cr_owner_name: fromOcr("cr_owner_name")
            ? e.target.value
            : String(e.target.value || "").toUpperCase(),
          }))
         }
         className="w-full px-3 py-2 border border-gray-300 rounded-md"
         placeholder={fromOcr("cr_owner_name") ? "" : "Not extracted – please enter owner's full name"}
        />
       {fromOcr("cr_owner_name") && (
         <p className="text-xs text-blue-600 mt-0.5">Filled from your document – edit if wrong.</p>
       )}
      </div>
     </div>

     {/* OR section */}
     <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-800">Official Receipt (OR)</h2>
     <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
        OR file number
       </label>
       <input
        type="text"
        value={confirmedDocDetails.or_file_number ?? ""}
        onChange={(e) =>
         setConfirmedDocDetails((prev) => ({
          ...prev,
          or_file_number: e.target.value,
         }))
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder={fromOcr("or_file_number") ? "" : "Not extracted – please enter (e.g. 150100000342937)"}
       />
       {fromOcr("or_file_number") && (
         <p className="text-xs text-blue-600 mt-0.5">Filled from your document – edit if wrong.</p>
       )}
      </div>
      <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
        OR registration date (MM/DD/YYYY)
       </label>
       <input
        type="text"
        value={confirmedDocDetails.or_registered ?? ""}
        onChange={(e) =>
         setConfirmedDocDetails((prev) => ({
          ...prev,
          or_registered: autoFormatMMDDYYYYInput(e.target.value, confirmedDocDetails.or_registered ?? ""),
         }))
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder="MM/DD/YYYY"
       />
       {fromOcr("or_registered") && (
         <p className="text-xs text-blue-600 mt-0.5">Filled from your document – edit if wrong.</p>
       )}
      </div>
      <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
        <span className="inline-flex items-center gap-1">
         OR expiration (MM/DD/YYYY)
         <span
          className="inline-flex items-center text-blue-600 cursor-help"
          title="Use the last date of expiration date shown on the OR."
         >
          <BiInfoCircle size={14} />
         </span>
        </span>
       </label>
       <input
        type="text"
        value={confirmedDocDetails.or_expiration ?? ""}
        onChange={(e) =>
         setConfirmedDocDetails((prev) => ({
          ...prev,
           or_expiration: autoFormatMMDDYYYYInput(e.target.value, confirmedDocDetails.or_expiration ?? ""),
         }))
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder="MM/DD/YYYY"
       />
       {fromOcr("or_expiration") && (
         <p className="text-xs text-blue-600 mt-0.5">Filled from your document – edit if wrong.</p>
       )}
      </div>
     </div>

     {/* DL section */}
     <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-800">Driver&apos;s License (DL)</h2>
      <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
        Name
       </label>
       <input
        type="text"
        value={confirmedDocDetails.dl_name ?? ""}
        onChange={(e) =>
         setConfirmedDocDetails((prev) => ({
          ...prev,
          dl_name: e.target.value,
         }))
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder="Name as shown on the license"
       />
       {fromOcr("dl_name") && (
        <p className="text-xs text-blue-600 mt-0.5">Filled from your document - edit if wrong.</p>
       )}
      </div>
      <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
        License number
       </label>
       <input
        type="text"
        value={confirmedDocDetails.dl_license_number ?? ""}
        onChange={(e) =>
         setConfirmedDocDetails((prev) => ({
          ...prev,
          dl_license_number: autoFormatLicenseNumberInput(
           e.target.value,
           confirmedDocDetails.dl_license_number ?? ""
          ),
         }))
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder="e.g. K19-10-004489"
       />
       {fromOcr("dl_license_number") && (
        <p className="text-xs text-blue-600 mt-0.5">Filled from your document - edit if wrong.</p>
       )}
      </div>
      <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
         DL expiration (MM/DD/YYYY)
       </label>
        <input
        type="text"
        value={confirmedDocDetails.dl_expiration ?? ""}
        onChange={(e) =>
         setConfirmedDocDetails((prev) => ({
          ...prev,
           dl_expiration: autoFormatMMDDYYYYInput(e.target.value, confirmedDocDetails.dl_expiration ?? ""),
         }))
        }
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder="MM/DD/YYYY"
       />
       {fromOcr("dl_expiration") && (
         <p className="text-xs text-blue-600 mt-0.5">Filled from your document – edit if wrong.</p>
       )}
      </div>
     </div>
    </div>

    <label className="flex items-center gap-2 cursor-pointer">
     <input
      type="checkbox"
      checked={detailsConfirmed}
      onChange={(e) => setDetailsConfirmed(e.target.checked)}
      className="w-4 h-4 rounded border-gray-300"
     />
     <span className="text-sm font-medium text-gray-700">
      I have confirmed the above details are correct.
     </span>
    </label>
   </div>
  </div>
 );
};

const AddDriverForm = ({ onSuccess, onCancel }) => {
 const [driverData, setDriverData] = useState({
  driver_first_name: "",
  driver_last_name: "",
  type: "",
  driver_birth_date: "",
  driver_relationship: "",
  driver_license_number: "",
  driver_license: null,
  driver_profile: null,
  driver_license_reg_date: "",
  driver_license_exp_date: "",
 });
 const [previewImage, setPreviewImage] = useState(null);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isExtractingLicense, setIsExtractingLicense] = useState(false);
 const [validationError, setValidationError] = useState(null);

 const getTodayMMDDYYYY = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
 };

 const splitExtractedDlName = (fullName) => {
  const raw = String(fullName ?? "").trim();
  if (!raw) return { first: "", last: "" };
  if (raw.includes(",")) {
   const [last, rest] = raw.split(",", 2);
   return { first: String(rest ?? "").trim(), last: String(last ?? "").trim() };
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: raw, last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
 };

 const handleInputChange = (e) => {
  const { name, value } = e.target;
  setDriverData((prev) => ({
   ...prev,
   [name]: value,
  }));
 };

 const handleProfileImageChange = (e) => {
  const file = e.target.files[0];
  if (file) {
   // Check if file is valid
   if (file.size > 5 * 1024 * 1024) {
    // 5MB limit
    toast.error("Profile image is too large. Maximum size is 5MB.");
    return;
   }

   setDriverData((prev) => ({
    ...prev,
    driver_profile: file,
   }));

   // Create preview
   const reader = new FileReader();
   reader.onloadend = () => {
    setPreviewImage(reader.result);
   };
   reader.readAsDataURL(file);
  }
 };

 const handleLicenseImageChange = async (e) => {
  const file = e.target.files[0];
  if (file) {
   // Check if file is valid
   if (file.size > 5 * 1024 * 1024) {
    // 5MB limit
    toast.error("License image is too large. Maximum size is 5MB.");
    return;
   }

   // Keep selected file immediately so user sees it, then try OCR autofill.
   setDriverData((prev) => ({
    ...prev,
    driver_license: file,
   }));

   setIsExtractingLicense(true);
   try {
    const formData = new FormData();
    formData.append("doc_type", "DL");
    formData.append("doc_file", file);

    const res = await fetch(buildUrl("/applicant/application/extract-one"), {
     method: "POST",
     headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
     body: formData,
    });
    let data = await res.json();
    if (!res.ok) {
     throw new Error(data?.detail || "Failed to extract driver's license details.");
    }
    if (data && typeof data === "object" && data.data != null) {
     data = data.data;
    }

    const extractedExpiration = toMMDDYYYYValue(
     String(data?.expiration_date ?? "").trim()
    );
    const extractedBirthDate = toMMDDYYYYValue(
     String(data?.birth_date ?? "").trim()
    );
    const { first: extractedFirstName, last: extractedLastName } =
     splitExtractedDlName(String(data?.name ?? "").trim());

    setDriverData((prev) => ({
     ...prev,
     driver_first_name: extractedFirstName || prev.driver_first_name,
     driver_last_name: extractedLastName || prev.driver_last_name,
     driver_birth_date: extractedBirthDate || prev.driver_birth_date,
     driver_license: file,
     driver_license_number:
      autoFormatLicenseNumberInput(String(data?.license_number ?? "").trim()) ||
      prev.driver_license_number,
     // Keep this editable and prefill only if empty.
     driver_license_reg_date:
      prev.driver_license_reg_date || getTodayMMDDYYYY(),
     // Prefer OCR expiration if available; preserve existing value otherwise.
     driver_license_exp_date:
      extractedExpiration || prev.driver_license_exp_date,
    }));
    toast.info(
     "Fields were filled from your document. Please review and edit any incorrect details before submitting."
    );

    if (!extractedExpiration) {
     toast.info(
      "License uploaded. Expiration date was not extracted, please enter it manually."
     );
    }
   } catch (err) {
    console.error(err);
    toast.error(
     err?.message || "Failed to auto-fill license details. Please enter dates manually."
    );
   } finally {
    setIsExtractingLicense(false);
   }
  }
 };

 const handleSubmit = async () => {
  // Reset validation error
  setValidationError(null);

  // Check required fields
  const requiredFields = {
   "First Name": driverData.driver_first_name,
   "Last Name": driverData.driver_last_name,
   "Date of Birth": driverData.driver_birth_date,
   Relationship: driverData.driver_relationship,
   "License Number": driverData.driver_license_number,
   "License Expiration Date": driverData.driver_license_exp_date,
   "Driver's License": driverData.driver_license,
   "Profile Image": driverData.driver_profile,
  };

  const missingFields = Object.entries(requiredFields)
   .filter(([_, value]) => !value)
   .map(([key]) => key);

  if (missingFields.length > 0) {
   toast.error(
    `Please fill in all required fields: ${missingFields.join(", ")}`
   );
   return;
  }

  const effectiveRegDate = driverData.driver_license_reg_date || getTodayMMDDYYYY();
  const birthDateISO = normalizeDateToISO(driverData.driver_birth_date);
  const regDateISO = normalizeDateToISO(effectiveRegDate);
  const expDateISO = normalizeDateToISO(driverData.driver_license_exp_date);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateISO)) {
   toast.error("Please enter Date of Birth in MM/DD/YYYY format");
   return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(regDateISO)) {
   toast.error("Please enter License Registered Date in MM/DD/YYYY format");
   return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expDateISO)) {
   toast.error("Please enter License Expiration Date in MM/DD/YYYY format");
   return;
  }

  try {
   setIsSubmitting(true);

   const formData = new FormData();

   // Add all form fields to formData
   const payloadDriverData = {
    ...driverData,
    driver_license_reg_date: effectiveRegDate,
   };
   Object.entries(payloadDriverData).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
     if (key === "driver_birth_date") {
      formData.append(key, birthDateISO);
      return;
     }
     if (key === "driver_license_reg_date") {
      formData.append(key, regDateISO);
      return;
     }
     if (key === "driver_license_exp_date") {
      formData.append(key, expDateISO);
      return;
     }
     formData.append(key, value);
    }
   });

   const response = await fetch(buildUrl("/applicant/authorized-driver"), {
    method: "POST",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
   });

   const data = await response.json();

   if (!response.ok) {
    if (response.status === 422) {
     setValidationError(data.detail);
     toast.error(data.detail.message || "Validation failed");
     return;
    }
    throw new Error(data.detail?.message || "Failed to add driver");
   }

   toast.success("Driver added successfully");
   onSuccess();
  } catch (error) {
   console.error("Error adding driver:", error);
   toast.error(error.message || "Failed to add driver");
  } finally {
   setIsSubmitting(false);
  }
 };

 const relationshipOptions = ["Family", "Friend", "Employee", "Self", "Other"];
 return (
  <div className="py-2">
   <h2 className="text-xl font-semibold text-center mb-4">Add Driver</h2>

   <div className="flex justify-center mb-4">
     <div className="relative">
      <label
       htmlFor="driver-image"
       className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center cursor-pointer border-2 border-transparent hover:border-primary/60 transition-colors"
      >
       {previewImage ? (
        <img
         src={previewImage}
        alt="Driver preview"
        className="w-full h-full object-cover"
       />
       ) : (
        <FaUserCircle className="w-16 h-16 text-gray-400" />
       )}
      </label>
      <div className="absolute bottom-0 right-0 bg-gray-800 rounded-full p-1 pointer-events-none">
       <IoMdCloudUpload size={16} className="text-white" />
      </div>
      <input
       type="file"
       id="driver-image"
      accept="image/*"
      onChange={handleProfileImageChange}
      className="hidden"
     />
    </div>
   </div>
    <div className="grid grid-cols-2 gap-3">
     <div className="flex flex-col col-span-2">
      <label className="text-sm text-gray-600 mb-1">
       Upload driver license:
      </label>
      <div className="border border-gray-300 rounded-md p-2 text-sm flex justify-between items-center">
       <span className="text-gray-500 truncate">
        {driverData.driver_license
         ? driverData.driver_license.name
         : "Choose File"}
       </span>
       <label
        htmlFor="license-file"
        className="bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200 transition-colors"
       >
        {isExtractingLicense ? "Extracting..." : "Browse"}
       </label>
       <input
        type="file"
        id="license-file"
        accept="image/*"
        onChange={handleLicenseImageChange}
        className="hidden"
       />
      </div>
     </div>

     <div className="flex flex-col">
      <label className="text-sm text-gray-600 mb-1">First Name</label>
     <input
      type="text"
      name="driver_first_name"
      value={driverData.driver_first_name}
      onChange={handleInputChange}
      className="border border-gray-300 rounded-md p-2 text-sm"
     />
    </div>

    <div className="flex flex-col">
     <label className="text-sm text-gray-600 mb-1">Last name</label>
     <input
      type="text"
      name="driver_last_name"
      value={driverData.driver_last_name}
      onChange={handleInputChange}
      className="border border-gray-300 rounded-md p-2 text-sm"
     />
    </div>

    <div className="flex flex-col col-span-2">
     <label className="text-sm text-gray-600 mb-1">Date of birth</label>
     <input
      type="text"
      name="driver_birth_date"
      value={toMMDDYYYYValue(driverData.driver_birth_date)}
      onChange={(e) =>
       handleInputChange({
        target: {
         name: "driver_birth_date",
          value: autoFormatMMDDYYYYInput(e.target.value, toMMDDYYYYValue(driverData.driver_birth_date)),
        },
       })
      }
      className="w-full border border-gray-300 rounded-md p-2 text-sm"
      placeholder="MM/DD/YYYY"
      inputMode="numeric"
     />
    </div>

    <div className="flex flex-col col-span-2">
     <label className="text-sm text-gray-600 mb-1">Relations</label>
     <select
      name="driver_relationship"
      value={driverData.driver_relationship}
      onChange={handleInputChange}
      className="border border-gray-300 rounded-md p-2 text-sm"
     >
      <option value="">Select Relationship</option>
      {relationshipOptions.map((option) => (
       <option key={option} value={option}>
        {option}
       </option>
      ))}
     </select>
    </div>

      {driverData.driver_license && (
      <>
       <div className="flex flex-col">
        <label className="text-sm text-gray-600 mb-1">License Number</label>
        <input
         type="text"
         name="driver_license_number"
         value={driverData.driver_license_number}
         onChange={(e) =>
          handleInputChange({
           target: {
            name: "driver_license_number",
            value: autoFormatLicenseNumberInput(
             e.target.value,
             driverData.driver_license_number
            ),
           },
          })
         }
         className="border border-gray-300 rounded-md p-2 text-sm"
         placeholder="e.g. K19-10-004489"
        />
       </div>

       <div className="flex flex-col">
        <label className="text-sm text-gray-600 mb-1">License Expiration Date</label>
        <input
         type="text"
         name="driver_license_exp_date"
         value={toMMDDYYYYValue(driverData.driver_license_exp_date)}
         onChange={(e) =>
          handleInputChange({
           target: {
            name: "driver_license_exp_date",
            value: autoFormatMMDDYYYYInput(
             e.target.value,
             toMMDDYYYYValue(driverData.driver_license_exp_date)
            ),
           },
          })
         }
         className="border border-gray-300 rounded-md p-2 text-sm"
         placeholder="MM/DD/YYYY"
         inputMode="numeric"
        />
       </div>
      </>
     )}

    
   </div>

   {validationError && validationError.errors && (
    <div className="mt-4 p-3 bg-white border border-gray-200 rounded-md">
     <div className="flex items-center gap-2">
      <div
       className={
        validationError.errors.text ? "text-red-500" : "text-green-500"
       }
      >
       {validationError.errors.text ? (
        <p className="text-sm font-medium">Document validation failed</p>
       ) : (
        <p className="text-sm font-medium">{validationError.errors.message}</p>
       )}
      </div>
     </div>
     {validationError.errors.text && (
      <div className="mt-2 space-y-1">
       <p className="text-xs text-red-500">Please ensure:</p>
       <ul className="list-disc list-inside text-xs text-red-500 space-y-1">
        {validationError.errors.image === false && (
         <li>The image format is valid</li>
        )}
        {validationError.errors.text === true && (
         <li>The document text is clearly readable</li>
        )}
        {validationError.errors.expiration === false && (
         <li>The document expiration date is valid</li>
        )}
       </ul>
      </div>
     )}
    </div>
   )}

   <div className="mt-6 flex justify-center">
    <button
     onClick={handleSubmit}
     disabled={isSubmitting}
     className="bg-[#1e293b] text-white rounded-md py-2 px-4 w-full disabled:bg-gray-300 flex items-center justify-center gap-2"
    >
     {isSubmitting ? (
      <>
       <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
       Adding...
      </>
     ) : (
      "Add Driver"
     )}
    </button>
   </div>

   <div className="mt-3 text-center cursor-pointer hover:text-primary/80">
    <p onClick={onCancel}
    
    className="text-primary text-sm " 
    >
     Click here to select driver
    </p>
   </div>
  </div>
 );
};
