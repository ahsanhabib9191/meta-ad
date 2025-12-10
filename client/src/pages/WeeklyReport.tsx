import Layout from '../components/Layout'

const mockStats = [
  { label: 'Total Spend', value: '$12,580', change: '15.2%', positive: true },
  { label: 'Total Revenue', value: '$56,340', change: '2.1%', positive: false },
  { label: 'ROAS', value: '4.48x', change: '1.5%', positive: true },
]

const mockCreatives = [
  { name: 'Summer Sale Video Ad', campaign: 'Summer 2024 Promo', spend: '$3,250.50', revenue: '$18,450.00', roas: '5.67x' },
  { name: 'New Feature Carousel', campaign: 'Q3 Product Launch', spend: '$2,810.00', revenue: '$14,120.75', roas: '5.02x' },
  { name: 'User Testimonial Ad', campaign: 'Brand Awareness Evergreen', spend: '$1,980.20', revenue: '$8,540.50', roas: '4.31x' },
]

const mockInsights = [
  { text: 'Top converting cities this week are ', highlight: 'New York', suffix: ' and Los Angeles.' },
  { text: "Audience 'Tech Enthusiasts' is showing signs of fatigue (CTR down 12%).", highlight: "'Tech Enthusiasts'", suffix: '' },
  { text: 'Seasonal trend detected: ', highlight: 'Ad engagement peaks', suffix: ' on weekend afternoons.' },
]

export default function WeeklyReport() {
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-gray-900 text-4xl font-black leading-tight tracking-[-0.033em]">Weekly Performance Report</h1>
          <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary pl-4 pr-3 text-gray-900 font-bold hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-xl">calendar_month</span>
            <p className="text-sm font-medium leading-normal">Last 7 days</p>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {mockStats.map((stat, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl p-6 border border-gray-200 bg-white shadow-sm">
              <p className="text-gray-500 text-sm font-medium leading-normal">{stat.label}</p>
              <p className="text-gray-900 text-3xl font-bold leading-tight">{stat.value}</p>
              <p className={`text-sm font-medium leading-normal flex items-center gap-1 ${stat.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                <span className="material-symbols-outlined text-lg">{stat.positive ? 'arrow_upward' : 'arrow_downward'}</span>
                {stat.change}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-900 text-xl font-bold">Performance Trend</h2>
              </div>
              <div className="flex items-end gap-2 mb-2">
                <p className="text-gray-900 text-3xl font-bold">$56,340</p>
              </div>
              <p className="text-sm text-gray-500 mb-4">Last 7 Days <span className="text-emerald-600">↑ 15.2%</span></p>
              
              <div className="h-48 flex items-end justify-between gap-2 border-b border-gray-200 pb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const heights = [60, 75, 45, 80, 55, 90, 70]
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-primary/60 rounded-t"
                        style={{ height: `${heights[i]}%` }}
                      />
                      <span className="text-xs text-gray-500">{day}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-xl border border-gray-200 bg-white p-6 h-full shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                <h2 className="text-gray-900 text-xl font-bold">AI Generated Insights</h2>
              </div>
              <ul className="space-y-4 text-sm text-gray-600">
                {mockInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>
                      {insight.text.split(insight.highlight)[0]}
                      <span className="text-gray-900 font-medium">{insight.highlight}</span>
                      {insight.suffix}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-3">
                <button className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-gray-900 font-bold hover:bg-primary/90 transition-colors">
                  <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                  Export as PDF
                </button>
                <button className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                  <span className="material-symbols-outlined text-lg">download</span>
                  Export as CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex">
              <button className="px-6 py-3 text-sm font-semibold text-primary border-b-2 border-primary">Top Creatives</button>
              <button className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">Top Audiences</button>
              <button className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">Top Locations</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                <tr>
                  <th className="px-6 py-3">Creative</th>
                  <th className="px-6 py-3">Campaign</th>
                  <th className="px-6 py-3">Spend</th>
                  <th className="px-6 py-3">Revenue</th>
                  <th className="px-6 py-3">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockCreatives.map((creative, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-lg bg-primary/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary">play_arrow</span>
                        </div>
                        <span className="text-gray-900 font-medium">{creative.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{creative.campaign}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono">{creative.spend}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono">{creative.revenue}</td>
                    <td className="px-6 py-4 text-emerald-600 font-bold">{creative.roas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
