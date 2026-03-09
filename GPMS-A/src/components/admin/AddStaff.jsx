import { useState } from "react";
import { IoCloseCircle } from "react-icons/io5";
import { SuccessModal } from "../response/ResponseModal";
import { buildUrl } from "../../utils/buildUrl";
import { toast } from "sonner";

export const AddStaff = ({ close }) => {
 const [success, setSuccess] = useState(false);
 const [firstName, setFirstName] = useState("");
 const [lastName, setLastName] = useState("");
 const [email, setEmail] = useState("");
 const [contact_no, setContactNo] = useState("");
 const [birthDate, setBirthDate] = useState("");
 const [sex, setSex] = useState("");
 const [address, setAddress] = useState("");

 const formData = new FormData();
 formData.append("first_name", firstName);
 formData.append("last_name", lastName);
 formData.append("email", email);
 formData.append("contact_no", contact_no);
 formData.append("birth_date", birthDate);
 formData.append("sex", sex), formData.append("address", address);

 const handleCreate = async () => {
  try {
   const res = await fetch(buildUrl("/admin/register"), {
    method: "POST",
    headers: {
     Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
   });
   const data = await res.json();
   console.log(data);
   if (res.ok) {
    toast.success("Staff has been created successfully!");
    setSuccess(true);
    setTimeout(() => {
     setSuccess(false);
     close(false);
     window.location.reload();
    }, [4000]);
   } else {
    toast.error(data.detail);
   }
  } catch (err) {
   console.log(err);
   toast.error("An error occurred, please try again later!");
  }
 };

 return (
  <>
   <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center z-50">
    <div className="bg-white w-[650px] rounded-2xl shadow-xl transform transition-all relative p-8">
     <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-primary">Create Staff</h1>
      <IoCloseCircle
       onClick={() => close(false)}
       size={26}
       className="text-red-500 cursor-pointer"
      />
     </div>
     <div className="mt-5 space-y-5">
      <div className="flex items-center gap-3">
       <div className="flex flex-col gap-1 w-full">
        <label htmlFor="">First Name</label>
        <input
         type="text"
         value={firstName}
         onChange={(e) => setFirstName(e.target.value)}
         className="h-10 px-4 border border-primary text-sm outline-none rounded-md"
        />
       </div>
       <div className="flex flex-col gap-1 w-full">
        <label htmlFor="">Last Name</label>
        <input
         type="text"
         value={lastName}
         onChange={(e) => setLastName(e.target.value)}
         className="h-10 px-4 border border-primary text-sm outline-none rounded-md"
        />
       </div>
      </div>
      <div className="flex items-center gap-3">
       <div className="flex flex-col gap-1 w-full">
        <label htmlFor="">Email</label>
        <input
         type="email"
         value={email}
         onChange={(e) => setEmail(e.target.value)}
         className="h-10 px-4 border border-primary text-sm outline-none rounded-md"
         placeholder="Enter email address"
        />
       </div>
       <div className="flex flex-col gap-1 w-full">
        <label htmlFor="">Brith Date</label>
        <input
         type="date"
         value={birthDate}
         onChange={(e) => setBirthDate(e.target.value)}
         className="h-10 px-4 border border-primary text-sm outline-none rounded-md"
        />
       </div>
      </div>
      <div className="flex items-center gap-3">
       <div className="flex flex-col gap-1 w-full">
        <label htmlFor="">Contact Number</label>
        <input
         type="number"
         value={contact_no}
         onChange={(e) => setContactNo(e.target.value)}
         className="h-10 px-4 border border-primary text-sm outline-none rounded-md"
        />
       </div>
       <div className="flex flex-col gap-1 w-full">
        <label htmlFor="">Address</label>
        <input
         type="text"
         value={address}
         onChange={(e) => setAddress(e.target.value)}
         className="h-10 px-4 border border-primary text-sm outline-none rounded-md"
        />
       </div>
      </div>
      <div>
       <label htmlFor="">Gender</label>
       <div className="flex items-center gap-3">
        <label className="flex items-center gap-1">
         <input
          type="radio"
          name="sex"
          value="MALE"
          checked={sex === "MALE"}
          onChange={(e) => setSex(e.target.value)}
         />
         Male
        </label>
        <label className="flex items-center gap-1">
         <input
          type="radio"
          name="sex"
          value="FEMALE"
          checked={sex === "FEMALE"}
          onChange={(e) => setSex(e.target.value)}
         />
         Female
        </label>
       </div>
      </div>

      <div className="mt-10 flex items-end justify-end">
       <button
        onClick={handleCreate}
        className="h-10 bg-primary rounded-md px-4 text-white"
       >
        Create
       </button>
       {success && (
        <SuccessModal
         desc={"Staff has been created successfully!"}
         close={() => setSuccess(false)}
        />
       )}
      </div>
     </div>
    </div>
   </div>
  </>
 );
};
