const sgMail = require('@sendgrid/mail');

// Set the API Key from your environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (options) => {
  const msg = {
    to: options.to, 
    from: process.env.EMAIL_FROM, // Must be the email you verified in SendGrid
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    await sgMail.send(msg);
    console.log('Email sent successfully via SendGrid');
  } catch (error) {
    console.error('SendGrid Error:', error.response ? error.response.body : error.message);
    throw error;
  }
};

module.exports = sendEmail;