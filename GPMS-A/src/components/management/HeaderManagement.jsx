import { buildUrl } from "../../utils/buildUrl";
import { useState, useEffect, useRef, useMemo } from "react";
import { ApproveModal } from "../applicant/ApproveModal";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import React from "react";

// Image display component that fetches image from backend
const ImageDisplay = React.memo(
 ({ imageUrl, alt, className, fallback, onClick }) => {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const imageRef = useRef(null);

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

     // Store the current object URL in the ref
     imageRef.current = objectUrl;
     setImage(objectUrl);
     setLoading(false);
    } catch (err) {
     console.error("Error fetching image:", err);
     setError(true);
     setLoading(false);
    }
   };

   // Only fetch if the image URL has changed
   if (imageUrl !== imageRef.current?.url) {
    fetchImage();
   }

   // Cleanup function to revoke object URL
   return () => {
    if (imageRef.current) {
     URL.revokeObjectURL(imageRef.current);
     imageRef.current = null;
    }
   };
  }, [imageUrl]);

  if (loading) {
   return (
    <div
     className={`flex items-center justify-center bg-gray-100 ${className}`}
     onClick={onClick}
    >
     <div className="animate-pulse h-8 w-8 rounded-full bg-primary"></div>
    </div>
   );
  }

  if (error || !image) {
   return <div onClick={onClick}>{fallback}</div>;
  }

  return (
   <img
    src={image}
    alt={alt}
    className={className}
    onClick={onClick}
    style={{ cursor: onClick ? "pointer" : "default" }}
   />
  );
 }
);

