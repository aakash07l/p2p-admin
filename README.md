# P2P Exchange Admin Terminal

A high-efficiency, data-dense, professional Admin Dashboard for the P2P OTC Exchange. It is designed for fast, high-volume transaction management.

## 🚀 Key Features

1. **Live Order Queue**: Sleek data-table of all pending BUY/SELL/WITHDRAW/DEPOSIT orders. Allows instant single-click manual approvals and rejection with reasons.
2. **Activity & Audit Logs**: Detailed logs inside order records capturing which admin approved/rejected which order and at what exact time.
3. **Exchange Rate Controls**: Live manual setting panel to update exchange rates ($1\text{ USDT} = \text{INR}$ buys/sells rate) and Platform UPI ID dynamically.
4. **User Management & Analytics**: Quick analytics summarizing total user balance, active trades, wallet health, and role toggling to grant admin privileges.
5. **Secure Authentication & Shielding**: Secure cookie-based session protection (`admin-token` cookie verified using JWT) with middleware shielding for all `/admin` paths.

---

## 🛠️ Tech Stack & Connection Architecture

* **Framework**: Next.js 15 (App Router), TypeScript, Tailwind CSS
* **Database**: Prisma + PostgreSQL (shared with the user-facing app)

The admin panel connects to the **same PostgreSQL database** instance as the user-facing site. 
When a user clicks "Submit UTR" or triggers a transaction on the P2P site, it inserts a `Transaction` row marked as `PENDING`. 
The Admin panel polls the database dynamically to load the pending queue in real-time. Approving a BUY order credits the user's database wallet directly.

---

## ⚙️ Setup & Deployment

1. **Extract Zip**: Extract the admin panel folder next to your user-facing app folder.
2. **Environment Variables**: Copy `.env.example` to `.env` and fill in:
   * `DATABASE_URL`: Set this to the **exact same Supabase/PostgreSQL connection string** used in your user-facing app.
   * `ADMIN_USERNAME`: Master admin username (default: `admin`).
   * `ADMIN_PASSWORD`: Master admin password (default: `p2pexchangeadmin`).
   * `ADMIN_JWT_SECRET`: Any secure random secret string.
3. **Database Migration**: Run the build scripts to sync schemas:
   ```bash
   npm install
   npm run build
   ```
4. **Local Run**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser. Log in using your admin credentials.

---

## 🛡️ Role-Based Access Control Setup

To grant admin access to a real user in the database:
1. Log in to the Admin Dashboard using the master admin credentials (`admin` / `p2pexchangeadmin`).
2. Go to the **User Analytics** tab.
3. Find the user from the list and click **"Set as System Admin"** to toggle their role. That user can now log in using their email or Privy ID on the admin portal using the master access key.
