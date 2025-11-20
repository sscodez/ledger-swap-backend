const nodemailer = require('nodemailer');

// Titan Email Configuration
const senderEmail = process.env.SMTP_USER || 'admin@ledgerswap.io';
const senderPassword = process.env.SMTP_PASS || 'your-titan-password';
const recipientEmail = 'test@example.com'; // Change this to your test email
const subject = 'Testing Titan Email Integration - LedgerSwap';
const body = 'This is a test email sent from LedgerSwap backend using Titan email service.';

// SMTP server details for Titan
const smtpServer = 'smtp.titan.email';
const smtpPort = 587;

async function testTitanEmail() {
  try {
    console.log('🚀 Testing Titan Email Configuration...');
    console.log(`📧 From: ${senderEmail}`);
    console.log(`📧 To: ${recipientEmail}`);
    console.log(`🌐 SMTP Server: ${smtpServer}:${smtpPort}`);
    
    // Create a nodemailer transporter using SMTP
    const transporter = nodemailer.createTransporter({
      host: smtpServer,
      port: smtpPort,
      secure: false, // false for port 587, true for port 465
      auth: {
        user: senderEmail,
        pass: senderPassword,
      },
      tls: {
        rejectUnauthorized: false // For compatibility with Titan email
      }
    });

    // Verify SMTP connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    // Create the email options
    const mailOptions = {
      from: senderEmail,
      to: recipientEmail,
      subject: subject,
      text: body,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #001233; margin: 0;">LedgerSwap</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Titan Email Test</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h2 style="color: #001233; margin: 0 0 20px 0;">Email Service Test</h2>
            <p style="color: #666; margin: 0 0 20px 0;">${body}</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #001233; margin: 0 0 15px 0;">Configuration Details:</h3>
              <ul style="color: #666; margin: 0; padding-left: 20px;">
                <li><strong>SMTP Server:</strong> ${smtpServer}</li>
                <li><strong>Port:</strong> ${smtpPort}</li>
                <li><strong>From:</strong> ${senderEmail}</li>
                <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
              </ul>
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
              This is a test email from LedgerSwap backend service using Titan email.
            </p>
          </div>
        </div>
      `,
    };

    // Send the email
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📋 Message ID:', info.messageId);
    console.log('📋 Response:', info.response);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('❌ Error testing Titan email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  console.log('🧪 LedgerSwap Titan Email Test');
  console.log('================================');
  
  testTitanEmail()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Titan email test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Titan email test failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testTitanEmail };
