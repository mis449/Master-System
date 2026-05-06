import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../SupabaseClient";

const RealtimeLogoutListener = () => {
  const navigate = useNavigate();

  // ✅ Ask notification permission
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // ✅ User auto-logout listener (for current user)
  useEffect(() => {
    let subscription;
    const username = localStorage.getItem("user-name");
    const userId = localStorage.getItem("user-id");
    if (!username || !userId) return;

    subscription = supabase
      .channel("user-status-watch")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for all changes (including DELETE)
          schema: "public",
          table: "users",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const isDeleted = payload.eventType === "DELETE";
          const isInactive = payload.eventType === "UPDATE" && payload.new.status === "inactive";

          if (isDeleted || isInactive) {
            // Show Chrome notification to user
            if (Notification.permission === "granted") {
              new Notification(isDeleted ? "Account Deleted" : "Account Deactivated", {
                body: isDeleted
                  ? "Your account has been removed. You have been logged out."
                  : "Your account has been deactivated. You have been logged out.",
                icon: "/logo.png",
              });
            }

            localStorage.clear();
            navigate("/login");
            window.location.reload();
          }
        }
      )
      .subscribe();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [navigate]);

  // ✅ Admin listener to see logout notifications
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "admin") return;

    const adminSubscription = supabase
      .channel("admin-user-status-watch")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
        },
        (payload) => {
          console.log("📡 Realtime event received:", payload); // 👈 Add this
          const updatedUser = payload.new;
          const previousUser = payload.old;

          if (previousUser?.status === "active" && updatedUser?.status === "inactive") {
            console.log("🚨 User changed from active → inactive:", updatedUser.user_name);
            if (Notification.permission === "granted") {
              new Notification("User Logged Out", {
                body: `User "${updatedUser.user_name}" has been logged out.`,
                icon: "/logo.png",
              });
            }
          }
        }
      )
      .subscribe((status) => console.log("✅ Subscribed to admin Realtime:", status));

    return () => {
      supabase.removeChannel(adminSubscription);
    };
  }, []);


  // ✅ Check user status on refresh
  useEffect(() => {
    let isMounted = true;
    const checkUserStatusOnLoad = async () => {
      const username = localStorage.getItem("user-name");
      if (!username) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select('status')
          .eq('user_name', username)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          // Suppress AbortError as it usually happens during navigation/refresh
          if (error.message?.includes('AbortError') || error.code === 'ABORT_ERR') {
            return;
          }
          console.error("Error checking user status on load:", error);
          return;
        }

        // With maybeSingle, data is the object itself (not an array)
        if (data && data.status === "inactive") {
          console.warn("User account is inactive. Logging out.");
          localStorage.clear();
          navigate("/login");
          window.location.reload();
        }
      } catch (err) {
        if (isMounted && !err.message?.includes('abort')) {
          console.error("Unexpected error in checkUserStatusOnLoad:", err);
        }
      }
    };

    checkUserStatusOnLoad();
    return () => { isMounted = false; };
  }, [navigate]);

  return null;
};

export default RealtimeLogoutListener;
