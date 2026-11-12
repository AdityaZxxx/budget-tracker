# Sora

Sora is a free finance app for individuals and for couples and households. This glossary defines the words the product uses so that code, UI copy, and docs stay consistent.

## People and spaces

**User**:
A sign-in identity (email/password or Google). A user exists independently of any household.
_Avoid_: member, partner

**Household**:
The space where a person keeps their finances, alone or shared. A couple or family keeps theirs together; an individual keeps their own. All money records belong to exactly one household. A household may have exactly one member (a solo household); solo and shared households are the same model, and the product treats the solo case as a first-class persona (ADR 0005). User-facing copy addresses a one-member household as the person, never as a "household".
_Avoid_: account, family, budget space, and "household" in copy aimed at a solo user

**Member**:
A user who belongs to a household. A member is either a full member, who can add, edit, and delete transactions, invite others, and remove others, or a view-only member, who can only read the ledger. There is no owner: full members all have equal rights.
_Avoid_: partner, owner (there is no owner role)

**Invite link**:
A revocable, shareable link (also shown as a QR code) that adds a person to a household when they sign in through it.
_Avoid_: invite code, email invite

## Money records

**Transaction**:
A single income or expense entry in a household ledger, attributed to the member who added it. Attributed transactions stay in the ledger even if that member leaves.
_Avoid_: entry, payment

**Shared transaction**:
A transaction that counts toward household totals and budgets and is visible to all members.
_Avoid_: joint expense

**Personal transaction**:
A transaction visible only to the member who added it; excluded from household totals and budgets.
_Avoid_: private expense

**Category**:
A label for transactions (for example Groceries), owned by a household, with an icon and an income or expense type.

**Budget**:
A monthly spending limit on one category within a household. A budget is either soft (warns at the limit) or hard (blocks transactions over the limit).
_Avoid_: envelope, spending plan

**Goal**:
A household savings target with an optional deadline. Contributions to a goal are transactions tagged with the goal.
_Avoid_: savings target

**Settlement**:
A transaction that records one member paying what they owed another member, zeroing their balance. No money ever moves inside the app.
_Avoid_: payment, transfer

**Active household**:
The household a user is currently working in when they belong to more than one. Remembered per browser and validated against memberships on every read; switching changes every screen at once.
_Avoid_: current workspace, selected account

**Balance**:
The net amount one member owes another, computed from shared transactions and settlements.

**Split share**:
The part of one shared expense that a single member owes. Shares default to an even split across all members; a shared expense can also carry per-member shares by amount or percent. Shares never change who added the transaction: the adder fronts the money and the others owe their shares back.

**Currency**:
The single currency of a household, chosen at onboarding. All amounts in the household are in this currency.

**Recurring item**:
A household-level definition of a repeating income or expense (weekly on a weekday, or monthly on a date), carrying name, amount, category, and optional start and end dates or pause. Members record the actual transaction from the list when it comes due; nothing posts automatically.
_Avoid_: subscription (that is one source of these), schedule

**Upcoming bills**:
The dashboard list of recurring items due or past due. Tapping one opens a prefilled transaction dialog; the member confirms or adjusts the real date and amount, which is what lands in the ledger.

**Insights**:
The dashboard section that reports the household's own numbers: savings rate for the current month and the trend of monthly net (income minus expense) over the last six months.

**Savings rate**:
(income − expense) / income for one month, per household. When income is zero the rate is undefined and shown as a dash, never as a real number.

**Unusual spending**:
A transaction whose amount exceeds twice the trailing three-month average for its category, where that average clears a currency-scaled floor so tiny categories do not alert. Evaluated on shared transactions for the household and on a member's personal transactions for that member alone; notifications carry no amounts beyond what the recipient can already see. In-app only.
_Avoid_: alert, anomaly flag

**Safe-to-spend**:
The sum of the remaining amounts of this month's budgets, across all budgeted categories. It answers "how much may this household still spend this month". Unbudgeted categories do not count; with no budgets, the app invites the household to set one instead of showing a number.
