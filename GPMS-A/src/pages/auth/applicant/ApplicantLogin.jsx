import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildUrl } from "../../../utils/buildUrl";
import { toast } from "sonner";
import { IoEyeOutline, IoEyeOffOutline } from "react-icons/io5";

export const ApplicantLogin = () => {
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Add this useEffect to check for saved credentials on component mount
    useEffect(() => {
        const savedCredentials = localStorage.getItem("savedApplicantCredentials");
        if (savedCredentials) {
            const { email: savedEmail, password: savedPassword } =
                JSON.parse(savedCredentials);
            setEmail(savedEmail);
            setPassword(savedPassword);
            setRememberMe(true);
        }
    }, []);

    const handleLogin = async () => {
        const formData = new FormData();
        formData.append("username", email);
        formData.append("password", password);
        try {
            const res = await fetch(buildUrl("/applicant/login"), {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                // Save credentials if remember me is checked
                if (rememberMe) {
                    localStorage.setItem(
                        "savedApplicantCredentials",
                        JSON.stringify({ email, password })
                    );
                } else {
                    localStorage.removeItem("savedApplicantCredentials");
                }

                localStorage.setItem("token", data.access_token);
                localStorage.setItem("full_name", data.full_name);
                toast.success("Login successful");
                setTimeout(() => {
                    nav("/applicant/dashboard");
                }, 1500);
            } else {
                toast.error(data.detail);
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    // Add this new function to handle key press
    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleLogin();
        }
    };

    return (
        <>
            <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gray-100 p-4 gap-4">
                {/* Logo */}
                <img
                    onClick={() => nav("/")}
                    src="/main_logo.png"
                    alt=""
                    className="w-48 md:w-[300px] z-50 cursor-pointer flex-shrink-0"
                />

                {/* Background Image */}
                <img
                    src="/auth/bg_login.png"
                    alt=""
                    className="w-full h-full absolute opacity-50 object-cover"
                />

                {/* Title */}
                <div>
                    <p className="text-lg md:text-xl font-semibold text-primary z-50">
                        -- APPLICANT ---
                    </p>
                </div>

                {/* Login Form */}
                <div className="w-full max-w-[500px] h-auto rounded-xl bg-white z-50 p-4 sm:p-6 md:p-8">
                    <h1 className="text-lg md:text-xl font-medium">Login</h1>
                    <div className="mt-4 flex flex-col gap-1">
                        <label htmlFor="login-as" className="text-sm text-gray-600">Login as</label>
                        <select
                            id="login-as"
                            value="applicant"
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === "staff") nav("/staff-login");
                                else if (v === "admin") nav("/admin-login");
                            }}
                            className="border border-gray-500 px-4 h-10 rounded-md outline-none text-sm font-medium cursor-pointer"
                        >
                            <option value="applicant">Applicant</option>
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div className="space-y-5 mt-5">
                        {/* Email Input */}
                        <div className="flex flex-col">
                            <label htmlFor="">Email</label>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="border border-gray-500 px-4 h-10 rounded-md outline-none"
                            />
                        </div>

                        {/* Password Input */}
                        <div className="flex flex-col">
                            <label htmlFor="">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    className="border border-gray-500 px-4 h-10 rounded-md outline-none w-full"
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent the button from stealing focus
                                        setShowPassword(!showPassword);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? (
                                        <IoEyeOffOutline size={20} />
                                    ) : (
                                        <IoEyeOutline size={20} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Remember Me and Forgot Password */}
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="cursor-pointer"
                            />
                            <label
                                htmlFor=""
                                className="text-sm cursor-pointer"
                                onClick={() => setRememberMe(!rememberMe)}
                            >
                                Remember me
                            </label>
                        </div>
                        <div>
                            <p
                                onClick={() => nav("/forgot-password")}
                                className="text-sm text-gray-500 font-medium cursor-pointer"
                            >
                                Forgot password?
                            </p>
                        </div>
                    </div>

                    {/* Login and Signup Buttons */}
                    <div className="mt-10 text-center flex flex-col gap-2">
                        <button
                            onClick={handleLogin}
                            className="w-full text-lg text-white bg-primary h-10 rounded-md cursor-pointer"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => nav("/applicant-signup")}
                            className="text-sm font-medium text-gray-500 cursor-pointer"
                        >
                            Don't have an account yet?{" "}
                            <span className="italic text-primary font-medium">Signup here</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
