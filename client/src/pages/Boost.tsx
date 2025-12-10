import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Boost() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleBoost = async () => {
    if (!url.trim()) {
      setError('Please enter a URL')
      return
    }

    try {
      new URL(url)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/boost/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return
      }

      localStorage.setItem('boost_session', JSON.stringify(data))
      navigate('/boost/preview')
    } catch (err) {
      setError('Failed to analyze URL. Please try again.')
      console.error('Boost error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(files => files.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
            </svg>
          </div>
          <span className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Shothik.ai</span>
        </div>
        <nav className="flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark">Create</a>
          <a href="#" className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark">Projects</a>
          <a href="#" className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark">Asset Library</a>
        </nav>
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary">person</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <div className="flex-1 max-w-md">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">
              Set Up Your Ad Campaign in a Snap
            </h1>

            <div className="mt-8 space-y-4">
              <div className="relative">
                <label className="absolute -top-2.5 left-3 px-1 bg-background-light dark:bg-background-dark text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
                  URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.yourwebsite.com/"
                  className="w-full px-4 py-3 rounded-xl border-2 border-primary/30 bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/50 dark:placeholder:text-text-secondary-dark/50 focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-light dark:border-border-dark text-text-secondary-light dark:text-text-secondary-dark hover:border-primary hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">upload</span>
                  <span className="text-sm font-medium">Upload Assets</span>
                </button>
                <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">(Optional)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={handleBoost}
                  disabled={isLoading}
                  className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-background-dark font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">bolt</span>
                      <span>Boost</span>
                    </>
                  )}
                </button>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
                      <span className="text-xs text-text-primary-light dark:text-text-primary-dark truncate max-w-[120px]">{file.name}</span>
                      <button onClick={() => removeFile(index)} className="text-text-secondary-light dark:text-text-secondary-dark hover:text-red-500">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="relative">
              <div className="space-y-2 text-right">
                <div className="text-2xl font-light text-text-secondary-light/30 dark:text-text-secondary-dark/30 blur-[1px]">Google Ads</div>
                <div className="text-2xl font-light text-text-secondary-light/40 dark:text-text-secondary-dark/40 blur-[0.5px]">TikTok</div>
                <div className="flex items-center justify-end gap-3">
                  <span className="text-primary text-xl">→</span>
                  <span className="text-3xl font-semibold text-text-primary-light dark:text-text-primary-dark">Facebook</span>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <span className="text-primary text-xl">→</span>
                  <span className="text-3xl font-semibold text-text-primary-light dark:text-text-primary-dark">Instagram</span>
                </div>
                <div className="text-2xl font-light text-text-secondary-light/40 dark:text-text-secondary-dark/40 blur-[0.5px]">LinkedIn</div>
                <div className="text-2xl font-light text-text-secondary-light/30 dark:text-text-secondary-dark/30 blur-[1px]">Snapchat</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
        Powered by AI to optimize your Meta ads
      </footer>
    </div>
  )
}
