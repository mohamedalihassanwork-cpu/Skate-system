# Skate Rental ERP — Master Business & Product Specification

## 1. Purpose

This is the master **business and product specification** for a commercial cloud ERP for a skate rental store.

It is the primary product reference for implementation. It describes the product, users, features, workflows, business rules, and expected user experience.

**This is not a technical specification.** It does not prescribe programming languages, frameworks, database schemas, APIs, deployment architecture, or code structure.

---

## 2. Product Overview

The system is a complete cloud ERP specialized for a skate rental business.

It is **not a traditional sales-only POS**. The core concept is individual asset lifecycle management: every skate is an independent asset with its own identity, status, rental history, damage history, maintenance history, revenue, maintenance cost, and rental count.

The system manages:

- Skates / assets
- Rentals
- Customers
- Reservations
- Payments
- Sales POS
- Products and spare parts
- Treasury
- Cashier shifts
- Expenses
- Damages
- Maintenance
- Reports
- Users and permissions
- Notifications
- Audit logs
- Settings
- Invoices and printing

The complete skate lifecycle is:

**Added → Available → Rented → Returned → Inspected → Available OR Damaged → Maintenance → Repaired → Available**

The final product must be a real commercial operational system, not a demo or dashboard-only application.

---

## 3. Language and RTL

The entire application is **Arabic-first**.

The user-facing interface must be:

- Arabic
- RTL (Right-to-Left)
- Clear and natural for Arabic-speaking employees
- Consistent in terminology
- Easy to use on touch devices

Normal UI content should be Arabic, including:

- Navigation
- Buttons
- Labels
- Forms
- Statuses
- Notifications
- Validation messages
- Confirmation dialogs
- Empty states
- Reports
- Invoices
- Operational messages

The specification is written in English for the implementation agent. This does **not** mean the application UI should be English.

If multilingual support is added later, Arabic remains the primary language and RTL remains the primary direction.

---

## 4. Cloud and Responsive Product

The system is one centralized cloud application accessed through a browser on:

- Desktop
- Laptop
- Tablet
- Mobile

There must not be separate desktop and mobile business applications.

The same product and workflows should adapt responsively.

### Desktop

May use:
- Sidebar
- Large tables
- Multi-column dashboards
- Large skate grids
- Charts

### Mobile

Should adapt to:
- Cards
- Simplified lists
- Touch-friendly controls
- Mobile navigation
- Horizontal scrolling where necessary

Mobile should be an adapted experience, not a completely separate product.

---

## 5. Users and Roles

Initial user types:

### Administrator

Can manage, according to permissions:

- Skates
- Pricing
- Customers
- Reservations
- Users
- Roles and permissions
- Expenses
- Treasury
- Reports
- Maintenance
- Settings

### Cashier

Can perform permitted operational tasks such as:

- Start rentals
- Select skates
- Select duration
- Find/create customers
- Handle payments
- Monitor rentals
- Return skates
- Handle late fees
- Inspect returned skates
- Record damage
- Record customer damage charges
- Decide maintenance requirement when authorized
- Use Sales POS when permitted
- Record expenses when permitted

### Maintenance Staff

Can, according to permissions:

- View maintenance skates
- View reported problems
- Record repairs
- Record spare parts
- Record repair costs
- Complete maintenance

### Dynamic Roles and Permissions

Roles must be configurable.

The Administrator must be able to:

- Create roles
- Edit roles
- Assign permissions
- Add new roles
- Control access to modules and actions

Do not assume only the initial roles will exist.

---

## 6. Main Navigation

Main areas:

- Dashboard
- Rentals
- Skates
- Customers
- Reservations
- Maintenance
- Sales POS
- Expenses
- Treasury
- Reports
- Users
- Settings

Users should only see/access areas allowed by their permissions.

---

## 7. Dashboard

The dashboard must adapt to user permissions.

Important management indicators include:

- Today's revenue
- Rentals today
- Active rentals
- Available skates
- Rented skates
- Skates in maintenance
- Late rentals
- Expenses
- Collected late fees
- Waived late fees
- Damage charges
- Operating result

Charts may include:

- Revenue over time
- Rental volume
- Most-rented skates
- Skate performance
- Expenses

Time filters:

- Today
- Yesterday
- This week
- This month
- Custom range

The dashboard must provide **Quick Access** actions such as:

- Start Rental
- Open Rentals
- Return Skate
- Add Customer
- Add Expense
- Other important permitted actions

---

## 8. Skate / Asset Management

Every skate is an individual asset.

A skate should have:

