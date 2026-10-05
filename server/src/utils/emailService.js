import nodemailer from "nodemailer";

/*
|--------------------------------------------------------------------------
| EMAIL TRANSPORTER
|--------------------------------------------------------------------------
|
| Configure these values in server/.env
|
| SMTP_HOST
| SMTP_PORT
| SMTP_SECURE
| SMTP_USER
| SMTP_PASSWORD
|
*/

const createTransporter = () => {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD
  ) {
    throw new Error(
      "SMTP email configuration is missing."
    );
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,

    port:
      Number(process.env.SMTP_PORT) || 587,

    secure:
      process.env.SMTP_SECURE === "true",

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

/*
|--------------------------------------------------------------------------
| SEND PASSWORD RESET EMAIL
|--------------------------------------------------------------------------
*/

const sendPasswordResetEmail = async ({
  email,
  name,
  resetUrl,
}) => {
  const transporter =
    createTransporter();

  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER;

  const appName = "MOVA";

  await transporter.sendMail({
    from: `"${appName}" <${from}>`,
    to: email,

    subject:
      "Reset your MOVA password",

    text: `
Hello ${name || "there"},

We received a request to reset your MOVA password.

Use the link below to create a new password:

${resetUrl}

This password-reset link expires in 15 minutes.

If you did not request a password reset, you can safely ignore this email.

For your security, never share this link with anyone.

Regards,
MOVA Team
`.trim(),

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>Reset your MOVA password</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f8fafc;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <div
    style="
      max-width:600px;
      margin:40px auto;
      padding:20px;
    "
  >
    <div
      style="
        background:#ffffff;
        border:1px solid #e2e8f0;
        border-radius:16px;
        padding:32px;
      "
    >
      <h1
        style="
          margin:0 0 12px;
          color:#0f172a;
          font-size:28px;
        "
      >
        MOVA
      </h1>

      <h2
        style="
          color:#0f172a;
          font-size:22px;
        "
      >
        Reset your password
      </h2>

      <p
        style="
          color:#475569;
          line-height:1.7;
        "
      >
        Hello ${name || "there"},
      </p>

      <p
        style="
          color:#475569;
          line-height:1.7;
        "
      >
        We received a request to reset your MOVA password.
        Click the button below to create a new password.
      </p>

      <div
        style="
          margin:28px 0;
          text-align:center;
        "
      >
        <a
          href="${resetUrl}"
          style="
            display:inline-block;
            padding:14px 24px;
            background:#2563eb;
            color:#ffffff;
            text-decoration:none;
            border-radius:10px;
            font-weight:bold;
          "
        >
          Reset Password
        </a>
      </div>

      <p
        style="
          color:#64748b;
          font-size:14px;
          line-height:1.6;
        "
      >
        This link expires in
        <strong>15 minutes</strong>.
      </p>

      <p
        style="
          color:#64748b;
          font-size:14px;
          line-height:1.6;
        "
      >
        If you did not request a password reset,
        you can safely ignore this email.
      </p>

      <hr
        style="
          border:0;
          border-top:1px solid #e2e8f0;
          margin:28px 0;
        "
      />

      <p
        style="
          color:#94a3b8;
          font-size:12px;
          line-height:1.5;
        "
      >
        For your security, never share your password-reset
        link with anyone.
      </p>
    </div>
  </div>
</body>
</html>
`.trim(),
  });
};

export default sendPasswordResetEmail;