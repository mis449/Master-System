import { motion } from "framer-motion";
import { ListTodo, CheckCircle2, Clock, AlertTriangle, ArrowUpRight, Target, Activity } from "lucide-react";

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
    { label: "Total Task", value: totalTask, sub: "Up to Today", icon: ListTodo, color: "blue", gradient: "from-blue-600 to-indigo-600" },
    { label: "Completed Task", value: completeTask, sub: `${completionRate.toFixed(1)}% Success`, icon: CheckCircle2, color: "emerald", gradient: "from-emerald-600 to-green-600" },
    { label: "Due Today", value: pendingTask, sub: "Actionable Now", icon: Clock, color: "amber", gradient: "from-amber-500 to-orange-500" },
    { label: "Overdue Task", value: overdueTask, sub: "Immediate Attention", icon: AlertTriangle, color: "rose", gradient: "from-rose-600 to-red-600" },
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
      {/* Left side - Statistics Cards */}
      <div className="xl:w-3/5 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 h-full">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="relative group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Decorative Background Element */}
              <div className={`absolute -right-4 -top-4 w-20 h-20 sm:w-24 sm:h-24 bg-${card.color}-50 rounded-full blur-2xl group-hover:bg-${card.color}-100 transition-colors duration-500`} />
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex justify-between items-start">
                  <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-${card.color}-50 text-${card.color}-600 group-hover:scale-110 transition-transform duration-500`}>
                    <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</span>
                    <div className={`flex items-center gap-1 text-${card.color}-600 bg-${card.color}-50 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black`}>
                      <Activity className="w-3 h-3" />
                      LIVE
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-6">
                  <div className={`text-3xl sm:text-4xl font-black bg-gradient-to-br ${card.gradient} bg-clip-text text-transparent leading-none`}>
                    {card.value}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500">{card.sub}</span>
                    <ArrowUpRight className="w-3 h-3 text-gray-300" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right side - Circular Progress Graph */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="xl:w-2/5 w-full"
      >
        <div className="rounded-2xl sm:rounded-3xl bg-white shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">
          <div className="p-4 sm:p-6 pb-0 flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">Compliance Analytics</h3>
              <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Operational Performance</p>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
              <Target className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="p-6 sm:p-8 flex-1 flex flex-col justify-center">
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-6 sm:gap-10">
              <div className="relative w-36 h-36 sm:w-48 sm:h-48 shrink-0">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="#f8fafc" strokeWidth="10" fill="none" />
                  
                  {/* Overdue */}
                  <circle cx="50" cy="50" r="42" stroke="#f43f5e" strokeWidth="10" fill="none"
                    strokeDasharray={`${overdueDash} ${circumference}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  
                  {/* Pending */}
                  <circle cx="50" cy="50" r="42" stroke="#f59e0b" strokeWidth="10" fill="none"
                    strokeDasharray={`${pendingDash} ${circumference}`}
                    strokeDashoffset={-overdueDash}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  
                  {/* Completed */}
                  <circle cx="50" cy="50" r="42" stroke="#10b981" strokeWidth="10" fill="none"
                    strokeDasharray={`${completedDash} ${circumference}`}
                    strokeDashoffset={-(overdueDash + pendingDash)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-black text-gray-900 leading-none">
                      {completionRate.toFixed(1)}<span className="text-lg">%</span>
                    </div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">Efficiency</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 w-full">
                {[
                  { label: "Completed", value: completionRate, color: "emerald", icon: CheckCircle2 },
                  { label: "Pending", value: pendingRate, color: "amber", icon: Clock },
                  { label: "Overdue", value: overdueRate, color: "rose", icon: AlertTriangle },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50 border border-gray-100/50 group hover:bg-white hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-${item.color}-50 text-${item.color}-600 group-hover:scale-110 transition-transform`}>
                        <item.icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">{item.label}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-gray-900">{item.value.toFixed(1)}%</span>
                      <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full bg-${item.color}-500 rounded-full`} style={{ width: `${item.value}%` }} />
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
