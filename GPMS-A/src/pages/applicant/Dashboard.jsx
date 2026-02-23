import { useNavigate } from "react-router-dom";
import { ApplicantLayout } from "../../layouts/ApplicantLayout";
import { useState, useEffect } from "react";
import { ApplicationInfo } from "../../components/applicant/ApplicationInfo";
import { IoMdAdd } from "react-icons/io";
import { FaCheck, FaSpinner } from "react-icons/fa";
import { toast } from "sonner";
import { buildUrl } from "../../utils/buildUrl";

export const Dashboard = () => {
 const nav = useNavigate();
 const [myApplication, setMyApplication] = useState(true);
 const [mySubmission, setMySubmission] = useState(false);
 const [selectedApplications, setSelectedApplications] = useState([]);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [refreshTrigger, setRefreshTrigger] = useState(0);

 useEffect(() => {
  // Reset selected applications when switching tabs
  setSelectedApplications([]);
 }, [myApplication, mySubmission]);

 const handleApplication = () => {
  setMyApplication(true);
  setMySubmission(false);
 };

 const handleSubmission = () => {
  setMySubmission(true);
  setMyApplication(false);
 };

 // Function to trigger a refresh of application data
 const triggerRefresh = () => {
  setRefreshTrigger((prev) => prev + 1);
 };

 // Submit selected applications
 const submitSelectedApplications = async () => {
  if (selectedApplications.length === 0) {
   toast.error("Please select at least one application to submit");
   return;
  }

  try {
   setIsSubmitting(true);
   const formData = new FormData();

   // Join all selected application IDs with comma
   const applicationIdsString = selectedApplications.join(",");
   formData.append("application_ids", applicationIdsString);

   const response = await fetch(
    buildUrl("/applicant/applications/submit-pending"),
    {
     method: "POST",
     headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
     body: formData,
    }
   );

   if (!response.ok) {
    throw new Error("Failed to submit applications");
   }

   toast.success("Applications submitted successfully");
   // Clear selections and trigger refresh
   setSelectedApplications([]);
   triggerRefresh();

   // After a successful submission, switch to the Submitted tab
   setTimeout(() => {
    handleSubmission();
   }, 1000);
  } catch (error) {
   console.error("Error submitting applications:", error);
   toast.error("Failed to submit applications. Please try again.");
  } finally {
   setIsSubmitting(false);
  }
 };

 // Handle selected applications change from child component
 const handleSelectedApplicationsChange = (selectedIds) => {
  setSelectedApplications(selectedIds);
 };

 return (
  <>
   <ApplicantLayout>
    {/* Applications section */}
    <div className="">
     <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
       {myApplication && selectedApplications.length > 0 && (
        <button
         onClick={submitSelectedApplications}
         disabled={isSubmitting}
         className={`px-4 py-2 rounded-md text-white ${
          isSubmitting
           ? "bg-primary/50 cursor-not-allowed"
           : "bg-primary hover:bg-primary/90"
         } transition-colors flex items-center gap-2`}
        >
         {isSubmitting ? (
          <>
           <FaSpinner className="animate-spin" size={14} />
           Submitting...
          </>
         ) : (
          <>
           <FaCheck size={14} />
           Submit Selected ({selectedApplications.length})
          </>
         )}
        </button>
       )}
      </div>
     </div>
     <ApplicationInfo
      refreshTrigger={refreshTrigger}
      onSlipUploaded={triggerRefresh}
     />
    </div>
   </ApplicantLayout>
  </>
 );
};
