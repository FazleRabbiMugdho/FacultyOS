import * as React from "react";
import { getProfile, getUser } from "@/lib/auth";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { PageTransition } from "@/components/shell/PageTransition";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const profile = await getProfile();

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <TopBar
          userEmail={user?.email || "faculty@university.edu"}
          userName={profile?.full_name || "Faculty Member"}
          userRole={profile?.role || "senior"}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
