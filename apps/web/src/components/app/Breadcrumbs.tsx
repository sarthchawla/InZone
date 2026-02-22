import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  boardName?: string;
}

export function Breadcrumbs({ boardName }: BreadcrumbsProps) {
  const location = useLocation();
  const segments: { label: string; to: string }[] = [];

  if (location.pathname === '/') return null;

  segments.push({ label: 'Home', to: '/' });

  if (location.pathname.startsWith('/board/')) {
    segments.push({ label: boardName || 'Board', to: location.pathname });
  } else if (location.pathname.startsWith('/admin/')) {
    segments.push({ label: 'Admin', to: '/admin/invites' });
    const page = location.pathname.split('/').pop();
    if (page === 'invites') segments.push({ label: 'Invites', to: '/admin/invites' });
    else if (page === 'requests') segments.push({ label: 'Requests', to: '/admin/requests' });
    else if (page === 'users') segments.push({ label: 'Users', to: '/admin/users' });
  } else if (location.pathname === '/settings') {
    segments.push({ label: 'Settings', to: '/settings' });
  }

  return (
    <nav data-testid="breadcrumbs" aria-label="Breadcrumb" className="flex items-center gap-1.5 px-4 sm:px-6 py-2 text-sm text-muted-foreground border-b border-border bg-card">
      {segments.map((seg, i) => (
        <span key={seg.to + i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
          {i === segments.length - 1 ? (
            <span className="text-foreground font-medium truncate max-w-32 sm:max-w-none">{seg.label}</span>
          ) : (
            <Link to={seg.to} className="hover:text-foreground transition-colors">{i === 0 ? <Home className="w-3.5 h-3.5" /> : seg.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
