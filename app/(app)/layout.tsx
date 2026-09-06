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
      <Sidebar
        accountType={profile?.account_type || "university_user"}
        isSuperAdmin={profile?.is_super_admin || false}
        institutionName={profile?.institution_name || "Ahsanullah University of Science and Technology"}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <TopBar
          userEmail={user?.email || (profile?.account_type === "service_provider" ? "admin@facultyos.io" : "faculty@aust.edu")}
          userName={profile?.full_name || (profile?.account_type === "service_provider" ? "Platform Operator" : "Faculty Member")}
          userRole={profile?.role || "senior"}
          accountType={profile?.account_type || "university_user"}
          institutionName={profile?.institution_name || "Ahsanullah University of Science and Technology"}
          institutionTier={profile?.institution_tier || "Enterprise"}
          isSuperAdmin={profile?.is_super_admin || false}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
