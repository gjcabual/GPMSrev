import { useEffect, useState } from "react";
import { IoCloseCircle } from "react-icons/io5";
import { buildUrl } from "../../utils/buildUrl";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Image Modal Component
const ImageModal = ({ imageUrl, alt, onClose }) => {
 return (
  <div
   className="fixed inset-0 w-full h-full bg-black/70 backdrop-blur-sm"
   style={{
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
   }}
   onClick={onClose}
  >
   <div className="relative w-auto h-auto" onClick={(e) => e.stopPropagation()}>
    <button
     onClick={onClose}
     className="absolute -top-12 right-2 text-white hover:text-gray-300 z-[99999]"
    >
     <IoCloseCircle size={30} />
    </button>
    <div className="relative">
     <ImageDisplay
      imageUrl={imageUrl}
      alt={alt}
      className="max-w-[85vw] max-h-[85vh] w-auto h-auto object-contain rounded-lg"
      fallback={
       <div className="w-[85vw] h-[85vh] bg-gray-800 rounded-lg flex items-center justify-center">
        <span className="text-white">No image available</span>
       </div>
      }
     />
    </div>
   </div>
  </div>
 );
};

// Image display component that fetches image from backend
const ImageDisplay = ({ imageUrl, alt, className, fallback, onClick }) => {
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
    const cleanedUrl = imageUrl.replace("/api/v1", "");
    const urlWithTimestamp = `${cleanedUrl}${
     cleanedUrl.includes("?") ? "&" : "?"
    }t=${Date.now()}`;

    const response = await fetch(buildUrl(`${urlWithTimestamp}`), {
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
    console.error("Image fetch error:", err);
    setError(true);
    setLoading(false);
   }
  };

  fetchImage();

  return () => {
   if (image) {
    URL.revokeObjectURL(image);
   }
  };
 }, [imageUrl]);

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

 return (
  <img
   src={image}
   alt={alt}
   className={`${className} ${
    onClick ? "cursor-pointer hover:opacity-90 transition-opacity" : ""
   }`}
   onClick={onClick}
  />
 );
};

