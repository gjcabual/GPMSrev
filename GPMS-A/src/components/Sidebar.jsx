import { adminData, staffData, applicantData } from "../data/data";
import { IoLogOut, IoMenu, IoClose } from "react-icons/io5";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { buildUrl } from "../utils/buildUrl";
import { BiChevronRight } from "react-icons/bi";

export const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
 const location = useLocation();
 const path = location.pathname;

 const nav = useNavigate();
 const [isLoggingOut, setIsLoggingOut] = useState(false);

 const segments = useMemo(() => path.split("/").filter(Boolean), [path]);
 const role =
  segments[0] === "admin"
   ? "admin"
   : segments[0] === "staff"
   ? "staff"
   : "applicant";

 // Memoize menu items based on role
 const menuItems = useMemo(() => {
  return role === "admin"
   ? adminData
   : role === "staff"
   ? staffData
   : applicantData;
 }, [role]);

 const handleLogout = async () => {
  if (isLoggingOut) return;
  setIsLoggingOut(true);
  let keepLoading = false;
  try {
   const res = await fetch(buildUrl(`/logout`), {
    method: "POST",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
   });

   const data = await res.json();
   if (res.status === 401) {
    toast.error(data.detail || "Unauthorized");
   } else if (res.ok) {
    keepLoading = true;
    toast.success("Logout successful");
    localStorage.clear();
    setTimeout(() => {
     nav("/gpms");
    }, 3000);
   }
  } catch (err) {
   toast.error("An error occurred");
  } finally {
   if (!keepLoading) {
    setIsLoggingOut(false);
   }
  }
 };

 return (
  <>
   {/* Sidebar */}
   <div
    className={`fixed min-h-screen w-[220px] flex flex-col items-center bg-white shadow p-4 pb-6 transform transition-transform duration-300 ease-in-out z-[50] ${
     isSidebarOpen ? "translate-x-0" : "-translate-x-full"
    } md:translate-x-0`}
    style={{ height: "100vh", maxHeight: "-webkit-fill-available" }}
   >
    {/* Close Button - Positioned absolutely */}
    <button
     onClick={() => setIsSidebarOpen?.((prev) => !prev)}
     className={`absolute top-5 -right-4 md:hidden p-2 bg-primary text-white rounded-lg ${
      isSidebarOpen ? "block" : "hidden"
     }`}
    >
     <BiChevronRight size={24} />
    </button>

    {/* Logo */}
    <img src="/main_logo.png" alt="" className="w-[160px] mt-5 shrink-0" />

    {/* Menu Items */}
    <div className="mt-10 w-full flex-1 flex flex-col overflow-y-auto">
     <div className="h-[2px] bg-primary shrink-0" />
     <ul className="mt-10 flex-1">
      {menuItems.map((item) => {
       const isActive = path === item.link;
       return (
        <li key={item.id} className="mb-3">
         <Link
          to={item.link}
          className={`w-full flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
           isActive
            ? "bg-primary text-white"
            : "hover:bg-primary hover:text-white"
          }`}
         >
          <item.icon size={24} />
          <p className="text-md font-medium">{item.title}</p>
         </Link>
        </li>
       );
      })}
     </ul>
    </div>

    {/* Logout Button */}
    <div className="w-full mt-auto">
     <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`w-full bg-primary text-white rounded-md h-10 flex items-center justify-center gap-2 ${
       isLoggingOut ? "opacity-80 cursor-not-allowed" : "cursor-pointer"
      }`}
     >
      {isLoggingOut ? (
       <span className="inline-block h-4 w-4 rounded-full border-2 border-white/70 border-t-white animate-spin" />
      ) : (
       <IoLogOut size={20} />
      )}
      {isLoggingOut ? "Logging out..." : "Logout"}
     </button>
    </div>
   </div>
  </>
 );
};