- Unique Skate ID
- QR Code
- Barcode
- Size
- Type
- Current status
- Cleanliness / quality condition
- Purchase date
- Purchase cost
- Rental history
- Damage history
- Maintenance history
- Rental revenue
- Maintenance cost
- Number of rentals

### Skate statuses

- Available
- Rented
- Reserved
- Maintenance
- Damaged
- Lost

A skate that is not available must not be selectable for a normal rental.

---

## 9. Cashier Skate Screen

The primary cashier screen should show the available skate inventory.

The cashier should not be forced to start from a traditional invoice-creation screen.

The screen should provide:

- Search
- Size filter
- Status filter
- Visual skate cards/grid

Each skate card should show:

- Skate ID
- Size
- Type
- Status
- Condition

Unavailable skates must be clearly identifiable and cannot be selected for normal rental.

---

## 10. Rental POS

Rental POS is the main operational workflow for the cashier.

It must be simple, guided, and fast.

The recommended flow is:

**Select Skate → Select Duration → Automatic Price → Customer → Review → Payment → Start Rental**

Use clear sections/steps and minimize clicks.

The cashier should always know:
- Current step
- Completed information
- Required information
- Next action

The Rental POS is **not** the same as the Sales POS.

---

## 11. Rental Duration and Pricing

Initial duration options:

- 15 minutes
- 30 minutes
- 45 minutes
- 60 minutes
- 90 minutes
- Custom duration

The Administrator controls pricing.

Prices must not be hardcoded.

Example with an hourly rate of 120 EGP:

- 15 min = 30 EGP
- 30 min = 60 EGP
- 45 min = 90 EGP
- 60 min = 120 EGP
- 90 min = 180 EGP

The system calculates the rental amount using the configured pricing rules.

Historical rentals must retain their historical amounts even when future pricing is changed.

---

## 12. Customers

Customer information includes:

- Name
- National ID
- Phone number
- Registration date

The cashier should be able to search by:

- Name
- Phone
- National ID

If the customer already exists, their information should load automatically.

Customer profiles should show:

- Number of rentals
- Total paid
- Late returns
- Damages
- Rental history

---

## 13. Rental Confirmation

Before activation, show a clear summary containing:

- Customer
- Customer identification information
- Skate
- Size
- Duration
- Rate
- Rental amount
- Actual start time
- Expected end time

After confirmation:

**Available → Rented**

A unique Rental ID is created.

---

## 14. Payments and Split Payments

Supported payment methods include:

- Cash
- Card
- InstaPay
- Vodafone Cash
- Other methods configured by the Administrator

The system must support **multiple payment methods in one transaction**.

Example:

Total = 200 EGP

- Cash = 100 EGP
- Vodafone Cash = 100 EGP

Each payment component must remain identifiable while belonging to the same business transaction.

Payments must be associated with the appropriate treasury/account.

The return workflow must also support additional amounts such as late fees and damage charges.

The cashier should clearly see:

- Original rental amount
- Amount already paid
- Additional charges
- Remaining amount
- Final amount due
- Payment methods

---

## 15. Active Rentals

Provide a dedicated active-rentals view.

Show:

- Rental ID
- Customer
- Skate
- Start time
- Expected end time
- Remaining time
- Rental status
- Cashier

Statuses:

- Normal
- Ending Soon
- Expired
- Late
- Returned

The screen should help the cashier identify rentals requiring action.

---

## 16. Rental Expiration Notifications

The system must alert the cashier **exactly one minute before the expected rental end time**.

The alert should contain relevant information such as:

- Rental ID
- Customer
- Skate
- Expected end time
- Remaining time

The notification should be visible inside the system and visually clear.

Optional sound notification may be supported.

Browser-only timers must not be treated as the authoritative source of rental state.

---

## 17. Late Returns and Late Fees

When the expected end time passes without a return, the rental becomes late.

Late time starts only after the expected end time.

Example:

Expected: 08:15 PM  
Returned: 08:23 PM  
Late: 8 minutes

The Administrator controls the late fee per minute.

Example:

2 EGP/minute × 8 minutes = 16 EGP

The system calculates the late fee automatically.

---

## 18. Late Fee Collection and Waiver

An authorized cashier can:

- Collect the calculated fee
- Waive the calculated fee

A waiver must record:

- User
- Amount waived
- Date/time
- Reason

The waiver must appear in the Audit Log.

The system must distinguish:

- Calculated fee
- Collected fee
- Waived fee

---

## 19. Return Workflow

When the customer returns the skate:

