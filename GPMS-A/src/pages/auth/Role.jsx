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
   <div className="h-screen flex flex-col gap-10 justify-center items-center bg-gray-100">
    <img
     src="/main_logo.png"
     alt=""
     onClick={() => nav("/")}
     className="w-[300px] z-50 cursor-pointer"
    />
    <img
     src="/auth/bg_login.png"
     alt=""
     className="w-full h-full absolute opacity-50 "
    />
    <div className="w-[700px] h-auto rounded-xl bg-white z-50">
     <div className="h-[60px] bg-primary rounded-t-xl flex items-center justify-center">
      <p className="text-lg font-bold text-white">
       Caraga State University - Main Campus
      </p>
     </div>
     <div className="p-8">
      <p className="text-primary text-2xl font-medium">Select Role</p>
      <hr />
      <div className="mt-5">
       <p className="text-md font-medium">
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

       <div className="mt-10 flex items-center justify-between">
        <p className="text-sm text-gray-400 ">
         Copyright @ 2025 Caraga State University
        </p>
        <div className="flex items-center gap-4">
         <button onClick={() => nav("/")} className="cursor-pointer">Back</button>
         <button
          onClick={() => handleNav()}
          className="h-10 rounded-md px-4 text-white bg-primary"
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
