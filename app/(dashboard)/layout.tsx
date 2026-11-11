import type { ReactNode } from "react";

import Navbar from "@/components/Navbar";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative flex h-dvh w-full flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring focus:ring-inset"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="w-full flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;
