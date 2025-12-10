import { ReactNode } from 'react'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

const mockUser = {
  name: 'John Doe',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqnSfwIKTF7eIw-hDkAkqv2hINOiuX7ZXjKuK4QLaTnayAwVsroNToPZcY6KudyoaRXEeUKio5p97hYiK1hoXmrN2RfLOOxmV3QOt54pMYVa-YOYvRRTrY9ZSKMFvGu_7lkAGl3FYOqVEt476VnO_-19-pcpQDi995kJ8vQB9lqrKe9zN0F0VJWZkZN5VnV0FGrTWYGS30YK7DDlmw8fUJCgTYgQcrMo0lUPxl85AR51S21J53lNuSShMJH330ES-9MGYk55Jti5E',
  connected: true,
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col">
      <div className="flex h-full w-full grow">
        <Sidebar user={mockUser} />
        <main className="w-full flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
