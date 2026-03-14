import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Complaints Handling Policy',
  description: 'Elizabeth Wightwick complaints handling policy. Our approach to handling and resolving complaints.',
};

export default function ComplaintsHandlingPolicyPage() {
  return (
    <>
      <section className="pt-32 pb-12">
        <div className="container-narrow">
          <h1 className="heading-display text-charcoal">Complaints Handling Policy</h1>
          <p className="mt-3 text-body text-slate font-inter font-light max-w-2xl">
            Elizabeth Wightwick Ltd is committed to providing a professional service to all our clients and customers. When something goes wrong, we need you to tell us about it so we can resolve the issue.
          </p>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-narrow">
          <div className="space-y-10">
            <div>
              <h2 className="heading-section text-charcoal mb-4">Policy Statement</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                Elizabeth Wightwick Ltd aims to provide an efficient and effective service at all times. We are committed to treating all complainants fairly and take all complaints seriously. We will deal with complaints promptly and politely, and we will use the information we gather from complaints to improve our service.
              </p>
            </div>

            <div>
              <h2 className="heading-section text-charcoal mb-4">Who Can Complain</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                Any person who has received or requested a service from Elizabeth Wightwick Ltd has the right to make a complaint about that service. This includes buyers, sellers, landlords, tenants, and any other person who has engaged with our services.
              </p>
            </div>

            <div>
              <h2 className="heading-section text-charcoal mb-4">How to Make a Complaint</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                A complaint can be made in the following ways:
              </p>
              <ul className="mt-3 space-y-2 text-body text-slate font-inter font-light">
                <li className="pl-4 border-l-2 border-brand/20">In writing by post to our office address</li>
                <li className="pl-4 border-l-2 border-brand/20">By email to info@elizabeth-wightwick.co.uk</li>
                <li className="pl-4 border-l-2 border-brand/20">By telephone on 0203 597 3484</li>
                <li className="pl-4 border-l-2 border-brand/20">In person at our office</li>
              </ul>
            </div>

            <div>
              <h2 className="heading-section text-charcoal mb-4">Our Complaints Process</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                Upon receipt of a complaint, the following process will be followed:
              </p>
              <ul className="mt-3 space-y-3 text-body text-slate font-inter font-light">
                <li className="pl-4 border-l-2 border-brand/20">
                  <span className="font-medium text-charcoal">Acknowledgement:</span> We will acknowledge your complaint in writing within three working days of receipt
                </li>
                <li className="pl-4 border-l-2 border-brand/20">
                  <span className="font-medium text-charcoal">Investigation:</span> A senior member of staff will investigate the complaint thoroughly and impartially
                </li>
                <li className="pl-4 border-l-2 border-brand/20">
                  <span className="font-medium text-charcoal">Response:</span> We will provide a formal written response within 15 working days, setting out our findings and any proposed resolution
                </li>
                <li className="pl-4 border-l-2 border-brand/20">
                  <span className="font-medium text-charcoal">Review:</span> If you remain dissatisfied, you may request a review by the firm&apos;s principal, who will respond within a further 15 working days
                </li>
              </ul>
            </div>

            <div>
              <h2 className="heading-section text-charcoal mb-4">If You Remain Dissatisfied</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                If, after completing our internal complaints process, you remain dissatisfied with our response, you have the right to refer the matter to The Property Ombudsman (TPO). You must do so within 12 months of receiving our final response.
              </p>
              <div className="mt-4 p-6 bg-beige/30 text-body text-slate font-inter font-light">
                <p className="font-medium text-charcoal">The Property Ombudsman</p>
                <p>Milford House, 43-55 Milford Street</p>
                <p>Salisbury, Wiltshire SP1 2BP</p>
                <p className="mt-2">Phone: 01722 333 306</p>
                <p>Email: admin@tpos.co.uk</p>
                <p>Website: www.tpos.co.uk</p>
              </div>
            </div>

            <div>
              <h2 className="heading-section text-charcoal mb-4">Contact Us</h2>
              <p className="text-body text-slate font-inter font-light leading-relaxed">
                To raise a complaint or for more information about our complaints handling process:
              </p>
              <div className="mt-4 p-6 bg-beige/30 text-body text-slate font-inter font-light">
                <p>Elizabeth Wightwick Ltd</p>
                <p>Office 10, 60 High Street, Wimbledon Village</p>
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
