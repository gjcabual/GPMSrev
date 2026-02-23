import React, { useEffect, useState } from "react";
import { BiChevronLeft } from "react-icons/bi";
import { IoMenu } from "react-icons/io5";
import { IoMdAdd } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { buildUrl } from "../utils/buildUrl";
import { GatePassRulesRegulations } from "./applicant/GatePassRulesRegulations";

export const Header = ({ isSidebarOpen, setIsSidebarOpen }) => {
 const [date, setDate] = useState(new Date());
 const [profile, setProfile] = useState(null);
 const [loading, setLoading] = useState(true);
 const [terms, setTerms] = useState(false);
 const nav = useNavigate();

 const path = window.location.pathname;
 const segments = path.split("/").filter(Boolean);
 const role =
  segments[0] === "admin"
   ? "admin"
   : segments[0] === "staff"
   ? "staff"
   : "applicant";

 // Fetch profile information
 useEffect(() => {
  const fetchProfile = async () => {
   try {
    setLoading(true);
    const response = await fetch(buildUrl("/profile"), {
     method: "GET",
     headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    });

    if (!response.ok) {
     throw new Error("Failed to fetch profile");
    }

    const data = await response.json();
    setProfile(data);
   } catch (error) {
    console.error("Error fetching profile:", error);
   } finally {
    setLoading(false);
   }
  };

  fetchProfile();
 }, []);

 useEffect(() => {
  setDate(new Date()); // Set the date when the component mounts
 }, []);

 const getDayOfWeek = () => {
  const days = [
   "Sunday",
   "Monday",
   "Tuesday",
   "Wednesday",
   "Thursday",
   "Friday",
   "Saturday",
  ];
  return days[date.getDay()];
 };

 // Format user's full name
 const getFullName = () => {
  if (!profile) return "";
  return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
 };

 // Get initials for avatar fallback
 const getInitials = () => {
  if (!profile) return "";
  const first = profile.first_name?.[0] || "";
  const last = profile.last_name?.[0] || "";
  return (first + last).toUpperCase();
 };

 return (
  <div className="w-full bg-white text-primary p-2 sm:p-3 md:p-4 shadow-sm">
   <div className="flex items-center justify-between gap-2 sm:gap-4">
    {/* Left Side: Profile and Name */}
    <div className="flex items-center gap-1.5 sm:gap-2">
     {/* Sidebar Toggle Button (Mobile Only) */}
     <button
      onClick={() => setIsSidebarOpen((prev) => !prev)}
      className={`md:hidden ${
       isSidebarOpen ? "hidden" : "block"
      } p-1.5 sm:p-2 bg-primary text-white rounded-lg`}
     >
      <BiChevronLeft size={20} className="sm:w-6 sm:h-6" />
     </button>

     {/* Profile Picture and Name */}
     <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white text-xs sm:text-sm font-semibold">
      {profile?.has_image && profile?.image_url ? (
       <img
        src={buildUrl(`${profile.image_url}?t=${Date.now()}`)}
        alt="Profile"
        className="h-full w-full object-cover"
        onError={(e) => {
         e.target.style.display = "none";
         e.target.parentElement.innerHTML = getInitials();
        }}
       />
      ) : (
       getInitials()
      )}
     </div>
     <h1 className="font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-[200px]">
      {loading ? "Loading..." : getFullName()}
     </h1>
    </div>

    {/* Right Side: Date and Day or New Application button */}
    <div>
     {role === "applicant" ? (
      <button
       onClick={() => setTerms(true)}
       className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 bg-primary text-white text-xs sm:text-sm rounded-md hover:bg-primary/90 transition-colors"
      >
       <IoMdAdd size={16} className="sm:w-5 sm:h-5" />
       <span className="hidden sm:inline">New Application</span>
       <span className="sm:hidden">New</span>
      </button>
     ) : (
      <span className="text-xs sm:text-sm">
       <span className="hidden sm:inline">{getDayOfWeek()} | </span>
       {date.toLocaleDateString()}
      </span>
     )}
     {terms && <GatePassRulesRegulations close={() => setTerms(false)} />}
    </div>
   </div>
  </div>
 );
};


