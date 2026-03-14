import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Once DNS is verified in Resend dashboard, change this to:
// 'Elizabeth Wightwick <notifications@elizabeth-wightwick.co.uk>'
const FROM = 'Elizabeth Wightwick <onboarding@resend.dev>';
const TO = 'info@elizabeth-wightwick.co.uk';

export async function sendInquiryNotification(data: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  type: string;
  property_id?: string;
  property_address?: string;
  preferred_time?: string;
}) {
  if (!resend) return;

  const subjectMap: Record<string, string> = {
    viewing: 'New Viewing Request',
    info: 'New Property Enquiry',
    general: 'New General Enquiry',
    contact: 'New Contact Form Submission',
    sales: 'Selling Enquiry',
    lettings: 'Lettings Enquiry',
    buying: 'Buying Enquiry',
    renting: 'Renting Enquiry',
    management: 'Property Management Enquiry',
    valuation: 'Valuation Request via Contact',
  };
  const subject = subjectMap[data.type] ?? 'New Website Enquiry';

  await resend.emails.send({
    from: FROM,
    to: TO,
    subject,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2b2b2b;">
        <div style="background: #37647E; padding: 24px 32px;">
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 300; letter-spacing: 1px;">Elizabeth Wightwick</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">${subject}</p>
        </div>
        <div style="padding: 32px; background: #fafaf9; border: 1px solid #ebe8e4;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #6b6b6b; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${data.name}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b6b6b;">Email</td><td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #37647E;">${data.email}</a></td></tr>
            ${data.phone ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Phone</td><td style="padding: 8px 0;"><a href="tel:${data.phone}" style="color: #37647E;">${data.phone}</a></td></tr>` : ''}
            ${data.property_address ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Property</td><td style="padding: 8px 0;">${data.property_address}</td></tr>` : ''}
            ${data.preferred_time ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Preferred Time</td><td style="padding: 8px 0;">${data.preferred_time}</td></tr>` : ''}
          </table>
          ${data.message ? `<div style="margin-top: 20px; padding: 16px; background: white; border-left: 3px solid #37647E;"><p style="margin: 0; font-size: 14px; color: #2b2b2b; line-height: 1.7;">${data.message}</p></div>` : ''}
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #ebe8e4; text-align: center;">
            <a href="mailto:${data.email}" style="display: inline-block; background: #37647E; color: white; padding: 12px 28px; text-decoration: none; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Reply to ${data.name.split(' ')[0]}</a>
          </div>
        </div>
        <div style="padding: 16px 32px; text-align: center;">
          <p style="color: #9a9a9a; font-size: 11px; margin: 0;">60 High Street, Wimbledon Village, SW19 5EE &nbsp;·&nbsp; 0203 597 3484</p>
        </div>
      </div>
    `,
  });
}

export async function sendValuationNotification(data: {
  address: string;
  property_type?: string;
  bedrooms?: string;
  name: string;
  email: string;
  phone: string;
  best_time?: string;
  additional_info?: string;
}) {
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to: TO,
    subject: 'New Valuation Request',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2b2b2b;">
        <div style="background: #37647E; padding: 24px 32px;">
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 300; letter-spacing: 1px;">Elizabeth Wightwick</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">New Valuation Request</p>
        </div>
        <div style="padding: 32px; background: #fafaf9; border: 1px solid #ebe8e4;">
          <h2 style="font-size: 16px; font-weight: 400; color: #37647E; margin: 0 0 16px; letter-spacing: 0.5px;">Property</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
            <tr><td style="padding: 8px 0; color: #6b6b6b; width: 140px;">Address</td><td style="padding: 8px 0; font-weight: 600;">${data.address}</td></tr>
            ${data.property_type ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Type</td><td style="padding: 8px 0; text-transform: capitalize;">${data.property_type}</td></tr>` : ''}
            ${data.bedrooms ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Bedrooms</td><td style="padding: 8px 0;">${data.bedrooms}</td></tr>` : ''}
          </table>
          <h2 style="font-size: 16px; font-weight: 400; color: #37647E; margin: 0 0 16px; letter-spacing: 0.5px;">Contact</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #6b6b6b; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${data.name}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b6b6b;">Email</td><td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #37647E;">${data.email}</a></td></tr>
            <tr><td style="padding: 8px 0; color: #6b6b6b;">Phone</td><td style="padding: 8px 0;"><a href="tel:${data.phone}" style="color: #37647E;">${data.phone}</a></td></tr>
            ${data.best_time ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Best Time</td><td style="padding: 8px 0;">${data.best_time}</td></tr>` : ''}
          </table>
          ${data.additional_info ? `<div style="margin-top: 20px; padding: 16px; background: white; border-left: 3px solid #37647E;"><p style="margin: 0; font-size: 14px; line-height: 1.7;">${data.additional_info}</p></div>` : ''}
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #ebe8e4; text-align: center;">
            <a href="mailto:${data.email}" style="display: inline-block; background: #37647E; color: white; padding: 12px 28px; text-decoration: none; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Reply to ${data.name.split(' ')[0]}</a>
          </div>
        </div>
        <div style="padding: 16px 32px; text-align: center;">
          <p style="color: #9a9a9a; font-size: 11px; margin: 0;">60 High Street, Wimbledon Village, SW19 5EE &nbsp;·&nbsp; 0203 597 3484</p>
        </div>
      </div>
    `,
  });
}

