import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { AppProvider } from "@/components/shared/app-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  return (
    <AppProvider>
      <div className="flex min-h-screen bg-srank-bg">
        <Sidebar />
        <main className="flex-1 ml-64">
          {children}
        </main>
      </div>
    </AppProvider>
  );
}
