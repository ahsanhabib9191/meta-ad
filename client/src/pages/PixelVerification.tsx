import Layout from '../components/Layout'

const verificationData = {
  summary: {
    status: 'success',
    title: 'All Systems Go!',
    description: 'Your Pixel and CAPI are correctly set up and events are being received. Last checked on Oct 26, 4:32 PM.',
  },
  sections: [
    {
      title: 'Meta Pixel',
      items: [
        { name: 'Pixel Found on Website', status: 'Active', type: 'success' },
        { name: 'PageView Event', status: 'Receiving Data', type: 'success' },
      ],
    },
    {
      title: 'Conversions API (CAPI)',
      items: [
        { name: 'Server Connection', status: 'Established', type: 'success' },
        { name: 'Event Match Quality', status: 'Good', type: 'success' },
      ],
    },
    {
      title: 'Event Tracking',
      items: [
        { name: 'ViewContent', status: 'Receiving Data', type: 'success' },
        { name: 'AddToCart', status: 'Receiving Data', type: 'success' },
        { name: 'InitiateCheckout', status: 'Not Detected', type: 'error', action: 'How to fix' },
        { name: 'Purchase', status: 'Partial Data', type: 'warning', action: 'Learn more' },
      ],
    },
  ],
}

export default function PixelVerification() {
  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-[960px]">
        <div className="flex flex-wrap justify-between gap-4 items-start">
          <div className="flex min-w-72 flex-col gap-2">
            <p className="text-gray-900 text-3xl sm:text-4xl font-black leading-tight tracking-[-0.033em]">Pixel & CAPI Setup Verification</p>
            <p className="text-gray-500 text-base font-normal leading-normal">Verify the setup of your Meta Pixel and Conversions API to ensure accurate ad tracking.</p>
          </div>
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-gray-900 text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-lg">sync</span>
            <span className="truncate">Re-run Verification</span>
          </button>
        </div>

        <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <div className="flex items-center justify-center size-16 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
              <span className="material-symbols-outlined filled !text-4xl">verified</span>
            </div>
            <div className="flex w-full min-w-72 grow flex-col items-stretch justify-center gap-1">
              <p className="text-gray-500 text-sm font-medium leading-normal tracking-wider uppercase">STATUS SUMMARY</p>
              <p className="text-gray-900 text-xl font-bold leading-tight tracking-[-0.015em]">{verificationData.summary.title}</p>
              <p className="text-gray-600 text-base font-normal leading-normal">{verificationData.summary.description}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-gray-900 text-[22px] font-bold leading-tight tracking-[-0.015em] px-0 pb-3 pt-5">Verification Details</h2>
          <div className="flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            {verificationData.sections.map((section, i) => (
              <details key={i} className="flex flex-col group border-t border-gray-200 first:border-t-0" open={i === 0 || i === 2}>
                <summary className="flex cursor-pointer items-center justify-between gap-6 py-4 px-6 bg-gray-50">
                  <p className="text-gray-900 text-base font-bold leading-normal">{section.title}</p>
                  <div className="text-gray-500 group-open:rotate-180 transition-transform">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </summary>
                <div className="divide-y divide-gray-100 bg-white">
                  {section.items.map((item, j) => (
                    <div key={j} className="flex items-center gap-4 p-4 px-6">
                      <div className={`${
                        item.type === 'success' ? 'text-emerald-500' :
                        item.type === 'error' ? 'text-red-500' :
                        'text-amber-500'
                      }`}>
                        <span className="material-symbols-outlined filled">
                          {item.type === 'success' ? 'check_circle' : item.type === 'error' ? 'cancel' : 'warning'}
                        </span>
                      </div>
                      <div className="flex-grow">
                        <p className="text-gray-700 text-sm font-medium">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`text-sm font-medium ${
                          item.type === 'success' ? 'text-emerald-600' :
                          item.type === 'error' ? 'text-red-500' :
                          'text-amber-500'
                        }`}>
                          {item.status}
                        </p>
                        {item.action && (
                          <button className="text-primary text-sm font-bold hover:underline">{item.action}</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