export async function sendRegistrationNotification(data: {
  name: string;
  email: string;
  phone?: string;
  department: string;
  property_type?: string;
  min_bedrooms?: string;
  min_price?: string;
  max_price?: string;
  locations?: string;
}) {
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to: TO,
    subject: `New Property Registration — ${data.department === 'lettings' ? 'Lettings' : 'Sales'}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2b2b2b;">
        <div style="background: #37647E; padding: 24px 32px;">
          <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 300; letter-spacing: 1px;">Elizabeth Wightwick</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0; font-size: 13px;">New Property Registration</p>
        </div>
        <div style="padding: 32px; background: #fafaf9; border: 1px solid #ebe8e4;">
          <h2 style="font-size: 16px; font-weight: 400; color: #37647E; margin: 0 0 16px; letter-spacing: 0.5px;">Requirements</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
            <tr><td style="padding: 8px 0; color: #6b6b6b; width: 140px;">Looking to</td><td style="padding: 8px 0; font-weight: 600;">${data.department === 'lettings' ? 'Rent' : 'Buy'}</td></tr>
            ${data.property_type ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Property Type</td><td style="padding: 8px 0; text-transform: capitalize;">${data.property_type}</td></tr>` : ''}
            ${data.min_bedrooms ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Min Bedrooms</td><td style="padding: 8px 0;">${data.min_bedrooms}+</td></tr>` : ''}
            ${data.min_price ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Min Budget</td><td style="padding: 8px 0;">£${Number(data.min_price).toLocaleString()}${data.department === 'lettings' ? ' pcm' : ''}</td></tr>` : ''}
            ${data.max_price ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Max Budget</td><td style="padding: 8px 0;">£${Number(data.max_price).toLocaleString()}${data.department === 'lettings' ? ' pcm' : ''}</td></tr>` : ''}
            ${data.locations ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Locations</td><td style="padding: 8px 0;">${data.locations}</td></tr>` : ''}
          </table>
          <h2 style="font-size: 16px; font-weight: 400; color: #37647E; margin: 0 0 16px; letter-spacing: 0.5px;">Contact</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #6b6b6b; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${data.name}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b6b6b;">Email</td><td style="padding: 8px 0;"><a href="mailto:${data.email}" style="color: #37647E;">${data.email}</a></td></tr>
            ${data.phone ? `<tr><td style="padding: 8px 0; color: #6b6b6b;">Phone</td><td style="padding: 8px 0;"><a href="tel:${data.phone}" style="color: #37647E;">${data.phone}</a></td></tr>` : ''}
          </table>
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #ebe8e4; text-align: center;">
            <a href="mailto:${data.email}" style="display: inline-block; background: #37647E; color: white; padding: 12px 28px; text-decoration: none; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Reply to ${data.name.split(' ')[0]}</a>
          </div>
        </div>
        <div style="padding: 16px 32px; text-align: center;">
          <p style="color: #9a9a9a; font-size: 11px; margin: 0;">60 High Street, Wimbledon Village, SW19 5EE &nbsp;·&nbsp; 0203 597 3484</p>
        </div>
      </div>
    `,
  });
}
