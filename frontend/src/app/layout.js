import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "Betty Campobasso — Générateur d'annonces IAD",
  description: "Outil personnel de Betty Campobasso pour générer ses annonces immobilières IAD.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{ style: { borderRadius: 12, border: "1px solid #D1DCEE" } }}
        />
      </body>
    </html>
  );
}
