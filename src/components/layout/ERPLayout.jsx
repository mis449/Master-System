
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  User,
  ChevronRight,
  ChevronDown,
  Command,
  ArrowRight,
  ListTodo,
  PlusSquare,
  Users2,
  Calendar,
  Palmtree,
  CheckCircle,
  History,
  Target,
  FileBarChart,
  CalendarDays,
  AlertTriangle,
  Zap,
  CalendarCheck,
  IndianRupee
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import aceLogo from '../../assets/Ace_Logoo.jpg';

const ERPLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const searchRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();

  const modules = [
    {
      id: 'dashboard',
      label: 'Profile',
      icon: User,
      path: '/dashboard/admin',
      roles: ['admin', 'manager', 'user', 'hod'],
      section: 'CHECKLIST & DELEGATIONS',
      subItems: []
    },
    {
      id: 'checklist',
      label: 'Checklist & Delegation',
      icon: CheckSquare,
      path: '/dashboard/checklist',
      roles: ['admin', 'manager', 'user', 'hod'],
      section: 'CHECKLIST & DELEGATIONS',
      subItems: [
        { label: 'Dashboard', path: '/dashboard/admin?view=checklist', icon: LayoutDashboard, roles: ['admin', 'hod', 'user'] },
        { label: 'Task Manager List', path: '/dashboard/quick-task', icon: Zap, roles: ['admin'] },
        { label: 'Assign Task', path: '/dashboard/assign-task', icon: PlusSquare, roles: ['admin', 'hod'] },
        { label: 'Delegation', path: '/dashboard/delegation', icon: Users2, roles: ['admin', 'hod', 'user'] },
        { label: 'Checklist', path: '/dashboard/task', icon: CalendarCheck, roles: ['admin', 'hod', 'user'] },
        { label: 'Calendar', path: '/dashboard/calendar', icon: Calendar, roles: ['admin', 'hod', 'user'] },
        { label: 'Holiday List', path: '/dashboard/holiday-list', icon: Palmtree, roles: ['admin', 'hod'] },
        { label: 'Working Day Calendar', path: '/dashboard/working-day-calendar', icon: CalendarDays, roles: ['admin', 'hod'] },
        { label: 'Admin Approval', path: '/dashboard/admin-approval', icon: CheckCircle, roles: ['admin', 'hod'] },
        { label: 'Settings', path: '/dashboard/setting', icon: Settings, roles: ['admin', 'hod', 'user'] },
      ]
    },
    {
      id: 'salary',
      label: 'Salary Management',
      icon: IndianRupee,
      path: '/dashboard/salary',
      roles: ['admin'],
      section: 'SALARY MANAGEMENT',
      subItems: []
    },
    {
      id: 'mis',
      label: 'MIS Report System',
      icon: BarChart3,
      path: '/dashboard/mis-dashboard',
      roles: ['admin'],
      section: 'MIS REPORTS',
      subItems: [
        { label: 'Dashboard', path: '/dashboard/mis-dashboard', icon: LayoutDashboard, roles: ['admin'] },
        { label: 'History', path: '/dashboard/mis-history', icon: History, roles: ['admin'] },
        { label: 'KPI & KRA', path: '/dashboard/kpi-kra', icon: Target, roles: ['admin'] },
      ]
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: ShoppingCart,
      path: '/sales',
      roles: ['admin', 'manager', 'hod'],
      section: 'SCALES',
      subItems: []
    },
    {
      id: 'purchase',
      label: 'Purchase',
      icon: Package,
      path: '/purchase',
      roles: ['admin', 'manager'],
      section: 'PURCHASE',
      subItems: []
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      path: '/dashboard/user-management',
      roles: ['admin', 'user', 'hod', 'manager'],
      section: 'USER MANAGEMENT',
      subItems: []
    },
  ];

  const [activeModuleId, setActiveModuleId] = useState(() => {
    const path = location.pathname;
    const search = location.search;

    if (path.startsWith('/sales')) return 'sales';
    if (path.startsWith('/purchase')) return 'purchase';
    if (path.startsWith('/dashboard/user-management')) return 'users';
    if (path.startsWith('/dashboard/salary')) return 'salary';

    if (path.includes('mis') || path.includes('kpi-kra')) return 'mis';
    if (path === '/dashboard/admin' || path === '/dashboard') {
      if (search.includes('view=checklist')) return 'checklist';
      return 'dashboard';
    }
    return 'checklist';
  });

  const activeModule = modules.find(m => m.id === activeModuleId) || modules[0];

  useEffect(() => {
    const path = location.pathname;
    const search = location.search;

    if (path.startsWith('/sales')) setActiveModuleId('sales');
    else if (path.startsWith('/purchase')) setActiveModuleId('purchase');
    else if (path.startsWith('/dashboard/user-management')) setActiveModuleId('users');
    else if (path.startsWith('/dashboard/salary')) setActiveModuleId('salary');

    else if (path.includes('mis') || path.includes('kpi-kra')) setActiveModuleId('mis');
    else if (path === '/dashboard/admin' || path === '/dashboard') {
      if (search.includes('view=checklist')) setActiveModuleId('checklist');
      else setActiveModuleId('dashboard');
    }
    else setActiveModuleId('checklist');
  }, [location]);

  const filteredModules = modules
    .filter(m => !m.roles || m.roles.includes(role?.toLowerCase()))
    .map(m => ({
      ...m,
      subItems: m.subItems.filter(s => !s.roles || s.roles.includes(role?.toLowerCase()))
    }));

  const filteredMenuItems = filteredModules.flatMap(m => [
    m,
    ...m.subItems.map(s => ({ ...s, id: `${m.id}-${s.label}` }))
  ]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = [];

    // Search in menu items
    filteredMenuItems.forEach(item => {
      if (item.label.toLowerCase().includes(query)) {
        results.push({
          type: 'module',
          id: item.id,
          label: item.label,
          path: item.path,
          icon: item.icon
        });
      }
    });

    // Special Task Search (if numeric or starts with #)
    if (/^\d+$/.test(query) || query.startsWith('#')) {
      const taskId = query.startsWith('#') ? query.slice(1) : query;
      results.push({
        type: 'task',
        id: `task-${taskId}`,
        label: `Go to Task #${taskId}`,
        path: `/dashboard/checklist?search=${taskId}`,
        icon: Search
      });
    }

    setSearchResults(results);
  }, [searchQuery, role]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar Desktop */}
      {/* Sidebar Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden md:flex flex-col bg-white border-r border-gray-200 shadow-2xl transition-all duration-500 ease-in-out
          ${isSidebarOpen ? 'w-52' : 'w-16'}`}
      >
        {/* Header - Brand & Logo */}
        <div className="h-16 flex items-center px-3 border-b border-gray-100 overflow-hidden shrink-0">
          <div className="flex items-center gap-3 min-w-max">
            <img
              src={aceLogo}
              alt="Logo"
              className="w-10 h-10 rounded-xl shadow-[0_8px_16px_rgba(37,99,235,0.15)] border border-gray-50 flex-shrink-0"
            />
            {isSidebarOpen && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-500">
                <span className="text-sm font-black text-gray-800 tracking-tight">Parekh</span>
                <span className="bg-blue-600 text-white text-[7px] font-black px-2 py-1 rounded-md tracking-wider uppercase shadow-sm shadow-blue-200">Gallerium</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-6">
          <nav className="px-3 space-y-1.5">
            {filteredModules.map((module, index) => {
              const isActiveModule = activeModuleId === module.id;
              const showSectionHeader = index === 0 || filteredModules[index - 1].section !== module.section;

              return (
                <div key={module.id} className="space-y-1">
                  {showSectionHeader && !isSidebarOpen && (
                    <div className="h-px bg-gray-100 my-4 first:hidden" />
                  )}

                  <button
                    onClick={() => {
                      setActiveModuleId(module.id);
                      if (module.subItems.length === 0) {
                        navigate(module.path);
                      } else if (!isSidebarOpen) {
                        setIsSidebarOpen(true);
                      }
                    }}
                    title={!isSidebarOpen ? module.label : ""}
                    className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-300 group relative
                      ${isActiveModule
                        ? 'bg-blue-50 text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <module.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 
                      ${isActiveModule ? 'scale-110' : 'group-hover:scale-110'}`}
                    />

                    {isSidebarOpen && (
                      <span className="ml-2.5 font-bold text-[12px] md:text-[13px] leading-tight tracking-tight flex-1 text-left animate-in fade-in slide-in-from-left-2 duration-300">
                        {module.label}
                      </span>
                    )}

                    {isSidebarOpen && module.subItems.length > 0 && (
                      <ChevronRight className={`ml-auto w-4 h-4 transition-transform duration-300 
                        ${isActiveModule ? 'rotate-90 text-blue-600' : 'text-gray-400'}`}
                      />
                    )}

                    {/* Active Indicator Bar */}
                    {isActiveModule && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full"
                      />
                    )}
                  </button>

                  {/* Sub-items list (only when expanded and active) */}
                  {isSidebarOpen && isActiveModule && module.subItems.length > 0 && (
                    <div className="ml-9 space-y-1 mt-1 animate-in slide-in-from-top-2 duration-300">
                      {module.subItems.map((item, idx) => {
                        const isSubActive = location.pathname === item.path;
                        return (
                          <Link
                            key={idx}
                            to={item.path}
                            className={`flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all relative group
                              ${isSubActive
                                ? 'text-blue-700 bg-blue-50/50'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                          >
                            <span>{item.label}</span>
                            {isSubActive && (
                              <div className="absolute right-2 w-1 h-1 bg-blue-600 rounded-full" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer - User Profile & Logout */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
          <div className={`flex items-center gap-3 p-2 bg-white rounded-xl border border-gray-100 shadow-sm transition-all
            ${isSidebarOpen ? 'px-3' : 'justify-center'}`}
          >
            <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xs shadow-md">
              {user?.charAt(0) || 'A'}
            </div>

            {isSidebarOpen && (
              <div className="flex flex-col truncate flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-[11px] font-black text-gray-900 truncate tracking-tight">{user || 'Admin'}</span>
                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">{role || 'User'}</span>
              </div>
            )}

            {isSidebarOpen && (
              <button
                onClick={logout}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {!isSidebarOpen && (
            <button
              onClick={logout}
              className="w-full mt-2 p-2 flex justify-center text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 md:hidden 
          ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleMobileMenu}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[70] w-72 bg-white transition-transform duration-300 transform md:hidden flex flex-col
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-700">
          <div className="flex items-center gap-3">
            <img src={aceLogo} alt="Logo" className="w-10 h-10 rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.2)] border-2 border-white/20" />
            <span className="font-black text-white text-xs tracking-tight">Parekh <span className="text-[10px] opacity-80 font-medium">Gallerium</span></span>
          </div>
          <button onClick={toggleMobileMenu} className="p-1 rounded-lg text-white/80 hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {filteredModules.map((module, index) => {
            const showSectionHeader = index === 0 || filteredModules[index - 1].section !== module.section;
            return (
              <div key={module.id} className="space-y-1">
                {showSectionHeader && (
                  <div className="px-4 py-2 mt-2 first:mt-0">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {module.section}
                    </span>
                  </div>
                )}

                {/* If module has subItems, show subItems. If not, show the module itself. */}
                {module.subItems.length > 0 ? (
                  module.subItems.map((item, idx) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={idx}
                        to={item.path}
                        onClick={toggleMobileMenu}
                        className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 relative group
                          ${isActive
                            ? 'bg-blue-50/50 text-blue-600'
                            : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                        <span className={`ml-3 font-semibold text-sm ${isActive ? 'text-blue-700' : ''}`}>{item.label}</span>
                        {isActive && (
                          <motion.div
                            layoutId="activeBarMobile"
                            className="absolute right-0 top-1 bottom-1 w-1 bg-blue-600 rounded-l-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                          />
                        )}
                      </Link>
                    );
                  })
                ) : (
                  <Link
                    to={module.path}
                    onClick={toggleMobileMenu}
                    className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 relative group
                      ${location.pathname === module.path
                        ? 'bg-blue-50/50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <module.icon className={`w-5 h-5 flex-shrink-0 ${location.pathname === module.path ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span className={`ml-3 font-semibold text-sm ${location.pathname === module.path ? 'text-blue-700' : ''}`}>{module.label}</span>
                    {location.pathname === module.path && (
                      <motion.div
                        layoutId="activeBarMobile"
                        className="absolute right-0 top-1 bottom-1 w-1 bg-blue-600 rounded-l-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                      />
                    )}
                  </Link>
                )}
              </div>
            );
          })}
          <button
            onClick={logout}
            className="flex items-center px-4 py-3.5 w-full rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200 mt-4 border border-dashed border-red-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="ml-3 font-bold">Logout System</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'md:ml-52' : 'md:ml-16'}`}>
        {/* Navbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-40 backdrop-blur-md bg-white/80">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hidden md:block transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={toggleMobileMenu}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 md:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center text-[10px] font-bold tracking-tight">
              <span className="hidden sm:inline font-black text-white bg-gradient-to-r from-blue-600 to-indigo-700 px-3 py-1.5 rounded-lg uppercase tracking-[0.1em] text-[10px] mr-3 shadow-lg shadow-blue-100">Parekh Gallerium</span>
              <span className="hidden sm:inline text-gray-400 font-bold text-[10px]">{activeModule.label}</span>
              <ChevronRight className="w-3 h-3 mx-1.5 hidden sm:block text-gray-300" />
              <span className="text-gray-900 font-black truncate max-w-[150px] sm:max-w-none text-[10px]">
                {activeModule.subItems.find(item => item.path === location.pathname)?.label || 'Overview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search */}
            <div className="relative hidden lg:block group" ref={searchRef}>
              <div className="relative">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isSearchFocused ? 'text-blue-600' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Global Search (Module or #TaskID)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className={`pl-10 pr-10 py-2 bg-gray-100 border-none rounded-full text-sm transition-all outline-none
                    ${isSearchFocused ? 'w-80 bg-white ring-2 ring-blue-500 shadow-lg' : 'w-64 focus:bg-white'}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300">
                  <Command className="w-2.5 h-2.5" /> K
                </div>
              </div>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {isSearchFocused && searchQuery.trim() !== '' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full mt-3 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100]"
                  >
                    <div className="p-2">
                      {searchResults.length > 0 ? (
                        <div className="space-y-1">
                          {searchResults.map((result, idx) => (
                            <button
                              key={result.id}
                              onClick={() => {
                                navigate(result.path);
                                setIsSearchFocused(false);
                                setSearchQuery('');
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-blue-50 group transition-all"
                            >
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <result.icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900 leading-tight">{result.label}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-0.5">{result.type}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center">
                          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="w-6 h-6 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">No results found for &quot;{searchQuery}&quot;</p>
                        </div>
                      )}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{searchResults.length} Results</span>
                        <span className="text-[10px] font-bold text-blue-600">ENTER TO SELECT</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications */}
            <button className="p-2.5 rounded-full text-gray-500 hover:bg-gray-100 relative group transition-all">
              <Bell className="w-5 h-5 group-hover:shake" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
            </button>

            <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block" />

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white overflow-hidden">
                  <User className="w-5 h-5" />
                </div>
                <div className="hidden sm:flex flex-col items-start mr-2">
                  <span className="text-sm font-bold text-gray-900 leading-none">{user || 'Admin User'}</span>
                  <span className="text-[10px] text-blue-600 font-black uppercase tracking-tighter mt-1">{role || 'Role'}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-gray-50 mb-1">
                    <p className="text-sm font-black text-gray-900">{user || 'Admin'}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{localStorage.getItem('email_id')}</p>
                  </div>
                  <Link 
                    to="/dashboard/admin" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-400" /> My Profile
                  </Link>
                  <Link 
                    to="/dashboard/user-management" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" /> Account Settings
                  </Link>
                  <div className="h-px bg-gray-50 my-1" />
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors font-semibold"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0); }
          20%, 60% { transform: rotate(-10deg); }
          40%, 80% { transform: rotate(10deg); }
        }
        .group:hover .group-hover\\:shake {
          animation: shake 0.5s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

export default ERPLayout;
