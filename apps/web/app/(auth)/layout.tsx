export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-srank-bg flex items-center justify-center">
      {children}
    </div>
  );
}
