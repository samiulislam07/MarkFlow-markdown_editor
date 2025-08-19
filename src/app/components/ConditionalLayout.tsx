"use client";
import { usePathname } from "next/navigation";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Don't add padding for editor pages since they don't have navbar
  const hasNavbar = !pathname.startsWith("/editor");
  
  return (
    <div className={hasNavbar ? "pt-16" : ""}>
      {children}
    </div>
  );
}
