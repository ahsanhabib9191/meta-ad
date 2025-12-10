import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  { path: '/reports', label: 'Reports', icon: 'bar_chart' },
  { path: '/monthly-review', label: 'Monthly Review', icon: 'analytics' },
  { path: '/pixel-verification', label: 'Pixel Setup', icon: 'verified' },
]

interface SidebarProps {
  user?: {
    name: string
    avatar?: string
    connected: boolean
  }
}

export default function Sidebar({ user }: SidebarProps) {
  const location = useLocation()

  return (
    <aside className="flex h-full min-h-screen w-64 flex-col justify-between border-r border-solid border-white/10 bg-background-light dark:bg-background-dark p-4">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3 px-3 text-white">
          <div className="size-6">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">Shothik.ai</h2>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? 'text-primary' : ''}`}>
                  {item.icon}
                </span>
                <p className="text-sm font-medium leading-normal">{item.label}</p>
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
            <p className="text-sm font-medium leading-normal">Settings</p>
          </Link>
        </div>
        {user && (
          <div className="flex items-center gap-3 border-t border-solid border-white/10 pt-4">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-primary/20"
              style={user.avatar ? { backgroundImage: `url("${user.avatar}")` } : {}}
            >
              {!user.avatar && (
                <div className="flex items-center justify-center size-full text-primary font-bold">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="text-white text-sm font-medium leading-normal">{user.name}</h1>
              <p className={`text-xs font-normal leading-normal ${user.connected ? 'text-primary' : 'text-white/50'}`}>
                {user.connected ? 'Connected' : 'Not Connected'}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
