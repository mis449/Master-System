import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    ClipboardList, Calendar, X, Mic, Square, Trash2, Plus, Save, Loader2, CheckCircle2, Clock, FileCheck, Play, Pause, ExternalLink, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReactMediaRecorder } from "react-media-recorder";
import ERPLayout from "../../components/layout/ERPLayout";
import AudioPlayer from "../../components/AudioPlayer";
import { useDispatch, useSelector } from "react-redux";
import { assignTaskInTable, uniqueDepartmentData, uniqueDoerNameData, uniqueGivenByData } from "../../redux/slice/assignTaskSlice";
import { customDropdownDetails } from "../../redux/slice/settingSlice";
import supabase from "../../SupabaseClient";
import CalendarComponent from "../../components/CalendarComponent";
import { sendTaskAssignmentNotification } from "../../services/whatsappService";
import { useMagicToast } from "../../context/MagicToastContext";

const formatDate = (date) => date ? date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
const formatDateISO = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const FREQUENCY_OPTIONS = [
    "One Time (No Recurrence)", "Alternate Day", "Daily", "Weekly",
    "Fortnight", "Monthly", "Quarterly", "Half Yearly", "Yearly"
];

const defaultTask = () => ({
    id: Date.now() + Math.random(),
    department: "",
    givenBy: "",
    doer: "",
    description: "",
    frequency: "One Time (No Recurrence)",
    duration: "",
    enableReminders: true,
    requireAttachment: false,
    date: null,
    time: "09:00",
    recordedAudio: null,
    showCalendar: false,
    references: [],
});

// --- AUDIO UTILITIES ---
const isAudioUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('http') && (
        url.includes('all_images') ||
        url.includes('voice-notes') ||
        url.match(/\.(mp3|wav|ogg|webm|m4a|aac)(\?.*)?$/i)
    );
};

const getYouTubeId = (url) => {
    if (!url || typeof url !== 'string') return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};


