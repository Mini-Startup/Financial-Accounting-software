import { SignUp } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth-layout";

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp fallbackRedirectUrl="/dashboard" />
    </AuthLayout>
  );
}
