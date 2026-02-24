import { useState } from "react";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";

export const StaffLayout = ({ children }) => {
 const [isSidebarOpen, setIsSidebarOpen] = useState(false);

 return (
  <>
   <div className="min-h-screen flex flex-col overflow-hidden">
    <Sidebar
     isSidebarOpen={isSidebarOpen}
     setIsSidebarOpen={setIsSidebarOpen}
    />
    <div className="flex-1 transition-all duration-300 md:ml-[220px]">
     <Header
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
     />
     <div className="m-4 md:m-[30px] flex-1 overflow-auto">{children}</div>
    </div>
   </div>
  </>
 );
};
