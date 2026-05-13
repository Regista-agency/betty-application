import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Connexion — Betty IAD" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
