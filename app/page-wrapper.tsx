"use client";

import React from "react";
import ShopOS from "@/components/ShopOS";

export default function PageWrapper() {
  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900">
      <ShopOS />
    </div>
  );
}
