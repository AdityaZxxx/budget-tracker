import Navbar from "@/components/Navbar";
import { ReactNode } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="w-full relative flex flex-col h-screen">
      <Navbar />
      <div className="w-full">{children}</div>
    </div>
  );
};

export default Layout;
