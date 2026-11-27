export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-900 antialiased font-body print:bg-white print:p-0">
      {children}
    </div>
  );
}