export const HeaderManagement = ({
 selectData,
 onApplicationStatusChange,
 hasApplications = true,
}) => {
 const path = window.location.pathname;
 const segments = path.split("/").filter(Boolean);
 const role =
  segments[0] === "admin"
   ? "admin"
   : segments[0] === "staff"
   ? "staff"
   : "applicant";

 // Check if the URL contains "/applications"
 const showButtons = path.includes("/application");

 const [approveModal, setApproveModal] = useState(false);
 const [status, setStatus] = useState("Approved");
 const [showImageModal, setShowImageModal] = useState(false);
 const [showDocumentModal, setShowDocumentModal] = useState(false);
 const [currentIndex, setCurrentIndex] = useState(0);
 const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);

 const handleApprove = async (status) => {
  setStatus(status);
  setApproveModal(true);
 };

 // Add function to handle successful application status change
 const handleApplicationStatusChange = (applicationId, status) => {
  // Close the modal
  setApproveModal(false);

  // Call the parent component's callback if provided
  if (onApplicationStatusChange) {
   onApplicationStatusChange(applicationId, status);
  }
 };

 // Memoize the profile image section
 const profileImageSection = useMemo(
  () => (
   <div className="h-[150px] w-[150px] rounded-full bg-gray-300 flex items-center justify-center">
    {selectData?.applicant?.profile_img ? (
     <ImageDisplay
      key={selectData.applicant.profile_img}
      imageUrl={selectData.applicant.profile_img}
      alt="Applicant Profile"
      className="h-full w-full rounded-full object-cover"
      fallback={
       <div className="h-full w-full rounded-full bg-gray-300 flex items-center justify-center">
        <span className="text-gray-500">No Image</span>
       </div>
      }
     />
    ) : (
     <span className="text-gray-500">No Image</span>
    )}
   </div>
  ),
  [selectData?.applicant?.profile_img]
 );

 // Memoize the document images section
 const documentImagesSection = useMemo(
  () => (
   <div className="relative h-[200px] w-full">
    {/* Add slip image if it exists */}
    {selectData?.slip?.image && (
     <div
      className="absolute w-[150px] h-[230px] bg-gray-200 rounded-md overflow-hidden cursor-pointer shadow-md transition-transform hover:translate-y-[-8px] hover:shadow-lg"
      style={{
       left: "0px",
       top: "0px",
       zIndex: (selectData?.documents?.length || 0) + 1,
      }}
      onClick={() => {
       setShowDocumentModal(true);
       setCurrentDocumentIndex(0);
      }}
     >
      <ImageDisplay
       key={selectData.slip.image}
       imageUrl={selectData.slip.image}
       alt="Payment Slip"
       className="w-full h-full object-cover"
       fallback={
        <div className="w-full h-full flex items-center justify-center">
         <span className="text-gray-500 text-sm">Payment Slip</span>
        </div>
       }
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-2 py-1 text-xs truncate">
       Payment Slip
      </div>
     </div>
    )}

    {/* Add other documents */}
    {selectData?.documents
     ?.slice()
     .reverse()
     .map((doc, index) => {
      // Calculate the correct index based on whether there's a slip image
      const hasSlip = selectData?.slip?.image;
      const documentIndex = hasSlip ? index + 1 : index;

      return (
       <div
        key={doc.document_id}
        className={`absolute w-[150px] h-[230px] bg-gray-200 rounded-md overflow-hidden cursor-pointer shadow-md transition-transform hover:translate-y-[-8px] hover:shadow-lg`}
        style={{
         left: `${documentIndex * 20}px`,
         top: `${documentIndex * 10}px`,
         zIndex: selectData.documents.length - index,
        }}
        onClick={() => {
         setShowDocumentModal(true);
         setCurrentDocumentIndex(documentIndex);
        }}
       >
        <ImageDisplay
         key={doc.image}
         imageUrl={doc.image}
         alt={doc.type}
         className="w-full h-full object-cover"
         fallback={
          <div className="w-full h-full flex items-center justify-center">
           <span className="text-gray-500 text-sm">{doc.type}</span>
          </div>
         }
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-2 py-1 text-xs truncate">
         {doc.type}
        </div>
       </div>
      );
     })}
   </div>
  ),
  [selectData?.documents, selectData?.slip]
 );

 // Memoize the vehicle images section
 const vehicleImagesSection = useMemo(
  () => (
   <div className="relative w-[340px] h-[240px]">
    {selectData?.applicant?.vehicle && (
     <>
      {/* Back image (bottom) */}
      <div
       className="absolute w-[280px] h-[180px] rounded-md overflow-hidden cursor-pointer shadow-md transition-transform hover:translate-y-[-8px] hover:shadow-lg border border-gray-200"
       style={{
        left: "30px",
        top: "40px",
        zIndex: 1,
       }}
       onClick={() => {
        setShowImageModal(true);
        setCurrentIndex(1);
       }}
      >
       <ImageDisplay
        key={selectData.applicant.vehicle.back_image}
        imageUrl={selectData.applicant.vehicle.back_image}
        alt="Vehicle Back"
        className="w-full h-full object-cover"
        fallback={
         <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500">Back View</span>
         </div>
        }
       />
       <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-3 py-1 text-sm">
        Back View
       </div>
      </div>

      {/* Front image (top) */}
      <div
       className="absolute w-[280px] h-[180px] rounded-md overflow-hidden cursor-pointer shadow-md transition-transform hover:translate-y-[-8px] hover:shadow-lg border border-gray-200"
       style={{
        left: "0px",
        top: "0px",
        zIndex: 2,
       }}
       onClick={() => {
        setShowImageModal(true);
        setCurrentIndex(0);
       }}
      >
       <ImageDisplay
        key={selectData.applicant.vehicle.front_image}
        imageUrl={selectData.applicant.vehicle.front_image}
        alt="Vehicle Front"
        className="w-full h-full object-cover"
        fallback={
         <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500">Front View</span>
         </div>
        }
       />
       <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-3 py-1 text-sm">
        Front View
       </div>
      </div>
     </>
    )}
   </div>
  ),
  [selectData?.applicant?.vehicle]
 );

 // Add effect to handle body scrolling
 useEffect(() => {
  if (showImageModal || showDocumentModal) {
   document.body.style.overflow = "hidden";
  } else {
   document.body.style.overflow = "auto";
  }

  return () => {
   document.body.style.overflow = "auto";
  };
 }, [showImageModal, showDocumentModal]);

 return (
  <div className="p-8 bg-gray-50 rounded-lg shadow-2xs">
   {!selectData ? (
    // Empty state when no application data is available
    <div className="flex flex-col items-center justify-center py-16">
     <img
      src="/empty-folder.png"
      alt="No applications"
      className="w-32 h-32 opacity-50 mb-4"
      onError={(e) => {
       e.target.onerror = null;
       e.target.src = "https://img.icons8.com/ios/100/000000/empty-box.png";
      }}
     />
     <h2 className="text-xl font-medium text-gray-500">
      No Approved Gate Pass Applications
     </h2>
     <p className="text-gray-400 mt-2">
      Applications that have been approved will appear here
     </p>
    </div>
   ) : (
    // Existing content when application data is available
    <div className="flex flex-col items-start justify-start">
     {/* Main Content Row */}
     <div className="w-full flex items-start justify-between gap-8">
      {/* Left Section - Profile Picture & Role */}
      <div className="flex flex-col items-center">
       {profileImageSection}
       <div className="mt-2 text-center">
        <h1 className="text-gray-600 font-medium">Application Role:</h1>
        <p className="text-xl font-semibold text-gray-800">
         {selectData && selectData.applicant
          ? selectData.applicant.role
          : "N/A"}
        </p>
       </div>
      </div>

      {/* Middle Left - Applicant Details */}
      <div className="flex flex-col gap-2">
       <h3 className="text-lg font-semibold mb-4">Information</h3>
       <div className="w-full flex items-center">
        <span className="w-24 text-gray-600 font-medium">Name:</span>
        <span className="text-xl font-semibold text-gray-800 h-10 bg-slate-200/60 rounded-md px-4 flex w-full items-center">
         {selectData && selectData.applicant
          ? selectData.applicant.name
          : "N/A"}
        </span>
       </div>
       <div className="w-full flex items-center">
        <span className="w-24 text-gray-600 font-medium">Sex:</span>
        <span className="text-xl font-semibold text-gray-800 h-10 bg-slate-200/60 rounded-md px-4 flex w-full items-center">
         {selectData && selectData.applicant
          ? selectData.applicant.sex || "N/A"
          : "N/A"}
        </span>
       </div>
       <div className="w-full flex items-center">
        <span className="w-24 text-gray-600 font-medium">Age:</span>
        <span className="text-xl font-semibold text-gray-800 h-10 bg-slate-200/60 rounded-md px-4 flex w-full items-center">
         {selectData && selectData.applicant
          ? selectData.applicant.age || "N/A"
          : "N/A"}
        </span>
       </div>
       <div className="w-full flex items-center">
        <span className="w-24 text-gray-600 font-medium">Sticker ID:</span>
        <span className="text-xl font-semibold text-gray-800 h-10 bg-slate-200/60 rounded-md px-4 flex w-full items-center">
         {selectData &&
         selectData.applicant &&
         selectData.applicant.vehicle &&
         selectData.applicant.vehicle.sticker &&
         selectData.applicant.vehicle.sticker.sticker_id
          ? selectData.applicant.vehicle.sticker.sticker_id
          : "##-####"}
        </span>
       </div>
      </div>

      {/* Middle Right - Documents */}
      <div className="flex flex-col gap-2">
       <div className="mb-4">
        <h3 className="text-lg font-semibold mb-4">Documents</h3>
        {documentImagesSection}
       </div>
      </div>

      {/* Right Section - Vehicle Images */}
      <div className="flex-shrink-0">
       <h3 className="text-lg font-semibold mb-4">Vehicle Images</h3>
       {vehicleImagesSection}
      </div>
     </div>

     {/* Conditionally Render Action Buttons only if there are applications */}
     {showButtons && hasApplications && (
      <div className="flex items-center gap-5">
       <button
        onClick={() => handleApprove("Approved")}
        className="h-10 px-4 rounded-md text-white font-medium bg-green-500 cursor-pointer"
       >
        Approve
       </button>
       <button
        onClick={() => handleApprove("Rejected")}
        className="h-10 px-4 rounded-md text-white font-medium bg-red-500"
       >
        Reject
       </button>
      </div>
     )}
     {approveModal && (
      <ApproveModal
       data={selectData}
       status={status}
       close={() => setApproveModal(false)}
       onSuccess={handleApplicationStatusChange}
      />
     )}

     {/* Image Modal with Carousel */}
     {showImageModal && selectData?.applicant?.vehicle && (
      <ImageCarouselModal
       images={[
        selectData.applicant.vehicle.front_image,
        selectData.applicant.vehicle.back_image,
       ]}
       onClose={() => setShowImageModal(false)}
       initialIndex={currentIndex}
      />
     )}

     {/* Document Modal with Carousel */}
     {showDocumentModal && (
      <DocumentCarouselModal
       documents={selectData?.documents}
       slip={selectData?.slip}
       onClose={() => setShowDocumentModal(false)}
       initialIndex={currentDocumentIndex}
      />
     )}
    </div>
   )}
  </div>
 );
};