1. Find the active rental.
2. Return the skate.
3. Record the actual return time.
4. Calculate late duration.
5. Calculate late fee.
6. Collect or waive the fee when applicable.
7. Inspect the skate.
8. Determine whether there is damage.
9. If no maintenance is needed, return the skate to Available.
10. If maintenance is needed, move it to Maintenance.

The return workflow must be fast and structured.

---

## 20. Skate Inspection

Every returned skate should go through an inspection.

Initial inspection areas:

- Wheels
- Brake
- Strap
- Bearings
- Body
- Other

Condition values:

- Good
- Minor Damage
- Damaged
- Broken

Inspection results become part of the skate's history.

---

## 21. Damage Management

When damage is found, create a Damage Report.

Damage types:

- Wheel
- Strap
- Brake
- Bearing
- Body
- Other

A damage report may contain:

- Problem type
- Description
- Severity
- Photo
- Customer charge
- Notes

The cashier should be able to attach a damage photo.

The system should support authorized waiver/forgiveness of a customer damage charge where applicable.

---

## 22. Customer Damage Charges

A damage charge is money requested/collected from the customer because of damage.

It is separate from the cost of repairing the skate.

Example:

Customer damage charge = 150 EGP  
Repair cost = 70 EGP

Operational financial impact:

**150 - 70 = 80 EGP**

These must remain separate financial events.

---

## 23. Maintenance Decision

After inspection/damage handling:

### No maintenance required

**Skate → Available**

The issue remains in history.

### Maintenance required

**Skate → Maintenance**

The skate must not be available for rental while maintenance is required.

---

## 24. Maintenance

Maintenance records should include:

- Maintenance ID
- Skate
- Problem
- Related issue/inspection
- Registration date
- Repair description
- Spare parts
- Parts cost
- Labor cost
- Total cost
- Status
- Completion date

Statuses:

- Pending
- In Progress
- Completed

Example:

Broken Strap → Strap Replacement  
Parts = 50 EGP  
Labor = 20 EGP  
Total = 70 EGP

After required maintenance is completed:

**Maintenance → Available**

---

## 25. Skate Timeline

Every skate must have a complete historical timeline.

It should preserve:

- Rentals
- Returns
- Inspections
- Damages
- Maintenance
- Repairs
- Financial performance

Management should be able to open any skate and understand its full history.

Example:

SK-023  
Rentals: 137  
Rental revenue: 18,450 EGP  
Maintenance events: 8  
Maintenance cost: 1,250 EGP  
Damage charges: 1,800 EGP

Historical rentals must not be deleted when a skate is disabled.

---

## 26. Reservations

The system must support future reservations.

Reservations should be connected to:
- Customer
- Relevant skate/inventory
- Reservation timing
- Reservation status

Conflicting reservations are prohibited.

A reserved skate should not be treated as normally available when the reservation prevents its use.

---

## 27. Sales POS

The system has a **separate Sales POS** for selling products and spare parts.

This is intentionally separate from the Rental POS.

Sales POS should support:

- Product selection
- Cart
- Quantities
- Pricing
- Payment
- Invoice
- Sales history

It should be possible to sell products such as spare parts and other store products without going through the skate rental workflow.

---

## 28. Invoices and Printing

The system should support invoices for:

- Rentals
- Sales

Invoice printing is configurable by the Administrator.

The Administrator can:

- Enable printing
- Disable printing
- Select the appropriate printer

Printed invoices should contain a **barcode for the invoice**.

Printing should not be mandatory when the feature is disabled.

---

## 29. Expenses

The Expenses module records business expenses.

An expense may contain:

- Category
- Amount
- Description
- Payment source
- Date
- Receipt/attachment

Initial categories:

- Maintenance
- Electricity
- Water
- Cleaning
- Rent
- Supplies
- Marketing
- Salaries
- Transportation
- Equipment
- Other

The Administrator can add/edit categories.

---

## 30. Treasury

The Treasury module manages financial accounts and movements.

Possible accounts include:

- Cash
- Bank
- Card
- InstaPay
- Other

Financial movements include:

- Rental payment
- Sales payment
- Late fee
- Damage charge
- Expense
- Refund
- Other permitted transactions

Each account should have a current balance.

Treasury activity must remain traceable to the underlying business operation.

---

## 31. Expense and Treasury Relationship

When an expense is paid from an account, the corresponding balance must be affected.

Example:

Expense = 300 EGP  
Paid from Cash

Financial effect:

**Cash -300 EGP**

and the expense is recorded as:

