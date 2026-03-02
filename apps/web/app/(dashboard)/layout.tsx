import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ResponsiveShell } from "@/components/shared/responsive-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  return <ResponsiveShell>{children}</ResponsiveShell>;
}
