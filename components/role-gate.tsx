"use client";

import { useUser } from "@clerk/nextjs";
import { ReactNode } from "react";

interface RoleGateProps {
  children: ReactNode;
  allowedRole: "admin" | "client";
}

export function RoleGate({ children, allowedRole }: RoleGateProps) {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return null;
  }

  const role = user.publicMetadata.role as string;
  
  if (role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
}
