# Sora

Sora is a free finance app for couples and households. This glossary defines the words the product uses so that code, UI copy, and docs stay consistent.

## People and spaces

**User**:
A sign-in identity (email/password or Google). A user exists independently of any household.
_Avoid_: member, partner

**Household**:
The shared space where a couple or family keeps their finances. All shared money records belong to exactly one household.
_Avoid_: account, family, budget space

**Member**:
A user who belongs to a household. Every member has equal rights: add, edit, and delete transactions, invite others, and remove others.
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

**Balance**:
The net amount one member owes another, computed from shared transactions and settlements.

**Split share**:
The part of one shared expense that a single member owes. Shares default to an even split across all members; a shared expense can also carry per-member shares by amount or percent. Shares never change who added the transaction: the adder fronts the money and the others owe their shares back.

**Currency**:
The single currency of a household, chosen at onboarding. All amounts in the household are in this currency.
