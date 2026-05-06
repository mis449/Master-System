import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, User, Building, X, Save, Edit, Trash2, Search, ChevronDown, Calendar, RefreshCw, Settings } from 'lucide-react';
import ERPLayout from '../components/layout/ERPLayout';
import { useDispatch, useSelector } from 'react-redux';
import { createDepartment, createUser, deleteUser, departmentOnlyDetails, givenByDetails, departmentDetails, updateDepartment, updateUser, userDetails, customDropdownDetails, createCustomDropdown, deleteCustomDropdown, createAssignFrom, deleteDepartment, deleteAssignFrom, updateCustomDropdown, updateAssignFrom, uploadProfileImage, createMachineEntries } from '../redux/slice/settingSlice';
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

const Setting = () => {
  const userRole = localStorage.getItem("role");
  const username = localStorage.getItem("user-name");
  const { showToast } = useMagicToast();
  const [activeTab, setActiveTab] = useState('departments');
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDeptId, setCurrentDeptId] = useState(null);
  const [usernameFilter, setUsernameFilter] = useState('');
  const [usernameDropdownOpen, setUsernameDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastSyncError = useRef({ status: null, timestamp: 0 });

  const [activeDeptSubTab, setActiveDeptSubTab] = useState('departments');
  // Leave Management State
  const [leavePersonId, setLeavePersonId] = useState('');
  const [leavePersonName, setLeavePersonName] = useState('');
  const [leaveRemark, setLeaveRemark] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveTasks, setLeaveTasks] = useState([]);
  const [leaveTasksLoading, setLeaveTasksLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [shiftToPerson, setShiftToPerson] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState(false);
  const [leaveUsernameFilter, setLeaveUsernameFilter] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [startCalendarPos, setStartCalendarPos] = useState({ top: 0, left: 0 });
  const [endCalendarPos, setEndCalendarPos] = useState({ top: 0, left: 0 });
  const [selectedLeaveTaskIds, setSelectedLeaveTaskIds] = useState([]);
  const startBtnRef = useRef(null);
  const endBtnRef = useRef(null);

  const [isDeleting, setIsDeleting] = useState(false);

  const { userData, department, departmentsOnly, givenBy, customDropdowns, loading, error } = useSelector((state) => state.setting);
  const dispatch = useDispatch();

  useEffect(() => {
    console.log("Setting Component - userData:", userData);
    if (userData && userData.length > 0) {
      console.log("Sample user object keys:", Object.keys(userData[0]));
    }
    console.log("Setting Component - loading:", loading);
    console.log("Setting Component - error:", error);
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
        if (lastSyncError.current.status !== 400) {
          console.log('ℹ️ Device APIs unreachable (400). Sync paused for 30 minutes.');
        }
        lastSyncError.current = { status: 400, timestamp: now };
        return;
      }

      // Clear back-off if we got any data
      if (allLogs.length > 0 && lastSyncError.current.status === 400) {
        console.log('✅ Device sync partially or fully restored.');
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
          // console.log('Real-time update received:', payload);
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
    if (activeTab === 'departments' || activeTab === 'categories') {
      resetDeptForm();
      setShowDeptModal(true);
    }
    // No action for leave tab
  };

  // Fetch tasks for the person on leave within the date range
  const handleFetchLeaveTasks = async () => {
    if (!leavePersonName || !leaveStartDate || !leaveEndDate) {
      showToast('Please select a person and both start and end dates', 'error');
      return;
    }
    if (new Date(leaveStartDate) > new Date(leaveEndDate)) {
      showToast('End date cannot be before start date', 'error');
      return;
    }
    setLeaveTasksLoading(true);
    setLeaveTasks([]);
    setHasFetched(false);
    setLeaveSuccess(false);
    try {
      const startISO = `${leaveStartDate}T00:00:00`;
      const endISO = `${leaveEndDate}T23:59:59`;

      const [
        { data: checklistTasks },
        { data: delegationTasks },
        { data: maintenanceTasks },
        { data: repairTasks },
        { data: eaTasks }
      ] = await Promise.all([
        supabase.from('checklist').select('*').eq('name', leavePersonName)
          .gte('task_start_date', startISO).lte('task_start_date', endISO).is('submission_date', null),
        supabase.from('delegation').select('*').eq('name', leavePersonName)
          .gte('task_start_date', startISO).lte('task_start_date', endISO).is('submission_date', null),
        supabase.from('maintenance_tasks').select('*').eq('name', leavePersonName)
          .gte('task_start_date', startISO).lte('task_start_date', endISO).is('submission_date', null),
        supabase.from('repair_tasks').select('*').eq('assigned_person', leavePersonName)
          .gte('created_at', startISO).lte('created_at', endISO).eq('status', 'Pending'),
        supabase.from('ea_tasks').select('*').eq('doer_name', leavePersonName)
          .gte('planned_date', startISO).lte('planned_date', endISO).eq('status', 'pending')
      ]);

      const combined = [
        ...(checklistTasks || []).map(t => ({ ...t, _table: 'checklist', id: t.task_id, _uniqueId: `checklist-${t.task_id}` })),
        ...(delegationTasks || []).map(t => ({ ...t, _table: 'delegation', id: t.task_id, _uniqueId: `delegation-${t.task_id}` })),
        ...(maintenanceTasks || []).map(t => ({ ...t, _table: 'maintenance_tasks', id: t.id, _uniqueId: `maintenance_tasks-${t.id}` })),
        ...(repairTasks || []).map(t => ({ ...t, _table: 'repair_tasks', id: t.id, task_description: t.issue_description, task_start_date: t.created_at, _uniqueId: `repair_tasks-${t.id}` })),
        ...(eaTasks || []).map(t => ({ ...t, _table: 'ea_tasks', id: t.id, task_description: t.task_description, task_start_date: t.planned_date, _uniqueId: `ea_tasks-${t.id}` }))
      ];
      setLeaveTasks(combined);
      setSelectedLeaveTaskIds([]); // Clear selection on new fetch
      setHasFetched(true);
    } catch (err) {
      console.error('Error fetching leave tasks:', err);
    } finally {
      setLeaveTasksLoading(false);
    }
  };

  // Shift selected fetched tasks to the substitute person
  const handleShiftTasks = async () => {
    // Determine which tasks to shift
    const tasksToShift = leaveTasks.length > 0
      ? leaveTasks.filter(t => selectedLeaveTaskIds.includes(t._uniqueId))
      : [];

    // If there are tasks found but none selected, alert user
    if (leaveTasks.length > 0 && tasksToShift.length === 0 && shiftToPerson) {
      showToast('Please select tasks to shift using the checkboxes', 'warning');
      return;
    }

    // Must have a substitute if shifting tasks
    if (tasksToShift.length > 0 && !shiftToPerson) {
      showToast('Please select a person to shift tasks to', 'error');
      return;
    }

    const isFullShift = tasksToShift.length === leaveTasks.length || leaveTasks.length === 0;

    const confirmMsg = tasksToShift.length > 0
      ? `Shift ${tasksToShift.length} selected task(s) from "${leavePersonName}" to "${shiftToPerson}"?`
      : `Mark "${leavePersonName}" as On Leave? (No tasks found to shift)`;

    if (!window.confirm(confirmMsg)) return;

    setLeaveSubmitting(true);
    try {
      const checklistIds = tasksToShift.filter(t => t._table === 'checklist').map(t => t.task_id);
      const delegationIds = tasksToShift.filter(t => t._table === 'delegation').map(t => t.task_id);
      const maintenanceIds = tasksToShift.filter(t => t._table === 'maintenance_tasks').map(t => t.id);
      const repairIds = tasksToShift.filter(t => t._table === 'repair_tasks').map(t => t.id);
      const eaIds = tasksToShift.filter(t => t._table === 'ea_tasks').map(t => t.id);

      // Only mark user as on leave if it's the first shift or a direct "Mark on leave"
      // or if all tasks are being shifted at once.
      // Usually, we should probably mark as on leave on the first action.
      const { data: currentUser } = await supabase.from('users').select('status').eq('id', leavePersonId).single();

      if (currentUser?.status !== 'on_leave') {
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({
            status: 'on_leave',
            leave_date: leaveStartDate,
            leave_end_date: leaveEndDate,
            remark: leaveRemark || 'Shifted tasks'
          })
          .eq('id', leavePersonId);
        if (userUpdateError) throw userUpdateError;
      }

      // Update Tasks (If any)
      if (checklistIds.length > 0) {
        const { error: checklistError } = await supabase.from('checklist').update({ name: shiftToPerson }).in('task_id', checklistIds);
        if (checklistError) console.error('Error updating checklist tasks:', checklistError);
      }
      if (delegationIds.length > 0) {
        const { error: delegationError } = await supabase.from('delegation').update({ name: shiftToPerson }).in('task_id', delegationIds);
        if (delegationError) console.error('Error updating delegation tasks:', delegationError);
      }
      if (maintenanceIds.length > 0) {
        const { error: maintenanceError } = await supabase.from('maintenance_tasks').update({ name: shiftToPerson }).in('id', maintenanceIds);
        if (maintenanceError) console.error('Error updating maintenance tasks:', maintenanceError);
      }
      if (repairIds.length > 0) {
        const { error: repairError } = await supabase.from('repair_tasks').update({ assigned_person: shiftToPerson }).in('id', repairIds);
        if (repairError) console.error('Error updating repair tasks:', repairError);
      }
      if (eaIds.length > 0) {
        const { error: eaError } = await supabase.from('ea_tasks').update({ doer_name: shiftToPerson }).in('id', eaIds);
        if (eaError) console.error('Error updating EA tasks:', eaError);
      }

      // Send WhatsApp Notifications for shifted tasks
      if (tasksToShift.length > 0) {
        for (const task of tasksToShift) {
          await sendTaskReassignmentNotification({
            newDoerName: shiftToPerson,
            originalDoerName: leavePersonName,
            taskId: task.task_id || task.id,
            description: task.task_description || task.tasks || task.title || task.issue_description,
            startDate: (task.task_start_date || task.planned_date || task.created_at) ? new Date(task.task_start_date || task.planned_date || task.created_at).toLocaleDateString('en-IN') : 'N/A',
            givenBy: task.given_by || task.filled_by || 'Admin',
            department: task.department,
            taskType: task._table
          });
        }
      }

      // Filter out shifted tasks from the local view
      const remainingTasks = leaveTasks.filter(t => !selectedLeaveTaskIds.includes(t._uniqueId));

      if (remainingTasks.length === 0) {
        setLeaveSuccess(true);
      } else {
        showToast(`${tasksToShift.length} tasks shifted to ${shiftToPerson}. ${remainingTasks.length} tasks remaining.`, 'success');
      }

      setLeaveTasks(remainingTasks);
      setSelectedLeaveTaskIds([]); // Clear selection
      setShiftToPerson('');
      // Re-fetch user details to reflect the "on leave" status immediately
      dispatch(userDetails());
    } catch (err) {
      console.error('Error shifting tasks:', err);
      showToast('Error shifting tasks. Please try again.', 'error');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleResetLeave = () => {
    setLeavePersonId('');
    setLeavePersonName('');
    setLeaveRemark('');
    setLeaveStartDate('');
    setLeaveEndDate('');
    setLeaveTasks([]);
    setSelectedLeaveTaskIds([]);
    setShiftToPerson('');
    setLeaveSuccess(false);
    setHasFetched(false);
  };

  // Add to your existing handleTabChange function
  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'users') {
      dispatch(userDetails({ role: userRole, username }));
      dispatch(departmentOnlyDetails());
    } else if (tab === 'departments') {
      // Fetch data based on activeDeptSubTab
      if (activeDeptSubTab === 'departments') {
        dispatch(departmentDetails());
      } else if (activeDeptSubTab === 'givenBy') {
        dispatch(givenByDetails());
      }
    } else if (tab === 'categories') {
      dispatch(customDropdownDetails());
    }
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

  const [deptForm, setDeptForm] = useState({
    name: '',
    givenBy: ''
  });
  const [inputParts, setInputParts] = useState([{ name: '', file: null, preview: null }]);

  useEffect(() => {
    dispatch(userDetails({ role: userRole, username }));
    dispatch(departmentDetails()); // Fetch departments on mount
    dispatch(givenByDetails()); // Fetch givenBy details on mount
    dispatch(customDropdownDetails()); // Fetch custom dropdowns on mount
  }, [dispatch, userRole, username])

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

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();

    if (activeTab === 'categories') {
      try {
        await dispatch(updateCustomDropdown({
          id: currentDeptId,
          category: 'Machine Name', // Force Machine Name category
          value: deptForm.givenBy
        })).unwrap();
        resetDeptForm();
        setShowDeptModal(false);
        dispatch(customDropdownDetails()); // Explicitly refresh custom dropdowns
      } catch (error) {
        console.error('Error updating category:', error);
      }
      return;
    }

    if (activeTab === 'departments') {
      if (activeDeptSubTab === 'departments') {
        const updatedDept = {
          department: deptForm.name,
          given_by: deptForm.givenBy
        };
        try {
          await dispatch(updateDepartment({ id: currentDeptId, updatedDept })).unwrap();

          // Also ensure it exists in assign_from table
          if (deptForm.givenBy) {
            try {
              await dispatch(createAssignFrom({ given_by: deptForm.givenBy })).unwrap();
            } catch (e) { }
          }
          resetDeptForm();
          setShowDeptModal(false);
          dispatch(departmentDetails()); // Explicitly refresh department details
        } catch (error) {
          console.error('Error updating department:', error);
        }
      } else if (activeDeptSubTab === 'givenBy') {
        try {
          await dispatch(updateAssignFrom({
            id: currentDeptId,
            given_by: deptForm.name
          })).unwrap();
          resetDeptForm();
          setShowDeptModal(false);
          dispatch(givenByDetails()); // Explicitly refresh givenBy details
        } catch (error) {
          console.error('Error updating assign_from:', error);
        }
      }
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();

    if (activeTab === 'categories') {
      try {
        const machineName = deptForm.givenBy;
        const machineArea = deptForm.machineArea;
        const parts = inputParts.filter(p => p.name.trim() !== '');

        if (!machineName) {
          showToast("Machine Name is required", "error");
          return;
        }

        showToast("Saving machine... please wait", "info");

        const entries = [];
        if (parts.length > 0) {
          for (const part of parts) {
            let imageUrl = null;
            if (part.file) {
              try {
                imageUrl = await uploadPartImageApi(part.file);
              } catch (uploadErr) {
                console.error('Part image upload failed:', uploadErr);
                showToast(`Image upload failed for part "${part.name}", saving without image.`, "warning");
              }
            }
            entries.push({
              machine_name: machineName,
              part_name: part.name,
              machine_area: machineArea,
              ...(imageUrl && { image_url: imageUrl })
            });
          }
        } else {
          entries.push({
            machine_name: machineName,
            part_name: null,
            machine_area: machineArea
          });
        }

        await dispatch(createMachineEntries(entries)).unwrap();

        resetDeptForm();
        setShowDeptModal(false);
        dispatch(customDropdownDetails());
        showToast("Machine saved successfully!", "success");
      } catch (error) {
        console.error('Error adding category option:', error);
        showToast("Failed to save machine.", "error");
      }
      return;
    }

    if (activeTab === 'departments') {
      if (activeDeptSubTab === 'givenBy') {
        try {
          await dispatch(createAssignFrom({ given_by: deptForm.name })).unwrap(); // Changed to createAssignFrom
          resetDeptForm();
          setShowDeptModal(false);
          dispatch(givenByDetails()); // Explicitly refresh givenBy details
        } catch (error) {
          console.error('Error adding assign_from:', error);
        }
      } else { // activeDeptSubTab === 'departments'
        try {
          await dispatch(createDepartment({
            department: deptForm.name,
            given_by: deptForm.givenBy
          })).unwrap(); // Pass department and given_by

          // Also ensure it exists in assign_from table
          if (deptForm.givenBy) {
            try {
              await dispatch(createAssignFrom({ given_by: deptForm.givenBy })).unwrap();
            } catch (e) { }
          }

          resetDeptForm();
          setShowDeptModal(false);
          dispatch(departmentDetails()); // Explicitly refresh department details
        } catch (error) {
          console.error('Error adding department:', error);
        }
      }
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

  const handleEditDepartment = (deptId) => {
    if (activeTab === 'departments' && activeDeptSubTab === 'departments') {
      const dept = department.find(d => d.id === deptId);
      setDeptForm({
        name: dept.department,
        givenBy: dept.given_by || ''
      });
      setCurrentDeptId(deptId);
      setIsEditing(true); // Set editing mode
      setShowDeptModal(true);
    } else if (activeTab === 'departments' && activeDeptSubTab === 'givenBy') {
      const item = givenBy.find(g => g.id === deptId); // Assuming givenBy items also have an 'id'
      setDeptForm({
        name: item.given_by,
        givenBy: '' // givenBy table only has 'given_by' field, no secondary field
      });
      setCurrentDeptId(deptId);
      setIsEditing(true);
      setShowDeptModal(true);
    } else if (activeTab === 'categories') {
      const item = customDropdowns.find(c => c.id === deptId);
      setDeptForm({
        name: item.category,
        givenBy: item.value
      });
      setCurrentDeptId(deptId);
      setIsEditing(true);
      setShowDeptModal(true);
    }
  };
  // const handleUpdateUser = (e) => {
  //   e.preventDefault();
  //   setUsers(users.map(user => 
  //     user.id === currentUserId ? { ...userForm, id: currentUserId } : user
  //   ));
  //   resetUserForm();
  //   setShowUserModal(false);
  // };



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

  // Department form handlers
  const handleDeptInputChange = (e) => {
    const { name, value } = e.target;
    setDeptForm(prev => ({ ...prev, [name]: value }));
  };

  // const handleAddDepartment = (e) => {
  //   e.preventDefault();
  //   const newDept = {
  //     ...deptForm,
  //     id: (departments.length + 1).toString()
  //   };
  //   setDepartments([...departments, newDept]);
  //   resetDeptForm();
  //   setShowDeptModal(false);
  // };


  //   const handleUpdateDepartment = (e) => {
  //     e.preventDefault();
  //     setDepartments(departments.map(dept => 
  //       dept.id === currentDeptId ? { ...deptForm, id: currentDeptId } : dept
  //     ));
  //     resetDeptForm();
  //     setShowDeptModal(false);
  //   };


  // const handleDeleteDepartment = (deptId) => {
  //   setDepartments(department.filter(dept => dept.id !== deptId));
  // };

  const resetDeptForm = () => {
    setDeptForm({
      name: '',
      givenBy: '',
      partName: '',
      machineArea: ''
    });
    setCurrentDeptId(null);
    setIsEditing(false);
    setInputParts([{ name: '', file: null, preview: null }]);
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
      case 'manager': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdatePartImage = async (file, part) => {
    if (!file) return;
    showToast("Uploading new image...", "info");
    try {
      const imageUrl = await uploadPartImageApi(file);
      await dispatch(updateCustomDropdown({
        id: part.id,
        category: 'Part Name',
        value: part.value,
        image_url: imageUrl
      })).unwrap();
      dispatch(customDropdownDetails());
      showToast("Image updated successfully!", "success");
    } catch (err) {
      console.error('Error updating part image:', err);
      showToast("Failed to update image", "error");
    }
  };

  return (
    <ERPLayout>
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-6">
          <h1 className="text-2xl font-bold text-blue-600">User Management System</h1>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200/30 relative overflow-x-auto no-scrollbar max-w-max xscrol">
              {[
                { id: 'departments', label: 'Departments', icon: Building, action: () => { dispatch(departmentDetails()); dispatch(givenByDetails()); } },
                { id: 'leave', label: 'Leave', icon: Calendar },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`relative flex items-center justify-center gap-2 py-2 px-6 rounded-lg text-xs font-bold transition-all duration-500 whitespace-nowrap min-w-[110px] z-10 ${activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-blue-600'}`}
                  onClick={() => {
                    handleTabChange(tab.id);
                    if (tab.action) tab.action();
                  }}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="settingsTabPillMinimal"
                      className="absolute inset-0 bg-blue-600 rounded-lg shadow-md"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <tab.icon size={15} className="relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2.5 rounded-lg bg-green-50 text-green-600 border border-green-200 hover:bg-green-100 transition-all disabled:opacity-50"
                title="Refresh Status"
              >
                <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
              </button>

              {activeTab === 'departments' && (
                <button
                  onClick={handleAddButtonClick}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all text-sm"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">
                    {activeDeptSubTab === 'departments' ? 'New Department' : 'New Assign From'}
                  </span>
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


        {/* Leave Management Tab */}
        {activeTab === 'leave' && (
          <div className="space-y-5">
            {/* Step 1: Leave Form */}
            <div className="bg-white shadow rounded-xl border border-blue-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-blue-700">Leave Management</h2>
                  <p className="text-xs text-blue-500 mt-0.5">Reassign tasks to a substitute during leave period</p>
                </div>
                {(leaveTasks.length > 0 || leaveSuccess) && (
                  <button onClick={handleResetLeave} className="text-xs text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 font-semibold transition-all">
                    ↺ Start Over
                  </button>
                )}
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Person on Leave */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Person on Leave</label>
                    <select
                      value={leavePersonId}
                      onChange={e => {
                        const id = e.target.value;
                        const user = userData.find(u => u.id.toString() === id.toString());
                        setLeavePersonId(id);
                        setLeavePersonName(user ? user.user_name : '');
                        setLeaveTasks([]);
                      }}
                      className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                    >
                      <option value="">Select person...</option>
                      {userData && [...userData].filter(u => u && u.user_name).sort((a, b) => a.user_name.localeCompare(b.user_name)).map(user => (
                        <option key={user.id} value={user.id}>{user.user_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Remark Field */}
                  <div className="md:col-span-2 relative">
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Leave Remark / Reason</label>
                    <input
                      type="text"
                      value={leaveRemark}
                      onChange={e => setLeaveRemark(e.target.value)}
                      placeholder="e.g. Family function, Sick leave..."
                      className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                    />
                  </div>

                  {/* Leave Start Date */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Leave Start Date</label>
                    <button
                      ref={startBtnRef}
                      type="button"
                      onClick={() => {
                        const rect = startBtnRef.current?.getBoundingClientRect();
                        if (rect) {
                          const calendarHeight = 360; // Estimated max height
                          const calendarWidth = 288;

                          let left = rect.left;
                          if (left + calendarWidth > window.innerWidth) {
                            left = window.innerWidth - calendarWidth - 20;
                          }

                          let top = rect.bottom + 4;
                          // If it overflows bottom, show above the button
                          if (top + calendarHeight > window.innerHeight) {
                            top = rect.top - calendarHeight - 4;
                          }

                          setStartCalendarPos({ top: Math.max(10, top), left: Math.max(10, left) });
                        }
                        setShowStartCalendar(!showStartCalendar);
                        setShowEndCalendar(false);
                      }}
                      className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-left flex justify-between items-center bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <span className={leaveStartDate ? 'text-gray-800' : 'text-gray-400'}>
                        {leaveStartDate ? formatDateLong(new Date(leaveStartDate)) : 'Select date'}
                      </span>
                      <Calendar size={14} className="text-gray-400" />
                    </button>
                    {showStartCalendar && createPortal(
                      <div style={{ position: 'fixed', top: startCalendarPos.top, left: startCalendarPos.left, zIndex: 9999 }}>
                        <CalendarComponent
                          date={leaveStartDate ? new Date(leaveStartDate) : null}
                          onChange={date => { setLeaveStartDate(formatDateISO(date)); setShowStartCalendar(false); setLeaveTasks([]); }}
                          onClose={() => setShowStartCalendar(false)}
                        />
                      </div>,
                      document.body
                    )}
                  </div>

                  {/* Leave End Date */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Leave End Date</label>
                    <button
                      ref={endBtnRef}
                      type="button"
                      onClick={() => {
                        const rect = endBtnRef.current?.getBoundingClientRect();
                        if (rect) {
                          const calendarHeight = 360;
                          const calendarWidth = 288;

                          let left = rect.left;
                          if (left + calendarWidth > window.innerWidth) {
                            left = window.innerWidth - calendarWidth - 20;
                          }

                          let top = rect.bottom + 4;
                          if (top + calendarHeight > window.innerHeight) {
                            top = rect.top - calendarHeight - 4;
                          }

                          setEndCalendarPos({ top: Math.max(10, top), left: Math.max(10, left) });
                        }
                        setShowEndCalendar(!showEndCalendar);
                        setShowStartCalendar(false);
                      }}
                      className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm text-left flex justify-between items-center bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <span className={leaveEndDate ? 'text-gray-800' : 'text-gray-400'}>
                        {leaveEndDate ? formatDateLong(new Date(leaveEndDate)) : 'Select date'}
                      </span>
                      <Calendar size={14} className="text-gray-400" />
                    </button>
                    {showEndCalendar && createPortal(
                      <div style={{ position: 'fixed', top: endCalendarPos.top, left: endCalendarPos.left, zIndex: 9999 }}>
                        <CalendarComponent
                          date={leaveEndDate ? new Date(leaveEndDate) : null}
                          onChange={date => { setLeaveEndDate(formatDateISO(date)); setShowEndCalendar(false); setLeaveTasks([]); }}
                          onClose={() => setShowEndCalendar(false)}
                        />
                      </div>,
                      document.body
                    )}
                  </div>

                  {/* Fetch Button */}
                  <div className="flex items-end">
                    <button
                      onClick={handleFetchLeaveTasks}
                      disabled={leaveTasksLoading || !leavePersonName || !leaveStartDate || !leaveEndDate}
                      className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {leaveTasksLoading ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Fetching...</>
                      ) : 'Show Tasks'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Success Banner */}
            {leaveSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-lg">✓</div>
                <div>
                  <p className="text-green-800 font-bold text-sm">Tasks shifted successfully!</p>
                  <p className="text-green-600 text-xs mt-0.5">All tasks have been reassigned to <strong>{shiftToPerson || 'the substitute'}</strong> and will appear in their task panel.</p>
                </div>
              </div>
            )}

            {/* Step 2: Tasks Preview + Shift */}
            {leaveTasks.length > 0 && !leaveSuccess && (
              <div className="bg-white shadow rounded-xl border border-blue-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-blue-800">Tasks During Leave Period</h3>
                    <p className="text-xs text-blue-500 mt-0.5">
                      {leaveTasks.length} task(s) found for <strong>{leavePersonName}</strong> between {leaveStartDate} and {leaveEndDate}
                    </p>
                  </div>

                  {/* Shift To + Confirm */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div>
                      <select
                        value={shiftToPerson}
                        onChange={e => setShiftToPerson(e.target.value)}
                        className="border border-blue-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white min-w-[180px]"
                      >
                        <option value="">Shift to person...</option>
                        {userNames.filter(n => n !== leavePersonName).map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleShiftTasks}
                      disabled={leaveSubmitting || !shiftToPerson || selectedLeaveTaskIds.length === 0}
                      className="py-2 px-5 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {leaveSubmitting ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Shifting...</>
                      ) : `✓ Confirm Shift (${selectedLeaveTaskIds.length})`}
                    </button>
                  </div>
                </div>

                <div className="overflow-auto max-h-[400px]">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left w-10">
                          <input
                            type="checkbox"
                            checked={leaveTasks.length > 0 && selectedLeaveTaskIds.length === leaveTasks.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeaveTaskIds(leaveTasks.map(t => t._uniqueId));
                              } else {
                                setSelectedLeaveTaskIds([]);
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Task</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Given By</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {leaveTasks.map((task, idx) => (
                        <tr key={task._uniqueId} className={`hover:bg-gray-50 transition-colors ${selectedLeaveTaskIds.includes(task._uniqueId) ? 'bg-blue-50/50' : ''}`}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedLeaveTaskIds.includes(task._uniqueId)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLeaveTaskIds(prev => [...prev, task._uniqueId]);
                                } else {
                                  setSelectedLeaveTaskIds(prev => prev.filter(id => id !== task._uniqueId));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 font-medium">{idx + 1}</td>
                          <td className="px-4 py-3" onClick={() => {
                            // Click row to toggle checkbox
                            if (selectedLeaveTaskIds.includes(task._uniqueId)) {
                              setSelectedLeaveTaskIds(prev => prev.filter(id => id !== task._uniqueId));
                            } else {
                              setSelectedLeaveTaskIds(prev => [...prev, task._uniqueId]);
                            }
                          }}>
                            <div className="text-sm font-bold text-gray-800 max-w-xs">{task.task_description}</div>
                            {task.issue_description && task._table === 'repair_tasks' && (
                              <div className="text-[10px] text-gray-500 font-medium mt-0.5">{task.issue_description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${task._table === 'checklist' ? 'bg-blue-100 text-blue-700' :
                              task._table === 'delegation' ? 'bg-blue-100 text-blue-700' :
                                task._table === 'maintenance_tasks' ? 'bg-orange-100 text-orange-700' :
                                  task._table === 'repair_tasks' ? 'bg-red-100 text-red-700' :
                                    'bg-green-100 text-green-700'
                              }`}>
                              {task._table.replace('_tasks', '').replace('checklist', 'Check').replace('delegation', 'Deleg')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-medium whitespace-nowrap">
                            {task.task_start_date ? new Date(task.task_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 font-medium truncate max-w-[100px]">{task.department || '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 font-bold">{task.given_by || task.filled_by || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty state after fetch */}
            {!leaveTasksLoading && hasFetched && leavePersonName && leaveStartDate && leaveEndDate && leaveTasks.length === 0 && !leaveSuccess && (
              <div className="bg-white border border-gray-200 rounded-xl px-6 py-10 text-center">
                <Calendar size={36} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No pending tasks found</p>
                <p className="text-gray-400 text-sm mt-1">There are no pending tasks for <strong>{leavePersonName}</strong> between the selected dates.</p>
                <button
                  onClick={handleShiftTasks}
                  disabled={leaveSubmitting}
                  className="mt-6 py-2.5 px-6 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-all flex items-center justify-center gap-2 mx-auto"
                >
                  {leaveSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating...</>
                  ) : 'Mark as On Leave Anyway'}
                </button>
              </div>
            )}
          </div>
        )}


        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="bg-white shadow rounded-lg overflow-hidden border border-blue-200">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-purple px-4 py-4 md:px-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center text-center sm:text-left">
                <h2 className="text-lg font-bold text-blue-700">Department Management</h2>

                <div className="flex border border-blue-200 rounded-lg overflow-hidden bg-white shadow-sm">
                  <button
                    className={`px-4 py-2 text-xs font-bold transition-all ${activeDeptSubTab === 'departments' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
                    onClick={() => {
                      setActiveDeptSubTab('departments');
                      dispatch(departmentDetails());
                    }}
                  >
                    Main Departments
                  </button>
                  <button
                    className={`px-4 py-2 text-xs font-bold border-l border-blue-100 transition-all ${activeDeptSubTab === 'givenBy' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
                    onClick={() => {
                      setActiveDeptSubTab('givenBy');
                      dispatch(givenByDetails());
                    }}
                  >
                    Assign From
                  </button>
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md m-4">
                <p className="text-red-600">Error: {error}</p>
              </div>
            )}

            {/* Departments Sub-tab - Show only department names */}
            {activeDeptSubTab === 'departments' && !loading && (
              <div className="max-h-[calc(100vh-250px)] overflow-auto scrollbar-thin">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {department && department.length > 0 ? (
                        department.map((dept, index) => (
                          <tr key={`dept-${dept.id || index}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.department}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex space-x-2 justify-end">
                                <button
                                  onClick={() => handleEditDepartment(dept.id)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded-md"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm('Delete this department?')) {
                                      dispatch(deleteDepartment(dept.id));
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded-md"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                            No departments found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Given By Sub-tab - Show only given_by values */}
            {activeDeptSubTab === 'givenBy' && !loading && (
              <div className="h-[calc(100vh-275px)] overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assign From</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {givenBy && givenBy.length > 0 ? (
                      givenBy.map((item, index) => (
                        <tr key={`given-${item.id || index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.given_by}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex space-x-2 justify-end">
                              <button onClick={() => handleEditDepartment(item.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => {
                                if (window.confirm('Delete this entry?')) {
                                  dispatch(deleteAssignFrom(item.id));
                                }
                              }} className="p-1 text-red-600 hover:bg-red-50 rounded-md">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">No data found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}





        {/* Department / Category Modal */}
        {showDeptModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setShowDeptModal(false)}
            ></div>

            <div className="relative bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-white/50 max-h-[90vh] flex flex-col">
              {/* Premium Header */}
              <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-500 px-10 py-8 relative">
                <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]"></div>
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      {activeDeptSubTab === 'givenBy'
                        ? (isEditing ? 'Update Designation' : 'Create Designation')
                        : (isEditing ? 'Update Department' : 'Create Department')}
                    </h3>
                    <p className="text-white/70 text-xs font-bold uppercase tracking-[0.2em] mt-1">
                      Organize your workforce structure
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeptModal(false)}
                    className="p-2.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-all hover:rotate-90"
                  >
                    <X size={22} />
                  </button>
                </div>
              </div>

              <div className="p-4 md:p-8 overflow-y-auto flex-1">
                <form onSubmit={isEditing ? handleUpdateDepartment : handleAddDepartment} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="block text-sm font-bold text-gray-700 ml-1">
                      {activeDeptSubTab === 'givenBy' ? 'Assign From Name' : 'Department Name'}
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      value={deptForm.name}
                      onChange={handleDeptInputChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder={activeDeptSubTab === 'givenBy' ? 'e.g. CEO' : 'e.g. Marketing'}
                    />
                  </div>


                  {deptForm.name === "Temperature" && (
                    <p className="text-xs text-amber-600 ml-1 mt-1 font-bold">
                      ⚠️ Temperature strictly uses: &apos;Low&apos;, &apos;Medium&apos;, &apos;High&apos;
                    </p>
                  )}






                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-50 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowDeptModal(false)}
                      className="px-8 py-3 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-10 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black rounded-2xl hover:from-purple-700 hover:to-indigo-700 shadow-[0_10px_20px_-5px_rgba(192,38,211,0.4)] hover:shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-widest"
                    >
                      <Save size={16} strokeWidth={3} />
                      {currentDeptId ? 'Update Entry' : 'Save Entry'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </ERPLayout>
  );
};

export default Setting;