export const ApplicationInfo = ({ applicationId, close }) => {
 const [personalInfo, setPersonalInfo] = useState(true);
 const [vehicleInfo, setVehicleInfo] = useState(false);
 const [documentInfo, setDocumentlInfo] = useState(false);
 const [applicantInfo, setApplicantInfo] = useState([]);
 const [selectedDriver, setSelectedDriver] = useState(null);
 const [selectedImage, setSelectedImage] = useState(null);
 const [vehicleImage, setVehicleImage] = useState(null);
 const [documentImage, setDocumentImage] = useState(null);

 const nav = useNavigate();

 const getApplicantInfo = async () => {
  try {
   const res = await fetch(buildUrl(`/staff/applications/${applicationId}`), {
    method: "GET",
    headers: {
     "Content-Type": "application/json",
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
   });
   const data = await res.json();
   if (res.ok) {
    setApplicantInfo(data);
   }
  } catch (err) {
   toast.info("An error occured, please try again later");
  }
 };

 useEffect(() => {
  getApplicantInfo();
 }, [applicationId]);

 const handleOpenLogs = (id, fullname) => {
  const event = new CustomEvent("showApplicationLogs", {
   detail: { id, fullname },
  });
  window.dispatchEvent(event);
  close(false);
 };

 const handleDriverClick = (driver) => {
  setSelectedDriver(driver);
  setPersonalInfo(true);
  setVehicleInfo(false);
  setDocumentlInfo(false);
 };

 const handleBackToOwner = () => {
  setSelectedDriver(null);
 };

 return (
  <>
   <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="bg-white w-[800px] rounded-2xl shadow-xl transform transition-all relative p-8">
     <div className="flex items-center justify-between">
      <h1 className="text-2xl font-medium text-primary">Online Application</h1>
      <IoCloseCircle
       onClick={() => close(false)}
       size={30}
       className="text-red-500 cursor-pointer"
      />
     </div>
     <div className="mt-3">
      <div className="bg-white border border-gray-200 rounded-lg">
       <div className="p-2 rounded-md flex items-center justify-between gap-5">
        {selectedDriver ? (
         <>
          {selectedDriver.profile_img ? (
           <ImageDisplay
            key={selectedDriver.profile_img + Date.now()}
            imageUrl={selectedDriver.profile_img}
            alt="Driver Profile"
            className="w-[60px] h-[60px] rounded-full object-cover"
            fallback={
             <div className="w-[60px] h-[60px] bg-gray-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">No Image</span>
             </div>
            }
           />
          ) : (
           <div className="w-[60px] h-[60px] bg-gray-500 rounded-full" />
          )}
          <div className="flex flex-col">
           <h1 className="font-medium text-lg text-primary">
            {selectedDriver.fullname}
           </h1>
           <p className="fotn-lgiht text-gray-500 text-sm">
            {selectedDriver.relationship}
           </p>
          </div>
          <button
           onClick={handleBackToOwner}
           className="px-3 py-1 bg-gray-100 rounded-md text-sm hover:bg-gray-200"
          >
           Back to Owner
          </button>
         </>
        ) : (
         <>
          {applicantInfo?.owner?.profile_img ? (
           <ImageDisplay
            key={applicantInfo.owner.profile_img + Date.now()}
            imageUrl={applicantInfo.owner.profile_img}
            alt="Profile"
            className="w-[60px] h-[60px] rounded-full object-cover"
            fallback={
             <div className="w-[60px] h-[60px] bg-gray-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">No Image</span>
             </div>
            }
           />
          ) : (
           <div className="w-[60px] h-[60px] bg-gray-500 rounded-full" />
          )}
          <div className="flex flex-col">
           <h1 className="font-medium text-lg text-primary">
            {applicantInfo?.owner?.fullname}
           </h1>
           <p className="fotn-lgiht text-gray-500 text-sm">
            {applicantInfo?.application_role}
           </p>
          </div>
          <div className="flex flex-col">
           <h1 className="font-medium text-lg text-primary">
            {applicantInfo?.vehicle?.sticker_id || "##-####"}
           </h1>
           <p className="fotn-lgiht text-gray-500 text-sm">Sticker ID</p>
          </div>
          <div className="flex flex-col">
           <h1 className="font-medium text-lg text-primary">
            {applicantInfo?.vehicle?.plate_number}
           </h1>
           <p className="fotn-lgiht text-gray-500 text-sm">Plate Number</p>
          </div>
         </>
        )}
       </div>
       {!selectedDriver && (
        <>
         <div className="mt-3">
          <hr className="border-t-1 border-gray-300" />
         </div>
         <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 p-3">
           <button
            onClick={() => {
             setPersonalInfo(true);
             setVehicleInfo(false);
             setDocumentlInfo(false);
            }}
            className={`px-3 h-10 rounded-lg ${
             personalInfo ? "bg-primary text-white" : "bg-gray-100"
            }`}
           >
            Personal
           </button>
           <button
            onClick={() => {
             setPersonalInfo(false);
             setVehicleInfo(true);
             setDocumentlInfo(false);
            }}
            className={`px-3 h-10 rounded-lg ${
             vehicleInfo ? "bg-primary text-white" : "bg-gray-100"
            }`}
           >
            Vehicle
           </button>
           <button
            onClick={() => {
             setPersonalInfo(false);
             setVehicleInfo(false);
             setDocumentlInfo(true);
            }}
            className={`px-3 h-10 rounded-lg ${
             documentInfo ? "bg-primary text-white" : "bg-gray-100"
            }`}
           >
            Documents
           </button>
          </div>
          <p
          type="button"
           onClick={() =>
            handleOpenLogs(
             applicantInfo?.owner?.user_id,
             applicantInfo?.owner?.fullname
            )
           }
           className="p-4 text-sm text-gray-600 cursor-pointer font-medium hover:text-primary/80"
          >
           Applicant Logs
          </p>
         </div>
        </>
       )}
      </div>
      <div className="mt-5">
       {selectedDriver ? (
        <div className="flex flex-col gap-5">
         <Personal applicantInfo={{ owner: selectedDriver }} />
         {selectedDriver.document && (
          <div className="w-full border border-gray-200 rounded-lg p-3">
           <h1 className="text-lg font-medium text-primary">
            Driver's Document
           </h1>
           <div className="mt-3">
            <div className="p-2 border border-gray-200 rounded-md">
             <div className="flex items-center gap-3">
              {selectedDriver.document.image && (
               <div className="w-[60px] h-[60px] cursor-pointer">
                <ImageDisplay
                 key={selectedDriver.document.image + Date.now()}
                 imageUrl={selectedDriver.document.image}
                 alt={selectedDriver.document.type}
                 className="w-full h-full object-cover rounded-md hover:opacity-90 transition-opacity"
                 onClick={() =>
                  setSelectedImage({
                   url: selectedDriver.document.image,
                   alt: `${selectedDriver.fullname}'s ${selectedDriver.document.type}`,
                  })
                 }
                 fallback={
                  <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                   <span className="text-xs text-gray-500">No Image</span>
                  </div>
                 }
                />
               </div>
              )}
              <div className="flex-1">
               <p className="text-sm font-medium">
                {selectedDriver.document.type}
               </p>
               <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>
                 Registered: {selectedDriver.document.registered_at || "N/A"}
                </span>
                <span>
                 Expires: {selectedDriver.document.expire_at || "N/A"}
                </span>
               </div>
              </div>
             </div>
            </div>
           </div>
          </div>
         )}
        </div>
       ) : (
        <>
         {personalInfo && (
          <Personal
           applicantInfo={applicantInfo}
           onDriverClick={handleDriverClick}
          />
         )}
         {vehicleInfo && (
          <Vehicle
           applicantInfo={applicantInfo}
           onImageClick={(image) => setVehicleImage(image)}
          />
         )}
         {documentInfo && (
          <Document
           applicantInfo={applicantInfo}
           onImageClick={(image) => setDocumentImage(image)}
          />
         )}
        </>
       )}
      </div>
     </div>
    </div>
   </div>

   {selectedImage && (
    <ImageModal
     imageUrl={selectedImage.url}
     alt={selectedImage.alt}
     onClose={() => setSelectedImage(null)}
    />
   )}
   {vehicleImage && (
    <ImageModal
     imageUrl={vehicleImage.url}
     alt={vehicleImage.alt}
     onClose={() => setVehicleImage(null)}
    />
   )}
   {documentImage && (
    <ImageModal
     imageUrl={documentImage.url}
     alt={documentImage.alt}
     onClose={() => setDocumentImage(null)}
    />
   )}
  </>
 );
};

const Personal = ({ applicantInfo, onDriverClick }) => {
 const isDriverView = !onDriverClick;

 const renderDriverFields = () => (
  <>
   <div className="flex flex-col w-full">
    <label htmlFor="" className="text-sm font-medium text-primary">
     Full Name
    </label>
    <div className="h-10 px-4 border border-gray-200 text-sm outline-none rounded-md w-full flex items-center">
     {applicantInfo?.owner?.fullname || "N/A"}
    </div>
   </div>
   <div className="flex flex-col w-full">
    <label htmlFor="" className="text-sm font-medium text-primary">
     Date of Birth
    </label>
    <div className="h-10 px-4 border border-gray-200 text-sm outline-none rounded-md w-full flex items-center">
     {applicantInfo?.owner?.birth_date || "N/A"}
    </div>
   </div>
   <div className="flex flex-col w-full">
    <label htmlFor="" className="text-sm font-medium text-primary">
     Relationship
    </label>
    <div className="h-10 px-4 border border-gray-200 text-sm outline-none rounded-md w-full flex items-center">
     {applicantInfo?.owner?.relationship || "N/A"}
    </div>
   </div>
  </>
 );

 const renderOwnerFields = () => (
  <>
   <div className="flex flex-col w-full">
    <label htmlFor="" className="text-sm font-medium text-primary">
     Email
    </label>
    <div className="h-10 px-4 border border-gray-200 text-sm outline-none rounded-md w-full flex items-center">
     {applicantInfo?.owner?.email || "N/A"}
    </div>
   </div>
   <div className="flex flex-col w-full">
    <label htmlFor="" className="text-sm font-medium text-primary">
     Phone Number
    </label>
    <div className="h-10 px-4 border border-gray-200 text-sm outline-none rounded-md w-full flex items-center">
     {applicantInfo?.owner?.contact_no || "N/A"}
    </div>
   </div>
   <div className="flex items-center gap-3 mt-3">
    <div className="flex flex-col w-full">
     <label htmlFor="" className="text-lsmfont-medium text-primmary">
      Date of Birth
     </label>
     <div className="h-10 px-4 border border-gray-200 text-sm outline-none rounded-md w-full flex items-center">
      {applicantInfo?.owner?.date_of_birth || "N/A"}
     </div>
    </div>
    <div className="flex flex-col w-full">
     <label htmlFor="" className="text-lsmfont-medium text-primmary">
      Gender
     </label>
     <div className="h-10 px-4 border border-gray-200 text-sm outline-none rounded-md w-full flex items-center">
      {applicantInfo?.owner?.gender || "N/A"}
     </div>
    </div>
   </div>
   <div className="flex flex-col w-full">
    <label htmlFor="" className="text-sm font-medium text-primary">
     Address
    </label>
    <div className="h-10 px-4 border border-gray-200 text-sm outline-none rounded-md w-full flex items-center">
     {applicantInfo?.owner?.address || "N/A"}
    </div>
   </div>
  </>
 );

 return (
  <div className="flex items-start gap-5">
   <div className="w-full border border-gray-200 rounded-lg p-3">
    <h1 className="text-lg font-medium text-primary">Personal Information</h1>
    <div className="mt-3 space-y-3">
     {isDriverView ? renderDriverFields() : renderOwnerFields()}
    </div>
   </div>
   {!isDriverView && (
    <div className="w-full border border-gray-200 rounded-lg p-3">
     <h1 className="text-lg font-medium text-primary">Authorized Drivers</h1>
     <div className="mt-3 space-y-3">
      {applicantInfo?.vehicle?.assigned_drivers?.map((driver, index) => (
       <div
        key={index}
        onClick={() => onDriverClick(driver)}
        className="flex items-center gap-2 p-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
       >
        {driver.profile_img ? (
         <ImageDisplay
          key={driver.profile_img + Date.now()}
          imageUrl={driver.profile_img}
          alt="Driver"
          className="w-[40px] h-[40px] rounded-full object-cover"
          fallback={
           <div className="w-[40px] h-[40px] bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">No Image</span>
           </div>
          }
         />
        ) : (
         <div className="w-[40px] h-[40px] bg-gray-300 rounded-full"></div>
        )}
        <div>
         <p className="text-sm font-medium">{driver.fullname}</p>
         <p className="text-xs text-gray-500">{driver.relationship}</p>
        </div>
       </div>
      ))}
      {!applicantInfo?.vehicle?.assigned_drivers?.length && (
       <div className="h-10 px-4 border border-gray-200 text-sm outline-none rounded-md w-full flex items-center">
        No authorized drivers found
       </div>
      )}
     </div>
    </div>
   )}
  </div>
 );
};

const Vehicle = ({ applicantInfo, onImageClick }) => {
 return (
  <>
   <div className="flex flex-col items-start gap-5">
    <div className="flex items-start gap-5">
     <div className="w-1/2 h-[180px]">
      <ImageDisplay
       key={applicantInfo?.vehicle?.front_img + Date.now()}
       imageUrl={applicantInfo?.vehicle?.front_img}
       alt="Front Image"
       className="w-full h-full object-cover rounded-md hover:opacity-90 transition-opacity cursor-pointer"
       onClick={() =>
        onImageClick({
         url: applicantInfo?.vehicle?.front_img,
         alt: "Front Image",
        })
       }
       fallback={
        <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
         <span className="text-gray-500">No Front Image</span>
        </div>
       }
      />
     </div>
     <div className="w-1/2 h-[180px]">
      <ImageDisplay
       key={applicantInfo?.vehicle?.back_img + Date.now()}
       imageUrl={applicantInfo?.vehicle?.back_img}
       alt="Back Image"
       className="w-full h-full object-cover rounded-md hover:opacity-90 transition-opacity cursor-pointer"
       onClick={() =>
        onImageClick({
         url: applicantInfo?.vehicle?.back_img,
         alt: "Back Image",
        })
       }
       fallback={
        <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
         <span className="text-gray-500">No Back Image</span>
        </div>
       }
      />
     </div>
    </div>

    {/* Vehicle Information section */}
    <div className="w-full border border-gray-200 rounded-lg p-4">
     <h1 className="text-lg font-medium text-primary">Vehicle Information</h1>
     <div className="mt-5 grid grid-cols-3 gap-3">
      <div className="flex flex-col">
       <label htmlFor="">Brand</label>
       <div className="h-10 rounded-md px-4 border border-gray-300 flex items-center">
        {applicantInfo?.vehicle?.brand || "N/A"}
       </div>
      </div>
      <div className="flex flex-col">
       <label htmlFor="">Model</label>
       <div className="h-10 rounded-md px-4 border border-gray-300 flex items-center">
        {applicantInfo?.vehicle?.model || "N/A"}
       </div>
      </div>
      <div className="flex flex-col">
       <label htmlFor="">Color</label>
       <div className="h-10 rounded-md px-4 border border-gray-300 flex items-center">
        {applicantInfo?.vehicle?.color || "N/A"}
       </div>
      </div>
     </div>
     <div className="mt-3 grid grid-cols-3 gap-3">
      <div className="flex flex-col">
       <label htmlFor="">Type</label>
       <div className="h-10 rounded-md px-4 border border-gray-300 flex items-center">
        {applicantInfo?.vehicle?.type || "N/A"}
       </div>
      </div>
      <div className="flex flex-col">
       <label htmlFor="">Plate Number</label>
       <div className="h-10 rounded-md px-4 border border-gray-300 flex items-center">
        {applicantInfo?.vehicle?.plate_number || "N/A"}
       </div>
      </div>
      <div className="flex flex-col">
       <label htmlFor="">Sticker ID</label>
       <div className="h-10 rounded-md px-4 border border-gray-300 flex items-center">
        {applicantInfo?.vehicle?.sticker_id || "N/A"}
       </div>
      </div>
     </div>
    </div>
   </div>
  </>
 );
};

const Document = ({ applicantInfo, onImageClick }) => {
 return (
  <div className="flex flex-col items-start gap-5">
   <div className="w-full border border-gray-200 rounded-lg p-3">
    <h1 className="text-lg font-medium text-primary">Documents</h1>
    <div className="mt-3 space-y-3">
     {applicantInfo?.vehicle?.documents?.map((doc, index) => (
      <div key={index} className="p-2 border border-gray-200 rounded-md">
       <div className="flex items-center gap-3">
        {doc.image && (
         <div className="w-[60px] h-[60px] cursor-pointer">
          <ImageDisplay
           key={doc.image + Date.now()}
           imageUrl={doc.image}
           alt={doc.type}
           className="w-full h-full object-cover rounded-md hover:opacity-90 transition-opacity"
           onClick={() =>
            onImageClick({
             url: doc.image,
             alt: doc.type,
            })
           }
           fallback={
            <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
             <span className="text-xs text-gray-500">No Image</span>
            </div>
           }
          />
         </div>
        )}
        <div className="flex-1">
         <p className="text-sm font-medium">{doc.type}</p>
         <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Registered: {doc.registered_at || "N/A"}</span>
          <span>Expires: {doc.expire_at || "N/A"}</span>
         </div>
        </div>
       </div>
      </div>
     ))}
    </div>
   </div>
  </div>
 );
};
