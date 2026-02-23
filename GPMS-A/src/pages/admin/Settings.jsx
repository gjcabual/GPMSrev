import { ProfileContent } from "../../components/profile/ProfileContent";
import { AdminLayout } from "../../layouts/AdminLayout";

export const Settings = () => {
 return (
  <>
   <AdminLayout>
    <div>
     <h1 className="text-2xl font-semibold">Settings</h1>
    </div>
    <div className="mt-5">
     <ProfileContent />
    </div>
   </AdminLayout>
  </>
 );
};
