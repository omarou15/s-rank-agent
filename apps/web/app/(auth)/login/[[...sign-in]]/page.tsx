import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <SignIn path="/login" routing="path" signUpUrl="/signup" />
    </div>
  );
}
