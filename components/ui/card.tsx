"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "elevated" | "outline";
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  variant = "default",
}) => {
  const variants = {
    default:
      "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200",
    glass:
      "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200",
    elevated:
      "bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-200 border border-slate-100 dark:border-slate-800",
    outline:
      "bg-transparent border-2 border-blue-500/30 dark:border-blue-400/30 rounded-xl hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-colors duration-200",
  };

  return (
    <div className={`${variants[variant]} ${className} p-6`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = "" }) => (
  <div className={`mb-4 pb-4 border-b border-slate-200 dark:border-slate-700 ${className}`}>
    {children}
  </div>
);

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className = "" }) => (
  <h3 className={`text-xl font-bold text-slate-900 dark:text-white ${className}`}>
    {children}
  </h3>
);

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  children,
  className = "",
}) => (
  <p className={`text-sm text-slate-600 dark:text-slate-400 mt-1 ${className}`}>
    {children}
  </p>
);

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = "" }) => (
  <div className={`mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 ${className}`}>
    {children}
  </div>
);

export default Card;
