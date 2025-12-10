import Layout from '../components/Layout'

const mockStats = [
  { label: 'Total Spend', value: '$12,450', change: '+5.2%', positive: true },
  { label: 'ROAS', value: '3.5x', change: '-1.5%', positive: false },
  { label: 'Cost Per Acquisition', value: '$12.20', change: '+2.1%', positive: true },
  { label: 'Conversions', value: '1,020', change: '-0.8%', positive: false },
]

const mockCopyPerformance = [
  { copy: '"Unlock peak performance with our new athletic gear. Limited time offer!"', impressions: '250,430', ctr: '3.12%', roas: '4.2x', status: 'Winner' },
  { copy: '"Your next adventure starts here. Shop now for 20% off."', impressions: '180,912', ctr: '2.55%', roas: '3.1x', status: 'Active' },
  { copy: '"Comfort meets style. Discover our latest collection."', impressions: '95,230', ctr: '1.80%', roas: '1.5x', status: 'Underperforming' },
]

const mockCampaigns = [
  { name: 'Summer Sale 2023', roas: '4.2x', status: 'Winner', active: true },
  { name: 'New Collection Intro', roas: '1.5x', status: 'Underperforming', active: false },
]

export default function MonthlyReview() {
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">Monthly Review</p>
          <div className="flex items-center gap-3">
            <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white/10 pl-4 pr-3 text-white hover:bg-white/20 transition-colors">
              <p className="text-sm font-medium leading-normal">October 2023</p>
              <span className="material-symbols-outlined text-xl">calendar_month</span>
            </button>
            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-primary text-background-dark text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-xl">download</span>
              <span className="truncate">Export Report</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockStats.map((stat, i) => (
            <div key={i} className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl p-6 border border-white/10 bg-white/5">
              <p className="text-white/80 text-base font-medium leading-normal">{stat.label}</p>
              <p className="text-white tracking-light text-3xl font-bold leading-tight">{stat.value}</p>
              <p className={`text-base font-medium leading-normal flex items-center gap-1 ${stat.positive ? 'text-success' : 'text-error'}`}>
                <span className="material-symbols-outlined text-lg">{stat.positive ? 'arrow_upward' : 'arrow_downward'}</span>
                {stat.change}
              </p>
            </div>
          ))}
        </div>

        <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pt-6 pb-2">Performance Analysis</h2>
        
        <div className="border-b border-white/10">
          <div className="flex gap-6">
            <button className="text-primary font-semibold py-3 border-b-2 border-primary">AI Copy</button>
            <button className="text-white/60 hover:text-white font-medium py-3">Budget</button>
            <button className="text-white/60 hover:text-white font-medium py-3">Audience</button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="text-xs text-white uppercase bg-white/5">
                <tr>
                  <th className="px-6 py-3">Ad Copy</th>
                  <th className="px-6 py-3">Impressions</th>
                  <th className="px-6 py-3">CTR</th>
                  <th className="px-6 py-3">ROAS</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockCopyPerformance.map((row, i) => (
                  <tr key={i} className="border-b border-white/10 last:border-0">
                    <td className="px-6 py-4 font-medium text-white max-w-sm truncate">{row.copy}</td>
                    <td className="px-6 py-4">{row.impressions}</td>
                    <td className="px-6 py-4">{row.ctr}</td>
                    <td className="px-6 py-4">{row.roas}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        row.status === 'Winner' ? 'bg-success/20 text-success' :
                        row.status === 'Active' ? 'bg-gray-500/20 text-gray-300' :
                        'bg-error/20 text-error'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Strategy & Optimization</h2>
            
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Refine AI Prompts</h3>
                <button className="text-sm font-medium text-primary hover:underline">View Suggestions</button>
              </div>
              <p className="text-sm text-white/60 mb-2">Current master prompt for generating ad copy. Edit below to refine for next month's campaigns.</p>
              <textarea
                className="w-full bg-background-dark border border-white/20 rounded-lg p-3 text-white/90 font-mono text-sm focus:ring-primary focus:border-primary resize-none"
                rows={4}
                defaultValue="Generate 5 high-converting Facebook ad headlines for our new line of eco-friendly running shoes. Focus on benefits like comfort, durability, and sustainability. Target audience: runners aged 25-45 who are environmentally conscious."
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Scale Winners / Pause Underperformers</h3>
              <div className="space-y-4">
                {mockCampaigns.map((campaign, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-white font-medium">Campaign: {campaign.name}</p>
                      <p className={`text-sm ${campaign.status === 'Winner' ? 'text-success' : 'text-error'}`}>
                        ROAS: {campaign.roas} ({campaign.status})
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={campaign.active} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ms-3 text-sm font-medium text-white">{campaign.active ? 'Active' : 'Paused'}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Future Testing</h2>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 h-full flex flex-col">
              <h3 className="text-lg font-bold text-white mb-2">Plan Next Month's A/B Tests</h3>
              <p className="text-sm text-white/60 mb-6 flex-grow">Set up tests to optimize objectives, targeting, and creative formats for the upcoming cycle.</p>
              <button className="w-full flex items-center justify-center gap-2 h-12 rounded-lg bg-primary text-background-dark font-bold hover:bg-primary/90 transition-colors">
                <span className="material-symbols-outlined">science</span>
                Set Up New Test
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
