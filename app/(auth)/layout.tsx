import { ReactNode } from "react";
import Logo from "../../components/Logo";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="w-full relative flex flex-col items-center justify-center">
      <Logo />
      <div className="mt-12">{children}</div>
    </div>
  );
};

export default Layout;
