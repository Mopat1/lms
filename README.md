# 📚 Library Management System
WEBSITE- https://lms-4xt3.onrender.com
### Full-Stack · Firebase · Gmail Email Notifications · Node.js + Express

---

## ✅ What's Included

| Feature | Details |
|---|---|
| 🔐 Auth | Signup/Login for Admin & Member via Firebase Auth |
| 📚 Book Catalog | Add, Edit, Delete, Search, Filter books |
| 📤 Issue Books | Admin issues books to members with email confirmation |
| ↩ Return Books | Admin processes returns with automatic fine calculation |
| 🔖 Reserve Online | Members reserve unavailable books; get notified when ready |
| ⚠️ Overdue Alerts | Daily cron sends emails to **both** member AND librarian |
| 📊 Library Report | Complete dashboard: stats, charts, genre breakdown, overdue list |
| 👥 Member Management | View, activate/deactivate members, see borrowing history |
| 💰 Fine System | Auto-calculated at ₹2/day (configurable), tracked per member |
| 📧 Email Notifications | Welcome, Issue, Return, Reserve, Overdue (Gmail SMTP) |
| 🖨️ Print Report | One-click print-ready library report |

---

## 🚀 SETUP GUIDE (Follow in Order)

### STEP 1 — Install Node.js

Download and install Node.js (v18 or higher):
👉 https://nodejs.org/en/download

Verify installation:
```bash
node --version    # Should show v18+
npm --version
```

---

### STEP 2 — Set Up Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → name it (e.g. `library-management`)
3. Disable Google Analytics (optional) → **Create Project**

#### Enable Firebase Authentication:
1. In your project → **Build → Authentication → Get Started**
2. Click **"Email/Password"** → Enable → Save

