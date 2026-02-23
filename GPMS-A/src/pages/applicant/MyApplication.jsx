import { ApplicantLayout } from "../../layouts/ApplicantLayout";
import { ApplicationLog } from "../../components/applicant/ApplicationLog";
import { useEffect, useState, useCallback, useRef } from "react";
import { buildUrl } from "../../utils/buildUrl";

export const MyApplication = () => {
 const [data, setData] = useState([]);
 const [isLoading, setIsLoading] = useState(true);
 const [filters, setFilters] = useState({
  vehicle_type: "All",
  sticker_number: "",
  date: "",
 });

 // Use ref to track if it's the initial mount
 const isInitialMount = useRef(true);
 const filterTimeoutRef = useRef(null);

 const getApplicationLogs = useCallback(async (currentFilters) => {
  try {
   setIsLoading(true);
   const queryParams = new URLSearchParams();

   if (currentFilters.vehicle_type !== "All") {
    queryParams.append("vehicle_type", currentFilters.vehicle_type);
   }

   if (currentFilters.sticker_number) {
    queryParams.append("sticker_number", currentFilters.sticker_number);
   }

   if (currentFilters.date) {
    queryParams.append("date", currentFilters.date);
   }

   const res = await fetch(
    buildUrl(`/applicant/applications/approved?${queryParams.toString()}`),
    {
     method: "GET",
     headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    }
   );
   const data = await res.json();
   setData(data || []);
  } catch (err) {
   console.error("Error fetching application logs:", err);
   setData([]);
  } finally {
   setIsLoading(false);
  }
 }, []);

 // Handle filter changes from ApplicationLog component
 const handleFilterChange = useCallback(
  (newFilters) => {
   // Clear any existing timeout
   if (filterTimeoutRef.current) {
    clearTimeout(filterTimeoutRef.current);
   }

   // Update filters state immediately
   setFilters(newFilters);

   // Debounce the API call
   filterTimeoutRef.current = setTimeout(() => {
    getApplicationLogs(newFilters);
   }, 500);
  },
  [getApplicationLogs]
 );

 // Initial load
 useEffect(() => {
  if (isInitialMount.current) {
   getApplicationLogs(filters);
   isInitialMount.current = false;
  }
 }, [getApplicationLogs, filters]);

 // Cleanup
 useEffect(() => {
  return () => {
   if (filterTimeoutRef.current) {
    clearTimeout(filterTimeoutRef.current);
   }
  };
 }, []);

 return (
  <ApplicantLayout>
   <div className="">
    <ApplicationLog
     data={data}
     showFilters={true}
     onFilterChange={handleFilterChange}
     initialFilters={filters}
     isLoading={isLoading}
    />
   </div>
  </ApplicantLayout>
 );
};
