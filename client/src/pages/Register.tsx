import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden">
      <div className="flex h-full grow flex-col">
        <div className="px-4 md:px-10 lg:px-20 xl:px-40 flex flex-1 justify-center py-5">
          <div className="flex flex-col max-w-[960px] flex-1">
            <header className="flex items-center justify-between whitespace-nowrap px-4 md:px-10 py-3">
              <Link to="/" className="flex items-center gap-4 text-white">
                <div className="size-6 text-primary">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
                  </svg>
                </div>
                <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Shothik.ai</h2>
              </Link>
              <div className="flex items-center gap-2">
                <p className="text-gray-600 dark:text-text-secondary-dark text-sm hidden sm:block">Already have an account?</p>
                <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200/80 dark:bg-white/10 text-gray-800 dark:text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
                  <span className="truncate">Log In</span>
                </button>
              </div>
            </header>

            <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 md:py-20">
              <div className="w-full max-w-md mx-auto space-y-8">
                <div className="flex flex-col gap-3 text-center">
                  <p className="text-gray-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">Create Your Account</p>
                  <p className="text-gray-600 dark:text-text-secondary-dark text-base font-normal leading-normal">Automate Your Meta Ads Today</p>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col min-w-40 flex-1">
                    <label className="text-gray-900 dark:text-white text-sm font-medium leading-normal pb-2" htmlFor="full-name">Full Name</label>
                    <input
                      className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-border-dark bg-background-light dark:bg-surface-dark focus:border-primary/50 h-12 placeholder:text-gray-400 dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal"
                      id="full-name"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="flex flex-col min-w-40 flex-1">
                    <label className="text-gray-900 dark:text-white text-sm font-medium leading-normal pb-2" htmlFor="work-email">Work Email</label>
                    <input
                      className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-border-dark bg-background-light dark:bg-surface-dark focus:border-primary/50 h-12 placeholder:text-gray-400 dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal"
                      id="work-email"
                      placeholder="name@company.com"
                      type="email"
                    />
                  </div>

                  <div className="flex flex-col min-w-40 flex-1">
                    <label className="text-gray-900 dark:text-white text-sm font-medium leading-normal pb-2" htmlFor="password">Password</label>
                    <div className="relative flex w-full flex-1 items-stretch">
                      <input
                        className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-border-dark bg-background-light dark:bg-surface-dark focus:border-primary/50 h-12 placeholder:text-gray-400 dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal pr-12"
                        id="password"
                        placeholder="Create a strong password"
                        type={showPassword ? 'text' : 'password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 dark:text-text-secondary-dark cursor-pointer"
                      >
                        <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col min-w-40 flex-1">
                    <label className="text-gray-900 dark:text-white text-sm font-medium leading-normal pb-2" htmlFor="confirm-password">Confirm Password</label>
                    <div className="relative flex w-full flex-1 items-stretch">
                      <input
                        className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-300 dark:border-border-dark bg-background-light dark:bg-surface-dark focus:border-primary/50 h-12 placeholder:text-gray-400 dark:placeholder:text-text-secondary-dark px-4 py-3 text-base font-normal leading-normal pr-12"
                        id="confirm-password"
                        placeholder="Re-enter your password"
                        type={showConfirmPassword ? 'text' : 'password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 dark:text-text-secondary-dark cursor-pointer"
                      >
                        <span className="material-symbols-outlined">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>

                  <button className="flex w-full min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary text-background-dark text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary transition-colors">
                    <span className="truncate">Create Account</span>
                  </button>

                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      By signing up, you agree to our <a className="font-medium text-primary/90 hover:text-primary" href="#">Terms of Service</a>.
                    </p>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
