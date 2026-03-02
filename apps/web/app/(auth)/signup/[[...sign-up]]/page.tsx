import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-srank-bg">
      <SignUp path="/signup" routing="path" signInUrl="/login" />
    </div>
  );
}
