import { NavLink, useLocation } from 'react-router-dom';
import { MessageSquare, Code, BarChart3, BookOpen } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: '知识问答', icon: MessageSquare },
  { path: '/prompt', label: '系统 Prompt', icon: Code },
  { path: '/eval', label: '智能评测', icon: BarChart3 },
];

export default function Header() {
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 group">
          <div className="size-8 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <BookOpen className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-tight">软件工程助教</span>
            <span className="text-[11px] text-muted-foreground leading-tight">《实用软件工程》第3版 · RAG</span>
          </div>
        </NavLink>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' ? pathname === '/' : pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'text-primary font-medium bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Mobile Nav */}
        <nav className="flex md:hidden items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' ? pathname === '/' : pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  isActive
                    ? 'text-primary font-medium bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
