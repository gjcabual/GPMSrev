import { useNavigate } from "react-router-dom";
import { buildUrl } from "../../utils/buildUrl";
import { useState } from "react";
import { toast } from "sonner";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

export const Login = () => {
 const nav = useNavigate();
 const path = window.location.pathname;
 const segments = path.split("/").filter(Boolean);
 const role =
  segments[0] === "admin-login"
   ? "admin"
   : segments[0] === "staff-login"
   ? "staff"
   : "applicant";

 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [showPassword, setShowPassword] = useState(false);

 const handleLogin = async () => {
  try {
   const formData = new FormData();
   formData.append("username", email);
   formData.append("password", password);
   const res = await fetch(buildUrl(`/${role}/login`), {
    method: "POST",
    body: formData,
   });
   const data = await res.json();
   if (res.ok) {
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("full_name", data.full_name);
    localStorage.setItem("token_type", data.token_type);
    toast.success("Login successful");
    setTimeout(() => {
     nav(`/${role}/dashboard`);
    }, 1500);
   } else {
    toast.error(data.detail);
   }
  } catch (error) {
   toast.error("An error occurred");
  }
 };

 const handleKeyPress = (e) => {
  if (e.key === "Enter") {
   handleLogin();
  }
 };

 return (
  <>
   <div className="h-screen flex flex-col gap-5 justify-center items-center bg-gray-100">
    <img src="/main_logo.png" alt="" className="w-[300px] z-50" />
    <img
     src="/auth/bg_login.png"
     alt=""
     className="w-full h-full absolute opacity-50"
    />
    <div>
     <p className="text-xl font-semibold text-primary z-50">
      -- {role.toUpperCase()} ---
     </p>
    </div>
    <div className="w-[500px] h-auto rounded-xl bg-white z-50 p-8">
     <h1 className="text-xl font-medium">Login</h1>
     <div className="space-y-5 mt-5">
      <div className="flex flex-col">
       <label htmlFor="">Email</label>
       <input
        type="text"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyPress}
        className="border border-gray-500 px-4 h-10 rounded-md outline-none"
       />
      </div>
      <div className="flex flex-col">
       <label htmlFor="">Password</label>
       <div className="relative">
        <input
         type={showPassword ? "text" : "password"}
         value={password}
         onChange={(e) => setPassword(e.target.value)}
         onKeyDown={handleKeyPress}
         className="border border-gray-500 px-4 h-10 rounded-md outline-none w-full"
        />
        <button
         type="button"
         tabIndex={-1}
         onMouseDown={(e) => {
          e.preventDefault();
          setShowPassword(!showPassword);
         }}
         className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
         {showPassword ? (
          <IoEyeOffOutline size={20} />
         ) : (
          <IoEyeOutline size={20} />
         )}
        </button>
       </div>
      </div>
     </div>
     <div className="flex items-center justify-between mt-2">
      <div className="flex items-center gap-1">
       <input type="checkbox" />
       <label htmlFor="" className="text-sm">
        Remember me
       </label>
      </div>
      <div>
       <p
        onClick={() => nav("/forgot-password")}
        className="text-sm text-gray-500 font-medium cursor-pointer"
       >
        forgot password?{" "}
       </p>
      </div>
     </div>
     <div className="mt-10 text-center flex flex-col gap-2">
      <button
       onClick={() => nav(-1)}
       className="text-sm font-medium text-gray-500 cursor-pointer"
      >
       return to role selection
      </button>
      <button
       onClick={() => handleLogin()}
       className="w-full text-lg text-white bg-primary h-10 rounded-md cursor-pointer"
      >
       Login
      </button>
     </div>
    </div>
   </div>
  </>
 );
};
