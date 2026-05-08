import { motion } from "framer-motion";
import { ListTodo, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, Target, Activity, TrendingUp } from "lucide-react";

export default function StatisticsCards({
  dashboardType,
  totalTask,
  completeTask,
  pendingTask,
  overdueTask,
  dateRange = null
}) {
  const completionRate = totalTask > 0 ? (completeTask / totalTask) * 100 : 0;
  const pendingRate = totalTask > 0 ? (pendingTask / totalTask) * 100 : 0;
  const overdueRate = totalTask > 0 ? (overdueTask / totalTask) * 100 : 0;

  const circumference = 251.3;
  const completedDash = completionRate * circumference / 100;
  const pendingDash = pendingRate * circumference / 100;
  const overdueDash = overdueRate * circumference / 100;

  const cards = [
    { label: "Total Task", value: totalTask, sub: "Up to Today", icon: ListTodo, color: "blue", gradient: "from-blue-500 via-blue-600 to-blue-700", shadow: "shadow-blue-100" },
    { label: "Completed Task", value: completeTask, sub: `${completionRate.toFixed(1)}% Success`, icon: CheckCircle2, color: "emerald", gradient: "from-emerald-400 via-emerald-500 to-teal-600", shadow: "shadow-emerald-100" },
    { label: "Due Today", value: pendingTask, sub: "Actionable Now", icon: Clock, color: "amber", gradient: "from-amber-400 via-orange-500 to-yellow-600", shadow: "shadow-amber-100" },
    { label: "Overdue Task", value: overdueTask, sub: "Immediate Attention", icon: AlertTriangle, color: "rose", gradient: "from-rose-500 via-red-600 to-pink-700", shadow: "shadow-rose-100" },
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-5 sm:gap-6 mb-5 sm:mb-7">
      {/* Left side - Statistics Cards */}
      <div className="xl:w-3/5 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 h-full">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: idx * 0.1, ease: "easeOut" }}
              whileHover={{ y: -5, scale: 1.01 }}
              className={`relative group bg-white/70 backdrop-blur-xl rounded-2xl p-3 shadow-xl ${card.shadow} border border-white/40 overflow-hidden cursor-default`}
            >
              {/* Animated Background Mesh */}
              <div className={`absolute -right-5 -top-5 w-28 h-28 bg-${card.color}-400/10 rounded-full blur-3xl group-hover:scale-135 transition-transform duration-800`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-5">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg ${card.shadow} group-hover:rotate-6 transition-all duration-500`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">{card.label}</span>
                    <div className={`flex items-center gap-1.5 text-${card.color}-600 bg-${card.color}-50/80 backdrop-blur-sm px-3 py-1 rounded-full text-[9px] font-black shadow-sm`}>
                      <Activity className="w-3 h-3 animate-pulse" />
                      REAL-TIME
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-none">
                      {card.value}
                    </span>
                    <TrendingUp className="w-4 h-4 text-emerald-500 mb-0.5" />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
                    <span className="text-[11px] sm:text-xs font-bold text-gray-500 tracking-wide">{card.sub}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right side - Circular Progress Graph */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="xl:w-2/5 w-full"
      >
        <div className="rounded-3xl bg-white/70 backdrop-blur-2xl shadow-2xl shadow-blue-100/50 border border-white/60 h-full flex flex-col overflow-hidden group/chart">
          <div className="p-4 sm:p-5 pb-0 flex items-center justify-between">
            <div>
              <h3 className="text-[11px] font-bold text-gray-900 tracking-tight">Compliance Score</h3>
              <p className="text-[10px] font-bold text-blue-500/60 uppercase tracking-[0.2em] mt-1"></p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shadow-inner group-hover/chart:rotate-12 transition-transform duration-500">
              <Target className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-center">
            <div className="flex flex-col md:flex-row lg:flex-col xl:flex-row items-center justify-center gap-7">
              <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="grad-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="grad-rose" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="42" stroke="#f1f5f9" strokeWidth="10.5" fill="none" />
                  
                  {/* Overdue */}
                  <circle cx="50" cy="50" r="42" stroke="url(#grad-rose)" strokeWidth="10.5" fill="none"
                    strokeDasharray={`${overdueDash} ${circumference}`}
                    strokeLinecap="round"
                    className="transition-all duration-[1.4s] ease-in-out"
                  />
                  
                  {/* Pending */}
                  <circle cx="50" cy="50" r="42" stroke="url(#grad-amber)" strokeWidth="10.5" fill="none"
                    strokeDasharray={`${pendingDash} ${circumference}`}
                    strokeDashoffset={-overdueDash}
                    strokeLinecap="round"
                    className="transition-all duration-[1.4s] ease-in-out"
                  />
                  
                  {/* Completed */}
                  <circle cx="50" cy="50" r="42" stroke="url(#grad-emerald)" strokeWidth="10.5" fill="none"
                    strokeDasharray={`${completedDash} ${circumference}`}
                    strokeDashoffset={-(overdueDash + pendingDash)}
                    strokeLinecap="round"
                    className="transition-all duration-[1.4s] ease-in-out"
                  />
                </svg>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none">
                      {completionRate.toFixed(0)}<span className="text-lg text-emerald-500">%</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-3">Accuracy</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full">
                {[
                  { label: "Completed", value: completionRate, color: "emerald", icon: CheckCircle2, status: "High" },
                  { label: "Pending", value: pendingRate, color: "amber", icon: Clock, status: "Wait" },
                  { label: "Overdue", value: overdueRate, color: "rose", icon: AlertTriangle, status: "Due" },
                ].map((item, idx) => (
                  <div key={idx} className="group/item flex items-center justify-between p-2.5 rounded-xl bg-white/50 border border-gray-100 hover:border-blue-100 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center gap-3.5">
                      <div className={`p-2 rounded-xl bg-${item.color}-50 text-${item.color}-600 group-hover/item:scale-110 transition-transform`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-[11px] font-black text-gray-800 uppercase tracking-tight">{item.label}</span>
                        <span className={`text-[9px] font-bold text-${item.color}-500 uppercase`}>{item.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-base font-black text-gray-900">{item.value.toFixed(1)}%</span>
                      <div className="w-18 h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden ring-1 ring-white">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1.2, delay: 0.6 }}
                          className={`h-full bg-gradient-to-r from-${item.color}-400 to-${item.color}-600 rounded-full`} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
