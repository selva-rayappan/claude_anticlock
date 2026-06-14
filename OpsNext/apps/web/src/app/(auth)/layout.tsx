import { Zap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar text-sidebar-foreground flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <Zap className="h-8 w-8 text-sidebar-primary" />
          <span className="text-2xl font-bold">OpsNext</span>
        </div>
        <div className="space-y-4">
          <blockquote className="text-2xl font-semibold leading-relaxed">
            "The CRM that understands professional services — built to close deals, not just track them."
          </blockquote>
          <div className="text-sidebar-foreground/60 text-sm">
            Trusted by 500+ professional services firms worldwide.
          </div>
        </div>
        <div className="text-sidebar-foreground/40 text-xs">
          © {new Date().getFullYear()} OpsNext Inc. All rights reserved.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
