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
  AlertCircle
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

  // Stats calculation
  const stats = {
    total: userData?.length || 0,
    active: userData?.filter(u => u.status === 'active')?.length || 0,
    inactive: userData?.filter(u => u.status === 'inactive')?.length || 0,
    onLeave: userData?.filter(u => u.status === 'on_leave' || u.status === 'on leave')?.length || 0
  }

  // Filtered users
  const filteredUsers = userData?.filter(user => {
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
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Staff', value: stats.total, icon: Users, color: 'indigo', gradient: 'from-indigo-500 to-blue-600' },
          { label: 'Active Now', value: stats.active, icon: UserCheck, color: 'emerald', gradient: 'from-emerald-500 to-teal-600' },
          { label: 'Offline', value: stats.inactive, icon: UserMinus, color: 'rose', gradient: 'from-rose-500 to-pink-600' },
          { label: 'On Leave', value: stats.onLeave, icon: Plane, color: 'amber', gradient: 'from-amber-400 to-orange-500' }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative overflow-hidden bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-[0.03] rounded-bl-[100px] transition-all group-hover:opacity-[0.05] group-hover:scale-110`} />
            
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
              </div>
              <div className={`p-4 rounded-2xl bg-gradient-to-tr ${stat.gradient} shadow-lg shadow-${stat.color}-200/50`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-1.5">
              <div className={`w-1 h-1 rounded-full bg-${stat.color}-500`} />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Live Status Update</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search by name, email or employee ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400 placeholder:font-medium"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-700 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
              <Filter className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select 
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-700 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
              >
                <option value="all">All Depts</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <Building2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <button 
          onClick={() => dispatch(userDetails())}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredUsers?.map((user, idx) => (
            <motion.div
              layout
              key={user.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: Math.min(idx * 0.05, 1) }}
              className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 transition-all duration-500 group relative overflow-hidden"
            >
              {/* Glow effect on hover */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="flex items-start justify-between mb-6">
                <div className="relative">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-xl font-black text-indigo-600 border border-gray-100 shadow-inner group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                    {user.profile_image ? (
                      <img src={user.profile_image} alt={user.user_name} className="w-full h-full object-cover" />
                    ) : (
                      user.user_name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-xl flex items-center justify-center shadow-md border border-gray-50">
                    <div className={`w-2.5 h-2.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500 animate-pulse' : user.status === 'inactive' ? 'bg-gray-300' : 'bg-amber-500'}`} />
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(user.status)}
                  <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">{user.employee_id || 'ID-NO'}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-black text-gray-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                    {user.user_name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1 text-indigo-500">
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-wider">{user.department || 'General'}</span>
                  </div>
                </div>

                <div className="space-y-2 py-4 border-y border-gray-50">
                  <div className="flex items-center gap-3 text-gray-500">
                    <Mail className="w-4 h-4 text-gray-300" />
                    <span className="text-xs font-bold truncate">{user.email_id || 'no-email@company.com'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500">
                    <Phone className="w-4 h-4 text-gray-300" />
                    <span className="text-xs font-bold">{user.number || 'No contact'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Designation</span>
                    <span className="text-xs font-black text-gray-700">{user.Designation || 'Staff Member'}</span>
                  </div>
                  <button 
                    onClick={() => handleEditClick(user)}
                    className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer shadow-sm hover:shadow-indigo-200"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
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
    </div>
  )
}

