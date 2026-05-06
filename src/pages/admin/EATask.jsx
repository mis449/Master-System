import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ERPLayout from "../../components/layout/ERPLayout";
import { Users, Calendar, Save, ArrowLeft, Loader2, Mic, Square, Trash2, Plus, CheckCircle2, X, Clock, Phone, Wrench } from "lucide-react";
import { ReactMediaRecorder } from "react-media-recorder";
import AudioPlayer from "../../components/AudioPlayer";
import supabase from "../../SupabaseClient";
import { useDispatch, useSelector } from "react-redux";
import { userDetails } from "../../redux/slice/settingSlice";
import CalendarComponent from "../../components/CalendarComponent";
import { sendTaskAssignmentNotification } from "../../services/whatsappService";
import { useMagicToast } from "../../context/MagicToastContext";
import { motion, AnimatePresence } from "framer-motion";

const formatDateLong = (date) => date ? date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
const formatDateISO = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DEFAULT_DOER_NAME = "Sonali Dutta";

const defaultTask = () => ({
    id: Date.now() + Math.random(),
    doer_name: DEFAULT_DOER_NAME,
    phone_number: "",
    given_by: (localStorage.getItem("role")?.toUpperCase() === "HOD" || (localStorage.getItem("role")?.toLowerCase() === "admin" && localStorage.getItem("user-name")?.toLowerCase() !== "admin")) ? localStorage.getItem("user-name") : "",
    planned_date: "",
    planned_time: "09:00",
    task_description: "",
    duration: "",
    attachment: false,
    recordedAudio: null,
    showCalendar: false,
});

