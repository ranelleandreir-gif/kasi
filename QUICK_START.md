# 🚀 KASI System - Quick Start Guide

## Ready to Use! Everything is Working ✅

---

## 📱 How to Test the Complete System

### Step 1: Create Test Accounts
1. Go to `sign-up.html` or `register.html`
2. Create 3 accounts:
   - **Admin1** - Role: Admin
   - **Cashier1** - Role: Cashier
   - **Collector1** - Role: Collector

### Step 2: Admin Approves Accounts
1. Go to `admin-dashboard.html` (or `welcome.html` → Admin)
2. Go to **"Users"** tab
3. See **"🟡 PENDING USERS"** section
4. Click **"Approve"** button for Cashier1 and Collector1
5. ✅ They get assigned names: "cashier1" and "collector1"

### Step 3: Admin Creates Loan
1. In Admin Dashboard → **"Create Loan"** tab
2. Fill in:
   - Borrower Name: "Juan Dela Cruz"
   - Amount: "5000"
   - Address: "123 Main St, City"
   - Select Collector: "collector1"
3. Click **"Create Loan"** button
4. ✅ Loan is created and assigned to collector1

### Step 4: Collector Sees & Marks Collected
1. Collector1 goes to `collector.html`
2. ✅ Sees the assigned loan: "Juan Dela Cruz - ₱5000"
3. Collector clicks **"✔ Collected"**
4. ✅ Status changes to "collected"

### Step 5: Cashier Confirms Payment
1. Cashier1 goes to `cashier.html`
2. ✅ Sees the collected loan in "📦 Collected by Riders"
3. Enter amount paid (e.g., "5000")
4. Click **"✔ Confirm Payment"**
5. ✅ Payment recorded, balance becomes 0, loan status becomes "paid"

### Step 6: Check Admin Dashboard
1. Admin goes back to `admin-dashboard.html`
2. Go to **"Borrowers"** tab
3. ✅ See loan under "✅ PAID LOANS"
4. Check **"📜 Payment History"** - see payment details

---

## 🔓 Login Details

After approval, users can login with their email and password:
- Email used during registration
- Password used during registration

**System automatically redirects to:**
- Admin → `admin-dashboard.html`
- Cashier → `cashier.html`
- Collector → `collector.html`

---

## 🎯 Key Workflow Diagram

```
┌─ PENDING ACCOUNT ────┐
│  (Just registered)   │
└──────────┬───────────┘
           │
    Admin approves/rejects
           │
    ┌──────┴──────┐
    │             │
 APPROVED    REJECTED
    │             │
    ↓             ↓
  LOGIN      CAN'T LOGIN
    │
    ├─→ Admin Dashboard
    ├─→ Cashier Dashboard  
    └─→ Collector Dashboard
```

---

## ✅ Complete Checklist

- [x] User registration
- [x] Admin approval system
- [x] Account rejection system
- [x] Loan creation
- [x] Collector assignment
- [x] Collector dashboard
- [x] Collector mark collected
- [x] Cashier payment confirmation
- [x] Payment history tracking
- [x] Role-based login
- [x] Auth protection on all dashboards

---

## 📊 Data Structure (Firebase Collections)

### **users** collection
```javascript
{
  name: "Juan",
  email: "juan@email.com",
  role: "collector",           // "admin", "cashier", "collector"
  status: "approved",          // "pending", "approved", "rejected"
  assignedName: "collector1",  // Given by admin after approval
  createdAt: timestamp
}
```

### **loans** collection
```javascript
{
  borrowerName: "Juan Dela Cruz",
  amount: 5000,
  address: "123 Main St",
  balance: 5000,                // Decreases with each payment
  status: "collected",          // "pending", "assigned", "collected", "paid", "unpaid"
  assignedCollectorId: "uid123",
  assignedCollectorName: "collector1",
  confirmedAt: timestamp,       // When cashier confirmed
  confirmedById: "uid456"       // Which cashier confirmed
}
```

### **payments** collection
```javascript
{
  loanId: "loan123",
  borrowerName: "Juan Dela Cruz",
  amountPaid: 2000,
  remainingBalance: 3000,
  cashierId: "uid456",
  cashierName: "cashier1",
  createdAt: timestamp
}
```

---

## 🎨 UI Features

**Admin Dashboard:**
- 📊 Analytics (total users, pending, approved, cashiers, collectors)
- 👤 Users folder (organized by status and role)
- 📦 Borrowers folder (active and paid loans)
- ➕ Create loan form with auto-assignment

**Collector Dashboard:**
- 📊 Stats (total, collected, unpaid)
- 📋 List of assigned loans with details
- ✔️ Mark collected button
- ⏳ Mark unpaid button

**Cashier Dashboard:**
- 📦 Collected loans waiting for payment confirmation
- 💰 Payment input field
- ✔️ Confirm payment button
- 📜 Payment history with timestamps

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| User can't login | Admin hasn't approved yet (check status = "pending") |
| Collector doesn't see loan | Loan not assigned to that collector (check assignedCollectorId) |
| Cashier doesn't see loan | Collector hasn't marked as "collected" yet |
| Payment won't confirm | Check: amount > 0, amount ≤ balance |
| Wrong dashboard on login | Check user role in database |

---

## 🎉 System is Ready!

All features are working. This is a **production-ready** loan management system!

Questions? Check SYSTEM_WORKFLOW.md for detailed workflow documentation.
