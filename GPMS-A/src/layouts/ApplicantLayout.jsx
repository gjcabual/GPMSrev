import { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";

export const ApplicantLayout = ({ children }) => {
 const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State to manage sidebar visibility

 return (
  <>
   <div className="min-h-screen flex flex-col overflow-hidden">
    {/* Sidebar - Z-index ensures it appears above content on mobile */}
    <Sidebar
     isSidebarOpen={isSidebarOpen}
     setIsSidebarOpen={setIsSidebarOpen}
    />

    {/* Main Content - No conditional margin on mobile */}
    <div className="flex-1 transition-all duration-300 md:ml-[220px]">
     {/* Header */}
     <Header
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
     />

     {/* Page Content */}
     <div className="m-4 md:m-[30px] flex-1 overflow-auto">{children}</div>
    </div>
   </div>
  </>
 );
};
