import { MdDashboard } from "react-icons/md";
import { MdPeople } from "react-icons/md";
import { RiPieChart2Fill } from "react-icons/ri";
import { FaClipboardList } from "react-icons/fa6";
import { IoMdSettings } from "react-icons/io";

export const adminData = [
 {
  id: 1,
  title: "Dashboard",
  icon: MdDashboard,
  link: "/admin/dashboard",
 },
 {
  id: 2,
  title: "Staff",
  icon: MdPeople,
  link: "/admin/staff",
 },
 {
  id: 3,
  title: "Reports",
  icon: RiPieChart2Fill,
  link: "/admin/report",
 },
 {
  id: 4,
  title: "Management",
  icon: FaClipboardList,
  link: "/admin/management",
 },
 {
  id: 5,
  title: "Settings",
  icon: IoMdSettings,
  link: "/admin/setting",
 },
];

export const staffData = [
 {
  id: 1,
  title: "Dashboard",
  icon: MdDashboard,
  link: "/staff/dashboard",
 },
 {
  id: 2,
  title: "Application",
  icon: FaClipboardList,
  link: "/staff/application",
 },
 {
  id: 3,
  title: "Reports",
  icon: RiPieChart2Fill,
  link: "/staff/report",
 },
 {
  id: 4,
  title: "Management",
  icon: FaClipboardList,
  link: "/staff/management",
 },
 {
  id: 5,
  title: "Settings",
  icon: IoMdSettings,
  link: "/staff/setting",
 },
];

export const applicantData = [
 {
  id: 1,
  title: "Applications",
  icon: MdDashboard,
  link: "/applicant/dashboard",
 },
 {
  id: 2,
  title: "History",
  icon: MdPeople,
  link: "/applicant/my-application",
 },
 {
  id: 3,
  title: "Profile",
  icon: FaClipboardList,
  link: "/applicant/profile",
 },
];
