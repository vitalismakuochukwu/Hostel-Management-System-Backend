const sgMail = require('@sendgrid/mail');

const sendEmail = async (options) => {
  // We set the key inside the function to ensure process.env is loaded
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: options.to, 
    from: process.env.EMAIL_FROM, 
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    await sgMail.send(msg);
    console.log('Email sent successfully via SendGrid');
  } catch (error) {
    console.error('SendGrid Error:', error.response ? error.response.body : error.message);
    // This will show us the EXACT reason if SendGrid rejects it
    throw error;
  }
};

module.exports = sendEmail;