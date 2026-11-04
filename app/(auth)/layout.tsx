import Logo from "@/components/Logo";
import { ReactNode } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center px-4 py-12">
      <Logo />
      <div className="mt-12">{children}</div>
    </div>
  );
};

export default Layout;