const ImageCarouselModal = ({ images, onClose, initialIndex = 0 }) => {
 const [currentIndex, setCurrentIndex] = useState(initialIndex);
 const [loadedImages, setLoadedImages] = useState([]);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
  // Load all images in the carousel
  const loadImages = async () => {
   setIsLoading(true);

   // Filter out any null or undefined image URLs
   const validImages = images.filter((img) => img);

   if (validImages.length === 0) {
    setLoadedImages([]);
    setIsLoading(false);
    return;
   }

   const loadedImagePromises = validImages.map(async (imgUrl) => {
    try {
     // Remove '/api/v1' from the URL if present
     const cleanedUrl = imgUrl.replace("/api/v1", "");

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

     if (!response.ok) return null;

     const blob = await response.blob();
     return URL.createObjectURL(blob);
    } catch (err) {
     console.error("Error loading carousel image:", err);
     return null;
    }
   });

   const results = await Promise.all(loadedImagePromises);
   // Filter out any nulls from failed loads
   const validResults = results.filter((result) => result !== null);
   setLoadedImages(validResults);
   setIsLoading(false);
  };

  loadImages();

  // Cleanup function
  return () => {
   loadedImages.forEach((img) => {
    if (img) URL.revokeObjectURL(img);
   });
  };
 }, [images]);

 const goToPrevious = () => {
  if (loadedImages.length <= 1) return;

  const isFirstImage = currentIndex === 0;
  const newIndex = isFirstImage ? loadedImages.length - 1 : currentIndex - 1;
  setCurrentIndex(newIndex);
 };

 const goToNext = () => {
  if (loadedImages.length <= 1) return;

  const isLastImage = currentIndex === loadedImages.length - 1;
  const newIndex = isLastImage ? 0 : currentIndex + 1;
  setCurrentIndex(newIndex);
 };

 // Handle keyboard navigation
 useEffect(() => {
  const handleKeyDown = (e) => {
   if (e.key === "ArrowLeft") {
    goToPrevious();
   } else if (e.key === "ArrowRight") {
    goToNext();
   } else if (e.key === "Escape") {
    onClose();
   }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => {
   window.removeEventListener("keydown", handleKeyDown);
  };
 }, [currentIndex, loadedImages]); // eslint-disable-line react-hooks/exhaustive-deps

 if (isLoading) {
  return (
   <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="relative w-full max-w-6xl p-4 bg-white rounded-lg">
     <button
      onClick={onClose}
      className="absolute top-2 right-2 z-10 p-2 text-black bg-white/50 rounded-full hover:bg-white transition-colors"
     >
      <IoClose size={30} />
     </button>
     <div className="h-[75vh] flex items-center justify-center">
      <div className="animate-pulse h-16 w-16 rounded-full bg-primary"></div>
     </div>
    </div>
   </div>
  );
 }

 if (loadedImages.length === 0) {
  return (
   <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="relative w-full max-w-6xl p-4 bg-white rounded-lg">
     <button
      onClick={onClose}
      className="absolute top-2 right-2 z-10 p-2 text-black bg-white/50 rounded-full hover:bg-white transition-colors"
     >
      <IoClose size={30} />
     </button>
     <div className="h-[75vh] flex items-center justify-center">
      <p className="text-gray-500 text-xl">No images available to display</p>
     </div>
    </div>
   </div>
  );
 }

 return (
  <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex justify-center items-center z-50">
   <div className="relative w-full max-w-6xl p-4">
    {/* Close button */}
    <button
     onClick={onClose}
     className="absolute top-2 right-2 z-10 p-2 text-white bg-white/50 rounded-full hover:bg-white/80 transition-colors"
    >
     <IoClose size={30} />
    </button>

    {/* Image container */}
    <div className="relative flex items-center justify-center bg-white/10 rounded-lg overflow-hidden h-[75vh]">
     {loadedImages[currentIndex] ? (
      <img
       src={loadedImages[currentIndex]}
       alt={`Vehicle image ${currentIndex + 1}`}
       className="h-full max-w-full object-contain shadow-2xl"
      />
     ) : (
      <div className="h-full w-full flex items-center justify-center bg-gray-100/10">
       <span className="text-white text-xl">No image available</span>
      </div>
     )}

     {/* Navigation arrows - only show if more than one image */}
     {loadedImages.length > 1 && (
      <>
       <button
        onClick={goToPrevious}
        className="absolute left-4 p-3 text-white bg-black/50 rounded-full hover:bg-black/70 transition-colors"
       >
        <FiChevronLeft size={36} />
       </button>

       <button
        onClick={goToNext}
        className="absolute right-4 p-3 text-white bg-black/50 rounded-full hover:bg-black/70 transition-colors"
       >
        <FiChevronRight size={36} />
       </button>
      </>
     )}
    </div>

    {/* Image counter - only show if more than one image */}
    {loadedImages.length > 1 && (
     <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
      {loadedImages.map((_, index) => (
       <button
        key={index}
        onClick={() => setCurrentIndex(index)}
        className={`w-3 h-3 rounded-full ${
         index === currentIndex ? "bg-white" : "bg-white/50"
        }`}
       ></button>
      ))}
     </div>
    )}
   </div>
  </div>
 );
};

