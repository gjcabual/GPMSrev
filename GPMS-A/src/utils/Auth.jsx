export const AuthAdmin = ({ children }) => {
 const token = localStorage.getItem("token");

 const handleAuth = async () => {
  try {
   const res = await fetch(
    buildUrl("/authd", {
     method: "POST",
     headers: {
      Authorization: `Bearer ${token}`,
     },
    })
   );
   if (res.status === 200) {
    const data = await res.json();
    if (data.role === "admin") {
     return children;
    } else {
     toast.info("You are not authorized to access this page");
    }
   }
  } catch (err) {
   toast.info("An error occurred, please try again later");
  }
 };
 return <></>;
};

export const AuthStaff = ({ children }) => {
 const token = localStorage.getItem("token");

 const handleAuth = async () => {
  try {
   const res = await fetch(
    buildUrl("/authd", {
     method: "POST",
     headers: {
      Authorization: `Bearer ${token}`,
     },
    })
   );
   if (res.status === 200) {
    const data = await res.json();
    if (data.role === "staff") {
     return children;
    } else {
     toast.info("You are not authorized to access this page");
    }
   }
  } catch (err) {
   toast.info("An error occurred, please try again later");
  }
 };
 return <></>;
};

export const AuthApplicant = ({ children }) => {
 const token = localStorage.getItem("token");

 const handleAuth = async () => {
  try {
   const res = await fetch(
    buildUrl("/authd", {
     method: "POST",
     headers: {
      Authorization: `Bearer ${token}`,
     },
    })
   );
   if (res.status === 200) {
    const data = await res.json();
    if (data.role === "applicant") {
     return children;
    } else {
     toast.info("You are not authorized to access this page");
    }
   }
  } catch (err) {
   toast.info("An error occurred, please try again later");
  }
 };
 return <></>;
};
