import { useEffect, useState } from "react";
import { SuccessModal } from "../../components/response/ResponseModal";
import { buildUrl } from "../../utils/buildUrl";
import { toast } from "sonner";

export const BatchSticker = ({ close }) => {
 const [register, setRegister] = useState(false);
 const [batches, setBatches] = useState([]);
 const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Default to current year

 const getBatchStickers = async () => {
  try {
   const res = await fetch(
    buildUrl(`/admin/admin/batch-stickers?year=${selectedYear}`),
    {
     method: "GET",
     headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    }
   );
   const data = await res.json();
   console.log(data);
   if (res.ok) {
    setBatches(data.batches);
   }
  } catch (err) {
   console.log(err);
   toast.error("Failed to fetch batch stickers.");
  }
 };

 useEffect(() => {
  getBatchStickers();
 }, [selectedYear]); // Fetch stickers whenever the selected year changes

 return (
  <>
   {!register ? (
    <div>
     {" "}
     <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Batch Sticker</h1>
      <div className="flex items-center gap-3">
       <button
        onClick={() => close()}
        className="h-10 bg-primary text-white rounded-md px-4"
       >
        Back
       </button>

       <button
        onClick={() => setRegister(true)}
        className="h-10 bg-primary text-white rounded-md px-4"
       >
        Register
       </button>
      </div>
     </div>
     {/* Year Filter */}
     <div className="mt-10 flex justify-end">
      <div className="flex items-center gap-1">
       <label className="mr-2">Select Year:</label>
       <select
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        className="h-8 px-8 bg-gray-100 rounded-lg text-xs"
       >
        {/* Generate options for the last 5 years and the current year */}
        {[...Array(6)].map((_, index) => {
         const year = new Date().getFullYear() - index;
         return (
          <option key={year} value={year}>
           {year}
          </option>
         );
        })}
       </select>
      </div>
     </div>
     <div className="mt-10">
      {batches.length === 0 ? (
       <div className="text-center text-gray-500">
        There are no Gate Pass Sticker Batches yet.
       </div>
      ) : (
       batches.map((data, index) => (
        <div key={index} className="">
         {/* Batch Header with Divider */}
         <div className="flex items-center gap-2 mt-5">
          <h1 className="shrink-0 text-lg font-medium text-gray-500">
           Batch {data?.batch_no}
          </h1>
          <hr className="flex-grow bg-gray-200 h-[1px] border-0" />
         </div>

         {/* Batch Details Grid */}
         <div className="grid grid-cols-2 gap-5 rounded-md mt-4 mx-32">
          {/* Employee */}
          <div className="p-4 border border-gray-300 rounded-lg flex items-center justify-between relative">
           <div className="bg-green-500 w-[15px] h-full rounded-l-lg absolute left-0" />
           <p className="px-4 text-sm font-medium text-gray-500">Employee</p>
           <p className="text-sm font-medium text-gray-400">
            {data?.employee?.start_at} - {data?.employee?.end_at}
           </p>
          </div>

          {/* Dropoff */}
          <div className="p-4 border border-gray-300 rounded-lg flex items-center justify-between relative">
           <div className="bg-violet-500 w-[15px] h-full rounded-l-lg absolute left-0" />
           <p className="px-4 text-sm font-medium text-gray-500">Dropoff</p>
           <p className="text-sm font-medium text-gray-400">
            {data?.dropoff?.start_at} - {data?.dropoff?.end_at}
           </p>
          </div>

          {/* Concessionaire */}
          <div className="p-4 border border-gray-300 rounded-lg flex items-center justify-between relative">
           <div className="bg-orange-500 w-[15px] h-full rounded-l-lg absolute left-0" />
           <p className="px-4 text-sm font-medium text-gray-500">
            Concessionaire
           </p>
           <p className="text-sm font-medium text-gray-400">
            {data?.concessionaire?.start_at} - {data?.concessionaire?.end_at}
           </p>
          </div>

          {/* Student */}
          <div className="p-4 border border-gray-300 rounded-lg flex items-center justify-between relative">
           <div className="bg-red-500 w-[15px] h-full rounded-l-lg absolute left-0" />
           <p className="px-4 text-sm font-medium text-gray-500">Student</p>
           <p className="text-sm font-medium text-gray-400">
            {data?.student?.start_at} - {data?.student?.end_at}
           </p>
          </div>
         </div>
        </div>
       ))
      )}
     </div>
    </div>
   ) : (
    <BatchRegister
     close={() => setRegister(false)}
     getBatchStickers={getBatchStickers}
    />
   )}
  </>
 );
};

