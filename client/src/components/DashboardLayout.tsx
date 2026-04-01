import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background noise-overlay">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-5 pt-16 lg:pt-8 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
