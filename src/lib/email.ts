import nodemailer from "nodemailer";
import { PlanRequestItem } from "@/lib/plans";

interface SendPlanApprovalEmailParams {
  item: PlanRequestItem;
  origin?: string;
}

export async function sendPlanApprovalEmail({ item, origin }: SendPlanApprovalEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const smtpUser = process.env.SMTP_USER || "presivox@gmail.com";
  const smtpPass = process.env.SMTP_PASS || "";
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpFrom = process.env.SMTP_FROM || `Presivox Attendance <${smtpUser}>`;

  if (!smtpPass || smtpPass.trim() === "") {
    return {
      success: false,
      error: "SMTP_PASS is not configured in .env. Please set your 16-digit Google App Password for presivox@gmail.com to send emails automatically.",
    };
  }

  const portalUrl = origin && !origin.includes("localhost")
    ? "https://presivox.com/login"
    : origin
    ? `${origin}/login`
    : "https://presivox.com/login";

  const password = item.generatedPassword || "admin123";
  const employeeLimitText = item.employeeLimit >= 999990 ? "Unlimited" : `Up to ${item.employeeLimit}`;

  const subject = `Welcome to Presivox — Your ${item.planName} Attendance Portal is Active!`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
    .content { padding: 32px 28px; }
    .salutation { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #1e293b; }
    .lead { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px; }
    .card-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #2563eb; margin-bottom: 14px; }
    .data-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
    .data-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 700; text-align: right; }
    .badge-pwd { background: #eff6ff; color: #1d4ed8; font-family: monospace; padding: 3px 8px; border-radius: 6px; border: 1px solid #bfdbfe; font-size: 14px; font-weight: 700; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); }
    .steps { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px; }
    .steps-title { font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 8px; }
    .steps ol { margin: 0; padding-left: 18px; font-size: 13px; color: #15803d; line-height: 1.6; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
    .footer strong { color: #0f172a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Presivox Attendance</h1>
      <p>Verified Presence. Simplified.</p>
    </div>
    <div class="content">
      <div class="salutation">Dear ${item.adminName},</div>
      <p class="lead">
        Congratulations! Your subscription request for <strong>${item.companyName}</strong> has been approved by the Super Admin. Your official company portal is now active.
      </p>

      <div class="card">
        <div class="card-title">Your Login Credentials</div>
        <div class="data-row">
          <span class="label">Company Name</span>
          <span class="value">${item.companyName}</span>
        </div>
        <div class="data-row">
          <span class="label">Subscription Plan</span>
          <span class="value">${item.planName} (${employeeLimitText} Employees)</span>
        </div>
        <div class="data-row">
          <span class="label">Admin Email / ID</span>
          <span class="value">${item.adminEmail}</span>
        </div>
        <div class="data-row">
          <span class="label">Temporary Password</span>
          <span class="value"><span class="badge-pwd">${password}</span></span>
        </div>
      </div>

      <div class="btn-container">
        <a href="${portalUrl}" class="btn">Enter Admin Portal &rarr;</a>
      </div>

      <div class="steps">
        <div class="steps-title">Quick Getting Started Steps:</div>
        <ol>
          <li>Open the Admin Portal at <a href="${portalUrl}" style="color: #166534; font-weight: 600;">${portalUrl}</a>.</li>
          <li>Log in using your registered email and the temporary password above.</li>
          <li>Download and print your dedicated <strong>Check-In & Check-Out QR Standees</strong> for your office.</li>
          <li>Add your employees under the Employee Registry.</li>
        </ol>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
        Need help with configuration? Feel free to reply directly to this email at <a href="mailto:${smtpUser}" style="color: #2563eb;">${smtpUser}</a>.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 4px;"><strong>Presivox Attendance System</strong> &bull; A Product of <a href="https://www.solutionplanets.com/" style="color: #2563eb; text-decoration: underline;" target="_blank">Solution Planets</a></p>
      <p style="margin: 0;">Support Email: ${smtpUser}</p>
    </div>
  </div>
</body>
</html>
  `;

  const plainText = `
Dear ${item.adminName},

Congratulations! Your subscription request for ${item.companyName} has been approved by the Super Admin.

Here are your official company login credentials:
--------------------------------------------------
Company Name : ${item.companyName}
Subscription : ${item.planName} (${employeeLimitText} Employees)
Login Portal : ${portalUrl}
Admin Email  : ${item.adminEmail}
Password     : ${password}
--------------------------------------------------

Next Steps to Get Started:
1. Open the Login Portal: ${portalUrl}
2. Sign in with your registered email and password above.
3. Access your dedicated QR Standee (IN & OUT) to print or display at your workplace.
4. Add your employee profiles in the Employee Registry.

If you have any questions or require custom setup assistance, reply directly to ${smtpUser}.

Best Regards,
Presivox Attendance Team
A Product of Solution Planets (https://www.solutionplanets.com/)
Support: ${smtpUser}
  `.trim();

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: item.adminEmail,
      subject,
      text: plainText,
      html: htmlBody,
    });

    console.log(`[EMAIL DISPATCH] Email successfully sent to ${item.adminEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[EMAIL DISPATCH] Error sending email:", err);
    return {
      success: false,
      error: `Failed to dispatch email via SMTP: ${err.message}`,
    };
  }
}
