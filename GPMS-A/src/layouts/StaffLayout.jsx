import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";

export const StaffLayout = ({ children }) => {
 return (
  <>
   <div>
    <div className="flex items-start">
     <Sidebar />
     <div className="ml-[220px] w-full overlfow-y-auto">
      <Header />
      <div className="m-[30px]">{children}</div>
     </div>
    </div>
   </div>
  </>
 );
};
