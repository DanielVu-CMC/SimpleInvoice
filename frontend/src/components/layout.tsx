import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  FileText,
  LayoutList,
  LogOut,
  Menu,
  Plus,
  X,
} from 'lucide-react';
import { useAuth } from '@/services/auth/auth-provider';
import { errorMessage } from '@/services/api/client';
import { toast } from 'sonner';
import { Button } from './ui/button';
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      to="/invoices"
      className={`brand ${light ? 'brand-light' : ''}`}
      aria-label="SimpleInvoice home"
    >
      <span className="brand-mark">
        <FileText size={22} />
      </span>
      <span>
        simple<span className="brand-emphasis">invoice</span>
        <sup>®</sup>
      </span>
    </Link>
  );
}
export function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const frame = requestAnimationFrame(() => mainRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const closeOnDesktop = () => {
      if (!media.matches) setMenuOpen(false);
    };
    media.addEventListener('change', closeOnDesktop);
    return () => media.removeEventListener('change', closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const sidebar = sidebarRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [
      ...(sidebar?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled)',
      ) ?? []),
    ];
    focusable()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key === 'Tab') {
        const elements = focusable(),
          first = elements[0],
          last = elements[elements.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !sidebar?.contains(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !sidebar?.contains(document.activeElement))
        ) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [menuOpen]);
  const [loggingOut, setLoggingOut] = useState(false);
  const signOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoggingOut(false);
    }
  };
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="mobile-header" inert={menuOpen}>
        <Brand />
        <Button
          variant="ghost"
          size="icon"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          ref={triggerRef}
          aria-expanded={menuOpen}
          aria-controls="workspace-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </header>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          tabIndex={-1}
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        ref={sidebarRef}
        className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}
        role={menuOpen ? 'dialog' : undefined}
        aria-modal={menuOpen ? true : undefined}
        aria-label="Workspace navigation"
      >
        {menuOpen && (
          <Button
            className="navigation-close"
            variant="ghost"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X size={18} /> Close navigation
          </Button>
        )}
        <Brand light />
        <div className="workspace-label">
          <span className="workspace-icon">S</span>
          <div>
            <strong>Your workspace</strong>
            <span>Invoice management</span>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation" onClick={() => setMenuOpen(false)}>
          <NavLink to="/invoices" end>
            <LayoutList size={18} />
            All invoices
            <ArrowUpRight size={15} className="nav-arrow" />
          </NavLink>
          <NavLink to="/invoices/new">
            <Plus size={18} />
            Create invoice
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="note-line" />
          <p>
            Less paperwork.
            <br />
            <strong>More perspective.</strong>
          </p>
          <span>Keep every invoice in view.</span>
        </div>
        <div className="sidebar-profile">
          <span className="avatar">
            {user?.fullname
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
          <div>
            <strong>{user?.fullname}</strong>
            <span>{user?.email}</span>
          </div>
          <button
            aria-label="Sign out"
            title="Sign out"
            disabled={loggingOut}
            onClick={() => void signOut()}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main
        ref={mainRef}
        id="main-content"
        className="main-content"
        tabIndex={-1}
        inert={menuOpen}
      >
        <div className="topbar">
          <span>YOUR BUSINESS, AT A GLANCE</span>
          <div>
            <span className="live-dot" />
            SimpleInvoice workspace
          </div>
        </div>
        <Outlet />
        <footer className="page-footer">
          <span>SimpleInvoice</span>
          <span>Clarity in every transaction.</span>
        </footer>
      </main>
    </div>
  );
}
