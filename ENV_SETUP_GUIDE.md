# Complete Environment Variables Setup Guide

## Part 1: Gmail SMTP Configuration (Email Sending)

### What is SMTP?
**SMTP** = Simple Mail Transfer Protocol - A service that sends emails from your application.

**Why do we need it?**
- Send welcome emails to new users
- Send booking confirmations
- Send payment receipts
- Send password reset links
- Send notifications

---

## Step-by-Step Gmail SMTP Setup

### Step 1: Enable 2-Factor Authentication on Gmail

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** (left sidebar)
3. Find **2-Step Verification** section
4. Click **Enable 2-Step Verification**
5. Follow Google's instructions (you'll need your phone)
6. Confirm it's enabled (you'll see a green checkmark)

---

### Step 2: Create an App Password

1. Go back to [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** (left sidebar)
3. Scroll down to **App passwords** (only appears after 2FA is enabled)
4. Select:
   - **App**: Mail
   - **Device**: Windows/Mac/Linux/Other
5. Click **Generate**
6. Google will show a 16-character password like: `abcd efgh ijkl mnop`
7. **Copy this password** (remove spaces)

**Example password**: `abcdefghijklmnop`

---

### Step 3: Add to Backend .env File

Open `/server/.env` and add these lines:

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_actual_email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_FROM_EMAIL=noreply@devhiring.com
SMTP_FROM_NAME=Dev Hiring Platform
```

**Replace with YOUR information:**
- `your_actual_email@gmail.com` → Your actual Gmail address
- `abcdefghijklmnop` → The 16-character password Google gave you

---

### Step 4: Test SMTP Configuration

In `/server`, create a test file `test-email.js`:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const testEmail = async () => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: 'your_test_email@gmail.com',
      subject: 'Test Email',
      html: '<h1>SMTP Configuration Works!</h1>',
    });
    console.log('✅ Email sent:', info.response);
  } catch (error) {
    console.error('❌ Email failed:', error.message);
  }
};

testEmail();
```

Run it:
```bash
cd server
node test-email.js
```

**Success message**: `✅ Email sent: 250 2.0.0 OK`

---

## Part 2: Crypto Payment Configuration

### What is Crypto Payment?
**Crypto payments** = Accept payments in cryptocurrencies like:
- **USDC** = USD Coin (stable, 1 coin = $1)
- **USDT** = Tether (stable, 1 coin = $1)
- **ETH** = Ethereum (volatile, price changes)

**Why add crypto?**
- Global payments (no borders)
- Faster than traditional banking
- Lower fees
- Attracts tech-savvy developers

---

## Step-by-Step Crypto Payment Setup

### Step 1: Understand the Settings

In `/server/.env`, add:

```env
# Crypto Payment Configuration
CRYPTO_PAYMENT_ENABLED=true
ACCEPTED_CRYPTO_CURRENCIES=USDC,USDT,ETH
CRYPTO_NETWORK=polygon
CRYPTO_PAYMENT_ADDRESS=0x1234567890123456789012345678901234567890
```

**What each setting means:**

| Setting | Meaning | Example |
|---------|---------|---------|
| `CRYPTO_PAYMENT_ENABLED` | Turn crypto payments ON/OFF | `true` = enabled, `false` = disabled |
| `ACCEPTED_CRYPTO_CURRENCIES` | Which coins to accept | `USDC,USDT,ETH` = accept these 3 |
| `CRYPTO_NETWORK` | Blockchain network to use | `polygon` = Polygon blockchain (fast, cheap) |
| `CRYPTO_PAYMENT_ADDRESS` | Wallet address to receive payments | Your MetaMask wallet address |

---

### Step 2: Get a Crypto Wallet Address

1. **Install MetaMask** - Chrome extension from [metamask.io](https://metamask.io)
2. **Create/Import wallet**
3. **Switch to Polygon network**:
   - Click network dropdown (top left)
   - Select "Polygon" (or add it)
4. **Copy your wallet address**:
   - Click your account icon
   - Click "Copy account address"
   - Looks like: `0x1234567890123456789012345678901234567890`

---

### Step 3: Add to Backend .env File

Open `/server/.env`:

```env
# Crypto Payment Configuration
CRYPTO_PAYMENT_ENABLED=true
ACCEPTED_CRYPTO_CURRENCIES=USDC,USDT,ETH
CRYPTO_NETWORK=polygon
CRYPTO_PAYMENT_ADDRESS=0x1234567890123456789012345678901234567890
STRIPE_CRYPTO_ENABLED=true
```

**Replace with YOUR information:**
- `0x1234567890123456789012345678901234567890` → Your actual MetaMask wallet address

---

### Step 4: Configure Frontend for Crypto

Open `/client/.env`:

```env
REACT_APP_CRYPTO_PAYMENT_ENABLED=true
REACT_APP_ACCEPTED_CRYPTO=USDC,USDT,ETH
REACT_APP_CRYPTO_NETWORK=polygon
```

---

### Step 5: How Crypto Payments Work in Your App

**User Flow:**
1. Customer books developer for 1 hour at $50/hour
2. Customer chooses payment method: **Crypto** or **Stripe**
3. If **Crypto**:
   - System shows: "Pay 50 USDC to 0x1234567..."
   - Customer's MetaMask wallet opens
   - Customer approves transaction
   - Payment is sent to your wallet address
   - Booking is confirmed instantly

**Backend handles:**
- Checking if payment is received
- Converting crypto to USD if needed
- Recording transaction in database
- Triggering video call

---

## Complete .env File Example

### `/server/.env`

```env
# ===== DATABASE =====
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dev_hiring
DB_USER=postgres
DB_PASSWORD=your_secure_password_123

# ===== SERVER =====
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# ===== JWT =====
JWT_SECRET=your_super_secret_jwt_key_change_in_production_12345

# ===== AGORA (VIDEO CALLS) =====
AGORA_APP_ID=your_app_id_from_agora
AGORA_APP_CERTIFICATE=your_certificate_from_agora

# ===== STRIPE (CREDIT CARD PAYMENTS) =====
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here

# ===== GMAIL SMTP (EMAIL) =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_actual_email@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_FROM_EMAIL=noreply@devhiring.com
SMTP_FROM_NAME=Dev Hiring Platform

# ===== CRYPTO PAYMENTS =====
CRYPTO_PAYMENT_ENABLED=true
ACCEPTED_CRYPTO_CURRENCIES=USDC,USDT,ETH
CRYPTO_NETWORK=polygon
CRYPTO_PAYMENT_ADDRESS=0x1234567890123456789012345678901234567890
STRIPE_CRYPTO_ENABLED=true
```

### `/client/.env`

```env
# ===== API URLS =====
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000

# ===== STRIPE =====
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_your_actual_public_key_here

# ===== AGORA =====
REACT_APP_AGORA_APP_ID=your_app_id_from_agora

# ===== CRYPTO =====
REACT_APP_CRYPTO_PAYMENT_ENABLED=true
REACT_APP_ACCEPTED_CRYPTO=USDC,USDT,ETH
REACT_APP_CRYPTO_NETWORK=polygon
```

---

## Summary Table

### What Goes Where?

| Configuration | Where | File | Format |
|---------------|-------|------|--------|
| **Gmail SMTP** | Backend only | `/server/.env` | SMTP_HOST, SMTP_PORT, etc. |
| **Crypto Payments** | Both | `/server/.env` + `/client/.env` | CRYPTO_PAYMENT_ENABLED, etc. |
| **Stripe Keys** | Both | `/server/.env` + `/client/.env` | Secret key in server, public in client |
| **Agora** | Both | `/server/.env` + `/client/.env` | App ID & Certificate |
| **Database** | Backend only | `/server/.env` | DB_HOST, DB_USER, etc. |
| **JWT Secret** | Backend only | `/server/.env` | JWT_SECRET |

---

## Verification Checklist

After configuring, verify everything:

```bash
# 1. Check .env files exist
ls server/.env
ls client/.env

# 2. Test database connection
cd server
npm install
npm start
# Look for: "Database connected ✓"

# 3. Test SMTP (optional, if you added nodemailer)
node test-email.js
# Look for: "✅ Email sent"

# 4. Start frontend
cd ../client
npm install
npm start
# Should load without errors
```

---

## Important Security Notes

⚠️ **Never share these values:**
- JWT_SECRET
- Database password
- SMTP_PASSWORD
- Stripe secret keys
- Agora certificate

✅ **Best practices:**
- Keep `.env` in `.gitignore` (already done)
- Use different secrets for dev/production
- Rotate secrets periodically
- Don't commit `.env` to Git

---

## Troubleshooting

### Email not sending?
- Check SMTP credentials are correct
- Verify 2FA is enabled on Gmail
- Check Gmail "Less secure apps" is OFF (2FA should handle this)
- Look for SMTP error logs

### Crypto payment not working?
- Verify MetaMask is installed
- Check wallet address format (starts with 0x)
- Ensure you have testnet tokens (USDC, USDT, ETH on Polygon)
- Check browser console for Web3 errors

### Stripe payment failing?
- Use test keys (sk_test_, pk_test_)
- Check both server and client have keys
- Verify frontend URL in Stripe dashboard matches

---

## Getting Help

When troubleshooting, provide:
1. Which configuration (SMTP, Crypto, Stripe)
2. Error message from console/logs
3. Your `.env` file (WITHOUT sensitive values)
4. Steps you took before error occurred
