# Ledgerling – ERD

Paste the code block below into https://mermaid.live to render the diagram.

```mermaid
erDiagram
    USER ||--o{ CATEGORY : owns
    USER ||--o{ TRANSACTION : records
    CATEGORY ||--o{ TRANSACTION : classifies

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
        date date
        date createdAt
        date updatedAt
    }
```

## Relationships

- One User has many Categories (`Category.userId`).
- One User has many Transactions (`Transaction.userId`).
- One Category has many Transactions (`Transaction.categoryId`).
- A Category cannot be deleted while it still has Transactions (API returns 409).
- Category name is unique per user and type: compound unique index on `(userId, name, type)`.
