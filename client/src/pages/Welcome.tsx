import { Link } from 'react-router-dom'

const features = [
  {
    icon: 'auto_awesome',
    title: 'AI-Powered Optimization',
    description: 'Let our intelligent algorithms automatically adjust your campaigns for the best possible results.',
  },
  {
    icon: 'tune',
    title: 'Simplified Management',
    description: 'Launch, monitor, and manage all your Meta ad campaigns from a single, intuitive dashboard.',
  },
  {
    icon: 'bar_chart',
    title: 'Data-Driven Insights',
    description: "Get clear, actionable reports that show you what's working and how to improve performance.",
  },
]

export default function Welcome() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <div className="flex h-full grow flex-col">
        <div className="flex flex-1 justify-center px-4 py-5 sm:px-6 md:px-8 lg:px-10">
          <div className="flex w-full max-w-6xl flex-col">
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light dark:border-border-dark px-4 py-3 md:px-10">
              <div className="flex items-center gap-4 text-text-primary-light dark:text-text-primary-dark">
                <div className="size-6 text-primary">
                  <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
                  </svg>
                </div>
                <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] text-text-primary-light dark:text-text-primary-dark">Shothik.ai</h2>
              </div>
              <div className="flex flex-1 items-center justify-end gap-8">
                <a className="hidden text-sm font-medium leading-normal text-text-primary-light dark:text-text-primary-dark sm:block" href="#">Help</a>
                <Link to="/register" className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">person</span>
                </Link>
              </div>
            </header>

            <main className="flex flex-1 flex-col items-center justify-center p-4 py-12 md:p-10">
              <div className="w-full">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
                  <div className="flex items-center justify-center">
                    <div className="w-full aspect-square bg-gradient-to-br from-primary/30 to-primary/5 rounded-xl flex items-center justify-center">
                      <div className="text-primary">
                        <svg className="w-32 h-32" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                          <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center gap-8">
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-2 text-left">
                        <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-text-primary-light dark:text-text-primary-dark sm:text-5xl">Welcome to Shothik.ai</h1>
                        <h2 className="text-base font-normal leading-normal text-text-secondary-light dark:text-text-secondary-dark sm:text-lg">Automate your Meta ads with the power of AI. Simplify campaign management, optimize for performance, and unlock data-driven insights to maximize your ROI.</h2>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <p className="text-base font-medium leading-normal text-text-primary-light dark:text-text-primary-dark">Step 1 of 3: Connect Account</p>
                      <div className="rounded-full bg-border-light dark:bg-border-dark h-2">
                        <div className="h-2 rounded-full bg-primary" style={{ width: '33%' }}></div>
                      </div>
                    </div>

                    <button className="flex min-w-[84px] w-full max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-background-dark text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
                      <span className="truncate">Connect Facebook Account</span>
                    </button>

                    <p className="text-sm font-normal leading-normal text-text-secondary-light dark:text-text-secondary-dark">Trusted by 1000+ businesses</p>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-10 px-0 py-16 md:px-4">
                  <div className="flex flex-col gap-4">
                    <h1 className="text-3xl font-bold leading-tight tracking-tight text-text-primary-light dark:text-text-primary-dark sm:text-4xl sm:font-black sm:tracking-[-0.033em]">Unlock Your Ad Potential</h1>
                    <p className="max-w-[720px] text-base font-normal leading-normal text-text-secondary-light dark:text-text-secondary-dark">Here's how Shothik.ai transforms your advertising strategy.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((feature, i) => (
                      <div key={i} className="flex flex-1 flex-col gap-3 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark p-4">
                        <div className="text-primary">
                          <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <h2 className="text-base font-bold leading-tight text-text-primary-light dark:text-text-primary-dark">{feature.title}</h2>
                          <p className="text-sm font-normal leading-normal text-text-secondary-light dark:text-text-secondary-dark">{feature.description}</p>
                        </div>
                      </div>
                    ))}
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
