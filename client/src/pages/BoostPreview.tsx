import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface BoostSession {
  url: string
  title: string
  description: string
  images: string[]
  adCopy: {
    headline: string
    primaryText: string
    callToAction: string
  }[]
  targetAudience: {
    interests: string[]
    ageRange: string
    locations: string[]
  }
}

export default function BoostPreview() {
  const navigate = useNavigate()
  const [session, setSession] = useState<BoostSession | null>(null)
  const [selectedAd, setSelectedAd] = useState(0)
  const [isLaunching, setIsLaunching] = useState(false)
  const [budget, setBudget] = useState('20')
  const [duration, setDuration] = useState('7')

  useEffect(() => {
    const savedSession = localStorage.getItem('boost_session')
    if (savedSession) {
      setSession(JSON.parse(savedSession))
    } else {
      navigate('/boost')
    }
  }, [navigate])

  const handleLaunch = async () => {
    if (!session) return

    setIsLaunching(true)
    try {
      const response = await fetch('/api/boost/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          selectedAdIndex: selectedAd,
          budget: parseFloat(budget),
          duration: parseInt(duration),
          tenantId: 1,
        }),
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
        return
      }

      localStorage.removeItem('boost_session')
      navigate('/', { state: { campaignLaunched: true } })
    } catch (err) {
      console.error('Launch error:', err)
      alert('Failed to launch campaign. Please try again.')
    } finally {
      setIsLaunching(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    )
  }

  const currentAd = session.adCopy[selectedAd]

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/boost')} className="text-text-secondary-light dark:text-text-secondary-dark hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="w-8 h-8 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
            </svg>
          </div>
          <span className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Preview Your Ads</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
                Analyzed from: <span className="text-primary">{session.url}</span>
              </h2>
              <p className="text-text-secondary-light dark:text-text-secondary-dark">{session.title}</p>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
              <div className="p-4 border-b border-border-light dark:border-border-dark">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">storefront</span>
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary-light dark:text-text-primary-dark text-sm">Your Business</div>
                    <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Sponsored</div>
                  </div>
                </div>
                <p className="text-text-primary-light dark:text-text-primary-dark text-sm">{currentAd.primaryText}</p>
              </div>

              {session.images.length > 0 && (
                <div className="aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <img 
                    src={session.images[0]} 
                    alt="Ad preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}

              <div className="p-4 bg-surface-light dark:bg-surface-dark">
                <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark uppercase mb-1">{new URL(session.url).hostname}</div>
                <div className="font-semibold text-text-primary-light dark:text-text-primary-dark">{currentAd.headline}</div>
                <div className="mt-3">
                  <button className="px-4 py-2 bg-primary text-background-dark rounded font-medium text-sm">
                    {currentAd.callToAction}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {session.adCopy.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAd(index)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedAd === index
                      ? 'bg-primary text-background-dark'
                      : 'bg-surface-light dark:bg-surface-dark text-text-secondary-light dark:text-text-secondary-dark border border-border-light dark:border-border-dark hover:border-primary'
                  }`}
                >
                  Variant {index + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
              <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">Campaign Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                    Daily Budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark">$</span>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark mb-2">
                    Duration (days)
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark focus:border-primary focus:outline-none"
                  >
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-border-light dark:border-border-dark">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Total Budget</span>
                    <span className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                      ${(parseFloat(budget || '0') * parseInt(duration || '0')).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary-light dark:text-text-secondary-dark">Platforms</span>
                    <span className="font-medium text-text-primary-light dark:text-text-primary-dark">
                      Facebook, Instagram
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
              <h3 className="font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">Target Audience</h3>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Interests:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {session.targetAudience.interests.map((interest, i) => (
                      <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Age:</span>
                  <span className="ml-2 text-sm text-text-primary-light dark:text-text-primary-dark">{session.targetAudience.ageRange}</span>
                </div>
                <div>
                  <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Locations:</span>
                  <span className="ml-2 text-sm text-text-primary-light dark:text-text-primary-dark">{session.targetAudience.locations.join(', ')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="w-full py-4 rounded-xl bg-primary text-background-dark font-bold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLaunching ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Launching...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">rocket_launch</span>
                  Launch Campaign
                </>
              )}
            </button>

            <p className="text-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
              Your ad will be reviewed by Meta before going live
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
