"use client"

import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

import { loginUser } from "../redux/slice/loginSlice"
import { useMagicToast } from "../context/MagicToastContext"
import supabase from "../SupabaseClient"
import { sendPasswordResetOTP } from "../services/whatsappService"
import { KeyRound, ShieldCheck, User as UserIcon, ArrowLeft, RefreshCw, Smartphone } from "lucide-react"

const LoginPage = () => {
  const navigate = useNavigate()
  const { isLoggedIn, userData, error } = useSelector((state) => state.login);
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();

  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotStep, setForgotStep] = useState('username') // 'username', 'otp', 'reset'
  const [forgotData, setForgotData] = useState({
    username: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
    generatedOtp: ""
  })
  const [isForgotLoading, setIsForgotLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoginLoading(true);
    dispatch(loginUser(formData));
  };

  useEffect(() => {
    const handleLoginSuccess = async () => {
      if (isLoggedIn && userData) {
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
        localStorage.setItem('user-name', userData.user_name || userData.username || "");
        localStorage.setItem('user-id', userData.id || "");
        localStorage.setItem('role', userData.role || "");
        localStorage.setItem('email_id', userData.email_id || userData.email || "");
        localStorage.setItem('user_access', userData.user_access || "");
        localStorage.setItem('profile_image', userData.profile_image || "");
        localStorage.setItem('can_self_assign', userData.can_self_assign === true ? "true" : "false");
        localStorage.setItem('designation', designation);

        console.log("Stored email:", userData.email_id || userData.email); // Debug log

        showToast(`Welcome back, ${userData.user_name || userData.username}!`, "success");
        navigate("/dashboard/admin");
      } else if (error) {
        showToast(error, "error");
        setIsLoginLoading(false);
      }
    };

    handleLoginSuccess();
  }, [isLoggedIn, userData, error, navigate, showToast]);




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
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg animate-float">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-3">
              Master <span className="text-gradient">System</span>
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

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot Password?
              </button>
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


        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !isForgotLoading && setShowForgotModal(false)}></div>
            <div className="relative glass-effect rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/40">
              <div className="bg-gradient-to-br from-blue-50/50 to-white/50 px-6 py-8 text-center border-b border-white/20">
                <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                  {forgotStep === 'username' && <UserIcon className="text-white" size={28} />}
                  {forgotStep === 'otp' && <ShieldCheck className="text-white" size={28} />}
                  {forgotStep === 'reset' && <KeyRound className="text-white" size={28} />}
                </div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">
                  {forgotStep === 'username' && "Find Account"}
                  {forgotStep === 'otp' && "Verification"}
                  {forgotStep === 'reset' && "New Password"}
                </h3>
                <p className="text-gray-500 text-xs font-medium mt-1">
                  {forgotStep === 'username' && "Enter your username to begin"}
                  {forgotStep === 'otp' && "Enter the OTP sent to admin"}
                  {forgotStep === 'reset' && "Create a secure password"}
                </p>
              </div>

              <div className="px-8 py-8 space-y-5">
                {forgotStep === 'username' && (
                  <div className="space-y-5">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <UserIcon size={18} />
                      </div>
                      <input
                        type="text"
                        placeholder="Username"
                        value={forgotData.username}
                        onChange={(e) => setForgotData({ ...forgotData, username: e.target.value })}
                        className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!forgotData.username) return showToast("Please enter username", "error");
                        setIsForgotLoading(true);
                        try {
                          const { data, error } = await supabase.from('users').select('user_name').eq('user_name', forgotData.username).single();
                          if (error || !data) return showToast("User not found", "error");

                          const otp = Math.floor(100000 + Math.random() * 900000).toString();
                          await sendPasswordResetOTP(forgotData.username, otp);
                          setForgotData({ ...forgotData, generatedOtp: otp });
                          setForgotStep('otp');
                          showToast("OTP sent to Admin", "success");
                        } catch (err) {
                          showToast("Error processing request", "error");
                        } finally {
                          setIsForgotLoading(false);
                        }
                      }}
                      disabled={isForgotLoading}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20"
                    >
                      {isForgotLoading ? <RefreshCw className="animate-spin" size={18} /> : "Continue"}
                    </button>
                    <button onClick={() => setShowForgotModal(false)} className="w-full text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                  </div>
                )}

                {forgotStep === 'otp' && (
                  <div className="space-y-5">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                      <Smartphone className="text-blue-600 flex-shrink-0" size={18} />
                      <p className="text-[11px] text-blue-800 font-bold leading-tight">OTP sent to Admin (9691207533). Please collect it from them.</p>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="••••••"
                        value={forgotData.otp}
                        onChange={(e) => setForgotData({ ...forgotData, otp: e.target.value })}
                        className="w-full px-4 py-4 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center text-2xl tracking-[0.5em] font-black"
                        maxLength={6}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (forgotData.otp === forgotData.generatedOtp) {
                          setForgotStep('reset');
                        } else {
                          showToast("Invalid OTP", "error");
                        }
                      }}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                    >
                      Verify Code
                    </button>
                    <button onClick={() => setForgotStep('username')} className="w-full text-sm font-bold text-blue-600 flex items-center justify-center gap-1"><ArrowLeft size={14} /> Back</button>
                  </div>
                )}

                {forgotStep === 'reset' && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (forgotData.newPassword !== forgotData.confirmPassword) return showToast("Passwords don't match", "error");
                    if (forgotData.newPassword.length < 4) return showToast("Password too short", "error");

                    setIsForgotLoading(true);
                    try {
                      const { error } = await supabase.from('users').update({ password: forgotData.newPassword }).eq('user_name', forgotData.username);
                      if (error) throw error;
                      showToast("Password reset successfully!", "success");
                      setShowForgotModal(false);
                      setForgotStep('username');
                      setForgotData({ username: "", otp: "", newPassword: "", confirmPassword: "", generatedOtp: "" });
                    } catch (err) {
                      showToast("Error resetting password", "error");
                    } finally {
                      setIsForgotLoading(false);
                    }
                  }} className="space-y-4">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <KeyRound size={18} />
                      </div>
                      <input
                        type="password"
                        placeholder="New Password"
                        required
                        value={forgotData.newPassword}
                        onChange={(e) => setForgotData({ ...forgotData, newPassword: e.target.value })}
                        className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <ShieldCheck size={18} />
                      </div>
                      <input
                        type="password"
                        placeholder="Confirm Password"
                        required
                        value={forgotData.confirmPassword}
                        onChange={(e) => setForgotData({ ...forgotData, confirmPassword: e.target.value })}
                        className="w-full pl-11 pr-4 py-3.5 bg-white/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isForgotLoading}
                      className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                    >
                      {isForgotLoading ? <RefreshCw className="animate-spin" size={18} /> : "Update Password"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

    </div>
  )
}

export default LoginPage
