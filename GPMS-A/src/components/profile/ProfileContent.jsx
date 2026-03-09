import { CiEdit } from "react-icons/ci";
import { IoCloseCircle } from "react-icons/io5";
import { useEffect, useState, useMemo } from "react";
import { ChangePassword } from "./ChangePassword";
import { ChangeEmail } from "./ChangeEmail";
import { buildUrl } from "../../utils/buildUrl";
import { toast } from "sonner";
import { SuccessModal } from "../response/ResponseModal";
import * as psgcApi from "../../utils/psgcApi";

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

const formatDateMMDDYYYY = (value) => {
 const s = String(value ?? "").trim();
 if (!s) return "";
 if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
 const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
 return s;
};

const toISODate = (value) => {
 const s = String(value ?? "").trim();
 if (!s) return "";
 if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
 const mmddyyyy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
 if (!mmddyyyy) return "";
 return `${mmddyyyy[3]}-${mmddyyyy[1]}-${mmddyyyy[2]}`;
};

const normalizeAddress = (value) =>
 String(value ?? "")
  .replace(/[ \t]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

// Image display component that fetches image from backend
const ImageDisplay = ({ imageUrl, alt, className, fallback }) => {
 const [image, setImage] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(false);

 // Use a memoized URL with timestamp that doesn't change on re-renders
 const memoizedImageUrl = useMemo(() => {
  if (!imageUrl) return null;
  return `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
 }, [imageUrl]);

 useEffect(() => {
  if (!memoizedImageUrl) {
   setLoading(false);
   setError(true);
   return;
  }

  let isMounted = true;
  const fetchImage = async () => {
   try {
    const response = await fetch(buildUrl(memoizedImageUrl), {
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

    if (isMounted) {
     setImage(objectUrl);
     setLoading(false);
    }
   } catch (err) {
    console.error("Error fetching image:", err);
    if (isMounted) {
     setError(true);
     setLoading(false);
    }
   }
  };

  fetchImage();

  // Cleanup function to revoke object URL and cancel fetch on unmount
  return () => {
   isMounted = false;
   if (image) {
    URL.revokeObjectURL(image);
   }
  };
 }, [memoizedImageUrl]);

 if (loading) {
  return (
   <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
    <div className="animate-pulse h-8 w-8 rounded-full bg-primary"></div>
   </div>
  );
 }

 if (error || !image) {
  return fallback;
 }

 return <img src={image} alt={alt} className={className} />;
};

export const ProfileContent = () => {
 const [success, setSuccess] = useState(false);
 const [changePassword, setChangePassword] = useState(false);
 const [changeEmail, setChangeEmail] = useState(false);
 const [profile, setProfile] = useState(null);
 const [isEditing, setIsEditing] = useState(false);
 const [formData, setFormData] = useState({});
 const [imageFile, setImageFile] = useState(null);
 const [previewImage, setPreviewImage] = useState(null);
 const [shouldRefreshImage, setShouldRefreshImage] = useState(false);
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

 // Get user's role from URL path
 const path = window.location.pathname;
 const segments = path.split("/").filter(Boolean);
 const role =
  segments[0] === "admin"
   ? "Admin"
   : segments[0] === "staff"
   ? "staff"
   : "Applicant";

 // Format user's full name
 const getFullName = () => {
  if (!profile) return "";
  return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
 };

 // Fetch profile information
 const getProfileInfo = async () => {
  try {
   const res = await fetch(buildUrl("/profile"), {
    method: "GET",
    headers: {
     "Content-Type": "application/json",
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
   });
   const data = await res.json();

   // Store image URL without adding timestamp (handled in ImageDisplay)
    setProfile(data);
    setFormData({
     ...data,
     birth_date: formatDateMMDDYYYY(data?.birth_date),
     address: normalizeAddress(data?.address),
    });
   // Reset preview image when fetching new profile data
   setPreviewImage(null);

   // Set the flag to refresh image only after a successful update
   setShouldRefreshImage(false);
  } catch (err) {
   console.log(err);
  }
 };

 useEffect(() => {
  getProfileInfo();
 }, []);

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

 // Cleanup for preview image object URL
 useEffect(() => {
  // Return cleanup function
  return () => {
   if (previewImage) {
    URL.revokeObjectURL(previewImage);
   }
  };
 }, [previewImage]);

 // Handle input changes
 const handleChange = (e) => {
  const { name, value } = e.target;
  if (name === "birth_date") {
   setFormData({ ...formData, birth_date: autoFormatMMDDYYYY(value, formData.birth_date || "") });
   return;
  }
  if (name === "address") {
   setFormData({ ...formData, address: normalizeAddress(value) });
   return;
  }
  setFormData({ ...formData, [name]: value });
 };

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

 // Handle image file selection
 const handleImageChange = (e) => {
  const file = e.target.files[0];
  if (file) {
   setImageFile(file);
   // Create a preview URL for the selected image
   const objectUrl = URL.createObjectURL(file);
   setPreviewImage(objectUrl);

   // The cleanup will be handled in useEffect cleanup when component unmounts
  }
 };

 // Update profile
 const handleUpdate = async () => {
  const form = new FormData();
  for (const key in formData) {
    if (key !== "image_url" && key !== "has_image") {
     // Skip these fields
     if (key === "birth_date") {
      const isoBirthDate = toISODate(formData[key]);
      if (!isoBirthDate) {
       toast.error("Please enter Birth Date in MM/DD/YYYY format");
       return;
      }
      form.append(key, isoBirthDate);
      continue;
     }
     if (key === "address") {
      form.append(key, normalizeAddress(formData[key]));
      continue;
     }
     form.append(key, formData[key]);
    }
   }

  // If a new image is selected, append it to form data
  if (imageFile) {
   form.append("image", imageFile);
  }

  try {
   const res = await fetch(buildUrl("/update-profile"), {
    method: "PUT",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: form,
   });

   const data = await res.json();

   if (res.ok) {
    toast.success("Profile updated successfully");
    setIsEditing(false);
    // Set flag to refresh image
    setShouldRefreshImage(true);
    getProfileInfo();
    setSuccess(true);
    // Reset image file and preview after successful update
    setImageFile(null);
    setPreviewImage(null);
   } else {
    toast.error("An error occurred, please try again later");
   }
  } catch (err) {
   toast.error("An error occurred, please try again later");
  }
 };

 return (
  <>
   <div className="flex flex-col md:flex-row items-start gap-5 md:gap-10">
    {/* Left Panel */}
    <div className="flex flex-col items-start gap-5 w-full md:w-[350px] shrink-0">
     <div className="w-full">
      <div className="relative bg-white shadow-md rounded-lg">
       <div className="h-[100px] bg-primary rounded-t-lg" />
       <div className="p-4 md:p-6">
        <div className="flex items-start gap-3 md:gap-5 absolute top-10 left-5 md:left-10">
         <div
          onClick={() => setIsEditing(true)}
          className="h-[70px] w-[70px] md:h-[90px] md:w-[90px] border-4 border-white rounded-full bg-primary overflow-hidden cursor-pointer group relative"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setIsEditing(true)}
          aria-label="Change profile picture"
         >
          {profile?.has_image && profile?.image_url ? (
           <ImageDisplay
            key={`profile-image-${
             shouldRefreshImage ? Date.now() : profile?.image_url
            }`}
            imageUrl={profile.image_url}
            alt="Profile"
            className="h-full w-full object-cover"
            fallback={
             <div className="h-full w-full flex items-center justify-center bg-primary text-white text-lg font-bold">
              {profile?.first_name?.[0]}
              {profile?.last_name?.[0]}
             </div>
            }
           />
          ) : (
           <div className="h-full w-full flex items-center justify-center bg-primary text-white text-lg font-bold">
            {profile?.first_name?.[0]}
            {profile?.last_name?.[0]}
           </div>
          )}
          <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-white text-xs font-medium text-center">
           Change photo
          </span>
         </div>
         <div className="text-white">
          <h1 className="font-semibold text-base md:text-lg">{getFullName()}</h1>
          <p className="text-sm md:text-sm">Account: {role}</p>
         </div>
        </div>
       </div>
      </div>
     </div>
     <div className="w-full p-4 md:p-8 rounded-md shadow-lg mt-5 bg-white border border-gray-100">
      <h1 className="text-lg font-semibold text-primary">Update</h1>
      <p className="text-sm font-light text-gray-500">
       Change your personal information in here
      </p>
       <div className="mt-5 flex flex-col gap-3">
        <button
         onClick={() => setIsEditing(true)}
         className="h-10 px-4 rounded-md text-white bg-primary font-medium text-sm cursor-pointer"
        >
         Update Information
       </button>
       {isEditing && (
        <EditingProfile
         formData={formData}
         handleChange={handleChange}
         handleUpdate={handleUpdate}
         handleImageChange={handleImageChange}
         previewImage={previewImage}
         profileImage={profile?.image_url}
         close={() => {
           setIsEditing(false);
           setPreviewImage(null);
           setImageFile(null);
           setShowAddressPicker(false);
          }}
          showAddressPicker={showAddressPicker}
          setShowAddressPicker={setShowAddressPicker}
          phAddress={phAddress}
          setPhAddress={setPhAddress}
          handlePhRegionChange={handlePhRegionChange}
          handlePhProvinceChange={handlePhProvinceChange}
          handlePhCityChange={handlePhCityChange}
          handlePhBarangayChange={handlePhBarangayChange}
          applyPSGCAddress={() =>
           setFormData((prev) => ({
            ...prev,
            address: normalizeAddress(buildPhAddressString(phAddress)),
           }))
          }
         />
        )}
        <p className="text-sm text-gray-600 text-center">
         <span
          onClick={() => setChangePassword(true)}
          className="font-medium text-primary cursor-pointer hover:text-primary/80 "
         >
           Change Password
          </span>
         </p>
         <p className="text-sm text-gray-600 text-center">
          <span
           onClick={() => setChangeEmail(true)}
           className="font-medium text-primary cursor-pointer hover:text-primary/80"
          >
           Change Email
          </span>
         </p>
         {changePassword && (
          <ChangePassword close={() => setChangePassword(false)} />
         )}
         {changeEmail && (
          <ChangeEmail
           close={() => setChangeEmail(false)}
           currentEmail={formData.email || profile?.email || ""}
          />
         )}
        </div>
      </div>
    </div>

    <div className="rounded-md border border-gray-100 shadow-md bg-white w-full h-auto mt-5 md:mt-0">
     <div className="h-14 bg-primary rounded-t-md" />
     <div className="flex flex-col gap-5 p-4 md:p-5">
      <div className="flex justify-between">
       <h1 className="text-lg md:text-xl font-medium text-primary">
        Personal Information
       </h1>
      </div>
      <hr className="my-2" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
       <div className="flex flex-col">
        <label>First Name</label>
        <input
         type="text"
         name="first_name"
         className="h-10 px-4 rounded-md border"
         value={formData.first_name || ""}
         onChange={handleChange}
         readOnly={!isEditing}
        />
       </div>
       <div className="flex flex-col">
        <label>Last Name</label>
        <input
         type="text"
         name="last_name"
         className="h-10 px-4 rounded-md border"
         value={formData.last_name || ""}
         onChange={handleChange}
         readOnly={!isEditing}
        />
       </div>
       <div className="flex flex-col">
        <label>Gender</label>
        <select
         name="sex"
         className="h-10 px-4 rounded-md border"
         value={formData.sex || ""}
         onChange={handleChange}
         disabled={!isEditing}
        >
         <option value="">Select Gender</option>
         <option value="MALE">Male</option>
         <option value="FEMALE">Female</option>
        </select>
       </div>
       <div className="flex flex-col">
        <label>Birth Date</label>
        <input
         type="text"
         name="birth_date"
         className="h-10 px-4 rounded-md border"
         value={formData.birth_date || ""}
         onChange={handleChange}
         readOnly={!isEditing}
         placeholder="MM/DD/YYYY"
         inputMode="numeric"
        />
       </div>
       <div className="flex flex-col">
        <label>Address</label>
        <textarea
         name="address"
         className="min-h-[72px] px-4 py-2 rounded-md border resize-y"
         value={formData.address || ""}
         onChange={handleChange}
         readOnly={!isEditing}
        />
        <p className="text-[11px] text-gray-500 mt-1">
         Format: House/Unit, Street, Barangay, City/Municipality, Province
        </p>
       </div>
        <div className="flex flex-col">
         <label>Email</label>
         <input
          type="email"
          name="email"
          className="h-10 px-4 rounded-md border bg-gray-100 text-gray-700"
          value={formData.email || ""}
          readOnly
         />
        </div>
        <div className="flex flex-col">
         <label>Contact Number</label>
         <input
         type="text"
         name="contact_no"
         className="h-10 px-4 rounded-md border"
         value={formData.contact_no || ""}
         onChange={handleChange}
         readOnly={!isEditing}
        />
       </div>
      </div>
     </div>
    </div>
    {success && (
     <SuccessModal
      desc="Your personal information has been successfully updated!"
      close={(e) => setSuccess(e)}
     />
    )}
   </div>
  </>
 );
};

const EditingProfile = ({
 formData,
 handleChange,
 handleUpdate,
 handleImageChange,
 previewImage,
 profileImage,
 close,
 showAddressPicker,
 setShowAddressPicker,
 phAddress,
 setPhAddress,
 handlePhRegionChange,
 handlePhProvinceChange,
 handlePhCityChange,
 handlePhBarangayChange,
 applyPSGCAddress,
}) => {
 // Use a stable key for the profile image
 const imageKey = useMemo(
  () => `edit-profile-${profileImage || "default"}`,
  [profileImage]
 );

 return (
  <>
   <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
   <div className="bg-white w-full max-w-[450px] rounded-lg shadow-xl p-3 md:p-5 relative">
    <div className="flex items-center justify-between mb-3">
     <h1 className="text-base font-semibold text-primary">
      Update Information
     </h1>
     <IoCloseCircle
      onClick={close}
      size={22}
      className="text-red-500 cursor-pointer"
     />
    </div>

    {/* Profile Image Upload - clickable image slot with hover */}
    <div className="mb-4 flex flex-col items-center">
     <label
      htmlFor="profile-image"
      className="relative h-[70px] w-[70px] rounded-full mb-2 overflow-hidden border-2 border-primary cursor-pointer group block"
     >
      <div className="h-full w-full">
       {previewImage ? (
        <img
         src={previewImage}
         alt="Profile Preview"
         className="h-full w-full object-cover"
        />
       ) : profileImage ? (
        <ImageDisplay
         key={imageKey}
         imageUrl={profileImage}
         alt="Current Profile"
         className="h-full w-full object-cover"
         fallback={
          <div className="h-full w-full bg-primary flex items-center justify-center text-white text-xl font-bold">
           {formData?.first_name?.[0]}
           {formData?.last_name?.[0]}
          </div>
         }
        />
       ) : (
        <div className="h-full w-full bg-primary flex items-center justify-center text-white text-xl font-bold">
         {formData?.first_name?.[0]}
         {formData?.last_name?.[0]}
        </div>
       )}
      </div>
      {/* Hover overlay - click to change photo */}
      <span className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full text-white text-[10px] font-medium text-center px-1">
       Change photo
      </span>
     </label>
     <label
      htmlFor="profile-image"
      className="cursor-pointer text-xs text-primary font-medium"
     >
      Change Profile Picture
     </label>
     <input
      type="file"
      id="profile-image"
      className="hidden"
      accept="image/*"
      onChange={handleImageChange}
     />
    </div>

    <div className="space-y-3">
     <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col gap-1">
       <label className="text-xs font-medium">First Name</label>
       <input
        type="text"
        name="first_name"
        className="h-9 px-3 rounded-md border text-sm"
        value={formData["first_name"] || ""}
        onChange={handleChange}
       />
      </div>
      <div className="flex flex-col gap-1">
       <label className="text-xs font-medium">Last Name</label>
       <input
        type="text"
        name="last_name"
        className="h-9 px-3 rounded-md border text-sm"
        value={formData["last_name"] || ""}
        onChange={handleChange}
       />
      </div>
     </div>

     <div className="grid grid-cols-2 gap-2">
      {/* Gender Dropdown */}
      <div className="flex flex-col gap-1">
       <label className="text-xs font-medium">Gender</label>
       <select
        name="sex"
        className="h-9 px-3 rounded-md border text-sm"
        value={formData.sex || ""}
        onChange={handleChange}
       >
        <option value="">Select Gender</option>
        <option value="MALE">Male</option>
        <option value="FEMALE">Female</option>
       </select>
      </div>

      {/* Birth Date Input */}
      <div className="flex flex-col gap-1">
       <label className="text-xs font-medium">Birth Date</label>
       <input
        type="text"
        name="birth_date"
        className="h-9 px-3 rounded-md border text-sm"
        value={formData.birth_date || ""}
        onChange={handleChange}
        placeholder="MM/DD/YYYY"
        inputMode="numeric"
       />
      </div>
     </div>

     <div className="flex flex-col gap-1">
      <label className="text-xs font-medium">Address</label>
      <input
       type="text"
       name="address"
       className="h-9 px-3 rounded-md border text-sm bg-white cursor-pointer"
       value={formData["address"] || ""}
       onClick={() => setShowAddressPicker(true)}
       readOnly
       placeholder="Click to select address"
      />
      
     </div>

     <div className="flex flex-col gap-1">
      <label className="text-xs font-medium">Contact Number</label>
      <input
       type="text"
       name="contact_no"
       className="h-9 px-3 rounded-md border text-sm"
       value={formData["contact_no"] || ""}
       onChange={handleChange}
      />
     </div>
    </div>
    <div className="mt-4 flex justify-end gap-2">
     <button
      onClick={close}
      className="h-8 px-3 rounded-md bg-gray-300 cursor-pointer text-sm"
     >
      Cancel
     </button>
     <button
      onClick={handleUpdate}
      className="h-8 px-3 rounded-md text-white bg-primary cursor-pointer text-sm"
     >
      Save Changes
     </button>
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
        <IoCloseCircle size={22} />
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
         applyPSGCAddress();
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
  </>
 );
};
