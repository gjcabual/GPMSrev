import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const Role = () => {
 const [role, setRole] = useState("admin");
 const nav = useNavigate();

 const handleNav = () => {
  switch (role) {
   case "admin":
    nav("/admin-login");
    break;
   case "staff":
    nav("/staff-login");
    break;
   case "applicant":
    nav("/applicant-signup");
    break;
   default:
    break;
  }
 };

 return (
  <>
   <div className="min-h-screen flex flex-col gap-6 md:gap-10 justify-center items-center bg-gray-100 px-4 py-6 md:py-10">
    <img
     src="/main_logo.png"
     alt=""
     onClick={() => nav("/")}
     className="w-48 md:w-[300px] z-50 cursor-pointer flex-shrink-0"
    />
    <img
     src="/auth/bg_login.png"
     alt=""
     className="w-full h-full absolute opacity-50 object-cover pointer-events-none"
    />
    <div className="w-full max-w-[700px] h-auto rounded-xl bg-white z-50 shadow-sm">
     <div className="min-h-[56px] md:h-[60px] bg-primary rounded-t-xl flex items-center justify-center px-3 py-3 md:py-0">
      <p className="text-sm md:text-lg font-bold text-white text-center">
       Caraga State University - Main Campus
      </p>
     </div>
     <div className="p-4 sm:p-6 md:p-8">
      <p className="text-primary text-xl md:text-2xl font-medium">Select Role</p>
      <hr />
      <div className="mt-5">
       <p className="text-sm md:text-base font-medium">
        Please select role before logging in
       </p>
       <select
        name=""
        id=""
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="w-full px-4 border border-primary h-10 rounded mt-5 text-sm font-medium"
       >
        <option value="applicant">
         Applicant (Gate Pass)
        </option>
        <option value="admin">
         Office of the Security and Safety Services (Admin)
        </option>
        <option value="staff">
         Office of the Security and Safety Services (Staff)
        </option>
       </select>

       <div className="mt-8 md:mt-10 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <p className="text-xs md:text-sm text-gray-400 text-center sm:text-left">
         Copyright @ 2025 Caraga State University
        </p>
        <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto justify-center sm:justify-end">
         <button onClick={() => nav("/")} className="cursor-pointer px-4 py-2">Back</button>
         <button
          onClick={() => handleNav()}
          className="h-10 rounded-md px-4 text-white bg-primary cursor-pointer hover:opacity-90 transition-opacity min-w-[100px]"
         >
          Select
         </button>
        </div>
       </div>
      </div>
     </div>
    </div>
   </div>
  </>
 );
};