// Single Task Card
function TaskCard({ task, index, total, department, doerName, givenBy, dispatch, onUpdate, onRemove }) {
    const handleChange = (e) => {
        onUpdate(task.id, { [e.target.name]: e.target.value });
    };

    // Filter doers based on task date and leave status
    const getFilteredDoers = () => {
        if (!doerName || !Array.isArray(doerName)) return [];

        const taskD = task.date ? new Date(task.date) : new Date();
        taskD.setHours(0, 0, 0, 0);

        return doerName.filter(user => {
            if (typeof user === 'string') return true;

            if (user.status === 'inactive') return false;

            // Leave filter
            if ((user.status === 'on leave' || user.status === 'on_leave') && user.leave_date && user.leave_end_date) {
                const leaveS = new Date(user.leave_date);
                const leaveE = new Date(user.leave_end_date);
                leaveS.setHours(0, 0, 0, 0);
                leaveE.setHours(0, 0, 0, 0);

                if (taskD >= leaveS && taskD <= leaveE) {
                    return false;
                }
            }

            // HOD Restriction & Reporting Group Filter
            const currentU = (localStorage.getItem("user-name") || "").toLowerCase().trim();
            const currentR = (localStorage.getItem("role") || "").toLowerCase().trim();

            if (currentR === "hod") {
                const dName = (user.user_name || user.name || "").toLowerCase().trim();
                const reportedBy = (user.reported_by || "").toLowerCase().trim();

                // Only show themselves OR their direct reports
                if (dName !== currentU && reportedBy !== currentU) return false;

                // If it's themselves, check for explicit self-assign rights
                if (dName === currentU && !user.can_self_assign) return false;
            }

            return true;
        });
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible hover:shadow-md transition-all duration-300">
            {/* Card Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                        {index + 1}
                    </div>
                    <span className="text-sm font-bold text-blue-800">Task {index + 1}</span>
                    {task.doer && <span className="text-xs text-blue-600 font-medium">— {task.doer}</span>}
                </div>
                {total > 1 && (
                    <button type="button" onClick={() => onRemove(task.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="p-5 space-y-4">
                {/* Department & Assign From */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                            Department <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="department"
                            value={task.department}
                            onChange={(e) => {
                                onUpdate(task.id, { department: e.target.value, doer: "" });
                                dispatch(uniqueDoerNameData(e.target.value));
                            }}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                        >
                            <option value="">Select Department</option>
                            {department.map((d, i) => (
                                <option key={i} value={typeof d === 'string' ? d : d.department}>
                                    {typeof d === 'string' ? d : d.department}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                            Assign From <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="givenBy"
                            value={task.givenBy}
                            onChange={handleChange}
                            disabled={(localStorage.getItem("role")?.toUpperCase() === "HOD" || (localStorage.getItem("role")?.toLowerCase() === "admin" && localStorage.getItem("user-name")?.toLowerCase() !== "admin"))}
                            className={`w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm ${(localStorage.getItem("role")?.toUpperCase() === "HOD" || (localStorage.getItem("role")?.toLowerCase() === "admin" && localStorage.getItem("user-name")?.toLowerCase() !== "admin")) ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <option value="">Select Assign From</option>
                            {givenBy.map((g, i) => <option key={i} value={g}>{g}</option>)}
                        </select>
                    </div>
                </div>

                {/* Doer */}
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                        Doer&apos;s Name <span className="text-red-500">*</span>
                    </label>
                    <select
                        name="doer"
                        value={task.doer}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                    >
                        <option value="">Select Doer</option>
                        {getFilteredDoers().map((d, i) => (
                            <option key={i} value={typeof d === 'string' ? d : d.user_name}>
                                {typeof d === 'string' ? d : d.user_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Description, Reference & Voice Note */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center -mb-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                            Task Description <span className="text-red-500">*</span>
                        </label>
                        <select
                            value="none"
                            onChange={(e) => {
                                if (e.target.value === 'none') return;
                                const newRefs = [...(task.references || []), { id: Date.now() + Math.random(), type: e.target.value, link: "", file: null }];
                                onUpdate(task.id, { references: newRefs });
                            }}
                            className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-purple-100 border border-blue-200 rounded px-2 py-1 outline-none cursor-pointer transition-colors"
                        >
                            <option value="none">+ Add Reference</option>
                            <option value="image">Image (Upload)</option>
                            <option value="video">Video (Link)</option>
                            <option value="pdf">PDF (Link)</option>
                            <option value="link">Web Link</option>
                        </select>
                    </div>
                    {task.references && task.references.map((ref, i) => {
                        const ytId = getYouTubeId(ref.link);
                        return (
                            <div key={ref.id} className={`p-2.5 border rounded-xl flex flex-col sm:flex-row gap-2 sm:items-center mt-2 group relative transition-all ${ytId ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-blue-50 border-blue-200'}`}>
                                <span className={`text-[10px] font-black flex-shrink-0 uppercase tracking-widest w-20 flex items-center gap-1.5 ${ytId ? 'text-red-700' : 'text-blue-700'}`}>
                                    {(ytId || ref.type === 'video') && <Play size={10} fill="currentColor" />}
                                    {ytId || ref.type === 'video' ? 'Video:' : `${ref.type}:`}
                                </span>
                                {ref.type === 'image' ? (
                                    <div className="flex-1 flex items-center gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const newRefs = [...task.references];
                                                newRefs[i].file = e.target.files[0];
                                                onUpdate(task.id, { references: newRefs });
                                            }}
                                            className="text-[10px] w-full text-blue-700 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer uppercase tracking-wider"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-1 flex items-center gap-2">
                                        <input
                                            type="url"
                                            placeholder="https://"
                                            value={ref.link}
                                            onChange={(e) => {
                                                const newRefs = [...task.references];
                                                newRefs[i].link = e.target.value;
                                                onUpdate(task.id, { references: newRefs });
                                            }}
                                            className={`flex-1 w-full px-3 py-1.5 text-xs font-medium bg-white border rounded-lg outline-none transition-all ${ytId ? 'border-red-200 focus:ring-2 focus:ring-red-100 text-red-900' : 'border-blue-200 focus:ring-2 focus:ring-blue-100 text-blue-900'}`}
                                        />
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    {ref.link && (
                                        <button
                                            type="button"
                                            onClick={() => window.open(ref.link, '_blank')}
                                            className={`p-1.5 rounded-lg transition-all ${ytId ? 'text-red-400 hover:bg-red-100 hover:text-red-600' : 'text-blue-400 hover:bg-blue-100 hover:text-blue-600'}`}
                                            title="External Preview"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newRefs = task.references.filter(r => r.id !== ref.id);
                                            onUpdate(task.id, { references: newRefs });
                                        }}
                                        className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                        title="Remove Reference"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    <ReactMediaRecorder
                        audio
                        onStop={(blobUrl, blob) => onUpdate(task.id, { recordedAudio: { blobUrl, blob } })}
                        render={({ status, startRecording, stopRecording, clearBlobUrl }) => (
                            <div>
                                {status !== 'recording' && (
                                    <div className="relative mb-3">
                                        <textarea
                                            name="description"
                                            value={task.description}
                                            onChange={handleChange}
                                            rows="3"
                                            placeholder="Enter task description..."
                                            className="w-full p-3 pr-11 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-purple-500 outline-none resize-none bg-gray-50 focus:bg-white transition-all text-sm"
                                        />
                                        <button type="button" onClick={startRecording} className="absolute bottom-2.5 right-2.5 p-1.5 bg-purple-100 text-blue-600 rounded-full hover:bg-purple-200 transition-all" title="Record Voice Note">
                                            <Mic className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                {status === 'recording' && (
                                    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg animate-pulse mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                            <span className="text-red-600 font-bold text-sm">Recording...</span>
                                        </div>
                                        <button type="button" onClick={stopRecording} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold">
                                            <Square className="w-3 h-3" /> Stop
                                        </button>
                                    </div>
                                )}
                                {task.recordedAudio && status !== 'recording' && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                                                <Mic className="w-3 h-3" /> Voice Note Attached
                                            </span>
                                            <button type="button" onClick={() => { clearBlobUrl(); onUpdate(task.id, { recordedAudio: null }); }} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
                                                <Trash2 className="w-3 h-3" /> Remove
                                            </button>
                                        </div>
                                        <AudioPlayer url={task.recordedAudio.blobUrl} />
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>

                {/* Date, Time, Frequency, Duration */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Planned Date <span className="text-red-500">*</span></label>
                        <button
                            type="button"
                            onClick={() => !task.dateLocked && onUpdate(task.id, { showCalendar: !task.showCalendar })}
                            className={`w-full px-3 py-2.5 text-left border border-gray-200 rounded-lg bg-gray-50 hover:bg-white focus:ring-2 focus:ring-blue-500 transition-all flex items-center justify-between text-xs ${task.dateLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                            disabled={task.dateLocked}
                        >
                            <span className={task.date ? "text-gray-800" : "text-gray-400"}>
                                {task.date ? formatDate(task.date) : "Select"}
                            </span>
                            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        </button>
                        {task.showCalendar && (
                            <div className="absolute top-full left-0 mt-1 z-50">
                                <CalendarComponent
                                    date={task.date}
                                    onChange={(d) => onUpdate(task.id, { date: d, showCalendar: false })}
                                    onClose={() => onUpdate(task.id, { showCalendar: false })}
                                />
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Time</label>
                        <input
                            type="time"
                            name="time"
                            value={task.time}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        />
                    </div>                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Frequency</label>
                        <select
                            name="frequency"
                            value={task.frequency}
                            onChange={handleChange}
                            disabled={task.frequencyLocked}
                            className={`w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs ${task.frequencyLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {FREQUENCY_OPTIONS.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Duration <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="duration"
                            value={task.duration}
                            onChange={handleChange}
                            placeholder="e.g. 30 mins"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => onUpdate(task.id, { enableReminders: !task.enableReminders })}
                        className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition-all ${task.enableReminders ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                        <span>Enable Reminders</span>
                        <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${task.enableReminders ? 'bg-blue-600' : 'bg-gray-300'}`}>
                            <div className={`bg-white w-3 h-3 rounded-full shadow transform transition-transform ${task.enableReminders ? 'translate-x-4' : ''}`} />
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate(task.id, { requireAttachment: !task.requireAttachment })}
                        className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-bold transition-all ${task.requireAttachment ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                        <span>Require Attachment</span>
                        <div className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${task.requireAttachment ? 'bg-blue-600' : 'bg-gray-300'}`}>
                            <div className={`bg-white w-3 h-3 rounded-full shadow transform transition-transform ${task.requireAttachment ? 'translate-x-4' : ''}`} />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ChecklistTask() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { showToast } = useMagicToast();
    const { department, doerName, givenBy } = useSelector((state) => state.assignTask);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [holidays, setHolidays] = useState([]);

    // Per-task list
    const [tasks, setTasks] = useState([
        {
            ...defaultTask(),
            givenBy: (localStorage.getItem("role")?.toUpperCase() === "HOD" || (localStorage.getItem("role")?.toLowerCase() === "admin" && localStorage.getItem("user-name")?.toLowerCase() !== "admin")) ? localStorage.getItem("user-name") : ""
        }
    ]);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [allGeneratedTasks, setAllGeneratedTasks] = useState([]);

    useEffect(() => {
        const fetchHolidays = async () => {
            const { data } = await supabase.from('holidays').select('holiday_date');
            if (data) setHolidays(data.map(h => h.holiday_date));
        };
        fetchHolidays();
        dispatch(uniqueDepartmentData());
        dispatch(uniqueGivenByData());
        dispatch(uniqueDoerNameData());
        dispatch(customDropdownDetails());

        // Handle URL parameters for pre-filling
        const params = new URLSearchParams(window.location.search);
        const dateParam = params.get('date');
        const typeParam = params.get('type');

        if (dateParam) {
            const parsedDate = new Date(dateParam + 'T00:00:00');
            setTasks(prev => {
                const newTasks = [...prev];
                if (newTasks.length > 0) {
                    newTasks[0] = {
                        ...newTasks[0],
                        date: isNaN(parsedDate.getTime()) ? null : parsedDate,
                        frequency: typeParam === 'delegation' ? "One Time (No Recurrence)" : newTasks[0].frequency,
                        dateLocked: true,
                        frequencyLocked: typeParam === 'delegation'
                    };
                }
                return newTasks;
            });
        }
    }, [dispatch]);

    const updateTask = (id, updates) => setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const addTask = () => setTasks(prev => {
        const lastTask = prev[prev.length - 1];
        return [...prev, {
            ...defaultTask(),
            department: lastTask?.department || "",
            givenBy: (localStorage.getItem("role")?.toUpperCase() === "HOD" || (localStorage.getItem("role")?.toLowerCase() === "admin" && localStorage.getItem("user-name")?.toLowerCase() !== "admin")) ? localStorage.getItem("user-name") : (lastTask?.givenBy || ""),
            doer: lastTask?.doer || ""
        }];
    });
    const removeTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

    const freqMap = {
        "One Time (No Recurrence)": "one-time",
        "Alternate Day": "alternate-day",
        "Daily": "daily",
        "Weekly": "weekly",
        "Fortnight": "fortnight",
        "Monthly": "monthly",
        "Quarterly": "quarterly",
        "Half Yearly": "half-yearly",
        "Yearly": "yearly"
    };

    const getLocalDateString = (date) => {
        if (!date) return "";
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const generateDatesForTask = async (task) => {
        const freqKey = freqMap[task.frequency] || "one-time";
        const dates = [];
        const startDate = task.date;
        const time = task.time;
        const endDate = new Date(startDate);
        if (freqKey !== "one-time") endDate.setFullYear(endDate.getFullYear() + 1);

        const { data: workingData } = await supabase.from('working_day_calender').select('working_date').gte('working_date', getLocalDateString(startDate)).lte('working_date', getLocalDateString(endDate));
        const workingDaySet = new Set(workingData?.map(d => d.working_date) || []);
        const isHoliday = (d) => holidays.includes(getLocalDateString(d));
        const isWorkingDay = (d) => workingDaySet.has(getLocalDateString(d));
        const toLocalISO = (d) => `${getLocalDateString(d)}T${time}:00`;
        const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

        if (freqKey === "one-time") {
            const d = new Date(startDate);
            if (isHoliday(d) || !isWorkingDay(d)) return [];
            dates.push(toLocalISO(d));
            return dates;
        }

        if (freqKey === 'daily' || freqKey === 'alternate-day') {
            let d = new Date(startDate);
            const validDays = [];
            while (d <= endDate) {
                if (!isHoliday(d) && isWorkingDay(d)) validDays.push(new Date(d));
                d.setDate(d.getDate() + 1);
            }
            if (freqKey === 'daily') validDays.forEach(day => dates.push(toLocalISO(day)));
            else validDays.forEach((day, i) => { if (i % 2 === 0) dates.push(toLocalISO(day)); });
        } else {
            let current = new Date(startDate);
            let attempts = 0;
            while (current <= endDate && attempts < 1000) {
                attempts++;
                let target = new Date(current);
                while (target <= endDate && (isHoliday(target) || !isWorkingDay(target))) target.setDate(target.getDate() + 1);
                if (target <= endDate) dates.push(toLocalISO(target));
                if (freqKey === 'weekly') current = addDays(current, 7);
                else if (freqKey === 'fortnight') current = addDays(current, 14);
                else if (freqKey === 'monthly') current.setMonth(current.getMonth() + 1);
                else if (freqKey === 'quarterly') current.setMonth(current.getMonth() + 3);
                else if (freqKey === 'half-yearly') current.setMonth(current.getMonth() + 6);
                else if (freqKey === 'yearly') current.setFullYear(current.getFullYear() + 1);
                else break;
            }
        }
        return dates;
    };

    const handlePreview = async () => {
        setIsSubmitting(true);
        try {
            const validationResults = await Promise.all(tasks.map(async (t, i) => {
                if (!t.department || !t.givenBy) return { success: false, message: `Task ${i + 1}: Please select Department and Assign From.` };
                if (!t.doer || !t.date || (!t.description && !t.recordedAudio && (!t.references || t.references.length === 0))) return { success: false, message: `Task ${i + 1}: Please fill in Doer, Date, and at least one instructional detail.` };
                if (!t.duration) return { success: false, message: `Task ${i + 1}: Please specify duration.` };
                if (t.frequency === "One Time (No Recurrence)") {
                    const dateStr = formatDateISO(t.date);
                    const isH = holidays.includes(dateStr);
                    const { data } = await supabase.from('working_day_calender').select('working_date').eq('working_date', dateStr);
                    if (isH || !(data && data.length > 0)) return { success: false, message: `Task ${i + 1}: ${dateStr} is a holiday or non-working day.` };
                }
                return { success: true };
            }));

            const failed = validationResults.find(r => !r.success);
            if (failed) { showToast(failed.message, 'error'); setIsSubmitting(false); return; }

            const genPromises = tasks.map(async (task) => {
                const dates = await generateDatesForTask(task);
                const freqKey = freqMap[task.frequency] || "one-time";
                return dates.map(dueDate => ({ ...task, dueDate, frequency: freqKey }));
            });
            const results = await Promise.all(genPromises);
            const allTasks = results.flat();
            if (allTasks.length === 0) { showToast("No valid tasks generated.", "error"); return; }
            setAllGeneratedTasks(allTasks);
            setShowPreviewModal(true);
        } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
    };

    const confirmSubmission = async () => {
        setIsSubmitting(true);
        try {
            const audioUploads = await Promise.all(tasks.map(async (task) => {
                if (task.recordedAudio?.blob) {
                    const fileName = `voice-notes/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
                    await supabase.storage.from('all_images').upload(fileName, task.recordedAudio.blob);
                    const { data } = supabase.storage.from('all_images').getPublicUrl(fileName);
                    return { id: task.id, audioUrl: data.publicUrl };
                }
                return { id: task.id, audioUrl: null };
            }));
            const audioMap = audioUploads.reduce((m, item) => ({ ...m, [item.id]: item.audioUrl }), {});

            const instructionUploads = await Promise.all(tasks.map(async (task) => {
                const urls = [], types = [];
                if (task.references?.length > 0) {
                    for (const ref of task.references) {
                        if (ref.type === 'image' && ref.file) {
                            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ref.file.name.split('.').pop()}`;
                            await supabase.storage.from('all_images').upload(fileName, ref.file);
                            const { data } = supabase.storage.from('all_images').getPublicUrl(fileName);
                            urls.push(data.publicUrl); types.push(ref.type);
                        } else if (ref.link) { urls.push(ref.link); types.push(ref.type); }
                    }
                }
                return { id: task.id, instructionUrl: urls.length ? JSON.stringify(urls) : null, instructionType: types.length ? JSON.stringify(types) : null };
            }));
            const instructionMap = instructionUploads.reduce((m, item) => ({ ...m, [item.id]: item }), {});

            const allTasksToSubmit = [];
            for (const task of tasks) {
                const dates = await generateDatesForTask(task);
                for (const dueDate of dates) {
                    allTasksToSubmit.push({
                        department: task.department,
                        givenBy: task.givenBy,
                        doer: task.doer,
                        task_description: task.description,
                        audio_url: audioMap[task.id],
                        instruction_attachment_url: instructionMap[task.id].instructionUrl,
                        instruction_attachment_type: instructionMap[task.id].instructionType,
                        frequency: freqMap[task.frequency] || "one-time",
                        duration: task.duration,
                        enableReminders: task.enableReminders,
                        requireAttachment: task.requireAttachment,
                        dueDate,
                        originalStartDate: formatDateISO(task.date) + `T${task.time || "09:00"}:00`,
                        status: "pending"
                    });
                }
            }

            const CHUNK_SIZE = 100;
            const inserted = [];
            for (let i = 0; i < allTasksToSubmit.length; i += CHUNK_SIZE) {
                const chunk = allTasksToSubmit.slice(i, i + CHUNK_SIZE);
                const res = await dispatch(assignTaskInTable({ tasks: chunk, table: null }));
                if (res.error) throw new Error(res.error.message);
                if (res.payload) inserted.push(...(Array.isArray(res.payload) ? res.payload : [res.payload]));
            }

            try {
                for (const uiTask of tasks) {
                    const t = inserted.find(it => it.name === uiTask.doer && (it.task_description === uiTask.description || it.audio_url === audioMap[uiTask.id]));
                    if (t) {
                        await sendTaskAssignmentNotification({
                            doerName: t.name,
                            taskId: t.task_id || t.id,
                            description: t.task_description || (t.instruction_attachment_url ? '📎 Ref Attached' : ''),
                            audioUrl: t.audio_url,
                            startDate: new Date(t.task_start_date).toLocaleString('en-IN'),
                            givenBy: t.given_by,
                            department: t.department,
                            duration: t.duration,
                            taskType: (t.frequency?.toLowerCase().includes('one')) ? 'delegation' : 'checklist'
                        });
                    }
                }
            } catch (err) { console.error(err); }

            showToast(`Assigned ${allTasksToSubmit.length} tasks!`, 'success');
            setTimeout(() => navigate('/dashboard/admin'), 2000);
        } catch (e) { showToast(e.message, 'error'); } finally { setIsSubmitting(false); }
    };

    return (
        <ERPLayout>
            <div className="w-full min-h-screen bg-[#F8FAFC]">
                <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-100">
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Bulk Task Assignment</h1>
                                <p className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Multi-entry workflow & automation</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => navigate('/dashboard/working-day-calendar')}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100 transition-all"
                            >
                                <Calendar size={16} className="text-purple-600" />
                                <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider text-left">Working Days<br/><span className="text-[8px] opacity-70">Check Calendar</span></span>
                            </button>
                            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100 self-start sm:self-center">
                                <ClipboardList size={16} className="text-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">{tasks.length} Active Slots</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {tasks.map((task, index) => (
                            <TaskCard
                                key={task.id}
                                index={index}
                                task={task}
                                total={tasks.length}
                                department={department}
                                doerName={doerName}
                                givenBy={givenBy}
                                dispatch={dispatch}
                                onUpdate={updateTask}
                                onRemove={removeTask}
                            />
                        ))}

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button
                                type="button"
                                onClick={addTask}
                                className="flex-1 flex items-center justify-center gap-3 py-4 border-2 border-dashed border-gray-200 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 rounded-[2rem] transition-all duration-300 font-black uppercase text-[10px] sm:text-xs tracking-widest group"
                            >
                                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                                <span>Add Another Entry Slot</span>
                            </button>

                            <button
                                type="button"
                                onClick={handlePreview}
                                disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-[2rem] shadow-xl shadow-indigo-100 hover:shadow-indigo-200 active:scale-[0.98] transition-all duration-300 font-black uppercase text-[10px] sm:text-xs tracking-widest disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <FileCheck size={18} />}
                                <span>{isSubmitting ? "Generating Analysis..." : "Verify & Generate Tasks"}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {successMessage && (
                        <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md">
                            <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><CheckCircle2 size={20} /></div>
                                <div><p className="font-black text-sm uppercase tracking-wider">Success!</p><p className="text-xs font-medium text-emerald-50">{successMessage}</p></div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {showPreviewModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Verification Center</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Final Audit before assignment</p>
                                </div>
                                <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><X className="h-5 w-5 text-gray-400" /></button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 space-y-4">
                                <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl flex items-start gap-4">
                                    <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md"><FileCheck size={20} /></div>
                                    <div>
                                        <p className="text-sm font-black text-indigo-900 uppercase tracking-tight">Deployment Summary</p>
                                        <p className="text-xs font-medium text-indigo-700/80 mt-1">You are initiating <span className="font-black text-indigo-900">{allGeneratedTasks.length}</span> instances across {tasks.length} workflows. All non-working days have been automatically excluded.</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {allGeneratedTasks.slice(0, 15).map((task, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 transition-all group">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">{i + 1}</div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-gray-900 tracking-tight">{new Date(task.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{task.doer} • {task.frequency}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {task.audio_url && <Mic size={14} className="text-indigo-400" />}
                                                {task.instruction_attachment_url && <ExternalLink size={14} className="text-blue-400" />}
                                            </div>
                                        </div>
                                    ))}
                                    {allGeneratedTasks.length > 15 && <p className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest py-4">+ {allGeneratedTasks.length - 15} more instances scheduled</p>}
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3 bg-gray-50/50">
                                <button onClick={() => setShowPreviewModal(false)} className="flex-1 py-4 px-6 rounded-2xl border border-gray-200 bg-white text-xs font-black text-gray-600 uppercase tracking-widest hover:bg-gray-100 transition-all">Revise Draft</button>
                                <button onClick={confirmSubmission} disabled={isSubmitting} className="flex-1 py-4 px-6 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span>{isSubmitting ? "Deploying..." : "Confirm & Deploy"}</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </ERPLayout>
    );
}
