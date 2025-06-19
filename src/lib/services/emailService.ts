import nodemailer from 'nodemailer';

// Create Gmail SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

export interface InvitationEmailData {
  to: string;
  inviterName: string;
  inviterEmail: string;
  workspaceName: string;
  workspaceDescription?: string;
  role: 'editor' | 'commenter' | 'viewer';
  invitationToken: string;
  expiresAt: Date;
  hasAccount: boolean;
}

const getRoleDescription = (role: string) => {
  switch (role) {
    case 'editor':
      return 'create, edit, and delete documents';
    case 'commenter':
      return 'view documents and add comments';
    case 'viewer':
      return 'view documents';
    default:
      return 'collaborate';
  }
};

const getInvitationEmailTemplate = ({
  inviterName,
  inviterEmail,
  workspaceName,
  workspaceDescription,
  role,
  invitationToken,
  expiresAt,
  hasAccount
}: InvitationEmailData) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const invitationUrl = `${appUrl}/invite/${invitationToken}`;
  const expiryDate = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const actionText = hasAccount 
    ? 'Accept Invitation' 
    : 'Sign Up & Accept Invitation';
    
  const accountText = hasAccount
    ? 'Since you already have a MarkFlow account, you can accept this invitation right away.'
    : 'This invitation will guide you through creating your MarkFlow account and joining the workspace.';

  return {
    subject: `${inviterName} invited you to collaborate on "${workspaceName}"`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>MarkFlow Workspace Invitation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .footer { background-color: #f8fafc; padding: 20px 30px; text-align: center; font-size: 14px; color: #64748b; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .workspace-info { background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .role-badge { display: inline-block; background-color: #e2e8f0; color: #475569; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .role-editor { background-color: #dcfce7; color: #166534; }
            .role-commenter { background-color: #fef3c7; color: #92400e; }
            .role-viewer { background-color: #e5e7eb; color: #374151; }
            .expiry-warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">📝 MarkFlow</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Workspace Invitation</p>
            </div>
            
            <div class="content">
              <h2 style="color: #1e293b; margin: 0 0 20px 0;">You're invited to collaborate!</h2>
              
              <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join the <strong>"${workspaceName}"</strong> workspace on MarkFlow.</p>
              
              <div class="workspace-info">
                <h3 style="margin: 0 0 10px 0; color: #334155;">Workspace Details</h3>
                <p style="margin: 0 0 8px 0;"><strong>Name:</strong> ${workspaceName}</p>
                ${workspaceDescription ? `<p style="margin: 0 0 8px 0;"><strong>Description:</strong> ${workspaceDescription}</p>` : ''}
                <p style="margin: 0;"><strong>Your Role:</strong> <span class="role-badge role-${role}">${role}</span></p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">As a ${role}, you can ${getRoleDescription(role)}.</p>
              </div>
              
              <p>${accountText}</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" class="button">${actionText}</a>
              </div>
              
              <div class="expiry-warning">
                <p style="margin: 0; font-size: 14px;"><strong>⏰ This invitation expires on ${expiryDate}</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #92400e;">Make sure to accept it before then!</p>
              </div>
              
              <p style="font-size: 14px; color: #64748b;">If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="font-size: 13px; word-break: break-all; background-color: #f1f5f9; padding: 10px; border-radius: 4px;"><a href="${invitationUrl}" style="color: #4f46e5;">${invitationUrl}</a></p>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">This invitation was sent by MarkFlow on behalf of ${inviterName}</p>
              <p style="margin: 5px 0 0 0;">If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
${inviterName} invited you to collaborate on "${workspaceName}"

${inviterName} (${inviterEmail}) has invited you to join the "${workspaceName}" workspace on MarkFlow.

Your Role: ${role.toUpperCase()}
As a ${role}, you can ${getRoleDescription(role)}.

${accountText}

Accept your invitation: ${invitationUrl}

This invitation expires on ${expiryDate}.

If you didn't expect this invitation, you can safely ignore this email.
    `.trim()
  };
};

export const sendInvitationEmail = async (data: InvitationEmailData): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn('Gmail credentials not configured. Email will not be sent.');
      return { success: false, error: 'Gmail credentials not configured' };
    }

    const template = getInvitationEmailTemplate(data);
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || `MarkFlow <${process.env.GMAIL_USER}>`,
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    const result = await transporter.sendMail(mailOptions);

    console.log('Invitation email sent successfully via Gmail:', result.messageId);
    return { success: true };

  } catch (error) {
    console.error('Failed to send invitation email via Gmail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const sendWelcomeEmail = async (userEmail: string, userName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return { success: false, error: 'Gmail credentials not configured' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.FROM_EMAIL || `MarkFlow <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: 'Welcome to MarkFlow! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
              .content { padding: 40px 30px; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">📝 Welcome to MarkFlow!</h1>
              </div>
              <div class="content">
                <h2>Hi ${userName}! 👋</h2>
                <p>Welcome to MarkFlow - your new collaborative markdown editor! We're excited to have you on board.</p>
                <p>You can now create workspaces, collaborate with team members, and write beautiful documents with our advanced LaTeX support.</p>
                <div style="text-align: center;">
                  <a href="${appUrl}/dashboard" class="button">Get Started</a>
                </div>
                <p>If you have any questions, feel free to reach out to our support team.</p>
                <p>Happy writing!</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Welcome to MarkFlow, ${userName}! Start collaborating at ${appUrl}/dashboard`
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully via Gmail:', result.messageId);
    return { success: true };

  } catch (error) {
    console.error('Failed to send welcome email via Gmail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}; 