#### Get Firebase Admin SDK credentials:
1. **Project Settings** (gear icon) → **Service Accounts**
2. Click **"Generate new private key"** → **Generate Key**
3. A JSON file downloads — keep it safe (you'll copy values into `.env`)

#### Get Firebase Web App config:
1. **Project Settings** → scroll to **"Your apps"** → click **"</>"** (Web)
2. Register app (any name) → copy the `firebaseConfig` object values

#### Enable Firestore:
1. **Build → Firestore Database → Create Database**
2. Choose **"Start in test mode"** → select your region → Done

#### Set Firestore Security Rules (IMPORTANT):
Go to **Firestore → Rules** and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
Click **Publish**.

---

### STEP 3 — Set Up Gmail App Password

You need a Gmail **App Password** (NOT your regular password):

1. Go to your Google Account: **https://myaccount.google.com**
2. **Security** → **2-Step Verification** → Enable it (required)
3. Back in Security → search **"App Passwords"**
4. Select app: **"Mail"** → Select device: **"Other"** → type "LMS" → **Generate**
5. Copy the **16-character password** (e.g. `abcd efgh ijkl mnop`)

---

### STEP 4 — Configure Environment Variables

In the project folder, copy the example file:
```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in ALL values:

```env
PORT=3000
SESSION_SECRET=any-long-random-string-change-this

# From Service Account JSON file:
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...

# From Firebase Web App config:
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef

# Gmail SMTP:
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop    # 16-char App Password (spaces OK)
LIBRARIAN_EMAIL=librarian@yourlibrary.com

# Library settings (customize these):
LIBRARY_NAME=City Public Library
MAX_BOOKS_PER_USER=5
LOAN_PERIOD_DAYS=14
FINE_PER_DAY=2.00
CURRENCY_SYMBOL=₹
```

> ⚠️ IMPORTANT: For `FIREBASE_PRIVATE_KEY`, copy the entire key from the JSON file including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`. Make sure newlines are `\n` (the JSON file already has them this way).

---

### STEP 5 — Install Dependencies & Run

```bash
# Navigate to the project folder
cd lms

# Install all packages
npm install

# Start the server
npm start
```

You should see:
```
✅ Firebase Admin initialized
🚀 Library Management System running at http://localhost:3000
📚 Library: City Public Library
⏰ Cron jobs scheduled: Daily overdue check at 9:00 AM
```

Open your browser at: **http://localhost:3000**

---

### STEP 6 — Create Your First Admin Account

1. Go to **http://localhost:3000**
2. Click **"Create one"** (signup)
3. Click the **"Admin"** tab
4. Fill in your details
5. For **Admin Registration Key**, enter: `LIBRARY_ADMIN_2024`
6. Click **"Create Account"**
7. Sign in with your new credentials

> To change the admin key, set `ADMIN_SIGNUP_KEY=yourkey` in `.env`

---

## 📂 Project Structure

```
lms/
├── server.js              # Express server entry point
├── package.json
├── .env                   # Your secrets (never commit this!)
├── .env.example           # Template
├── config/
│   └── firebase.js        # Firebase Admin SDK setup
├── middleware/
│   └── auth.js            # JWT token verification middleware
├── routes/
│   ├── auth.js            # /api/auth/* — signup, login, profile
│   ├── books.js           # /api/books/* — CRUD book catalog
│   ├── transactions.js    # /api/transactions/* — issue, return, reserve
│   └── reports.js         # /api/reports/* — full report, members
├── utils/
│   ├── email.js           # Nodemailer — all email templates
│   └── cron.js            # Daily overdue check scheduler
└── public/
    ├── index.html         # Single-page app shell
    ├── css/
    │   ├── main.css       # All styles
    │   └── print.css      # Print styles for report
    └── js/
        ├── app.js         # Core: routing, API, toast, modal
        ├── auth.js        # Login & signup forms
        ├── dashboard.js   # Admin dashboard
        ├── books.js       # Book catalog (admin + member browse)
        ├── transactions.js # Issue, return, my books
        ├── members.js     # Member management (admin)
        ├── reports.js     # Full library report
        └── profile.js     # Member profile page
```

---

## 🔔 How Email Notifications Work

| Trigger | Who Gets Email |
|---|---|
| Member signs up | Member (welcome email) |
| Book is issued | Member (issue confirmation with due date) |
| Book is returned | Member (return confirmation + fine if any) |
| Book is reserved | Member (reservation confirmation) |
| Reserved book available | Next member in queue |
| Book is overdue (daily 9AM) | **Member** (overdue reminder + fine) |
| Book is overdue (daily 9AM) | **Librarian** (alert with member contact details) |

To manually trigger overdue notifications at any time:
- Admin dashboard → click **"📧 Send Notifications"** button
- Or: Library Report → **"📧 Notify All"**

---

## 🛠 Customization

All these are set in `.env`:

| Setting | Default | Description |
|---|---|---|
| `LIBRARY_NAME` | City Public Library | Shown throughout the app |
| `LOAN_PERIOD_DAYS` | 14 | Days before a book is due |
| `MAX_BOOKS_PER_USER` | 5 | How many books a member can hold |
| `FINE_PER_DAY` | 2.00 | Fine amount per overdue day |
| `CURRENCY_SYMBOL` | ₹ | Currency symbol shown in UI |
| `LIBRARIAN_EMAIL` | — | Librarian receives overdue alerts |

---

## 🚀 Deploying to Production (Optional)

### Deploy to Render.com (Free):
1. Push project to GitHub
2. Go to https://render.com → New Web Service
3. Connect your GitHub repo
4. Build command: `npm install`
5. Start command: `npm start`
6. Add all `.env` variables in the **Environment** section

### Deploy to Railway.app (Easy):
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Add environment variables
4. Done — Railway auto-detects Node.js

---

## ❓ Troubleshooting

**Firebase error: "Could not load the default credentials"**
→ Check that `FIREBASE_PRIVATE_KEY` in `.env` has `\n` for newlines (not literal newlines)

**Email not sending**
→ Make sure you're using an **App Password** (not your Gmail password)
→ Check that 2FA is enabled on your Google account
→ Try: `EMAIL_SECURE=false` and `EMAIL_PORT=587`

**"auth/email-already-exists" on signup**
→ Email is already registered. Use login instead.

**Firestore permission denied**
→ Make sure you published the Firestore security rules in Step 2

**Port already in use**
→ Change `PORT=3001` in `.env`

---

## 🔐 Security Notes

- Never commit `.env` to version control — add it to `.gitignore`
- The admin signup key should be changed in production
- Firebase tokens expire after 1 hour — users are auto-refreshed
- All API endpoints require valid Firebase JWT tokens
- Rate limiting is enabled: 200 req/15min general, 20 req/15min for auth

---

*Built with Node.js, Express, Firebase Admin SDK, Nodemailer, and vanilla JS.*
