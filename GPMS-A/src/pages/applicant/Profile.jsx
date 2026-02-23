import { ProfileContent } from "../../components/profile/ProfileContent";
import { ApplicantLayout } from "../../layouts/ApplicantLayout";

export const Profile = () => {
 return (
  <>
   <ApplicantLayout>
    <div>
     <h1 className="text-2xl font-semibold">Profile</h1>
    </div>
    <div className="mt-5">
     <ProfileContent />
    </div>
   </ApplicantLayout>
  </>
 );
};
