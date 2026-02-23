import React, { useEffect, useState } from "react";

export const Overview = ({ data }) => {
 const [vehicleData, setVehicleData] = useState(null);
 const [pendingVehicles, setPendingVehicles] = useState([]);
 const [timeFilter, setTimeFilter] = useState("");
 const [searchQuery, setSearchQuery] = useState("");

 useEffect(() => {
  if (data) {
   setVehicleData(data.vehicle_counts || null);
   setPendingVehicles(data.pending_vehicles || []);
  }
 }, [data]);

 // Transform vehicle counts into displayable format
 const filteredVehicles = [];

 if (vehicleData?.data) {
  // Get all unique vehicle types from the data array (excluding 'Total' row)
  const vehicleTypes = vehicleData.data
   .filter((row) => row.role !== "Total")
   .reduce((acc, row) => {
    Object.keys(row).forEach((key) => {
     if (key !== "role" && key !== "Total") {
      acc.add(key);
     }
    });
    return acc;
   }, new Set());

  // Create entries for each vehicle type
  vehicleTypes.forEach((type) => {
   const total = vehicleData.summary.by_type[type] || 0;

   filteredVehicles.push({
    type: type,
    total: total,
    desc: `Total ${type.toLowerCase()}s`,
   });
  });

  // Add total vehicles count
  const totalVehicles = vehicleData.summary.total_vehicles || 0;

  filteredVehicles.push({
   type: "Total Vehicles",
   total: totalVehicles,
   desc: "All vehicle types combined",
  });
 }

 // Filtering pending vehicles based on search and time filter
 const addedVehicles = pendingVehicles.filter((vehicle) => {
  const matchesSearch = searchQuery
   ? vehicle.plate_number?.toLowerCase().includes(searchQuery.toLowerCase())
   : true;

  const matchesTimeFilter = timeFilter ? vehicle.time === timeFilter : true;

  return matchesSearch && matchesTimeFilter;
 });

 // Add this helper function before the return statement
 const formatTimeDisplay = (time) => {
  if (!time) return "0";
  // Extract only the number from strings like "9 days"
  return time.split(" ")[0];
 };

 return (
  <div className="flex items-start gap-5">
   {/* Total Vehicles Section */}
   <div className="w-[600px] h-[450px] border border-gray-100 shadow rounded-md p-8 flex flex-col">
    <h1 className="text-2xl font-semibold text-primary mb-5">Total Vehicles</h1>
    <div className="overflow-y-auto flex-1">
     {filteredVehicles.length > 0 ? (
      filteredVehicles.map((data, key) => (
       <div key={key} className="mb-5">
        <div className="flex items-center gap-3">
         {typeof data.total === "number" && data.total > 0 && (
          <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center">
           {data.total}
          </div>
         )}
         <div className="flex flex-col">
          <h1 className="text-lg font-medium text-primary">{data.type}</h1>
          <h1 className="text-sm font-light text-gray-500">{data.desc}</h1>
         </div>
        </div>
       </div>
      ))
     ) : (
      <p className="text-gray-500 text-center">No vehicles available.</p>
     )}
    </div>
   </div>

   {/* Pending Vehicles Section */}
   <div className="w-full h-[450px] border border-gray-100 shadow rounded-md p-8">
    <div>
     {/* Search and Filter */}
     <div className="mb-4 flex items-center gap-4">
      <input
       type="text"
       placeholder="Search plate number..."
       className="w-full p-2 border border-gray-300 rounded"
       value={searchQuery}
       onChange={(e) => setSearchQuery(e.target.value)}
      />
      <div className="flex gap-2">
       <select
        className="px-6 h-10 rounded bg-gray-200 text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
        onChange={(e) => setSearchQuery(e.target.value)}
       >
        <option value="">All Types</option>
        <option value="Car">Car</option>
        <option value="Tricycle">Tricycle</option>
        <option value="Truck">Truck</option>
        <option value="Motorcycle">Motorcycle</option>
       </select>
       <select
        className="px-10 h-10 rounded bg-gray-200 text-black border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
        value={timeFilter}
        onChange={(e) => setTimeFilter(e.target.value)}
       >
        <option value="">All Times</option>
        <option value="2 days">2 days</option>
        <option value="5 days">5 days</option>
        <option value="15 days">15 days</option>
        <option value="20 days">20 days</option>
        <option value="25 days">25 days</option>
        <option value="30 days">30 days</option>
        <option value="50 days">50 days</option>
       </select>
      </div>
     </div>

     {/* Pending Vehicles List */}
     <div className="h-[350px] relative">
      {/* Header Row - Fixed */}
      <div className="sticky top-0 z-10 bg-white px-4 h-[40px] rounded-md grid grid-cols-4 items-center gap-2 border-b border-gray-300 font-medium text-gray-600">
       <h1>Plate Number</h1>
       <h1>Vehicle Type</h1>
       <h1>Brand</h1>
       <h1>Days Submitted</h1>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[310px] space-y-3 mt-2">
       {addedVehicles.length > 0 ? (
        addedVehicles.map(
         (data, key) =>
          typeof data.plate_number === "string" &&
          typeof data.vehicle_type === "string" &&
          typeof data.brand === "string" &&
          typeof data.time === "string" && (
           <div
            key={key}
            className="px-4 h-[50px] rounded-md grid grid-cols-4 items-center gap-2 border border-gray-200 p-1 transition duration-200 hover:bg-gray-200"
           >
            <h1>{data.plate_number}</h1>
            <h1>{data.vehicle_type}</h1>
            <h1>{data.brand}</h1>
            <h1>{formatTimeDisplay(data.time)}</h1>
           </div>
          )
        )
       ) : (
        <p className="text-gray-500 text-center mt-5">No vehicles found.</p>
       )}
      </div>
     </div>
    </div>
   </div>
  </div>
 );
};
