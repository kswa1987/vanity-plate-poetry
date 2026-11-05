import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "./actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vanity Plate Poetry",
  description: "A daily poem written from vanity license plates spotted by our members.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            Vanity Plate Poetry
          </Link>
          <nav>
            <Link href="/poems">Past poems</Link>
            <Link href="/plates">Plates</Link>
            {user ? (
              <>
                <Link href="/upload">Upload</Link>
                {user.is_admin && <Link href="/admin">Admin</Link>}
                <form action={logout}>
                  <button className="link-button">Log out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login">Log in</Link>
                <Link href="/signup">Sign up</Link>
              </>
            )}
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
