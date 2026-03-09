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
 const [isLoading, setIsLoading] = useState(false);

 const handleLogin = async () => {
  if (isLoading) return;
  setIsLoading(true);
  let keepLoading = false;
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
    keepLoading = true;
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
  } finally {
   if (!keepLoading) {
    setIsLoading(false);
   }
  }
 };

 const handleKeyPress = (e) => {
  if (e.key === "Enter" && !isLoading) {
   handleLogin();
  }
 };

 return (
  <>
   <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gray-100 p-4 gap-4">
    <button
     type="button"
     onClick={() => nav("/")}
     className="z-50 flex-shrink-0 cursor-pointer"
     aria-label="Go to landing page"
    >
     <img src="/main_logo.png" alt="GatePass logo" className="w-48 md:w-[300px]" />
    </button>
    <img
     src="/auth/bg_login.png"
     alt=""
     className="w-full h-full absolute opacity-50 object-cover pointer-events-none"
    />
    <div className="z-50">
     <p className="text-lg md:text-xl font-semibold text-primary">
      -- {role.toUpperCase()} ---
     </p>
    </div>
    <div className="w-full max-w-[500px] h-auto rounded-xl bg-white z-50 p-4 sm:p-6 md:p-8">
     <h1 className="text-lg md:text-xl font-medium">Login</h1>
     <div className="mt-4 flex flex-col gap-1">
      <label htmlFor="login-as" className="text-sm text-gray-600">Login as</label>
      <select
       id="login-as"
       value={role}
       onChange={(e) => {
        const v = e.target.value;
        if (v === "applicant") nav("/applicant-login");
        else if (v === "staff") nav("/staff-login");
        else if (v === "admin") nav("/admin-login");
       }}
       className="border border-gray-500 px-4 h-10 rounded-md outline-none text-sm font-medium cursor-pointer"
      >
       <option value="applicant">Applicant</option>
       <option value="staff">Staff</option>
       <option value="admin">Admin</option>
      </select>
     </div>
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
     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 gap-2">
      <div className="flex items-center gap-1">
       <input type="checkbox" className="cursor-pointer" />
       <label htmlFor="" className="text-xs md:text-sm cursor-pointer">
        Remember me
       </label>
      </div>
      <div>
       <p
        onClick={() => nav("/forgot-password")}
        className="text-xs md:text-sm text-gray-500 font-medium cursor-pointer"
       >
        Forgot password?
       </p>
      </div>
     </div>
     <div className="mt-8 md:mt-10 text-center flex flex-col gap-2">
      <button
       onClick={() => handleLogin()}
       disabled={isLoading}
       className={`w-full text-base md:text-lg text-white bg-primary h-10 rounded-md transition-opacity flex items-center justify-center gap-2 ${
        isLoading
         ? "opacity-80 cursor-not-allowed"
         : "cursor-pointer hover:opacity-90"
       }`}
      >
       {isLoading && (
        <span className="inline-block h-4 w-4 rounded-full border-2 border-white/70 border-t-white animate-spin" />
       )}
       {isLoading ? "Logging in..." : "Login"}
      </button>
      {(role === "admin" || role === "staff") && (
       <p className="text-sm font-medium font-light text-gray-500">
        Don't have an account yet?{" "}
        <span
         onClick={() => nav("/applicant-signup")}
         className="italic text-primary font-medium cursor-pointer hover:underline"
        >
         Sign up here
        </span>
       </p>
      )}
     </div>
    </div>
   </div>
  </>
 );
};
