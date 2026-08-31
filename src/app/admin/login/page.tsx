import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="grid min-h-screen place-items-center bg-rose-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span
            aria-hidden
            className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-600 font-display text-lg font-bold text-white"
          >
            FfU
          </span>
          <h1 className="mt-4 font-display text-3xl">FloralforU admin</h1>
          <p className="mt-1 text-sm text-ink-600">
            Sign in to manage products, offers and enquiries.
          </p>
        </div>
        <LoginForm next={next ?? "/admin"} />
      </div>
    </div>
  );
}
