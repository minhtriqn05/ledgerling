# Ledgerling – ERD

Paste the code block below into https://mermaid.live to render the diagram.

```mermaid
erDiagram
    USER ||--o{ CATEGORY : owns
    USER ||--o{ TRANSACTION : records
    CATEGORY ||--o{ TRANSACTION : classifies
    USER ||--o{ BUDGET : sets
    CATEGORY ||--o{ BUDGET : limits
    USER ||--o{ RECURRING_RULE : schedules
    CATEGORY ||--o{ RECURRING_RULE : classifies
    RECURRING_RULE |o--o{ TRANSACTION : creates
    USER ||--o{ GOAL : saves
    USER ||--o{ TRANSACTION_TEMPLATE : saves
    CATEGORY ||--o{ TRANSACTION_TEMPLATE : prefills
    GOAL ||--o{ CONTRIBUTION : holds

    USER {
        ObjectId _id PK
        string name
        string email UK "unique, lowercase"
        string passwordHash
        date createdAt
        date updatedAt
    }

    CATEGORY {
        ObjectId _id PK
        ObjectId userId FK
        string name "unique per user and type"
        string type "income | expense"
        string color "hex, e.g. #FF7043"
        string icon "optional, icon name or one emoji, null = none"
        date createdAt
        date updatedAt
    }

    TRANSACTION {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId categoryId FK
        string type "income | expense, copied from category"
        number amount "greater than 0"
        string currency "ISO code, default VND"
        string note
        string_array tags "up to 5, lowercase, each 1-20 of a-z 0-9 -"
        ObjectId recurringRuleId FK "optional, only on transactions created by a rule"
        date date
        date createdAt
        date updatedAt
    }

    BUDGET {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId categoryId FK "expense categories only"
        string month "YYYY-MM, Vietnam time"
        number amount "greater than 0, VND"
        date createdAt
        date updatedAt
    }

    RECURRING_RULE {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId categoryId FK
        number amount "greater than 0, VND"
        string note
        string frequency "weekly | monthly"
        date startDate "noon Vietnam time"
        date nextRunDate "noon Vietnam time"
        date endDate "optional, last day that can run"
        boolean active "default true"
        date createdAt
        date updatedAt
    }

    GOAL {
        ObjectId _id PK
        ObjectId userId FK
        string name "1-60 characters"
        number targetAmount "greater than 0, whole VND"
        number savedAmount "default 0, never below 0"
        date deadline "optional, noon Vietnam time"
        string color "hex, e.g. #4A9FE3"
        date createdAt
        date updatedAt
    }

    TRANSACTION_TEMPLATE {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId categoryId FK
        string name "1-40 characters"
        number amount "greater than 0, VND"
        string note "up to 200 characters"
        date createdAt
        date updatedAt
    }

    CONTRIBUTION {
        ObjectId _id PK
        number amount "whole VND, not 0: positive = deposit, negative = withdrawal"
        string note "up to 200 characters"
        date date "noon Vietnam time"
    }
```

## Relationships

- One User has many Categories (`Category.userId`).
- One User has many Transactions (`Transaction.userId`).
- One Category has many Transactions (`Transaction.categoryId`).
- A Category cannot be deleted while it still has Transactions or Recurring Rules (API returns 409).
- One User has many Recurring Rules (`RecurringRule.userId`); one Category has many Recurring Rules (`RecurringRule.categoryId`).
- One Recurring Rule creates many Transactions (`Transaction.recurringRuleId`). Deleting a rule keeps its transactions, so the id can point to a rule that no longer exists.
- A rule never creates two transactions for the same date: partial unique index on `(recurringRuleId, date)`, only for transactions that have a `recurringRuleId`.
- Indexes on RecurringRule: `(userId, active, nextRunDate)` to find due rules and `(userId, categoryId)` for the check before a category is deleted.
- Category name is unique per user and type: compound unique index on `(userId, name, type)`.
- One User has many Budgets (`Budget.userId`); one Category has many Budgets (`Budget.categoryId`), one per month.
- A Budget is unique per user + category + month: compound unique index on `(userId, categoryId, month)` (API returns 409).
- `spent`, `remaining`, `percent` and `status` of a budget are not stored: they are computed from the month's VND expense transactions.
- Deleting a Category also deletes its Budgets (after the 409 check for transactions).
- Tags are stored inside the Transaction (no separate collection). `GET /api/tags` counts them with an aggregation.
- Indexes on Transaction: `(userId, date -1)` for the list and `(userId, tags)` for the tag filter and the tag list.
- One User has many Goals (`Goal.userId`). The contributions are stored inside the Goal as an array of subdocuments (no separate collection), so a goal and its history are always read and changed together.
- `Goal.savedAmount` is the sum of the contributions. It is changed only by an atomic `$inc` together with `$push` / `$pull` of a contribution, with a condition that keeps it at 0 or more.
- `progress`, `remaining` and `completed` of a goal are not stored: they are computed from `savedAmount` and `targetAmount`.
- Index on Goal: `(userId)` for the list.
- `Category.icon` is optional: an icon name from the app's icon set (`utensils`, `bus`, ...; list in `server/src/utils/categoryIcons.js`, max 30 characters) or one emoji saved by an older version. `null` = none chosen, and the client then guesses an icon from the name (nothing is written back). Default categories are created with an icon name; stored emoji are never rewritten, the client shows them as the matching line icon.
- One User has many Transaction Templates (`TransactionTemplate.userId`); one Category has many Templates (`TransactionTemplate.categoryId`). A template has no `type`: the type of a transaction made from it comes from the category.
- Deleting a Category also deletes its Templates (after the 409 checks for transactions and recurring rules).