const TaskCard = ({ task, index, total, allDoers, onUpdate, onRemove }) => {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        onUpdate(task.id, { [name]: type === 'checkbox' ? checked : value });
    };

    const getFilteredDoers = () => {
        if (!allDoers || !Array.isArray(allDoers)) return [];
        const taskD = task.planned_date ? new Date(task.planned_date) : new Date();
        taskD.setHours(0, 0, 0, 0);

        return allDoers.filter(user => {
            if (user.status === 'inactive') return false;
            const currentU = (localStorage.getItem("user-name") || "").toLowerCase().trim();
            const currentR = (localStorage.getItem("role") || "").toLowerCase().trim();
            if (currentR === "hod") {
                const dName = (user.user_name || user.name || "").toLowerCase().trim();
                const reportedBy = (user.reported_by || "").toLowerCase().trim();
                if (dName !== currentU && reportedBy !== currentU) return false;
                if (dName === currentU && !user.can_self_assign) return false;
            }
            return true;
        });
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                        {index + 1}
                    </div>
                    <span className="text-sm font-bold text-purple-800">EA Operation Task {index + 1}</span>
                </div>
                {total > 1 && (
                    <button type="button" onClick={() => onRemove(task.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Assign From <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="given_by"
                            value={task.given_by}
                            onChange={handleChange}
                            disabled={(localStorage.getItem("role")?.toUpperCase() === "HOD" || (localStorage.getItem("role")?.toLowerCase() === "admin" && localStorage.getItem("user-name")?.toLowerCase() !== "admin"))}
                            className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50 focus:bg-white transition-all text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                            placeholder="Assign From"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Doer Name <span className="text-red-500">*</span></label>
                        <select name="doer_name" value={task.doer_name} onChange={handleChange} className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50 focus:bg-white transition-all text-sm">
                            <option value="">Select Doer</option>
                            {getFilteredDoers().map((d, i) => (
                                <option key={i} value={d.user_name || d.name}>{d.user_name || d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Planned Date <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => onUpdate(task.id, { showCalendar: !task.showCalendar })}
                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50 text-left text-sm flex items-center justify-between"
                            >
                                <span>{task.planned_date ? formatDateLong(new Date(task.planned_date)) : "Pick Date"}</span>
                                <Calendar className="w-4 h-4 text-gray-400" />
                            </button>
                            {task.showCalendar && (
                                <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl p-4">
                                    <CalendarComponent
                                        onSelect={(date) => {
                                            onUpdate(task.id, { planned_date: formatDateISO(date), showCalendar: false });
                                        }}
                                        selectedDate={task.planned_date ? new Date(task.planned_date) : null}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Planned Time <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input
                                type="time"
                                name="planned_time"
                                value={task.planned_time}
                                onChange={handleChange}
                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50 focus:bg-white transition-all text-sm pr-10"
                            />
                            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Task Description <span className="text-red-500">*</span></label>
                    <ReactMediaRecorder
                        audio
                        onStop={(blobUrl, blob) => onUpdate(task.id, { recordedAudio: { blobUrl, blob } })}
                        render={({ status, startRecording, stopRecording }) => (
                            <div className="space-y-3">
                                <div className="relative">
                                    <textarea
                                        name="task_description"
                                        value={task.task_description}
                                        onChange={handleChange}
                                        rows="3"
                                        placeholder="Enter EA task details..."
                                        className="w-full p-3 pr-11 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none resize-none bg-gray-50 focus:bg-white transition-all text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={status === "recording" ? stopRecording : startRecording}
                                        className={`absolute bottom-3 right-3 p-2 rounded-full transition-all shadow-sm ${status === "recording" ? "bg-red-100 text-red-600 animate-pulse" : "bg-purple-100 text-purple-600 hover:bg-purple-200"}`}
                                    >
                                        {status === "recording" ? <Square size={16} /> : <Mic size={16} />}
                                    </button>
                                </div>
                                {task.recordedAudio && <AudioPlayer blob={task.recordedAudio.blob} onClear={() => onUpdate(task.id, { recordedAudio: null })} />}
                            </div>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Duration (Mins)</label>
                        <input
                            type="number"
                            name="duration"
                            value={task.duration}
                            onChange={handleChange}
                            className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50 focus:bg-white transition-all text-sm"
                            placeholder="e.g. 30"
                        />
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                        <input
                            type="checkbox"
                            id={`attach-${task.id}`}
                            name="attachment"
                            checked={task.attachment}
                            onChange={handleChange}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <label htmlFor={`attach-${task.id}`} className="text-xs font-bold text-gray-600 uppercase tracking-wide cursor-pointer">Require Attachment</label>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminEATasks = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { showToast } = useMagicToast();
    const { allDoers } = useSelector((state) => state.userDetails);
    const [tasks, setTasks] = useState([defaultTask()]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        dispatch(userDetails());
    }, [dispatch]);

    const addTask = () => setTasks([...tasks, defaultTask()]);
    const removeTask = (id) => setTasks(tasks.filter(t => t.id !== id));
    const updateTask = (id, updates) => setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));

    const handleSubmitAll = async () => {
        const invalidTask = tasks.find(t => !t.given_by || !t.doer_name || !t.planned_date || !t.task_description);
        if (invalidTask) {
            showToast("Please complete all required fields for each task.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const uploadPromises = tasks.map(async (task) => {
                let audioUrl = null;
                if (task.recordedAudio) {
                    const fileName = `${Date.now()}_ea_audio.wav`;
                    const { data, error } = await supabase.storage.from("audio-notes").upload(fileName, task.recordedAudio.blob);
                    if (error) throw error;
                    audioUrl = data.path;
                }

                const { error: insertError } = await supabase.from("checklist_delegation_table").insert([{
                    department: "EA",
                    fmsName: "EA",
                    givenBy: task.given_by,
                    assignedTo: task.doer_name,
                    taskName: task.task_description,
                    taskDescription: task.task_description,
                    dueDate: `${task.planned_date}T${task.planned_time}:00`,
                    frequency: "one-time",
                    enableReminders: true,
                    requireAttachment: task.attachment,
                    audio_note_url: audioUrl,
                    status: "pending"
                }]);

                if (insertError) throw insertError;

                // Send Notification
                const doer = allDoers.find(d => d.user_name === task.doer_name || d.name === task.doer_name);
                if (doer?.phone_number) {
                    await sendTaskAssignmentNotification(doer.phone_number, task.doer_name, task.task_description, `${task.planned_date} ${task.planned_time}`, "EA Operations");
                }
            });

            await Promise.all(uploadPromises);
            showToast(`✅ Successfully deployed ${tasks.length} task(s)!`, "success");
            setTimeout(() => navigate("/dashboard/admin"), 1500);
        } catch (error) {
            console.error(error);
            showToast(`Submission failed: ${error.message}`, "error");
        } finally {
            setIsSubmitting(false);
        }
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
                                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Executive Operations</h1>
                                <p className="text-[10px] sm:text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">EA & Management Task Control</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-xl border border-purple-100 self-start sm:self-center">
                            <Users size={16} className="text-purple-600" />
                            <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">{tasks.length} Active Slots</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {tasks.map((task, index) => (
                            <TaskCard
                                key={task.id}
                                index={index}
                                task={task}
                                total={tasks.length}
                                allDoers={allDoers}
                                onUpdate={updateTask}
                                onRemove={removeTask}
                            />
                        ))}

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button
                                type="button"
                                onClick={addTask}
                                className="flex-1 flex items-center justify-center gap-3 py-4 border-2 border-dashed border-gray-200 text-gray-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50/30 rounded-[2rem] transition-all duration-300 font-black uppercase text-[10px] sm:text-xs tracking-widest group"
                            >
                                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                                <span>Add Another Task Slot</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleSubmitAll}
                                disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-[2rem] shadow-xl shadow-purple-100 hover:shadow-purple-200 active:scale-[0.98] transition-all duration-300 font-black uppercase text-[10px] sm:text-xs tracking-widest disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                <span>{isSubmitting ? "Deploying Tasks..." : `Submit ${tasks.length} Task${tasks.length !== 1 ? 's' : ''}`}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {isSubmitting && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[200] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                                <p className="text-sm font-black text-purple-900 uppercase tracking-widest">Processing Data...</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </ERPLayout>
    );
};

export default AdminEATasks;