const DocumentCarouselModal = ({
 documents,
 slip,
 onClose,
 initialIndex = 0,
}) => {
 const [currentIndex, setCurrentIndex] = useState(initialIndex);
 const [loadedImages, setLoadedImages] = useState([]);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
  // Load all images in the carousel
  const loadImages = async () => {
   setIsLoading(true);

   // Combine slip and documents into a single array
   const allImages = [
    ...(slip?.image ? [{ url: slip.image, type: "Payment Slip" }] : []),
    ...(documents || []).map((doc) => ({ url: doc.image, type: doc.type })),
   ];

   // Filter out any null or undefined image URLs
   const validImages = allImages.filter((img) => img.url);

   if (validImages.length === 0) {
    setLoadedImages([]);
    setIsLoading(false);
    return;
   }

   const loadedImagePromises = validImages.map(async (img) => {
    try {
     // Remove '/api/v1' from the URL if present
     const cleanedUrl = img.url.replace("/api/v1", "");

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

     if (!response.ok) return null;

     const blob = await response.blob();
     return {
      url: URL.createObjectURL(blob),
      type: img.type,
     };
    } catch (err) {
     console.error("Error loading document image:", err);
     return null;
    }
   });

   const results = await Promise.all(loadedImagePromises);
   // Filter out any nulls from failed loads
   const validResults = results.filter((result) => result !== null);
   setLoadedImages(validResults);
   setIsLoading(false);
  };

  loadImages();

  // Cleanup function
  return () => {
   loadedImages.forEach((img) => {
    if (img?.url) URL.revokeObjectURL(img.url);
   });
  };
 }, [documents, slip]);

 const goToPrevious = () => {
  if (loadedImages.length <= 1) return;

  const isFirstImage = currentIndex === 0;
  const newIndex = isFirstImage ? loadedImages.length - 1 : currentIndex - 1;
  setCurrentIndex(newIndex);
 };

 const goToNext = () => {
  if (loadedImages.length <= 1) return;

  const isLastImage = currentIndex === loadedImages.length - 1;
  const newIndex = isLastImage ? 0 : currentIndex + 1;
  setCurrentIndex(newIndex);
 };

 // Handle keyboard navigation
 useEffect(() => {
  const handleKeyDown = (e) => {
   if (e.key === "ArrowLeft") {
    goToPrevious();
   } else if (e.key === "ArrowRight") {
    goToNext();
   } else if (e.key === "Escape") {
    onClose();
   }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => {
   window.removeEventListener("keydown", handleKeyDown);
  };
 }, [currentIndex, loadedImages]);

 if (isLoading) {
  return (
   <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="relative w-full max-w-6xl p-4 bg-white rounded-lg">
     <button
      onClick={onClose}
      className="absolute top-2 right-2 z-10 p-2 text-black bg-white/50 rounded-full hover:bg-white transition-colors"
     >
      <IoClose size={30} />
     </button>
     <div className="h-[75vh] flex items-center justify-center">
      <div className="animate-pulse h-16 w-16 rounded-full bg-primary"></div>
     </div>
    </div>
   </div>
  );
 }

 if (loadedImages.length === 0) {
  return (
   <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="relative w-full max-w-6xl p-4 bg-white rounded-lg">
     <button
      onClick={onClose}
      className="absolute top-2 right-2 z-10 p-2 text-black bg-white/50 rounded-full hover:bg-white transition-colors"
     >
      <IoClose size={30} />
     </button>
     <div className="h-[75vh] flex items-center justify-center">
      <p className="text-gray-500 text-xl">No documents available to display</p>
     </div>
    </div>
   </div>
  );
 }

 return (
  <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex justify-center items-center z-50">
   <div className="relative w-full max-w-6xl p-4">
    {/* Close button */}
    <button
     onClick={onClose}
     className="absolute top-2 right-2 z-10 p-2 text-white bg-white/50 rounded-full hover:bg-white/80 transition-colors"
    >
     <IoClose size={30} />
    </button>

    {/* Document type */}
    <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-3 py-1 rounded-md">
     {loadedImages[currentIndex]?.type}
    </div>

    {/* Image container */}
    <div className="relative flex items-center justify-center bg-white/10 rounded-lg overflow-hidden h-[75vh]">
     {loadedImages[currentIndex]?.url ? (
      <img
       src={loadedImages[currentIndex].url}
       alt={`Document ${currentIndex + 1}`}
       className="h-full max-w-full object-contain shadow-2xl"
      />
     ) : (
      <div className="h-full w-full flex items-center justify-center bg-gray-100/10">
       <span className="text-white text-xl">No document available</span>
      </div>
     )}

     {/* Navigation arrows - only show if more than one image */}
     {loadedImages.length > 1 && (
      <>
       <button
        onClick={goToPrevious}
        className="absolute left-4 p-3 text-white bg-black/50 rounded-full hover:bg-black/70 transition-colors"
       >
        <FiChevronLeft size={36} />
       </button>

       <button
        onClick={goToNext}
        className="absolute right-4 p-3 text-white bg-black/50 rounded-full hover:bg-black/70 transition-colors"
       >
        <FiChevronRight size={36} />
       </button>
      </>
     )}
    </div>

    {/* Image counter - only show if more than one image */}
    {loadedImages.length > 1 && (
     <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
      {loadedImages.map((_, index) => (
       <button
        key={index}
        onClick={() => setCurrentIndex(index)}
        className={`w-3 h-3 rounded-full ${
         index === currentIndex ? "bg-white" : "bg-white/50"
        }`}
       ></button>
      ))}
     </div>
    )}
   </div>
  </div>
 );
};
