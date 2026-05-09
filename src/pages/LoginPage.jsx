"use client"

import { useState, useEffect, useRef } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { loginUser } from "../redux/slice/loginSlice"
import { useMagicToast } from "../context/MagicToastContext"
import { useAuth } from "../context/AuthContext"
import supabase from "../SupabaseClient"
import { KeyRound, User as UserIcon, RefreshCw } from "lucide-react"
import aceLogo from "../assets/Ace_Logoo.jpg"

const LoginPage = () => {
  const navigate = useNavigate()
  const { isLoggedIn, userData, error } = useSelector((state) => state.login);
  const { login } = useAuth();
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();
  const hasHandledSuccess = useRef(false);

  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })


  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoginLoading(true);
    dispatch(loginUser(formData));
  };

  useEffect(() => {
    const handleLoginSuccess = async () => {
      if (isLoggedIn && userData && !hasHandledSuccess.current) {
        hasHandledSuccess.current = true;
        console.log("User Data received:", userData); // Debug log

        let designation = userData.Designation || userData.designation || "";

        // If designation is missing, try fetching it explicitly
        if (!designation && userData.user_name) {
          try {
            const { data } = await supabase
              .from('users')
              .select('designation')
              .eq('user_name', userData.user_name || userData.username)
              .maybeSingle();
            if (data) {
              designation = data.Designation || "";
            }
          } catch (err) {
            console.error("Error fetching designation:", err);
          }
        }

        // Store all user data in localStorage
        const userName = userData.user_name || userData.username || "";
        const userRole = userData.role || "";
        const userEmail = userData.email_id || userData.email || "";
        const userId = userData.id || "";

        localStorage.setItem('user-name', userName);
        localStorage.setItem('user-id', userId);
        localStorage.setItem('role', userRole);
        localStorage.setItem('email_id', userEmail);
        localStorage.setItem('user_access', userData.user_access || "");
        localStorage.setItem('profile_image', userData.profile_image || "");
        localStorage.setItem('can_self_assign', userData.can_self_assign === true ? "true" : "false");
        localStorage.setItem('designation', designation);

        // Update AuthContext to prevent loop
        login({ 
          user_name: userName, 
          email_id: userEmail, 
          id: userId 
        }, userRole);

        console.log("Stored email:", userEmail); // Debug log

        showToast(`Welcome back, ${userName}!`, "success");
        navigate("/dashboard/admin");
      } else if (error) {
        showToast(error, "error");
        setIsLoginLoading(false);
      }
    };

    handleLoginSuccess();
  }, [isLoggedIn, userData, error, navigate, showToast, login]);




  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="pt-8 pb-4 px-6 text-center space-y-1">
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg animate-float">
              <img src={aceLogo} alt="Parekh Gallerium Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-3">
              Parekh <span className="text-gradient">Gallerium</span>
            </h1>
            <p className="text-gray-400 text-sm font-medium">Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wider">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                  <UserIcon size={16} />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="admin@example.com"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 focus:bg-white transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label htmlFor="password" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                  <KeyRound size={16} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 focus:bg-white transition-all text-sm font-medium"
                />
              </div>
            </div>


            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-base shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoginLoading ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a
            href="https://www.botivate.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-200/50 rounded-full text-gray-500 hover:text-gray-800 transition-all text-xs font-medium group"
          >
            Powered by <span className="font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Botivate</span>
          </a>
        </div>
      </div>


    </div>
  )
}

export default LoginPage
