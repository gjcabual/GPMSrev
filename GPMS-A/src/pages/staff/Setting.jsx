import { ProfileContent } from "../../components/profile/ProfileContent";
import { StaffLayout } from "../../layouts/StaffLayout";

export const Setting = () => {
 return (
  <>
   <StaffLayout>
    <div>
     <h1 className="text-2xl font-semibold">Profile</h1>
    </div>
    <div className="mt-10">
     <ProfileContent />
    </div>
   </StaffLayout>
  </>
 );
};