**Maintenance Expense 300 EGP**

The relationship between the expense and financial movement must remain traceable.

---

## 32. Cashier Shifts

The system supports cashier shifts.

At opening:

**Opening Cash = 1,000 EGP**

During the shift:

Revenue = 7,250 EGP  
Expenses = 150 EGP

Expected cash:

**1,000 + 7,250 - 150 = 8,100 EGP**

At closing:

Actual cash = 8,050 EGP

Difference:

**-50 EGP**

The shift preserves:

- Cashier
- Start time
- End time
- Opening balance
- Expected balance
- Actual balance
- Difference

Administrators can review shift performance.

---

## 33. Reports

The Reports area must provide management and operational reporting.

Major reports:

- Overview
- Revenue
- Rentals
- Skate Performance
- Late Returns
- Damages
- Maintenance
- Expenses
- Customers
- Cashiers
- Operating Financial Result

Reports should support relevant filters and date ranges.

---

## 34. Overview Report

Shows:

- Revenue
- Rentals
- Active rentals
- Late rentals
- Expenses
- Damages
- Maintenance

---

## 35. Revenue Report

Distinguish:

- Rental Revenue
- Collected Late Fees
- Damage Charges
- Other Income
- Total Revenue

Support time-based analysis such as revenue by day.

---

## 36. Rental Report

Show:

- Rental ID
- Customer
- Skate
- Duration
- Amount
- Start time
- Return time
- Status
- Cashier

Useful filters:

- Date
- Cashier
- Skate
- Size
- Customer
- Status
- Duration

---

## 37. Skate Performance Report

For every skate, show:

- Number of rentals
- Rental revenue
- Maintenance events
- Maintenance cost
- Damages
- Customer damage charges
- Current status
- Usage/utilization rate

The report should help management identify:

- Most profitable skates
- Least-used skates
- Frequently damaged/maintained skates
- Skates that may be economically better to replace

---

## 38. Late Report

Show:

- Total late rentals
- Calculated late fees
- Collected late fees
- Waived late fees
- Waiver rate

Also provide analysis by cashier.

---

## 39. Damage Report

Show:

- Number of damages
- Damage type
- Skate
- Customer
- Customer charge
- Repair cost

Support analysis by damage category.

---

## 40. Maintenance Report

Show:

- Number of maintenance operations
- Total maintenance cost
- Average repair cost
- Time spent in maintenance
- Skates requiring maintenance most often
- Most common problem types

---

## 41. Expense Report

Analyze expenses by:

- Category
- Date
- User
- Payment method

Show totals for the selected period.

---

## 42. Customer Report

Show insights such as:

- Number of customers
- Most frequent customers
- Highest-spending customers
- Number of rentals
- Late returns
- Damages

---

## 43. Cashier Report

For each cashier:

- Number of rentals
- Revenue
- Late fees
- Waived fees
- Expenses
- Shift difference

---

## 44. Operating Financial Report

Show:

### Revenue

- Rental Revenue
- Late Fees
- Damage Charges
- Other Income

### Expenses

- Maintenance
- Rent
- Electricity
- Salaries
- Supplies
- Other

### Result

**Operating Result**

Do not call this formal accounting **Net Profit** unless a complete accounting system has been implemented.

---

## 45. Export and Print

Reports should support:

- PDF
- Excel
- CSV
- Print

Users should be able to choose the relevant period and filters before exporting.

---

## 46. Notifications

Important operational notifications include:

- Rental ending soon
- Rental expired
- Other important operational events

Notifications should be visible inside the application and clearly distinguish urgent events.

---

## 47. Audit Log

Important operations must be recorded.

Examples:

- Start rental
- Waive late fee
- Record damage
- Change pricing
- Complete maintenance
- Important administrative changes
- Important financial actions

An audit entry should preserve:

- User
- Action
- Entity type
- Entity ID
- Old value
- New value
- Date/time

The purpose is accountability and traceability.

---

## 48. Settings

The Administrator can configure:

- Rental price
- Rental durations
- Late fee per minute
- Damage types
- Skate sizes
- Skate types
- Expense categories
- Payment methods
- Roles
- Permissions
- Notification settings
- Store information
- Currency
- Tax settings when required
- Invoice printing
- Printer selection

Values expected to change through management should be configurable.

---

## 49. Core Business Rules

The following rules are mandatory:

