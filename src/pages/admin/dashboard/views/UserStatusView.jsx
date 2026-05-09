import React, { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { userDetails, updateUser } from "../../../../redux/slice/settingSlice"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  Plane, 
  Search, 
  Filter, 
  Edit,
  Mail,
  Phone,
  Building2,
  RefreshCw,
  Activity,
  X,
  CheckCircle2,
  AlertCircle,
  MapPin,
  PhoneCall,
  Clock
} from "lucide-react"

export default function UserStatusView() {
  const dispatch = useDispatch()
  const { userData, loading } = useSelector((state) => state.setting)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editFormData, setEditFormData] = useState({
    user_name: "",
    email_id: "",
    number: "",
    status: "active",
    department: ""
  })

  useEffect(() => {
    dispatch(userDetails())
  }, [dispatch])

  const handleEditClick = (user) => {
    setEditingUser(user)
    setEditFormData({
      user_name: user.user_name || "",
      email_id: user.email_id || "",
      number: user.number || "",
      status: user.status || "active",
      department: user.department || ""
    })
    setIsEditModalOpen(true)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    try {
      await dispatch(updateUser({ 
        id: editingUser.id, 
        updatedUser: editFormData 
      })).unwrap()
      setIsEditModalOpen(false)
      // Success logic could go here (e.g. toast)
    } catch (error) {
      console.error("Failed to update user:", error)
    }
  }

  // Get user info for filtering
  const userRole = (localStorage.getItem("role") || "").toLowerCase()
  const currentUserName = (localStorage.getItem("user-name") || "").toLowerCase()

  // Stats calculation
  const stats = {
    total: userData?.filter(u => u.user_name?.toLowerCase() === currentUserName).length || 0,
    active: userData?.filter(u => u.user_name?.toLowerCase() === currentUserName && u.status === 'active')?.length || 0,
    inactive: userData?.filter(u => u.user_name?.toLowerCase() === currentUserName && u.status === 'inactive')?.length || 0,
    onLeave: userData?.filter(u => u.user_name?.toLowerCase() === currentUserName && (u.status === 'on_leave' || u.status === 'on leave'))?.length || 0
  }

  // Filtered users
  const filteredUsers = userData?.filter(user => {
    // ALWAYS only show the logged-in user on the dashboard cards
    if (user.user_name?.toLowerCase() !== currentUserName) {
      return false;
    }

    const matchesSearch = 
      user.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    const matchesDept = deptFilter === "all" || user.department === deptFilter

    return matchesSearch && matchesStatus && matchesDept
  })

  const departments = [...new Set(userData?.map(u => u.department).filter(Boolean))]

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-100 shadow-sm shadow-emerald-50">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        )
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-rose-100 shadow-sm shadow-rose-50">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Offline
          </span>
        )
      case 'on_leave':
      case 'on leave':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-100 shadow-sm shadow-amber-50">
            <Plane className="w-3 h-3" />
            On Leave
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-wider rounded-full border border-gray-100 shadow-sm shadow-gray-50">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            {status || 'Unknown'}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 py-4">
      {/* Profile Display Section - Always full-page width now as it only shows 1 user */}
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="popLayout">
          {filteredUsers?.map((user, idx) => (
            <motion.div
              layout
              key={user.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: Math.min(idx * 0.1, 1), duration: 0.5 }}
              className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden group relative ${userRole !== 'admin' ? 'w-full' : ''}`}
            >
              {/* Profile Cover / Header */}
              <div className="h-28 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 relative overflow-hidden">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent animate-pulse" />
                <div className="absolute top-4 right-6">
                  {getStatusBadge(user.status)}
                </div>
              </div>
              
              <div className="px-8 pb-8">
                {/* Profile Photo - Overlapping */}
                <div className="relative -mt-14 mb-5 flex justify-between items-end">
                  <div className="relative group/avatar">
                    <div className="w-28 h-28 rounded-[1.8rem] bg-white p-1.5 shadow-xl ring-4 ring-white/50 overflow-hidden border border-gray-100">
                      <div className="w-full h-full rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-3xl font-bold text-blue-600 border border-gray-100 shadow-inner overflow-hidden">
                        {user.profile_image ? (
                          <img src={user.profile_image} alt={user.user_name} className="w-full h-full object-cover transform group-hover/avatar:scale-110 transition-transform duration-700" />
                        ) : (
                          user.user_name?.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 w-7 h-7 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-gray-50">
                      <div className={`w-3 h-3 rounded-full ${user.status === 'active' ? 'bg-emerald-500 animate-pulse' : user.status === 'inactive' ? 'bg-gray-300' : 'bg-amber-500'}`} />
                    </div>
                  </div>

                  <div className="flex gap-2 mb-2">
                    <button 
                      onClick={() => handleEditClick(user)}
                      className="p-3 rounded-2xl bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                    >
                      <Edit className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                {/* Profile Info */}
                <div className={userRole !== 'admin' ? "grid md:grid-cols-2 gap-10" : "space-y-6"}>
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                        {user.user_name}
                      </h2>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest rounded-full border border-blue-100">
                          {user.Designation || 'Team Member'}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 font-medium leading-relaxed italic">
                      &quot;Professional commitment to excellence in {user.department || 'the organization'}.&quot;
                    </p>

                    <div className="flex flex-wrap gap-5 pt-1.5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Department</span>
                        <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          {user.department || 'Not Assigned'}
                        </span>
                      </div>
                      <div className="w-px h-8 bg-gray-100 hidden sm:block" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Employee Status</span>
                        <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-500" />
                          On-Duty
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="p-5 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-3">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contact Information</h4>
                      
                      <div className="flex items-center gap-4 group/item">
                        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-gray-400 group-hover/item:text-blue-600 transition-colors shadow-sm">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-semibold text-gray-400 uppercase">Email</span>
                          <span className="text-xs font-semibold text-gray-700 truncate">{user.email_id || 'Not available'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 group/item">
                        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-gray-400 group-hover/item:text-blue-600 transition-colors shadow-sm">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-semibold text-gray-400 uppercase">Phone</span>
                          <span className="text-xs font-semibold text-gray-700">{user.number || 'No contact provided'}</span>
                        </div>
                      </div>
                    </div>

                    {userRole !== 'admin' && (
                      <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">Member Since</span>
                        <span className="text-[10px] font-bold text-gray-900 uppercase">Jan 2024</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Decorative bottom bar */}
              <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 opacity-20" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Edit Staff Member</h3>
                    <p className="text-gray-400 text-sm font-medium mt-1">Update profile and permissions</p>
                  </div>
                  <button 
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateUser} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        type="text"
                        value={editFormData.user_name}
                        onChange={(e) => setEditFormData({...editFormData, user_name: e.target.value})}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Number</label>
                      <input 
                        type="text"
                        value={editFormData.number}
                        onChange={(e) => setEditFormData({...editFormData, number: e.target.value})}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      type="email"
                      value={editFormData.email_id}
                      onChange={(e) => setEditFormData({...editFormData, email_id: e.target.value})}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                      <select 
                        value={editFormData.department}
                        onChange={(e) => setEditFormData({...editFormData, department: e.target.value})}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                      >
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
                      <select 
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="on_leave">On Leave</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-6 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {filteredUsers?.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-200">
          <div className="p-6 rounded-3xl bg-gray-50 mb-4">
            <Users className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">No staff members found</h3>
          <p className="text-gray-400 text-sm mt-2 font-medium">Try adjusting your filters or search terms.</p>
          <button 
            onClick={() => { setSearchQuery(""); setStatusFilter("all"); setDeptFilter("all"); }}
            className="mt-6 text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
      {/* Footer Section */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 max-w-4xl mx-auto w-full px-4 sm:px-0"
      >
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            {/* Location */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Corporate Office</h5>
                  <h4 className="text-sm font-bold text-gray-900 tracking-tight">Visit Us</h4>
                </div>
              </div>
              <p className="text-xs font-medium text-gray-500 leading-relaxed max-w-[260px]">
                6M84+9HF, New Dhamtari Rd, Pachpedi Naka, Raipur, Chhattisgarh 492001
              </p>
              <button 
                onClick={() => window.open('https://www.google.com/maps/dir/?api=1&destination=6M84%2B9HF,+New+Dhamtari+Rd,+Pachpedi+Naka,+Raipur,+Chhattisgarh+492001', '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-900 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                Get Directions
                <Activity className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Contact Support */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Support Line</h5>
                  <h4 className="text-sm font-bold text-gray-900 tracking-tight">Call Anytime</h4>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xl font-bold text-gray-900 tracking-tighter">084358 56151</p>
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[8px] font-bold uppercase tracking-widest">Available 24/7</span>
                </div>
              </div>
              <p className="text-[9px] font-medium text-gray-400">Our support team is ready to help you with any queries.</p>
            </div>

            {/* Store Hours */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-100">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Business Hours</h5>
                  <h4 className="text-sm font-bold text-gray-900 tracking-tight">Operation Time</h4>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Current Status</span>
                  <span className="text-xs font-bold text-gray-900 tracking-tighter">Closes 8:30 PM Today</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-bold uppercase tracking-widest rounded-full shadow-sm shadow-emerald-100">Open Now</span>
              </div>
            </div>
          </div>
        </div>

      </motion.footer>
    </div>
  )
}

