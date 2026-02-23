import { AddStaff } from "../../components/admin/AddStaff";
import { AdminLayout } from "../../layouts/AdminLayout";
import { FaCirclePlus } from "react-icons/fa6";
import { useEffect, useState } from "react";
import { DeleteStaff } from "../../components/admin/DeleteStaff";
import { FaTrash } from "react-icons/fa";
import { buildUrl } from "../../utils/buildUrl";
import { toast } from "sonner";

export const Staff = () => {
 const [addStaff, setAddStaff] = useState(false);
 const [deleteStaff, setDeleteStaff] = useState(false);
 const [data, setData] = useState([]);

 const getStaffs = async () => {
  try {
   const res = await fetch(buildUrl("/admin/admin/accounts"), {
    method: "GET",
    headers: {
     "Content-Type": "application/json",
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
   });
   const data = await res.json();
   if (res.ok) {
    setData(data.staffs);
    // setData([]);
   } else {
    toast.info(data.detail);
   }
  } catch (err) {
   console.log(err);
   toast.error("An error occurred, please try again later!");
  }
 };

 useEffect(() => {
  getStaffs();
 }, []);

 return (
  <>
   <AdminLayout>
    <div className="flex items-center justify-between">
     <h1 className="text-2xl font-semibold">Staff</h1>
     <button
      onClick={() => setAddStaff(true)}
      className="h-10 text-white bg-primary rounded-md px-4 flex items-center justify-between gap-2 text-sm cursor-pointer"
     >
      <FaCirclePlus size={16} /> Create Staff
     </button>
    </div>
    <div>
     {addStaff && <AddStaff close={setAddStaff} />}
     {deleteStaff && (
      <DeleteStaff
       staff={deleteStaff}
       staffId={deleteStaff.user_id}
       close={() => setDeleteStaff(false)}
       refreshData={getStaffs}
      />
     )}

     <div className="mt-10">
      <div className="overflow-x-auto w-full">
       <table className="w-full table-auto">
        <thead>
         <tr className="w-full bg-gray-100">
          <th className="text-left text-primary font-semibold w-1/6 p-2">
           No.
          </th>
          <th className="text-left text-primary font-semibold w-1/6 p-2">
           Name
          </th>
          <th className="text-left text-primary font-semibold w-1/6 p-2">
           Email
          </th>
          <th className="text-left text-primary font-semibold w-1/6 p-2">
           Date Created
          </th>
          <th className="text-left text-primary font-semibold w-1/6 p-2">
           Date Updated
          </th>
          <th className="text-left text-primary font-semibold w-1/6 p-2">
           Action
          </th>
         </tr>
        </thead>
       </table>
       <div className="mt-2">
        <hr className="border border-gray-200" />
       </div>
       <div className="mt-5">
        <table className="w-full">
         <tbody className="space-y-2">
          {data.map((staff, index) => (
           <tr
            key={index}
            className="hover:bg-gray-100 border border-gray-200 rounded-md"
           >
            <td className="w-1/6 p-2">{staff.position}</td>
            <td className="w-1/6 p-2">{staff.name}</td>
            <td className="w-1/6 p-2">{staff.email}</td>
            <td className="w-1/6 p-2">
             {new Date(staff.created_at).toLocaleString()}
            </td>
            <td className="w-1/6 p-2">
             {new Date(staff.updated_at).toLocaleString()}
            </td>
            <td className="w-1/6 p-2">
             <button
              onClick={() => setDeleteStaff(staff)}
              className="flex items-center gap-1 text-red-600 hover:text-red-800 transition duration-200 px-3 py-1 rounded-md"
             >
              <FaTrash size={14} />
              Delete
             </button>
            </td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
      </div>
      {data.length === 0 && (
       <div className="flex flex-col items-center">
        <img src="/loading/emptyList.jpg" alt="" className="w-[500px]" />
        <h1 className="text-gray-500 text-lg font-light">
         There are currently no staffs in this system, create one.
        </h1>
       </div>
      )}
     </div>
    </div>
   </AdminLayout>
  </>
 );
};
