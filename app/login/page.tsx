import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <>
      <h1>Log in</h1>
      <AuthForm mode="login" />
    </>
  );
}