1. An unavailable skate cannot be rented.
2. One skate cannot be rented to two customers simultaneously.
3. A skate in Maintenance cannot be rented.
4. Rental price is calculated from configured business rules.
5. Expected end time is based on the actual rental start time.
6. Late time starts only after expected end time.
7. Late fee is calculated automatically.
8. Late-fee waiver requires permission.
9. Every waiver is audited.
10. Customer damage charge is a customer payment/income event.
11. Maintenance cost is an expense.
12. A skate requiring maintenance cannot become Available until required maintenance is completed.
13. Important financial operations must behave as complete business transactions; partial updates must not leave inconsistent financial state.
14. Important administrative actions must be auditable.
15. Concurrent attempts to rent the same skate must not result in double rental.
16. Conflicting reservations are prohibited.
17. Treasury balances must remain accurate.
18. Disabling a skate must not delete historical rentals.
19. Rental, inspection, damage, and maintenance history must be retained.
20. The authoritative rental time/state must not depend only on a browser timer.

---

## 50. User Experience Principles

The system is designed around real store operations.

### Cashier-first

A normal rental should be possible without navigating through administrative screens.

### Minimal clicks

Use:
- Defaults
- Pre-filled information
- Reusable customer data
- Clear Next/Back steps
- Obvious primary actions

### Clear state

Users should always understand the current:
- Skate state
- Rental state
- Payment state
- Return state
- Damage state
- Maintenance state

### Error prevention

Prevent invalid operations before submission.

Examples:
- Block unavailable skates.
- Block conflicting reservations.
- Block unauthorized waivers.
- Block incomplete critical transactions.

---

## 51. End-to-End Rental Workflow

### Starting a Rental

**Select Skate**
→ choose an available skate

**Select Duration**
→ predefined or permitted custom duration

**Automatic Price**
→ system calculates amount

**Customer**
→ search existing or create new

**Review**
→ show complete rental summary

**Payment**
→ complete applicable payment workflow, including split payment

**Start Rental**
→ rental becomes active

Skate:

**Available → Rented**

---

## 52. End-to-End Return Workflow

**Find Active Rental**
→ **Return Skate**
→ **Record Return Time**
→ **Calculate Late**
→ **Calculate Fee**
→ **Collect/Waive**
→ **Inspect**
→ **Damage?**

If no damage / no maintenance:

**Available**

If damage:

**Damage Report**
→ **Customer Charge**
→ **Maintenance?**

If no maintenance:

**Available**

If maintenance required:

**Maintenance**
→ **Repair**
→ **Completed**
→ **Available**

---

## 53. Important Business Distinctions

### Rental vs Sale

Rental and direct product sales are different business workflows.

### Damage Charge vs Maintenance Cost

Customer damage charges and business repair costs are separate financial events.

### Calculated vs Collected/Waived Late Fee

The system must preserve what was calculated and what actually happened.

### Skate Status vs Skate Condition

Operational status and physical condition are different concepts.

### Operating Result vs Accounting Net Profit

Operating result is not formal accounting profit.

### Role vs Permission

A role is a configurable collection of permissions.

---

## 54. Expected Final Product

The completed application should provide one coherent Arabic RTL experience for:

**Skates**
→ individual assets, statuses, history

**Rentals**
→ start, monitor, return, late fees

**Customers**
→ profiles and history

**Reservations**
→ future rental planning

**Sales POS**
→ direct product and spare-part sales

**Payments**
→ multiple payment methods and split payments

**Treasury**
→ financial accounts and movements

**Cashier Shifts**
→ opening, activity, closing, variance

**Damages**
→ inspection, charges, waivers, photos

**Maintenance**
→ repair lifecycle and costs

**Expenses**
→ operating spending

**Reports**
→ operational and management analysis

**Users & Permissions**
→ controlled access

**Notifications**
→ operational alerts

**Audit Log**
→ traceability

**Settings**
→ configurable business rules

**Invoices & Printing**
→ rental and sales invoices with invoice barcodes

The final product should feel like a unified commercial ERP designed specifically for the daily reality of a skate rental store, rather than disconnected screens.

---

## 55. Final Product Guidance

Preserve the business intent and workflows in this document.

Do not reduce the system to a generic CRUD application.

Do not treat Rental POS as a normal sales invoice screen.

Do not treat skates as interchangeable inventory when individual asset history is required.

Do not delete historical events when a skate changes status.

Do not merge unrelated financial events into one generic amount.

Do not bypass permissions for sensitive actions.

Do not create separate desktop and mobile products.

The highest priority is a **fast, clear, Arabic-first, RTL commercial system** that correctly manages the complete lifecycle of every skate and all associated rental, customer, financial, damage, maintenance, sales, and operational activities.
