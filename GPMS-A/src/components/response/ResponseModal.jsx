import { IoCloseCircle } from "react-icons/io5";

export const SuccessModal = ({ desc, close, hideButton = false }) => {
 return (
  <>
   <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="bg-white w-[500px] rounded-2xl shadow-xl transform transition-all relative p-8">
     <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-primary">Success </h1>
      <IoCloseCircle
       onClick={() => close(false)}
       size={26}
       className="text-red-500 cursor-pointer"
      />
     </div>
     <div className="mt-10 flex flex-col text-center items-center justify-center gap-5">
      <img src="/check-symbol-4794.png" alt="" className="w-[150px]" />
      <h1 className="text-lg font-medium text-primary">{desc}</h1>
     </div>
     {!hideButton && (
      <div className="mt-10 w-full">
       <button
        onClick={() => close(false)}
        className="h-10 w-full rounded-lg px-4 bg-green-600 text-white font-medium cursor-pointer"
       >
        okay
       </button>
      </div>
     )}
    </div>
   </div>
  </>
 );
};

export const FailModal = ({ desc, close }) => {
 return (
  <>
   <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="bg-white w-[500px] rounded-2xl shadow-xl transform transition-all relative p-8">
     <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-primary">Failed </h1>
      <IoCloseCircle
       onClick={() => close(false)}
       size={26}
       className="text-red-500 cursor-pointer"
      />
     </div>
     <div className="mt-10 flex flex-col items-center justify-center gap-5 text-center">
      <img src="/public/auth/wrong.jpg" alt="" className="w-[150px]" />
      <h1 className="text-lg font-medium text-primary">{desc}</h1>
     </div>
     <div className="mt-10 w-full">
      <button
       onClick={() => close(false)}
       className="h-10 w-full rounded-lg px-4 bg-gray-400 text-primary font-medium cursor-pointer"
      >
       okay
      </button>
     </div>
    </div>
   </div>
  </>
 );
};
