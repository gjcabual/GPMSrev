import { useLocation } from "react-router-dom";
import { ApplicationReview as ApplicationReviewComponent } from "../../components/applicant/ApplicationReview";

export const ApplicationReview = () => {
 const location = useLocation();
 const isFromLog = location.state?.isFromLog || false;
 const isFromApplication = location.state?.isFromApplication || false;

 return (
  <ApplicationReviewComponent
   isFromLog={isFromLog}
   isFromApplication={isFromApplication}
  />
 );
};
