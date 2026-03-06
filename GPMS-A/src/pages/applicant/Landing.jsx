import { useNavigate } from "react-router-dom";

export const Landing = () => {
 const nav = useNavigate();

 return (
  <div className="h-screen flex flex-col gap-10 justify-start bg-gray-100 relative overflow-hidden">
   {/* Navbar */}
   <div className="px-5 md:px-20 w-full h-20 bg-gray-100 z-50 flex items-center justify-between">
    <img src="/main_logo.png" alt="" className="w-32 md:w-48" />
    <p
    type="button"
     onClick={() => nav("/applicant-login")}
     className="p-2 rounded-md text-sm md:text-base cursor-pointer hover:text-primary/80 "
    >
     Login
    </p>
   </div>

   {/* Background Image */}
   <img
    src="/auth/bg_login.png"
    alt=""
    className="w-full h-full absolute opacity-50 object-cover"
   />

   {/* Main Content */}
   <div className="flex flex-col md:flex-row items-center justify-between px-5 md:px-24 relative z-50 text-center md:text-left">
    <div className="max-w-lg md:max-w-2xl">
     <p className="text-sm md:text-base">
      Powered by | Office of the Campus Security and Safety Services
     </p>
     <h1 className="text-2xl md:text-4xl font-bold text-primary mt-2">
      Caraga State University Gate Pass Application
     </h1>
     <div className="h-2 bg-primary w-24 md:w-48 mt-4" />
     <p className="mt-4 text-base md:text-xl font-light">
      Convenient, Fast, and Secure – Get Your CSU Gate Pass Online with Just a
      Few Clicks and Save Time Without the Hassle of Manual Applications.
     </p>
     <div className="mt-6 md:mt-10">
      <button
       onClick={() => nav("/role")}
       className="bg-primary text-white h-10 rounded-md px-4 text-sm md:text-base cursor-pointer hover:opacity-90 transition-opacity"
      >
       Get Started
      </button>
     </div>
    </div>
    <div className="mt-10 md:mt-0">
     <img src="/csu_logo.png" alt="" className="w-40 md:w-96" />
    </div>
   </div>
  </div>
 );
};
