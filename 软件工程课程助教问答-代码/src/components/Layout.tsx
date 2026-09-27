import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 w-full flex flex-col min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
