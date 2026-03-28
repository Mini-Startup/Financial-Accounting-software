import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const role = (user.publicMetadata?.role as string) || "client";
  const firstName = user.firstName || "User";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-heading font-semibold">
          Welcome back, {firstName}
        </h2>
        <p className="text-slate-400">
          Here is the latest overview of your financial accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder Stat Cards */}
        {[
          { title: "Total Balance", value: "$124,500.00", trend: "+2.4%" },
          { title: "Monthly Revenue", value: "$32,100.00", trend: "+12.5%" },
          { title: "Pending Invoices", value: "$4,200.00", trend: "-1.2%" },
        ].map((stat, i) => (
          <div key={i} className="bg-surface/40 backdrop-blur-sm border border-border p-6 rounded-2xl flex flex-col gap-4">
            <p className="text-slate-400 font-medium">{stat.title}</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-heading font-semibold">{stat.value}</span>
              <span className={`text-sm font-medium ${stat.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="bg-surface/40 backdrop-blur-sm border border-border rounded-2xl p-6">
          <h3 className="text-xl font-heading font-medium mb-4 flex items-center gap-3">
            Your Profile Metadata
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 uppercase tracking-wider">
              {role}
            </span>
          </h3>
          <pre className="p-4 rounded-xl bg-black/50 overflow-x-auto text-sm text-slate-300 font-mono border border-border/50">
            {JSON.stringify({ 
              id: user.id,
              primaryEmail: user.emailAddresses[0]?.emailAddress,
              role: role 
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