const BatchRegister = ({ close, getBatchStickers }) => {
 const [success, setSuccess] = useState(false);
 const [stickers, setStickers] = useState([
  { id: 1, title: "Employee", StartAt: "", EndAt: "", color: "#028B58" },
  { id: 2, title: "Dropoff", StartAt: "", EndAt: "", color: "#610187" },
  { id: 3, title: "Student", StartAt: "", EndAt: "", color: "#D6D148" },
  { id: 4, title: "Concessionaire", StartAt: "", EndAt: "", color: "#FE5F01" },
 ]);
 const [isChecked, setIsChecked] = useState(false);
 const [isCreating, setIsCreating] = useState(false);

 // Fetch recommendations for autofilling
 const fetchRecommendations = async () => {
  try {
   const res = await fetch(
    buildUrl("/admin/admin/batch-stickers/recommendations"),
    {
     method: "GET",
     headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
     },
    }
   );
   const data = await res.json();

   if (res.ok && data.success) {
    // Update the stickers state with recommendations
    setStickers((prevStickers) =>
     prevStickers.map((sticker) => ({
      ...sticker,
      StartAt: data.recommendations[sticker.title.toLowerCase()] || "",
     }))
    );
   } else {
    toast.error("Failed to fetch recommendations.");
   }
  } catch (err) {
   console.error(err);
   toast.error("An error occurred while fetching recommendations.");
  }
 };

 // Fetch recommendations when the component mounts
 useEffect(() => {
  fetchRecommendations();
 }, []);

 // Handle input change
 const handleInputChange = (id, field, value) => {
  setStickers((prev) =>
   prev.map((sticker) =>
    sticker.id === id ? { ...sticker, [field]: value } : sticker
   )
  );
 };

 const handleCreateSticker = async () => {
  if (!isChecked) {
   toast.error(
    "Please confirm that the data entered is accurate and complete."
   );
   return;
  }

  // Check if at least one sticker has valid StartAt and EndAt values
  const hasValidSticker = stickers.some(
   (sticker) => sticker.StartAt && sticker.EndAt
  );

  if (!hasValidSticker) {
   toast.error(
    "Please enter valid Start At and End At values for at least one sticker."
   );
   return;
  }

  setIsCreating(true);

  try {
   const formData = new FormData();

   stickers.forEach((data) => {
    const keyPrefix = data.title.toLowerCase().replace(/\s+/g, "_");
    formData.append(`${keyPrefix}_start_at`, data.StartAt);
    formData.append(`${keyPrefix}_end_at`, data.EndAt);
   });

   const res = await fetch(buildUrl("/admin/admin/batch-stickers"), {
    method: "POST",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    body: formData,
   });

   const data = await res.json();
   console.log(data);

   if (res.ok) {
    toast.success("Sticker batch has been successfully added.");
    await getBatchStickers(); // Refresh the batch stickers after successful addition
    close();
   } else {
    toast.error(data.detail.message);
   }
  } catch (err) {
   console.error(err);
   toast.error("An error occurred, please try again later.");
  } finally {
   setIsCreating(false);
  }
 };

 return (
  <>
   <div className="flex items-start justify-between">
    <div className="flex flex-col gap-1 w-[500px]">
     <h1 className="text-2xl font-semibold">Add Batch Ticket Number</h1>
     <p className="text-sm font-medium text-gray-500">
      Please enter the batch number for each sticker generated to ensure proper
      tracking and organization.
     </p>
    </div>
    <button
     onClick={close}
     className="h-10 bg-primary text-white rounded-md px-4"
    >
     Back
    </button>
   </div>

   <div className="mt-10 grid grid-cols-4 gap-5 mx-32 bg-gray-100 p-8 rounded-md">
    {stickers.map((data) => (
     <div key={data?.id} className="bg-white border border-gray-200 rounded-md">
      <div style={{ backgroundColor: data.color }} className="p-4 rounded-md">
       <h1 className="text-lg font-medium text-white">{data?.title}</h1>
      </div>
      <div className="p-4 space-y-5 mt-3">
       <div className="flex flex-col gap-2">
        <label>Start At: </label>
        <input
         type="number"
         className="h-10 border border-gray-300 px-4 rounded-md"
         value={data?.StartAt}
         onChange={(e) => handleInputChange(data.id, "StartAt", e.target.value)}
        />
       </div>
       <div className="flex flex-col gap-2">
        <label>End At: </label>
        <input
         type="number"
         className="h-10 border border-gray-300 px-4 rounded-md"
         value={data?.EndAt}
         onChange={(e) => handleInputChange(data.id, "EndAt", e.target.value)}
        />
       </div>
      </div>
     </div>
    ))}
   </div>

   <div className="mt-10 flex flex-col items-center justify-center">
    <div className="flex gap-1 items-center">
     <input
      type="checkbox"
      className="border border-primary outline-none"
      checked={isChecked}
      onChange={() => setIsChecked(!isChecked)}
     />
     <label className="text-sm font-medium text-gray-500">
      I confirm that I have reviewed and agree that the data entered is accurate
      and complete.
     </label>
    </div>
    <div className="mt-5">
     <button
      onClick={handleCreateSticker}
      className={`h-10 bg-primary text-white rounded-md px-4 font-medium cursor-pointer ${
       !isChecked || isCreating ? "opacity-50 cursor-not-allowed" : ""
      }`}
      disabled={!isChecked || isCreating}
     >
      Register
     </button>
     {success && (
      <SuccessModal
       desc="Sticker batch has been successfully added."
       close={() => setSuccess(false)}
      />
     )}
    </div>
   </div>
  </>
 );
};
