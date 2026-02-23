import { useState, useEffect } from "react";
import { ClipLoader } from "react-spinners";
import { FaCheck } from "react-icons/fa";
import { IoCloseSharp } from "react-icons/io5";
import { FaFileExcel } from "react-icons/fa6";
import { TfiReload } from "react-icons/tfi";

export const VerifyModal = ({ status, onClose }) => {
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
  if (status) {
   setTimeout(() => setIsLoading(false), 2000); // Simulate verification delay
  }
 }, [status]);

 // Show fail modal when not loading and status is error
 if (!isLoading && status === "error") {
  return (
   <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="bg-white w-[600px] rounded-2xl shadow-xl transform transition-all relative">
     <div className="bg-primary h-[20px] rounded-t-2xl" />
     <div className="p-8 text-center flex flex-col items-center justify-center space-y-5">
      <h1 className="text-primary text-2xl font-bold">
       The provided documents and information do not match.
      </h1>
      <FaFileExcel size={60} className="text-red-400" />
      <p className="text-sm font-light text-gray-500 pt-4">
       The provided documents and information do not match. Please review your
       information and ensure the document image is clear, fully captured
       without any cuts, and taken with proper lighting.
      </p>
      <div className="flex flex-col items-center">
       <button
        onClick={() => onClose(false)}
        className="text-sm text-gray-500 font-medium hover:text-red-400"
       >
        check errors and try again
       </button>
      </div>
     </div>
    </div>
   </div>
  );
 }

 // Show verifying modal when loading or success
 return (
  <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
   <div className="bg-white w-[500px] rounded-2xl shadow-xl transform transition-all relative">
    <div className="bg-primary h-[20px] rounded-t-2xl" />
    <div className="p-8">
     <h1 className="text-2xl text-primary font-bold text-center">
      Verifying Credentials
     </h1>
     <p className="text-sm font-light text-gray-500 text-center pt-4">
      Verifying the submitted information and uploaded documents. Please wait...
     </p>
     <div className="flex justify-center mt-4">
      {isLoading ? (
       <ClipLoader size={70} />
      ) : status === "success" ? (
       <FaCheck size={70} className="text-green-500" />
      ) : (
       <IoCloseSharp size={70} className="text-red-400" />
      )}
     </div>
    </div>
   </div>
  </div>
 );
};
