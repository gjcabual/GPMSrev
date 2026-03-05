import { FaCirclePlus } from "react-icons/fa6";
import { IoCloseCircle } from "react-icons/io5";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildUrl } from "../../utils/buildUrl";
import { useParams } from "react-router-dom";
import { FaCar, FaIdCard, FaFileAlt, FaImage } from "react-icons/fa";
import { toast } from "sonner";

// Image display component that fetches image from backend
const ImageDisplay = ({ imageUrl, alt, className, fallback }) => {
 const [image, setImage] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(false);
 const [showModal, setShowModal] = useState(false);

 useEffect(() => {
  if (!imageUrl) {
   setLoading(false);
   setError(true);
   return;
  }

  const fetchImage = async () => {
   try {
    // Remove '/api/v1' from the URL if present
    const cleanedUrl = imageUrl.replace("/api/v1", "");

    // Add a timestamp to prevent caching
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
   <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
    <div className="animate-pulse h-8 w-8 rounded-full bg-primary"></div>
   </div>
  );
 }

 if (error || !image) {
  return fallback;
 }

 return (
  <>
   <img
    src={image}
    alt={alt}
    className={`${className} cursor-pointer hover:opacity-90 transition-opacity`}
    onClick={() => setShowModal(true)}
   />
   {showModal && (
    <div
     className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[9999]"
     onClick={() => setShowModal(false)}
    >
     <div
      className="relative max-w-[90vw] max-h-[90vh]"
      onClick={(e) => e.stopPropagation()}
     >
      <button
       onClick={() => setShowModal(false)}
       className="absolute -top-10 right-0 text-white hover:text-gray-300"
      >
       <IoCloseCircle size={30} />
      </button>
      <img
       src={image}
       alt={alt}
       className="max-w-full max-h-[85vh] object-contain rounded-lg"
      />
     </div>
    </div>
   )}
  </>
 );
};

export const ApplicationReview = ({
 isFromLog = false,
 isFromApplication = false,
}) => {
 const nav = useNavigate();
 const [data, setData] = useState(null);
 const [loading, setLoading] = useState(true);

 const { id } = useParams();

 useEffect(() => {
  getApplicationInfo();
 }, [id]);

 const getApplicationInfo = async () => {
  try {
   setLoading(true);
   const res = await fetch(buildUrl(`/applicant/application/${id}`), {
    method: "GET",
    headers: {
     "Content-Type": "application/json",
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
   });
   const responseData = await res.json();
   setData(responseData);
  } catch (err) {
   console.log(err);
  } finally {
   setLoading(false);
  }
 };

 const handleDelete = async () => {
  try {
   const res = await fetch(buildUrl(`/applicant/application/${id}`), {
    method: "DELETE",
    headers: {
     "Content-Type": "application/json",
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
   });

   const data = await res.json();

   if (res.ok) {
    nav("/applicant/dashboard");
   } else {
    toast.error(data.detail);
   }
  } catch (err) {
   console.error(err);
  }
 };

 if (loading) {
  return (
   <div className="flex justify-center items-center h-screen">
    <div className="animate-pulse flex flex-col items-center">
     <div className="h-12 w-12 rounded-full bg-primary mb-4"></div>
     <div className="text-primary font-medium">Loading application data...</div>
    </div>
   </div>
  );
 }

 return (
  <>
   <div className="flex flex-col items-center justify-center px-2 sm:px-4 md:px-0">
    <div className="mt-4 sm:mt-8 md:mt-16 w-full max-w-[900px]">
     {!isFromApplication && (
      <div className="flex items-center justify-end">
       <button
        onClick={() => nav(-1)}
        className="bg-primary hover:bg-primary/90 transition-colors px-3 sm:px-4 h-8 sm:h-10 text-sm sm:text-base text-white rounded-lg"
       >
        Back
       </button>
      </div>
     )}
     <div className="mt-4 sm:mt-6 md:mt-10 mb-16 sm:mb-24 w-full h-auto border border-gray-200 shadow-sm rounded-md">
      <div className="h-[40px] sm:h-[50px] bg-primary rounded-t-lg" />
      <div className="p-3 sm:p-4 md:p-14">
       <h1 className="text-base sm:text-lg md:text-2xl text-primary font-semibold">
        My Gate Pass Application
       </h1>
       <p className="text-xs sm:text-sm md:text-lg font-medium text-primary">
        Status:{" "}
        <span
         className={`font-medium ${
          data?.status === "Approved"
           ? "text-green-500"
           : data?.status === "Rejected"
           ? "text-red-500"
           : "text-gray-500"
         }`}
        >
         {data?.status || "Pending"}
        </span>
       </p>
       <div className="mt-4 sm:mt-6 md:mt-10 space-y-8 sm:space-y-12 md:space-y-20">
        <PersonalInfo data={data?.applicant} />
        <VehicleInfo data={data?.applicant?.vehicle_information} />
        <ValidCredentials
         data={data?.applicant?.documents}
         slip={data?.slip}
         status={data?.status}
        />
        <Application data={data} />
        <AuthorizedDriver data={data?.applicant?.driver} />
       </div>

        <div className="mt-6 sm:mt-8 md:mt-10 text-center">
         <div className="mb-4 sm:mb-5">
          <hr />
         </div>

         {!isFromLog ? (
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mt-4 sm:mt-5">
           <button
            onClick={() => nav(-1)}
            className="border border-primary text-primary h-8 sm:h-10 rounded-md px-4 sm:px-6 text-sm sm:text-base font-medium hover:bg-primary/5"
           >
            Back
           </button>
           <button
            onClick={() => nav("/applicant/dashboard")}
            className="bg-primary h-8 sm:h-10 rounded-md px-4 sm:px-6 text-sm sm:text-base font-medium hover:bg-primary/90 text-white"
           >
            Continue
           </button>
          </div>
         ) : (
          <div className="flex justify-center mt-4 sm:mt-5">
           <button
            onClick={() => nav(-1)}
            className="border border-primary text-primary h-8 sm:h-10 rounded-md px-4 sm:px-6 text-sm sm:text-base font-medium hover:bg-primary/5"
           >
            Back
           </button>
          </div>
         )}
       </div>
      </div>
     </div>
    </div>
   </div>
  </>
 );
};

const PersonalInfo = ({ data }) => {
 return (
  <>
   <div>
    <h1 className="text-sm sm:text-base md:text-lg font-medium text-primary">
     Personal Information
    </h1>
    <div className="my-1">
     <hr />
    </div>
    <div className="ml-0 md:ml-[150px]  mt-3 sm:mt-4 md:mt-10">
     <div className="flex flex-col md:flex-row items-center md:items-start gap-3 sm:gap-5">
      {/* <ImageDisplay
       key={`profile-${data?.profile_image}`}
       imageUrl={data?.profile_image}
       alt="Profile"
       className="h-[100px] w-[100px] sm:h-[120px] sm:w-[120px] md:h-[150px] md:w-[300px] rounded-md object-cover"
       fallback={
        <div className="h-[100px] w-[100px] sm:h-[120px] sm:w-[120px] md:h-[130px] md:w-[130px] bg-gray-200 rounded-md flex items-center justify-center text-gray-400 shrink-0">
         <span>No Image</span>
        </div>
       }
      /> */}
      <div className="w-full space-y-2 sm:space-y-3 md:space-y-4">
       <div className="flex flex-col md:flex-row items-start gap-2 sm:gap-3 md:gap-5">
        <div className="w-full flex flex-col gap-1">
         <label htmlFor="" className="text-xs sm:text-sm text-gray-600">
          First Name
         </label>
         <input
          type="text"
          value={data?.first_name || "N/A"}
          readOnly
          className="w-full h-8 sm:h-10 rounded-md px-3 sm:px-4 border border-primary bg-gray-50 text-sm sm:text-base"
         />
        </div>
        <div className="w-full flex flex-col gap-1">
         <label htmlFor="" className="text-xs sm:text-sm text-gray-600">
          Last Name
         </label>
         <input
          type="text"
          value={data?.last_name || "N/A"}
          readOnly
          className="w-full h-8 sm:h-10 rounded-md px-3 sm:px-4 border border-primary bg-gray-50 text-sm sm:text-base"
         />
        </div>
       </div>
       <div className="flex flex-col md:flex-row items-start gap-2 sm:gap-3 md:gap-5">
        <div className="w-full flex flex-col gap-1">
         <label htmlFor="" className="text-xs sm:text-sm text-gray-600">
          Email Address
         </label>
         <input
          type="text"
          value={data?.email_address || "N/A"}
          readOnly
          className="w-full h-8 sm:h-10 rounded-md px-3 sm:px-4 border border-primary bg-gray-50 text-sm sm:text-base"
         />
        </div>
        <div className="w-full flex flex-col gap-1">
         <label htmlFor="" className="text-xs sm:text-sm text-gray-600">
          Phone Number
         </label>
         <input
          type="text"
          value={data?.phone_number || "N/A"}
          readOnly
          className="w-full h-8 sm:h-10 rounded-md px-3 sm:px-4 border border-primary bg-gray-50 text-sm sm:text-base"
         />
        </div>
       </div>
       <div className="flex flex-col md:flex-row items-start gap-2 sm:gap-3 md:gap-5">
        <div className="w-full flex flex-col gap-1">
         <label htmlFor="" className="text-xs sm:text-sm text-gray-600">
          Date of Birth
         </label>
         <input
          type="text"
          value={data?.birth_date || "N/A"}
          readOnly
          className="w-full h-8 sm:h-10 rounded-md px-3 sm:px-4 border border-primary bg-gray-50 text-sm sm:text-base"
         />
        </div>
        <div className="w-full flex flex-col gap-1">
         <label htmlFor="" className="text-xs sm:text-sm text-gray-600">
          Gender
         </label>
         <input
          type="text"
          value={data?.sex || "N/A"}
          readOnly
          className="w-full h-8 sm:h-10 rounded-md px-3 sm:px-4 border border-primary bg-gray-50 text-sm sm:text-base"
         />
        </div>
       </div>
       <div className="flex items-start gap-3 sm:gap-5">
        <div className="w-full flex flex-col gap-1">
         <label htmlFor="" className="text-xs sm:text-sm text-gray-600">
          Address
         </label>
         <input
          type="text"
          value={data?.address || "N/A"}
          readOnly
          className="w-full h-8 sm:h-10 rounded-md px-3 sm:px-4 border border-primary bg-gray-50 text-sm sm:text-base"
         />
        </div>
       </div>
      </div>
     </div>
    </div>
   </div>
  </>
 );
};

const VehicleInfo = ({ data }) => {
 return (
  <>
   <div>
    <h1 className="text-base md:text-lg font-medium text-primary">
     Vehicle Information
    </h1>
    <div className="my-1">
     <hr />
    </div>
    <div className="mt-4 md:mt-10">
     <div className="ml-0 md:ml-[150px] grid grid-cols-1 md:grid-cols-2 gap-5">
      {data?.front_image ? (
       <ImageDisplay
        key={`vehicle-front-${data.front_image}`}
        imageUrl={data.front_image}
        alt="Vehicle Front"
        className="w-[500px] h-[200px] object-cover rounded-md"
        fallback={
         <div className="relative w-full h-[200px] border rounded-md p-1 bg-gray-100 flex flex-col items-center justify-center">
          <FaCar size={50} className="text-primary mb-2" />
          <div className="text-center text-gray-600 text-sm">
           <p>Front Image</p>
           <p className="text-xs text-gray-400 mt-1">Preview not available</p>
          </div>
         </div>
        }
       />
      ) : (
       <div className="w-[500px] h-[200px] bg-gray-200 rounded-md flex items-center justify-center text-gray-400">
        <span>No Front Image</span>
       </div>
      )}

      {data?.back_image ? (
       <ImageDisplay
        key={`vehicle-back-${data.back_image}`}
        imageUrl={data.back_image}
        alt="Vehicle Back"
        className="w-[500px] h-[200px] object-cover rounded-md"
        fallback={
         <div className="relative w-full h-[200px] border rounded-md p-1 bg-gray-100 flex flex-col items-center justify-center">
          <FaCar size={50} className="text-primary mb-2" />
          <div className="text-center text-gray-600 text-sm">
           <p>Back Image</p>
           <p className="text-xs text-gray-400 mt-1">Preview not available</p>
          </div>
         </div>
        }
       />
      ) : (
       <div className="w-[500px] h-[200px] bg-gray-200 rounded-md flex items-center justify-center text-gray-400">
        <span>No Back Image</span>
       </div>
      )}
     </div>
     <div className="ml-0 md:ml-[150px] mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="w-full flex flex-col gap-1">
       <label htmlFor="" className="text-sm text-gray-600">
        Plate Number
       </label>
       <input
        type="text"
        value={data?.plate_number || "N/A"}
        readOnly
        className="w-full h-10 rounded-md px-4 border border-primary bg-gray-50"
       />
      </div>
      <div className="w-full flex flex-col gap-1">
       <label htmlFor="" className="text-sm text-gray-600">
        Model
       </label>
       <input
        type="text"
        value={data?.model || "N/A"}
        readOnly
        className="w-full h-10 rounded-md px-4 border border-primary bg-gray-50"
       />
      </div>
      <div className="w-full flex flex-col gap-1">
       <label htmlFor="" className="text-sm text-gray-600">
        Brand
       </label>
       <input
        type="text"
        value={data?.brand || "N/A"}
        readOnly
        className="w-full h-10 rounded-md px-4 border border-primary bg-gray-50"
       />
      </div>
      <div className="w-full flex flex-col gap-1">
       <label htmlFor="" className="text-sm text-gray-600">
        Vehicle Type
       </label>
       <input
        type="text"
        value={data?.vehicle_type || "N/A"}
        readOnly
        className="w-full h-10 rounded-md px-4 border border-primary bg-gray-50"
       />
      </div>
     </div>
    </div>
   </div>
  </>
 );
};

const ValidCredentials = ({ data, slip, status }) => {
 const hasDocuments = Array.isArray(data) && data.length > 0;
 const showUploadedReceipt = Boolean(slip?.image);

 if (!hasDocuments && !showUploadedReceipt) {
  return (
   <>
    <div>
     <h1 className="text-base md:text-lg font-medium text-primary">
      Valid Credentials
     </h1>
     <div className="my-1">
      <hr />
     </div>
     <div className="mt-4 md:mt-10 flex justify-center">
       <p className="text-gray-500">No credentials available</p>
      </div>
     </div>
    </>
   );
  }

 // Helper function to get icon based on document type
 const getDocumentIcon = (type) => {
  switch (type) {
   case "OR":
    return <FaFileAlt size={40} className="text-primary" />;
   case "CR":
    return <FaIdCard size={40} className="text-primary" />;
   case "DL":
    return <FaIdCard size={40} className="text-primary" />;
   default:
    return <FaImage size={40} className="text-primary" />;
  }
 };

 // Helper function to get full document name
 const getDocumentName = (type) => {
  switch (type) {
   case "OR":
    return "Official Receipt";
   case "CR":
    return "Certificate of Registration";
   case "DL":
    return "Driver's License";
   default:
    return type;
  }
 };

 return (
  <>
   <div>
    <h1 className="text-base md:text-lg font-medium text-primary">
     Valid Credentials
    </h1>
    <div className="my-1">
     <hr />
    </div>
    <div className="mt-4 md:mt-10">
      <div className="ml-0 md:ml-[150px] grid grid-cols-1 md:grid-cols-3 gap-5">
       {showUploadedReceipt && (
        <div className="w-full flex flex-col items-center">
         <div>
          <ImageDisplay
           key={`uploaded-slip-${slip?.slip_id || "latest"}`}
           imageUrl={slip.image}
           alt="Uploaded Cashier Receipt"
           className="w-[170px] h-[170px] md:h-[250px] object-cover border rounded-md"
           fallback={
            <div className="w-[170px] h-[170px] md:h-[200px] border rounded-md p-2 hover:shadow-md transition-shadow bg-gray-100 flex flex-col items-center justify-center">
             <FaFileAlt size={40} className="text-primary" />
             <p className="text-xs md:text-sm font-medium text-primary mt-4">
              Uploaded Cashier Receipt
             </p>
             <p className="text-xs text-gray-400 mt-1">Preview not available</p>
            </div>
           }
          />
          <p className="text-xs md:text-sm font-medium text-primary mt-4 text-center">
           Uploaded Cashier Receipt
          </p>
          <p className="text-xs text-gray-500 mt-1 text-center">
           OR: {slip?.official_receipt || "N/A"}
          </p>
          <p className="text-xs text-gray-500 text-center">
           Amount: {slip?.amount ?? "N/A"}
          </p>
         </div>
        </div>
       )}
       {(data || []).map((doc, index) => (
        <div key={index} className="w-full flex flex-col items-center">
        {doc.image ? (
         <div>
          {" "}
          <ImageDisplay
           key={`doc-${doc.type}-${index}`}
           imageUrl={doc.image}
           alt={getDocumentName(doc.type)}
           className="w-[170px] h-[170px] md:h-[250px] object-cover border rounded-md"
           fallback={
            <div className="w-[170px] h-[170px] md:h-[200px] border rounded-md p-2 hover:shadow-md transition-shadow bg-gray-100 flex flex-col items-center justify-center">
             {getDocumentIcon(doc.type)}
             <p className="text-xs md:text-sm font-medium text-primary mt-4">
              {getDocumentName(doc.type)}
             </p>
             <p className="text-xs text-gray-400 mt-1">Preview not available</p>
            </div>
           }
          />
          <p className="text-xs md:text-sm font-medium text-primary mt-4 text-center">
           {getDocumentName(doc.type)}
          </p>
         </div>
        ) : (
         <div className="w-[150px] h-[150px] md:h-[200px] border rounded-md p-2 hover:shadow-md transition-shadow bg-gray-100 flex flex-col items-center justify-center">
          {getDocumentIcon(doc.type)}
          <p className="text-xs md:text-sm font-medium text-primary mt-4">
           {getDocumentName(doc.type)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Preview not available</p>
         </div>
        )}
       </div>
      ))}
     </div>
    </div>
   </div>
  </>
 );
};

const Application = ({ data }) => {
 return (
  <>
   <div>
    <h1 className="text-base md:text-lg font-medium text-primary">
     Application
    </h1>
    <div className="my-1">
     <hr />
    </div>
    <div className="ml-0 md:ml-[150px] mt-4 md:mt-10">
     <div className="w-full flex flex-col items-center gap-5 md:gap-10">
      <div className="flex flex-col md:flex-row items-center gap-3 md:gap-5 w-full">
       <div className="flex flex-col gap-1 w-full">
        <h1 className="text-green-500 text-3xl md:text-4xl font-bold">
         {data?.sticker_id || "##-####"}
        </h1>
        <p className="text-xs md:text-sm font-medium text-gray-500">
         Generated sticker ID
        </p>
       </div>
       <div className="flex flex-col gap-1 w-full">
        <label htmlFor="" className="text-sm text-gray-600">
         Date of Submission
        </label>
        <input
         type="text"
         value={data?.date || "N/A"}
         readOnly
         className="h-10 px-4 rounded-md border border-primary w-full bg-gray-50"
        />
       </div>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-3 md:gap-5 w-full">
       <div className="flex flex-col gap-1 w-full">
        <label htmlFor="" className="text-sm text-gray-600">
         Application Role
        </label>
        <input
         type="text"
         value={data?.application_role || "N/A"}
         readOnly
         className="h-10 px-4 rounded-md border border-primary w-full bg-gray-50"
        />
       </div>
       <div className="flex flex-col gap-1 w-full">
        <label htmlFor="" className="text-sm text-gray-600">
         Building Name
        </label>
        <input
         type="text"
         value={data?.building_name || "N/A"}
         readOnly
         className="h-10 px-4 rounded-md border border-primary w-full bg-gray-50"
        />
       </div>
      </div>
     </div>
    </div>
   </div>
  </>
 );
};

const AuthorizedDriver = ({ data }) => {
 return (
  <>
   <div>
    <h1 className="text-base md:text-lg font-medium text-primary">
     Authorized Drivers
    </h1>
    <div className="my-1">
     <hr />
    </div>
    <div className="ml-0 md:ml-[150px] mt-6 md:mt-8">
     {data && data.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       {data.map((driver, index) => (
        <div
         key={index}
         className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
         <div className="p-4 md:p-5 flex items-center gap-4">
          <div className="flex-shrink-0">
           <ImageDisplay
            key={`driver-profile-${index}-${driver.document?.image}`}
            imageUrl={driver.profile_image}
            alt={driver.full_name}
            className="w-[70px] h-[70px] md:w-[80px] md:h-[80px] rounded-full object-cover border-2 border-primary"
            fallback={
             <div className="w-[70px] h-[70px] md:w-[80px] md:h-[80px] rounded-full bg-gray-100 border-2 border-primary flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
               {driver.full_name?.[0]}
              </span>
             </div>
            }
           />
          </div>

          <div className="flex-1">
           <h3 className="text-lg font-semibold text-gray-900">
            {driver.full_name || "N/A"}
           </h3>
           <div className="mt-1 flex flex-col gap-1">
            <div className="flex items-center gap-2">
             <span className="text-sm text-gray-600">Age:</span>
             <span className="text-sm font-medium">
              {calculateAge(driver.birthdate) || "N/A"} years
             </span>
            </div>
            <div className="flex items-center gap-2">
             <span className="text-sm text-gray-600">Relationship:</span>
             <span className="text-sm font-medium">
              {driver.relationship || "N/A"}
             </span>
            </div>
            <div className="flex items-center gap-2">
             <span className="text-sm text-gray-600">License:</span>
             <span
              className={`text-sm font-medium px-2 py-0.5 rounded-full text-white ${
               driver.is_valid ? "bg-green-500" : "bg-red-500"
              }`}
             >
              {driver.is_valid ? "Valid" : "Expired"}
             </span>
            </div>
           </div>
          </div>
         </div>

         {driver.document?.image && (
          <div className="px-4 pb-4">
           <div className="border-t border-gray-100 mt-1 pt-3">
            <div className="flex justify-between items-center mb-2">
             <h4 className="text-sm font-medium text-gray-700">
              {driver.document?.type || "Driver's License"}
             </h4>
            </div>
            <div className="w-full h-[100px] overflow-hidden rounded-md border border-gray-200">
             <ImageDisplay
              key={`driver-license-${index}-${driver.document?.image}`}
              imageUrl={driver.document.image}
              alt="License"
              className="w-full h-full object-cover"
              fallback={
               <div className="w-full h-full flex items-center justify-center bg-gray-50">
                <span className="text-gray-400 text-xs">
                 No license image available
                </span>
               </div>
              }
             />
            </div>
           </div>
          </div>
         )}
        </div>
       ))}
      </div>
     ) : (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
       <div className="flex flex-col items-center justify-center">
        <svg
         xmlns="http://www.w3.org/2000/svg"
         className="h-12 w-12 text-gray-400 mb-3"
         fill="none"
         viewBox="0 0 24 24"
         stroke="currentColor"
        >
         <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
         />
        </svg>
        <p className="text-gray-600 text-lg">No authorized drivers found</p>
        <p className="text-sm text-gray-500 mt-1">
         There are no drivers associated with this application
        </p>
       </div>
      </div>
     )}
    </div>
   </div>
  </>
 );
};

// Helper function to calculate age from birthdate
const calculateAge = (birthdate) => {
 if (!birthdate) return "N/A";
 const today = new Date();
 const birthDate = new Date(birthdate);
 let age = today.getFullYear() - birthDate.getFullYear();
 const m = today.getMonth() - birthDate.getMonth();
 if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
  age--;
 }
 return age;
};
