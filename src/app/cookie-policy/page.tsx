import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Elizabeth Wightwick cookie policy. How we use cookies and similar technologies on our website.',
};

const cookieTable = [
  {
    category: 'Essential Cookies',
    description: 'Required for the website to function correctly. These cookies enable core functionality such as security, network management, and page navigation.',
    cookies: [
      { name: 'Session ID', purpose: 'Stores your search criteria and preferences', duration: 'Session' },
    ],
  },
  {
    category: 'Analytics Cookies',
    description: 'Help us understand how visitors interact with our website by collecting and reporting information anonymously.',
    cookies: [
      { name: 'Google Analytics', purpose: 'Tracks site usage statistics to help us improve the website', duration: 'Up to 2 years' },
    ],
  },
  {
    category: 'Functionality Cookies',
    description: 'Allow us to remember choices you make and provide enhanced, more personalised features.',
    cookies: [
      { name: 'Video cookies', purpose: 'Enable embedded video functionality (YouTube, Vimeo)', duration: 'Session to 2 years' },
    ],
  },
  {
    category: 'Advertising Cookies',
    description: 'Used to deliver advertisements more relevant to you and your interests. They may also be used to limit the number of times you see an advertisement.',
    cookies: [
      { name: 'Third-party advertising', purpose: 'Collect information about your visit for targeted advertising', duration: 'Varies' },
    ],
  },
];

export default function CookiePolicyPage() {
  return (
    <>
      <section className="pt-32 pb-12">
        <div className="container-narrow">
          <h1 className="heading-display text-charcoal">Cookie Policy</h1>
          <p className="mt-3 text-small text-slate font-inter">Last updated: January 2025</p>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-narrow">
          <div className="prose-ew space-y-10">
            <div>
              <h2 className="heading-section text-charcoal mb-4">What Are Cookies</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                Cookies are small text files that are placed on your device when you visit a website. We use cookies and other similar technologies to distinguish you from other users of our website. This helps us to provide you with a good experience when you browse our website and also allows us to improve our site.
              </p>
              <p className="text-body text-slate font-inter font-light leading-relaxed mt-3">
                By using our website, you agree to our use of cookies in accordance with this Cookie Policy. You can choose to disable cookies through your browser settings, though this may affect your experience of our website.
              </p>
            </div>

            <div>
              <h2 className="heading-section text-charcoal mb-4">Types of Cookies We Use</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                We use the following categories of cookies on our website:
              </p>
            </div>

            {cookieTable.map((category, index) => (
              <div key={index}>
                <h3 className="font-cormorant text-[1.35rem] font-light text-charcoal mb-3">
                  {index + 1}. {category.category}
                </h3>
                <p className="text-body text-slate font-inter font-light leading-relaxed mb-4">
                  {category.description}
                </p>
                <div className="overflow-hidden border border-taupe/20">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-beige/50">
                        <th className="px-4 py-3 text-[12px] font-inter font-medium uppercase tracking-wider text-charcoal">Cookie</th>
                        <th className="px-4 py-3 text-[12px] font-inter font-medium uppercase tracking-wider text-charcoal">Purpose</th>
                        <th className="px-4 py-3 text-[12px] font-inter font-medium uppercase tracking-wider text-charcoal">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.cookies.map((cookie, cIndex) => (
                        <tr key={cIndex} className="border-t border-taupe/10">
                          <td className="px-4 py-3 text-body text-slate font-inter font-light">{cookie.name}</td>
                          <td className="px-4 py-3 text-body text-slate font-inter font-light">{cookie.purpose}</td>
                          <td className="px-4 py-3 text-body text-slate font-inter font-light">{cookie.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div>
              <h2 className="heading-section text-charcoal mb-4">Managing Cookies</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                Most web browsers allow you to control cookies through their settings. You can set your browser to refuse all or some cookies, or to alert you when websites set or access cookies. Please note that if you disable or refuse cookies, some parts of this website may become inaccessible or not function properly.
              </p>
              <p className="text-body text-slate font-inter font-light leading-relaxed mt-3">
                To find out more about cookies, including how to see what cookies have been set and how to manage and delete them, visit{' '}
                <a
                  href="https://www.allaboutcookies.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand-dark transition-colors underline underline-offset-2"
                >
                  www.allaboutcookies.org
                </a>.
              </p>
            </div>

            <div>
              <h2 className="heading-section text-charcoal mb-4">Third-Party Cookies</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                Please note that third parties (including, for example, advertising networks and providers of external services like web traffic analysis) may also use cookies, over which we have no control. These cookies are likely to be analytical, performance or advertising cookies.
              </p>
            </div>

            <div>
              <h2 className="heading-section text-charcoal mb-4">Changes to This Policy</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our data practices. We encourage you to periodically review this page for the latest information on our cookie practices.
              </p>
            </div>

            <div>
              <h2 className="heading-section text-charcoal mb-4">Contact</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                If you have any questions about our use of cookies, please contact us at:
              </p>
              <div className="mt-4 p-6 bg-beige/30 text-body text-slate font-inter font-light">
                <p>Elizabeth Wightwick Ltd</p>
                <p>60 High Street, Wimbledon Village</p>
                <p>London SW19 5EE</p>
                <p className="mt-2">Email: info@elizabeth-wightwick.co.uk</p>
                <p>Phone: 0203 597 3484</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
