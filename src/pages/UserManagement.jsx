import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, User, Building, X, Save, Edit, Trash2, Search, ChevronDown, Calendar, RefreshCw, Settings } from 'lucide-react';
import ERPLayout from '../components/layout/ERPLayout';
import { useDispatch, useSelector } from 'react-redux';
import { createUser, deleteUser, userDetails, updateUser, uploadProfileImage, departmentDetails, givenByDetails, customDropdownDetails } from '../redux/slice/settingSlice';
import { uploadPartImageApi } from '../redux/api/settingApi';

import supabase from '../SupabaseClient';
import CalendarComponent from '../components/CalendarComponent';
import { createPortal } from 'react-dom';
import { sendTaskReassignmentNotification } from '../services/whatsappService';
import { useMagicToast } from '../context/MagicToastContext';

const formatDateLong = (date) => date ? date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
const formatDateISO = (date) => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const UserManagement = () => {
  const userRole = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const { showToast } = useMagicToast();
  const [showUserModal, setShowUserModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [usernameFilter, setUsernameFilter] = useState('');
  const [usernameDropdownOpen, setUsernameDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastSyncError = useRef({ status: null, timestamp: 0 });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDeleteData, setUserToDeleteData] = useState({ id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);

  const { userData, department, departmentsOnly, givenBy, customDropdowns, loading, error } = useSelector((state) => state.setting);
  const dispatch = useDispatch();

  useEffect(() => {
    console.log("UserManagement Component - userData:", userData);
    if (userData && userData.length > 0) {
      console.log("Sample user object keys:", Object.keys(userData[0]));
    }
  }, [userData, loading, error]);


  const fetchDeviceLogsAndUpdateStatus = useCallback(async () => {
    // Set to true to enable background sync when the hardware API is online
    const ENABLE_DEVICE_SYNC = false;
    if (!ENABLE_DEVICE_SYNC) return;

    try {
      const now = Date.now();
      // Only sync once every 30 mins if we are in an error state
      if (lastSyncError.current.status === 400 && (now - lastSyncError.current.timestamp) < 30 * 60 * 1000) {
        return;
      }

      setIsRefreshing(true);
      const today = new Date().toISOString().split('T')[0];

      const urls = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`http://139.167.179.193:90/api/v2/WebAPI/GetDeviceLogs?APIKey=205511032522&SerialNumber=E03C1CB34D83AA02&FromDate=${today}&ToDate=${today}`)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`http://139.167.179.193:90/api/v2/WebAPI/GetDeviceLogs?APIKey=205511032522&SerialNumber=E03C1CB36042AA02&FromDate=${today}&ToDate=${today}`)}`
      ];

      let allLogs = [];
      let encountered400 = false;

      // Sequential fetch to isolate errors
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            const logs = await response.json();
            if (Array.isArray(logs)) allLogs = [...allLogs, ...logs];
          } else if (response.status === 400) {
            encountered400 = true;
          }
        } catch (e) {
          // Network errors are caught here
        }
      }

      // Back-off logic if entirely failing
      if (encountered400 && allLogs.length === 0) {
        lastSyncError.current = { status: 400, timestamp: now };
        return;
      }

      // Clear back-off if we got any data
      if (allLogs.length > 0 && lastSyncError.current.status === 400) {
        lastSyncError.current = { status: null, timestamp: 0 };
      }

      if (allLogs.length === 0) return;

      // Sort logs by date (latest first)
      allLogs.sort((a, b) => new Date(b.LogDate) - new Date(a.LogDate));

      const employeeStatus = {};
      allLogs.forEach(log => {
        const employeeCode = log.EmployeeCode;
        if (!employeeStatus[employeeCode]) {
          const punchDirection = log.PunchDirection?.toLowerCase();
          employeeStatus[employeeCode] = {
            status: punchDirection === 'in' ? 'active' : 'inactive'
          };
        }
      });

      const updatePromises = Object.entries(employeeStatus).map(async ([employeeCode, statusInfo]) => {
        if (!userData || !Array.isArray(userData)) return;
        const user = userData.find(u => u.employee_id === employeeCode);
        if (user && user.status !== statusInfo.status && user.status !== 'on leave' && user.status !== 'on_leave') {
          const { error } = await supabase
            .from('users')
            .update({ status: statusInfo.status })
            .eq('id', user.id);

          if (error) console.error(`Error updating status for ${user.user_name}:`, error);
        }
      });

      await Promise.all(updatePromises);
      dispatch(userDetails({ role: userRole, username }));
    } catch (error) {
      // Final catch for logic errors
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, userData]);

  // Add real-time subscription
  useEffect(() => {
    // Subscribe to users table changes
    const subscription = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          // Refresh user data when any change occurs
          dispatch(userDetails({ role: userRole, username }));
        }
      )
      .subscribe();

    // Set up interval to check device logs every 60 seconds (reduced frequency)
    const intervalId = setInterval(fetchDeviceLogsAndUpdateStatus, 60000);

    // Initial fetch of device logs
    fetchDeviceLogsAndUpdateStatus();

    // Fetch departments and dropdowns on mount
    dispatch(departmentDetails());
    dispatch(customDropdownDetails());
    dispatch(givenByDetails()); // Fetch givenBy details on mount

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, [dispatch, fetchDeviceLogsAndUpdateStatus]);


  // Add manual refresh button handler
  const handleManualRefresh = () => {
    fetchDeviceLogsAndUpdateStatus();
  };

  const handleUsernameFilterSelect = (username) => {
    setUsernameFilter(username);
    setUsernameDropdownOpen(false);
  };

  const clearUsernameFilter = () => {
    setUsernameFilter('');
    setUsernameDropdownOpen(false);
  };

  const toggleUsernameDropdown = () => {
    setUsernameDropdownOpen(!usernameDropdownOpen);
  };

  const handleAddButtonClick = () => {
    resetUserForm();
    setShowUserModal(true);
  };

  // Add to your handleAddButtonClick function





  // Sample data
  // const [users, setUsers] = useState([
  //   {
  //     id: '1',
  //     username: 'john_doe',
  //     email: 'john@example.com',
  //     password: '********',
  //     department: 'IT',
  //     givenBy: 'admin',
  //     phone: '1234567890',
  //     role: 'user',
  //     status: 'active'
  //   },
  //   {
  //     id: '2',
  //     username: 'jane_smith',
  //     email: 'jane@example.com',
  //     password: '********',
  //     department: 'HR',
  //     givenBy: 'admin',
  //     phone: '0987654321',
  //     role: 'admin',
  //     status: 'active'
  //   }
  // ]);

  // const [departments, setDepartments] = useState([
  //   { id: '1', name: 'IT', givenBy: 'super_admin' },
  //   { id: '2', name: 'HR', givenBy: 'super_admin' },
  //   { id: '3', name: 'Finance', givenBy: 'admin' }
  // ]);

  // Form states
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    employee_id: '',
    role: 'user',
    status: 'active',
    department: '',
    user_access: '',
    Designation: '',
    profile_image: '',
    reported_by: '',
    can_self_assign: false
  });

  useEffect(() => {
    dispatch(userDetails({ role: userRole, username }));
    dispatch(departmentDetails()); // Fetch departments on mount
    dispatch(givenByDetails()); // Fetch givenBy details on mount
    dispatch(customDropdownDetails()); // Fetch custom dropdowns on mount
  }, [dispatch, userRole, username]);

  // In your handleAddUser function:
  // Modified handleAddUser
  const handleAddUser = async (e) => {
    e.preventDefault();
    // Auto-generate employee_id
    const generatedEmpId = `EMP-${Date.now().toString().slice(-6)}`;

    let imageUrl = userForm.profile_image;
    if (profileFile) {
      try {
        imageUrl = await dispatch(uploadProfileImage({ file: profileFile, userId: generatedEmpId })).unwrap();
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr);
        showToast("Image upload failed, continuing without image.", "warning");
      }
    }

    const newUser = {
      ...userForm,
      employee_id: userForm.employee_id || generatedEmpId,
      user_access: userForm.user_access || userForm.department,
      department: userForm.department,
      profile_image: imageUrl,
      reported_by: userForm.reported_by,
      can_self_assign: userForm.can_self_assign
    };

    try {
      console.log("Creating user with payload:", newUser);
      await dispatch(createUser(newUser)).unwrap();

      // If the new user has the same name as current logged in user (unlikely but safe)
      if (newUser.user_name === localStorage.getItem("user-name")) {
        localStorage.setItem("profile_image", imageUrl || "");
      }

      resetUserForm();
      setShowUserModal(false);
      showToast("User created successfully!", "success");
      dispatch(userDetails({ role: userRole, username })); // Explicitly refresh user details
    } catch (error) {
      console.error('Error adding user:', error);
      showToast("Failed to create user.", "error");
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    let imageUrl = userForm.profile_image;
    if (profileFile) {
      try {
        imageUrl = await dispatch(uploadProfileImage({ file: profileFile, userId: userForm.employee_id || currentUserId })).unwrap();
      } catch (uploadErr) {
        console.error('Image upload failed:', uploadErr);
        showToast("Image upload failed, continuing with previous image.", "warning");
      }
    }

    const updatedUser = {
      user_name: userForm.username,
      password: userForm.password,
      email_id: userForm.email,
      number: userForm.phone,
      employee_id: userForm.employee_id,
      role: userForm.role,
      status: userForm.status,
      user_access: userForm.user_access || userForm.department,
      department: userForm.department,
      Designation: userForm.Designation || null,
      profile_image: imageUrl,
      leave_date: userForm.leave_date || null,
      leave_end_date: userForm.leave_end_date || null,
      remark: userForm.remark || null,
      reported_by: userForm.reported_by,
      can_self_assign: userForm.can_self_assign
    };

    try {
      console.log("Updating user with image:", imageUrl);
      await dispatch(updateUser({ id: currentUserId, updatedUser })).unwrap();

      // Critical: Update localStorage if the edited user is the current logged-in user
      if (updatedUser.user_name === localStorage.getItem("user-name")) {
        console.log("Updating current user's localStorage image");
        localStorage.setItem("profile_image", imageUrl || "");
        // Refresh to update all layouts immediately
        window.location.reload();
      }

      resetUserForm();
      setShowUserModal(false);
      showToast("User updated successfully!", "success");
      dispatch(userDetails()); // Explicitly refresh user details
    } catch (error) {
      console.error('Error updating user:', error);
      showToast("Failed to update user.", "error");
    }
  };


  // Modified handleDeleteUser
  const handleDeleteUser = (userId) => {
    const userToDel = userData.find(u => u.id === userId);
    if (!userToDel) return;
    setUserToDeleteData({ id: userId, name: userToDel.user_name });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUserAndTasks = async () => {
    const { id: userId, name: userName } = userToDeleteData;
    setIsDeleting(true);
    try {
      // 1. Delete tasks from all tables where this user is assigned
      if (userName) {
        const deletePromises = [
          supabase.from('checklist').delete().eq('name', userName),
          supabase.from('maintenance_tasks').delete().eq('name', userName),
          supabase.from('delegation').delete().eq('name', userName),
          supabase.from('repair_tasks').delete().eq('assigned_person', userName),
          supabase.from('ea_tasks').delete().eq('doer_name', userName)
        ];

        const results = await Promise.all(deletePromises);

        results.forEach((res, idx) => {
          if (res.error) console.error(`Error deleting tasks from table index ${idx}:`, res.error);
        });
      }

      // 2. Delete the user
      await dispatch(deleteUser(userId)).unwrap();

      showToast(`User ${userName} and all associated tasks deleted successfully`, 'success');
      dispatch(userDetails());
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting user and tasks:', error);
      showToast('Error during deletion process', 'error');
    } finally {
      setIsDeleting(false);
    }
  };


  // User form handlers
  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
  };

  // const handleAddUser = (e) => {
  //   e.preventDefault();
  //   const newUser = {
  //     ...userForm,
  //     id: (users.length + 1).toString(),
  //     password: '********'
  //   };
  //   setUsers([...users, newUser]);
  //   resetUserForm();
  //   setShowUserModal(false);
  // };
  const handleEditUser = (userId) => {
    if (!userData) return;
    const user = userData.find(u => u.id === userId);
    if (!user) return;

    setUserForm({
      username: user.user_name || '',
      email: user.email_id || '',
      password: '', // Leave empty when editing to keep current password
      phone: user.number || '',
      employee_id: user.employee_id || '',
      department: user.department || '',
      user_access: user.user_access || '',
      role: user.role || 'user',
      status: user.status || 'active',
      Designation: user.Designation || '',
      profile_image: user.profile_image || '',
      leave_date: user.leave_date ? user.leave_date.split('T')[0] : '',
      leave_end_date: user.leave_end_date ? user.leave_end_date.split('T')[0] : '',
      remark: user.remark || '',
      reported_by: user.reported_by || '',
      can_self_assign: user.can_self_assign || false
    });
    setProfilePreview(user.profile_image || null);
    setProfileFile(null);
    setCurrentUserId(userId);
    setIsEditing(true);
    setShowUserModal(true);
  };




  const resetUserForm = () => {
    setUserForm({
      username: '',
      email: '',
      password: '',
      phone: '',
      employee_id: `EMP-${Date.now().toString().slice(-6)}`,
      department: '',
      user_access: '',
      givenBy: '',
      role: 'user',
      status: 'active',
      Designation: '',
      profile_image: '',
      leave_date: '',
      leave_end_date: '',
      remark: '',
      reported_by: '',
      can_self_assign: false
    });
    setProfileFile(null);
    setProfilePreview(null);
    setIsEditing(false);
    setCurrentUserId(null);
  };



  // User names list for dropdowns
  const userNames = (userData || []).filter(u => u && u.user_name && u.user_name !== 'admin' && u.user_name !== 'DSMC').map(u => u.user_name);


  const getStatusColor = (status) => {
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'on leave' || status === 'on_leave') return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'HOD': return 'bg-orange-100 text-orange-800';
      case 'manager': return 'bg-blue-200 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  return (
    <ERPLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-6">
          <h1 className="text-2xl font-bold text-blue-600">User Management System</h1>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2.5 rounded-lg bg-blue-50 text-green-600 border border-green-200 hover:bg-green-100 transition-all disabled:opacity-50"
                title="Refresh Status"
              >
                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
              </button>

              {userRole === 'admin' && (
                <button
                  onClick={handleAddButtonClick}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all text-sm"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">New User</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
            </div>
          </div>
        </div>
        {/* <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 className="text-sm font-medium text-yellow-800">Debug Info</h3>
        <p className="text-xs text-yellow-700">
          Total Users: {userData?.length || 0} | 
          Active: {userData?.filter(u => u && u.status === 'active').length || 0} | 
          Inactive: {userData?.filter(u => u && u.status === 'inactive').length || 0}
        </p>
        <div className="text-[10px] text-gray-400 mt-1 truncate">
          Employee IDs in DB: {userData?.filter(u => u && u.employee_id).map(u => u.employee_id).join(', ') || 'None'}
        </div>
      </div> */}


        <div className="bg-white shadow rounded-lg overflow-hidden border border-blue-200">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-4 md:px-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
              <h2 className="text-lg font-bold text-blue-700">User List</h2>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    list="usernameOptions"
                    placeholder="Search users..."
                    value={usernameFilter}
                    onChange={(e) => setUsernameFilter(e.target.value)}
                    className="w-full sm:w-48 pl-10 pr-8 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                  />
                  <datalist id="usernameOptions">
                    {(userData || []).filter(u => u && u.user_name).map(user => (
                      <option key={`opt-user-${user.id}`} value={user.user_name} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            <div className="max-h-[calc(100vh-250px)] overflow-auto scrollbar-thin">
              <div className="inline-block min-w-full align-middle">
                {/* Desktop View */}
                <div className="hidden md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Username
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone No.
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Password
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reported To
                        </th>
                        {userRole === 'admin' && (
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        const filtered = (userData || [])
                          .filter(user =>
                            user &&
                            user.user_name && (
                              !usernameFilter || user.user_name.toLowerCase().includes(usernameFilter.toLowerCase()))
                          );
                        console.log("Setting Page - Filtered Users COUNT:", filtered.length);
                        return filtered;
                      })().map((user, index) => (
                        <tr key={`user-${user?.id || index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden mr-3 border border-indigo-200">
                                {user?.profile_image ? (
                                  <img src={user.profile_image} alt={user.user_name} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-xs font-bold text-indigo-700">{user?.user_name?.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="text-sm font-medium text-gray-900">{user?.user_name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user?.email_id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user?.number}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(user?.status)}`}>
                              {user?.status || 'active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit">
                              {user?.id}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-mono">
                              {(userRole === 'admin' || user?.user_name === username) ? user?.password : '••••••••'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user?.department || '—'}</div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user?.role)}`}>
                                {user?.role}
                              </span>
                              {user?.can_self_assign && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-tighter border border-indigo-100 shadow-sm animate-fade-in">
                                  <div className="w-1 h-1 rounded-full bg-indigo-600 animate-pulse"></div>
                                  Self-Assign
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-medium text-gray-600">{user?.reported_by || 'Admin'}</span>
                          </td>
                          {userRole === 'admin' && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditUser(user?.id)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Edit User"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user?.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="md:hidden space-y-4 p-4 bg-gray-50/50">
                  {(userData || [])
                    .filter(user =>
                      user &&
                      user.user_name &&
                      user.user_name !== 'admin' &&
                      user.user_name !== 'DSMC' && (
                        !usernameFilter || user.user_name.toLowerCase().includes(usernameFilter.toLowerCase()))
                    )
                    .map((user, index) => (
                      <div key={`user-card-${user?.id || index}`} className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden animate-fade-in">
                        <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
                          <span className="text-sm font-bold text-blue-900">{user?.user_name}</span>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 uppercase font-semibold">Status</p>
                              <span className={`px-1.5 py-0.5 inline-flex text-[10px] leading-4 font-bold rounded-full uppercase ${getStatusColor(user?.status)}`}>
                                {user?.status || 'active'}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 uppercase font-semibold">User ID</p>
                              <p className="text-xs text-gray-700 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 w-fit">
                                {user?.id}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 uppercase font-semibold">Password</p>
                              <p className="text-xs text-gray-700 font-mono">
                                {(userRole === 'admin' || user?.user_name === username) ? user?.password : '••••••••'}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 uppercase font-semibold">Role</p>
                              <span className={`px-1.5 py-0.5 inline-flex text-[10px] leading-4 font-bold rounded-full uppercase ${getRoleColor(user?.role)}`}>
                                {user?.role}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px] text-gray-400 uppercase font-semibold">Email</p>
                            <p className="text-xs text-gray-700 truncate">{user?.email_id || '—'}</p>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 uppercase font-semibold">Department</p>
                              <p className="text-xs text-indigo-700 font-bold">{user?.department || '—'}</p>
                            </div>
                          </div>

                          {userRole === 'admin' && (
                            <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                              <button
                                onClick={() => handleEditUser(user?.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all"
                              >
                                <Edit size={14} /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user?.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>




        {/* User Modal */}
        {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setShowUserModal(false)}
            ></div>

            <div className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-white/50 flex flex-col max-h-[95vh]">
              {/* Premium Header */}
              <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-500 px-10 py-8 relative">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]"></div>
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      {isEditing ? 'Update Profile' : 'Nurture Talent'}
                    </h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mt-1">
                      {isEditing ? 'Refine user information' : 'Create a new team member'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all hover:rotate-90"
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>

              <div className="p-10 overflow-y-auto no-scrollbar">
                <form onSubmit={isEditing ? handleUpdateUser : handleAddUser} className="space-y-8">
                  {/* Profile Image Section */}
                  <div className="flex flex-col items-center mb-8">
                    <div className="relative group">
                      <div className="h-28 w-28 rounded-full bg-white p-1.5 shadow-2xl ring-4 ring-blue-100/50">
                        <div className="h-full w-full rounded-full bg-gradient-to-tr from-indigo-50 to-blue-50 border-2 border-dashed border-blue-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50/50">
                          {profilePreview || userForm.profile_image ? (
                            <img
                              src={profilePreview || userForm.profile_image}
                              alt="Profile"
                              className="h-full w-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <User size={40} className="text-blue-200 group-hover:text-blue-400 transition-colors" />
                          )}
                        </div>
                      </div>
                      <label className="absolute bottom-1 right-1 bg-indigo-600 text-white p-2.5 rounded-full cursor-pointer shadow-xl hover:bg-indigo-700 transition-all active:scale-90 ring-4 ring-white">
                        <Plus size={18} strokeWidth={3} />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setProfileFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => setProfilePreview(reader.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-4 font-black uppercase tracking-widest">Profile Identity</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="username" className="block text-sm font-bold text-gray-700 ml-1">Username</label>
                      <input
                        type="text"
                        name="username"
                        id="username"
                        value={userForm.username}
                        onChange={handleUserInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="Enter username"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-bold text-gray-700 ml-1">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={userForm.email}
                        onChange={handleUserInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="Enter email address"
                      />
                    </div>

                    {!isEditing && (
                      <div className="space-y-2">
                        <label htmlFor="password" className="block text-sm font-bold text-gray-700 ml-1">Password</label>
                        <input
                          type="password"
                          name="password"
                          id="password"
                          value={userForm.password}
                          onChange={handleUserInputChange}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="phone" className="block text-sm font-bold text-gray-700 ml-1">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={userForm.phone}
                        onChange={handleUserInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="+91 00000 00000"
                      />
                    </div>



                    <div className="space-y-2">
                      <label htmlFor="role" className="block text-sm font-bold text-gray-700 ml-1">User Role</label>
                      <select
                        id="role"
                        name="role"
                        value={userForm.role}
                        onChange={handleUserInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="admin">Admin</option>
                        <option value="HOD">HOD</option>
                        <option value="user">User</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="reported_by" className="block text-sm font-bold text-gray-700 ml-1">Reported To (Supervisor)</label>
                      <select
                        id="reported_by"
                        name="reported_by"
                        value={userForm.reported_by}
                        onChange={handleUserInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="">No Supervisor (Direct Admin)</option>
                        {userData && userData.length > 0 && userData
                          .filter(u => u && u.user_name !== userForm.username && u.user_name !== 'admin')
                          .map((u, i) => (
                            <option key={i} value={u.user_name}>{u.user_name}</option>
                          ))
                        }
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="department" className="block text-sm font-bold text-gray-700 ml-1">Department Assigned</label>
                      <select
                        id="department"
                        name="department"
                        value={userForm.department}
                        onChange={handleUserInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="">Choose a department...</option>
                        {department && department.length > 0 ? (
                          [...new Set(department.map(dept => dept.department))]
                            .filter(Boolean)
                            .map((deptName, index) => (
                              <option key={index} value={deptName}>{deptName}</option>
                            ))
                        ) : null}
                      </select>
                    </div>

                    {/* Designation Field — shown for both new and edit */}
                    <div className="space-y-2">
                      <label htmlFor="Designation" className="block text-sm font-bold text-gray-700 ml-1">Designation</label>
                      <input
                        type="text"
                        name="Designation"
                        id="Designation"
                        value={userForm.Designation}
                        onChange={handleUserInputChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="e.g. Senior Technician, Supervisor..."
                      />
                    </div>

                    {isEditing && (
                      <>
                        <div className="md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                          <h4 className="text-sm font-bold text-indigo-900 mb-4 px-1">Leave &amp; Status Management</h4>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="status" className="block text-sm font-bold text-gray-700 ml-1">User Status</label>
                          <select
                            id="status"
                            name="status"
                            value={userForm.status}
                            onChange={handleUserInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="on_leave">On Leave</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="leave_date" className="block text-sm font-bold text-gray-700 ml-1">Leave Start Date</label>
                          <input
                            type="date"
                            id="leave_date"
                            name="leave_date"
                            value={userForm.leave_date}
                            onChange={handleUserInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="leave_end_date" className="block text-sm font-bold text-gray-700 ml-1">Leave End Date</label>
                          <input
                            type="date"
                            id="leave_end_date"
                            name="leave_end_date"
                            value={userForm.leave_end_date}
                            onChange={handleUserInputChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label htmlFor="remark" className="block text-sm font-bold text-gray-700 ml-1">Remark / Reason</label>
                          <textarea
                            id="remark"
                            name="remark"
                            value={userForm.remark}
                            onChange={handleUserInputChange}
                            rows="2"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                            placeholder="Enter any remarks or leave reason..."
                          ></textarea>
                        </div>
                      </>
                    )}

                  </div>
                  
                  <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-[2rem] border border-blue-100/50 flex items-center justify-between group transition-all hover:shadow-xl hover:shadow-blue-100/30">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 group-hover:scale-110 transition-transform">
                        <User size={20} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-0.5 group-hover:text-indigo-600 transition-colors">Self-Assign Rights</h4>
                        <p className="text-[10px] text-gray-400 font-bold max-w-[200px]">Allow this user to assign tasks to themselves</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer scale-110">
                      <input 
                        type="checkbox" 
                        name="can_self_assign"
                        checked={userForm.can_self_assign}
                        onChange={(e) => setUserForm(prev => ({ ...prev, can_self_assign: e.target.checked }))}
                        className="sr-only peer" 
                      />
                      <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-600 peer-checked:to-indigo-600"></div>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-50 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="px-8 py-3 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-10 py-3 bg-gradient-to-r from-indigo-600 to-indigo-600 text-white text-xs font-black rounded-2xl hover:from-indigo-700 hover:to-indigo-700 shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] hover:shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest"
                    >
                      <Save size={16} strokeWidth={3} />
                      {isEditing ? 'Save Changes' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}


        {/* Custom Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => !isDeleting && setShowDeleteConfirm(false)}
            ></div>
            <div className="relative bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50">
              {/* Header with Icon */}
              <div className="bg-gradient-to-br from-red-500 to-rose-600 px-6 pt-10 pb-8 text-center relative">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>
                <div className="relative z-10">
                  <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 shadow-xl ring-4 ring-white/30">
                    <Trash2 size={40} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight mb-2">Terminate Profile?</h3>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest px-4">
                    Irreversible Deletion
                  </p>
                </div>
              </div>

              <div className="px-8 py-8 text-center">
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Are you absolutely certain about deleting <span className="text-red-600 font-extrabold">&quot;{userToDeleteData.name}&quot;</span>?
                </p>

                <div className="bg-amber-50 border border-amber-100 rounded-[1.5rem] p-5 text-left mb-8">
                  <div className="flex gap-3">
                    <div className="pt-1">
                      <Settings className="text-amber-600 w-5 h-5 animate-spin-slow" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1">Critical Guard</h4>
                      <p className="text-[11px] text-amber-800/80 leading-relaxed">
                        Un-shifted tasks will be <span className="font-bold underline text-red-600">permanently purged</span> from our systems.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={confirmDeleteUserAndTasks}
                    className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_10px_20px_-5px_rgba(220,38,38,0.4)] hover:shadow-red-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75"
                  >
                    {isDeleting ? (
                      <><RefreshCw size={16} className="animate-spin" /> Executing...</>
                    ) : (
                      <>Confirm Termination</>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    Keep Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ERPLayout>
  );
};

export default UserManagement;
