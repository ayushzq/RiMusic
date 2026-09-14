"use client";

import { useEffect, useState } from "react";
// 🔥 NAYA: Firebase hata kar NextAuth lagaya
import { useSession, signOut } from "next-auth/react"; 
import { usePathname, useRouter } from "next/navigation"; 
import Link from "next/link";
import {
  MessageSquare,
  Settings,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Link2,
  Bot,
  LayoutTemplate,
  LayoutDashboard,
  Megaphone,
  GitFork,
  Users,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Code2,
  UserPlus, 
  LogOut    
} from "lucide-react";
import ConfigModal from "./ConfigModal";

export default function Sidebar() {
  const { data: session, status } = useSession(); 
  
  const [user, setUser] = useState<any>(null);
  const [isMatched, setIsMatched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [hideOnMobile, setHideOnMobile] = useState<boolean>(false);

  const [userRole, setUserRole] = useState<"ADMIN" | "AGENT" | null>(null);
  const [agentName, setAgentName] = useState<string>("");

  const pathname = usePathname();
  const router = useRouter();

  // Authentication aur API Config Load Check
  useEffect(() => {
    const checkAuthAndConfig = async () => {
      // 1. Pehle check karo ki kya koi AGENT (Local Storage) logged in hai?
      if (typeof window !== "undefined") {
        const agentToken = localStorage.getItem("agent_token");
        const savedAgentName = localStorage.getItem("agent_name");
        
        if (agentToken) {
          setUserRole("AGENT");
          setAgentName(savedAgentName || "Support Agent");
          setUser({ uid: agentToken }); 
          setIsMatched(true); 
          setLoading(false);
          return;
        }
      }

      if (status === "loading") return;

      // 2. Check karo kya ADMIN (NextAuth) logged in hai?
      if (session?.user) {
        setUserRole("ADMIN");
        setUser(session.user);
        
        // 🔥 FIX: Ab hum direct Database (/api/config) se check kar rahe hain ki API linked hai ya nahi
        try {
          const res = await fetch("/api/config");
          if (res.ok) {
            const data = await res.json();
            
            // Agar database mein accessToken maujood hai
            if (data && data.accessToken && data.accessToken.length > 10) {
              setIsMatched(true);
              
              // Local storage ko bhi sync kar dete hain (taaki ConfigModal aur dusre components theek se kaam karein)
              if (typeof window !== "undefined") {
                localStorage.setItem("metaAccessToken", data.accessToken);
                localStorage.setItem("phoneId", data.phoneNumberId || "");
                localStorage.setItem("wabaId", data.businessAccountId || "");
              }
            } else {
              setIsMatched(false);
            }
          } else {
            setIsMatched(false); // API Error ya Settings not found
          }
        } catch (error) {
          console.error("Error fetching API config for sidebar:", error);
          setIsMatched(false);
        }
        
        setLoading(false);
      } else {
        // Koi login nahi hai
        setUserRole(null);
        setUser(null);
        setLoading(false);
      }
    };

    checkAuthAndConfig();
  }, [session, status]);

  // Route Guard & Default Redirect
  useEffect(() => {
    if (!loading) {
      if (!userRole) {
        router.push("/login");
      } else if (pathname === "/") {
        router.push(userRole === "AGENT" ? "/chat" : "/dashboard");
      }
    }
  }, [loading, userRole, pathname, router]);

  // Smart detector for mobile hide logic
  useEffect(() => {
    const checkIfDetailViewOpen = () => {
      const isDetailView =
        document.getElementById("hide-bottom-bar") ||
        document.getElementById("mobile-chat-view") ||
        document.getElementById("template-builder-view") ||
        document.getElementById("flow-builder-view");
      setHideOnMobile(!!isDetailView);
    };
    checkIfDetailViewOpen();
    const observer = new MutationObserver(checkIfDetailViewOpen);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Logout Handler (Admin aur Agent dono ke liye)
  const handleLogout = async () => {
    if (confirm("Are you sure you want to log out?")) {
      if (userRole === "AGENT") {
        localStorage.removeItem("agent_token");
        localStorage.removeItem("agent_name");
        localStorage.removeItem("agent_role");
        localStorage.removeItem("agent_primary_page");
        router.push("/login");
      } else {
        await signOut({ callbackUrl: "/login" });
      }
    }
  };

  const isActive = (paths: string[]) =>
    paths.some((p) => pathname === p || pathname?.startsWith(p + "/"));

  const rawNavItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", activePaths: ["/dashboard"], roles: ["ADMIN"] },
    { href: "/campaigns", icon: Megaphone, label: "Campaigns", activePaths: ["/campaigns"], roles: ["ADMIN"] },
    { href: "/chat", icon: MessageSquare, label: "Chat", activePaths: ["/chat"], roles: ["ADMIN", "AGENT"] },
    { href: "/chatbot-builder", icon: GitFork, label: "Flows", activePaths: ["/chatbot-builder"], roles: ["ADMIN"] },
    { href: "/template", icon: LayoutTemplate, label: "Templates", activePaths: ["/template"], roles: ["ADMIN"] },
    { href: "/contacts", icon: Users, label: "Contacts", activePaths: ["/contacts"], roles: ["ADMIN", "AGENT"] },
    { href: "/dashboard/team", icon: UserPlus, label: "Team", activePaths: ["/dashboard/team"], roles: ["ADMIN"] },
  ];

  const rawBottomItems = [
    { href: "/settings", icon: Settings, label: "Settings", activePaths: ["/settings"], roles: ["ADMIN"] },
    { href: "/developers", icon: Code2, label: "Developers", activePaths: ["/developers"], roles: ["ADMIN"] },
    { href: "/help", icon: HelpCircle, label: "Help Center", activePaths: ["/help"], roles: ["ADMIN", "AGENT"] },
  ];

  const navItems = rawNavItems.filter(item => item.roles.includes(userRole || ""));
  const bottomItems = rawBottomItems.filter(item => item.roles.includes(userRole || ""));

  if (loading || status === "loading") {
    return (
      <>
        <div className="hidden md:flex flex-col h-full w-[220px] bg-white border-r border-gray-100 items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#25D366]" />
        </div>
        <div className="md:hidden fixed bottom-0 left-0 z-30 w-full h-16 border-t border-gray-100 bg-white flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[#25D366]" />
        </div>
      </>
    );
  }

  if (!userRole) return null; 

  return (
    <>
      <aside
        className={`hidden md:flex flex-col h-full bg-white border-r border-gray-100 z-40 shrink-0 transition-all duration-300 ease-in-out ${
          collapsed ? "w-[64px]" : "w-[220px]"
        }`}
      >
        <div
          className={`flex items-center h-14 border-b border-gray-100 px-3 shrink-0 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 bg-[#25D366] rounded-lg flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[15px] text-gray-900 tracking-tight whitespace-nowrap">
                BaseKey
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 bg-[#25D366] rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-500 transition-colors shrink-0 ${
              collapsed ? "mt-0 ml-0" : ""
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <div className="flex-1 flex flex-col py-3 overflow-y-auto no-scrollbar gap-0.5 px-2">
          {isMatched ? (
            <>
              {navItems.map((item) => {
                const active = isActive(item.activePaths);
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`group flex items-center gap-3 rounded-lg px-2.5 py-2.5 cursor-pointer transition-all duration-150 relative ${
                        active
                          ? "bg-[#e8faf0] text-[#25D366]"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                      } ${collapsed ? "justify-center px-0" : ""}`}
                      title={collapsed ? item.label : undefined}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#25D366] rounded-r-full" />
                      )}
                      <item.icon
                        className={`shrink-0 transition-none ${
                          active ? "text-[#25D366]" : "text-gray-400 group-hover:text-gray-600"
                        } ${collapsed ? "w-5 h-5" : "w-4 h-4"}`}
                      />
                      {!collapsed && (
                        <span
                          className={`text-[13.5px] font-medium whitespace-nowrap ${
                            active ? "text-[#25D366]" : "text-gray-600 group-hover:text-gray-800"
                          }`}
                        >
                          {item.label}
                        </span>
                      )}
                      {collapsed && (
                        <div className="absolute left-[52px] px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                          {item.label}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </>
          ) : (
            <div
              className={`flex flex-col items-center gap-2 mt-6 px-2 ${
                collapsed ? "" : ""
              }`}
            >
              <div className="w-9 h-9 bg-red-50 text-red-400 rounded-xl flex items-center justify-center border border-red-100">
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
              {!collapsed && (
                <p className="text-[11px] text-gray-400 text-center leading-tight font-medium">
                  API Not Linked
                </p>
              )}
            </div>
          )}
        </div>

        <div className={`flex flex-col pb-4 pt-2 border-t border-gray-100 gap-0.5 px-2`}>
          {bottomItems.map((item) => {
            const active = isActive(item.activePaths);
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 cursor-pointer transition-all duration-150 ${
                    active ? "text-[#25D366] bg-[#e8faf0]" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={`shrink-0 ${collapsed ? "w-5 h-5" : "w-4 h-4"} ${active ? "text-[#25D366]" : ""}`} />
                  {!collapsed && (
                    <span className="text-[13px] font-medium whitespace-nowrap">{item.label}</span>
                  )}
                  {collapsed && (
                    <div className="absolute left-[52px] px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                      {item.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}

          {userRole === "ADMIN" && (
            <div
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 cursor-pointer transition-all duration-150 text-gray-400 hover:bg-gray-50 hover:text-gray-600 ${
                collapsed ? "justify-center px-0" : ""
              }`}
              onClick={() => setIsModalOpen(true)}
              title={collapsed ? (isMatched ? "Configuration" : "Connect API") : undefined}
            >
              <Link2 className={`shrink-0 text-gray-700 ${collapsed ? "w-5 h-5" : "w-4 h-4"}`} />
              {!collapsed && (
                <span className="text-[13px] font-medium text-gray-600">
                  {isMatched ? "Configuration" : "Connect API"}
                </span>
              )}
            </div>
          )}

          <div
            onClick={handleLogout}
            className={`group flex items-center gap-2.5 mt-1 px-2 py-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors ${
              collapsed ? "justify-center px-0" : ""
            }`}
            title={collapsed ? "Logout" : undefined}
          >
            <div className="w-8 h-8 rounded-full bg-[#e8faf0] group-hover:bg-red-100 border border-[#b7e8cc] group-hover:border-red-200 flex items-center justify-center text-sm font-bold text-[#1a9e4e] group-hover:text-red-500 shrink-0 overflow-hidden transition-colors">
              {userRole === "ADMIN" && user?.image ? (
                <img src={user.image} alt="User" className="w-full h-full object-cover" />
              ) : (
                (userRole === "AGENT" ? agentName : user?.name || user?.email)?.charAt(0).toUpperCase() || "U"
              )}
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-[12px] font-semibold text-gray-800 group-hover:text-red-600 truncate leading-tight transition-colors">
                  {userRole === "ADMIN" ? (user?.name || user?.email?.split("@")[0] || "Owner") : agentName}
                </span>
                <span className="text-[10px] text-gray-400 group-hover:text-red-400 truncate leading-tight transition-colors">
                  {userRole === "ADMIN" ? (user?.email || "Admin") : "Support Agent"}
                </span>
              </div>
            )}
            {!collapsed && isMatched && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#25D366] ml-auto shrink-0 group-hover:hidden" />
                <LogOut className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0 hidden group-hover:block" />
              </>
            )}
            {!collapsed && !isMatched && (
              <LogOut className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </aside>

      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 ease-in-out ${
          hideOnMobile
            ? "translate-y-full opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        }`}
      >
        <div className="flex items-center h-16 px-2 overflow-x-auto gap-2 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {isMatched ? (
            <>
              {navItems.map((item) => {
                const active = isActive(item.activePaths);
                return (
                  <Link key={item.href} href={item.href} className="flex-1 min-w-[70px] shrink-0">
                    <div className="flex flex-col items-center justify-center gap-0.5 py-1.5">
                      <div
                        className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          active
                            ? "bg-[#e8faf0] text-[#25D366]"
                            : "text-gray-400"
                        }`}
                      >
                        <item.icon className="w-[18px] h-[18px]" />
                        {active && (
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <span
                        className={`text-[9.5px] font-medium ${
                          active ? "text-[#25D366]" : "text-gray-400"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}

              {userRole === "ADMIN" && (
                <>
                  <Link href="/settings" className="flex-1 min-w-[70px] shrink-0">
                    <div className="flex flex-col items-center justify-center gap-0.5 py-1.5">
                      <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        pathname === "/settings" || pathname?.startsWith("/settings/") ? "bg-[#e8faf0] text-[#25D366]" : "text-gray-400"
                      }`}>
                        <Settings className="w-[18px] h-[18px]" />
                      </div>
                      <span className={`text-[9.5px] font-medium ${
                        pathname === "/settings" || pathname?.startsWith("/settings/") ? "text-[#25D366]" : "text-gray-400"
                      }`}>Settings</span>
                    </div>
                  </Link>

                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 min-w-[70px] shrink-0 flex flex-col items-center justify-center gap-0.5 py-1.5"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400">
                      <Link2 className="w-[18px] h-[18px]" />
                    </div>
                    <span className="text-[9.5px] font-medium text-gray-400">Config</span>
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center w-full gap-3 py-2 min-w-full">
              <div className="w-8 h-8 bg-red-50 text-red-400 rounded-lg flex items-center justify-center border border-red-100">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-sm text-gray-500 font-medium">API Not Connected</p>
              
              {userRole === "ADMIN" && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition"
                >
                  Connect
                </button>
              )}
            </div>
          )}
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </nav>

      {userRole === "ADMIN" && (
        <ConfigModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
