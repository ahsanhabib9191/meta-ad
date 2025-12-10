import Layout from '../components/Layout'

const mockData = {
  primaryAdAccount: {
    name: 'Starlight - Main Campaign',
    id: 'act_1234567890123',
    status: 'Active',
  },
  associatedPixel: {
    name: 'Starlight Main Pixel',
    id: '555123456789',
    status: 'Active',
  },
  businessManagers: [
    { name: 'Starlight Innovations Inc.', id: '987654321098765' },
    { name: 'Quantum Leap Co.', id: '123456789012345' },
  ],
  adAccounts: [
    { name: 'Starlight - Main Campaign', totalSpend: '$15,234.87', accountAge: '2 years, 3 months' },
    { name: 'Quantum - Product Launch', totalSpend: '$8,750.12', accountAge: '8 months' },
    { name: 'Personal Ad Account', totalSpend: '$1,050.50', accountAge: '5 years' },
  ],
  connectedPages: [
    { name: 'Starlight Innovations Inc.', type: 'Business' },
    { name: 'Quantum Leap Co.', type: 'Business' },
    { name: "John Doe's Page", type: 'Personal' },
  ],
  metaPixels: [
    { name: 'Starlight Main Pixel', id: '555123456789', stats: '1.2k PageViews in last 7 days' },
    { name: 'Quantum Leap Pixel', id: '555987654321', stats: '876 Purchase events in last 7 days' },
  ],
}

export default function Dashboard() {
  return (
    <Layout>
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-white text-3xl font-bold leading-tight tracking-[-0.033em]">Dashboard</h1>
            <p className="text-text-secondary-dark text-base font-normal leading-normal">
              Welcome back, John. Here's your performance overview.
            </p>
          </div>
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-6 bg-primary text-background-dark text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined">add</span>
            <span className="truncate">Create New Campaign</span>
          </button>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Primary Setup</h2>
              <button className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-4 bg-white/10 text-white text-sm font-medium leading-normal hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-sm">edit</span>
                <span className="truncate">Change Setup</span>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4 rounded-lg border border-solid border-primary/50 bg-primary/10 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-white text-base font-semibold">Primary Ad Account</h3>
                  <div className="flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                    <div className="size-2 rounded-full bg-primary"></div>
                    <span>{mockData.primaryAdAccount.status}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-white text-lg">{mockData.primaryAdAccount.name}</p>
                  <p className="text-sm text-gray-400">ID: {mockData.primaryAdAccount.id}</p>
                </div>
              </div>
              <div className="flex flex-col gap-4 rounded-lg border border-solid border-primary/50 bg-primary/10 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-white text-base font-semibold">Associated Pixel</h3>
                  <div className="flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                    <div className="size-2 rounded-full bg-primary"></div>
                    <span>{mockData.associatedPixel.status}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-white text-lg">{mockData.associatedPixel.name}</p>
                  <p className="text-sm text-gray-400">ID: {mockData.associatedPixel.id}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Your Business Managers</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mockData.businessManagers.map((bm) => (
                <div key={bm.id} className="flex flex-col gap-4 rounded-lg border border-solid border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20">
                      <span className="material-symbols-outlined text-primary">business_center</span>
                    </div>
                    <h3 className="flex-1 text-white text-base font-semibold">{bm.name}</h3>
                  </div>
                  <p className="text-sm text-gray-400">ID: {bm.id}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Ad Accounts Overview</h2>
            <div className="overflow-hidden rounded-lg border border-solid border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="p-4 text-sm font-semibold text-white">Account Name</th>
                      <th className="p-4 text-sm font-semibold text-white">Total Spend</th>
                      <th className="p-4 text-sm font-semibold text-white">Account Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {mockData.adAccounts.map((account, i) => (
                      <tr key={i}>
                        <td className="p-4 text-sm text-gray-300">{account.name}</td>
                        <td className="p-4 text-sm text-gray-300">{account.totalSpend}</td>
                        <td className="p-4 text-sm text-gray-300">{account.accountAge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Connected Pages</h2>
              <div className="flex flex-col gap-4 rounded-lg border border-solid border-white/10 bg-white/5 p-5">
                {mockData.connectedPages.map((page, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-sm">person</span>
                      </div>
                      <p className="text-base text-white">{page.name}</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-medium ${
                      page.type === 'Business' 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {page.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Meta Pixels</h2>
              <div className="flex flex-col gap-4 rounded-lg border border-solid border-white/10 bg-white/5 p-5">
                {mockData.metaPixels.map((pixel, i) => (
                  <div key={i}>
                    {i > 0 && <hr className="border-white/10 mb-4" />}
                    <div className="flex flex-col gap-2">
                      <p className="text-base font-medium text-white">{pixel.name}</p>
                      <p className="text-sm text-gray-400">ID: {pixel.id}</p>
                      <p className="text-sm text-primary">{pixel.stats}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
