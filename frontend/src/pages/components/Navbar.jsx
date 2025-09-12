import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, Settings as SettingsIcon, LogOut, BookOpenText } from 'lucide-react';
import { clearToken } from '../../utils/auth';

const Navbar = ({ user }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-navbar]')) {
        setIsMenuOpen(false);
        setIsProfileOpen(false);
      }
    };
    if (isMenuOpen || isProfileOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen, isProfileOpen]);

  if (!user) return null;

  const navigationByRole = {
    admin: [{ name: 'User Management', to: '/admin/user-management' }],
    teacher: [
      { name: 'Dashboard', to: '/teacher' },
      { name: 'Students', to: '/teacher/student-management' },
      { name: 'Blogs', to: '/teacher/blogs', icon: <BookOpenText className="w-3.5 h-3.5" /> },
    ],
    student: [
      { name: 'Dashboard', to: '/student' },
      { name: 'Blogs', to: '/student/blogs', icon: <BookOpenText className="w-3.5 h-3.5" /> },
    ],
  };
  const navItems = navigationByRole[user.role] || navigationByRole.student;

  const homePath = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student';
  const settingsPath = user.role === 'admin' ? '/admin/settings' : '/settings';
  const getUserInitial = () => user?.name?.[0]?.toUpperCase() || 'U';

  const handleLogout = () => {
    clearToken();
    navigate('/login', { replace: true });
    setIsProfileOpen(false);
    setIsMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b transition-shadow ${isScrolled ? 'shadow' : ''}`}
      data-navbar
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <button
            onClick={() => navigate(homePath)}
            className="text-2xl font-bold tracking-tight text-blue-700 hover:text-blue-800 transition-colors"
            aria-label="Go to home"
          >
            STEM<span className="text-blue-500">Play</span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors pb-1 ${
                    isActive || location.pathname === item.to
                      ? 'text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-700 hover:text-blue-700'
                  }`
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  {item.icon}
                  {item.name}
                </span>
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Profile dropdown (desktop) */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setIsProfileOpen((v) => !v)}
                className="flex items-center gap-3 px-2 py-1 rounded-md hover:bg-blue-50/60 transition-colors"
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
              >
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                  {getUserInitial()}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold leading-4 text-gray-900">{user.name}</div>
                  <div className="text-[11px] text-blue-700 capitalize">{user.role}</div>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500 break-all">
                      {user.email || user.parentEmail}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigate('/profile');
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-blue-600" />
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      navigate(settingsPath);
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4 text-blue-600" />
                    Settings
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-colors"
              aria-expanded={isMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-3">
            {/* Mobile profile header */}
            <div className="flex items-center gap-3 px-2 pb-3 mb-2 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                {getUserInitial()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{user.name}</div>
                <div className="text-[11px] text-blue-700 capitalize">{user.role}</div>
              </div>
            </div>

            {/* Mobile links */}
            <div className="flex flex-col">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-2 py-2 text-base border-l-2 ${
                      isActive || location.pathname === item.to
                        ? 'text-blue-700 border-blue-600 bg-blue-50/50'
                        : 'text-gray-700 border-transparent hover:text-blue-700 hover:bg-blue-50'
                    }`
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    {item.icon}
                    {item.name}
                  </span>
                </NavLink>
              ))}

              <div className="mt-2 pt-2 border-top border-gray-100">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-2 text-base text-gray-700 hover:text-blue-700 hover:bg-blue-50"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    navigate(settingsPath);
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-2 py-2 text-base text-gray-700 hover:text-blue-700 hover:bg-blue-50"
                >
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-2 py-2 text-base text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;