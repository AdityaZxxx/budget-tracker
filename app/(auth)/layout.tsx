import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-12">
      <div className="my-auto w-full max-w-[400px]">{children}</div>
    </main>
  );
};

export default Layout;
