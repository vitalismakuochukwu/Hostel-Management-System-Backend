const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter using environment variables
  // Ensure EMAIL_SERVICE, EMAIL_USERNAME, and EMAIL_PASSWORD are set in your .env file
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail', 
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@hostel.com',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;