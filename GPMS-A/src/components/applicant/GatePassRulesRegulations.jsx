import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

export const GatePassRulesRegulations = ({ close }) => {
 const nav = useNavigate();
 const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
 const contentRef = useRef(null);

 useEffect(() => {
  // Prevent scrolling on the body when modal is open
  document.body.style.overflow = "hidden";

  // Re-enable scrolling when modal is closed
  return () => {
   document.body.style.overflow = "unset";
  };
 }, []);

 const handleScroll = (e) => {
  const element = e.target;
  const reachedBottom =
   element.scrollHeight - element.scrollTop <= element.clientHeight + 5;

  setHasScrolledToBottom(reachedBottom);
 };

 // Check on initial render and after content loads
 useEffect(() => {
  if (contentRef.current) {
   const element = contentRef.current;
   const reachedBottom =
    element.scrollHeight - element.scrollTop <= element.clientHeight + 5;
   setHasScrolledToBottom(reachedBottom);
  }
 }, []);

 const handleAccept = () => {
  if (!hasScrolledToBottom) return;
  close();
  nav("/applicant/application");
 };

 return (
  <div
   className="fixed inset-0 z-[9999]"
   onClick={(e) => {
    if (e.target === e.currentTarget) {
     close();
    }
   }}
  >
   <div
    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
    aria-hidden="true"
   />
   <div className="fixed inset-0 flex items-center justify-center p-4">
    <div className="relative bg-white w-[90%] max-w-[600px] rounded-2xl shadow-xl">
     <div className="p-6">
      <h1 className="text-2xl font-semibold text-primary">
       GATE PASS STICKER APPLICANT'S PLEDGE
      </h1>
      <div
       ref={contentRef}
       onScroll={handleScroll}
       className="mt-4 max-h-[calc(80vh-12rem)] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100"
      >
       <p className="mb-2">In view of my application, I pledge to:</p>
       <ol className="list-decimal pl-8 space-y-2">
        <li>
         Ensure that my vehicle meets the exhaust emission requirements as
         certified by a government accredited emissions test center; and comply
         with periodic exhaust emission tests as may be required by the
         university during the school year;
        </li>
        <li>
         Ensure that a driver with a valid driver's license operates my vehicle;
        </li>
        <li>
         Instruct the driver to strictly observe Caraga State University rules
         and regulations; i.e. no blowing of horn, improper parking, parking in
         reserved slots and no parking areas, and observe the 15 km/h campus
         speed limit.
        </li>
        <li>
         The Vehicle Gate Pass sticker is non-transferrable and specifically for
         the vehicle applied for; and it must be displayed at the upper right
         portion of the windshield;
        </li>
        <li>
         Promptly pay the fine for traffic and parking violation I, or my
         authorized driver may commit;
        </li>
        <li>
         Notify the Campus Safety and Security Services Office of any:
         <ol className="list-[lower-alpha] pl-8 pt-2 space-y-1">
          <li>Change of license plate;</li>
          <li>Change of vehicle ownership; or</li>
          <li>Vehicle repair or alteration;</li>
         </ol>
        </li>
        <li>
         Face possible administrative or disciplinary sanctions in the unit
         concerned in the event of multiple offenses committed within the
         academic year;
        </li>
        <li>
         I won't allow my vehicle to carry/bring-out unauthorized items that
         belong to the University. I have read all the regulations and agree to
         comply with the same.
        </li>
       </ol>
      </div>
      <div className="mt-6 flex gap-3 justify-end border-t pt-4">
       <button
        onClick={close}
        className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
       >
        Cancel
       </button>
       <button
        onClick={handleAccept}
        disabled={!hasScrolledToBottom}
        className={`px-4 py-2 text-sm rounded-md ${
         hasScrolledToBottom
          ? "bg-primary text-white hover:bg-primary/90"
          : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
       >
        I Have Read and Agree to the Pledge
       </button>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
};
