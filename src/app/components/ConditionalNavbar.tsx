"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on editor pages
  const hideNavbar = pathname.startsWith("/editor");
  
  if (hideNavbar) {
    return null;
  }
  
  return <Navbar />;
}
