import { ReactNode } from 'react'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

const mockUser = {
  name: 'John Doe',
  avatar: '',
  connected: true,
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-gray-100">
      <div className="flex h-full w-full grow">
        <Sidebar user={mockUser} />
        <main className="w-full flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
