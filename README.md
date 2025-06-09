#  Split App - Backend Assignment

This is a backend API system for a Splitwise-style application, built using **Node.js**, **Express.js**, **Prisma**, and **PostgreSQL**. It allows groups of people to track shared expenses and automatically calculates who owes whom.



## Features

###  Core Features

-  Add, view, edit, delete expenses
-  People auto-added from expenses
-  Split by percentage, share, or exact amount
-  Calculate who owes/gets how much
-  Simplified settlement results

###  API Endpoints

####  Expense Management

| Method | Endpoint              | Description                   |
|--------|-----------------------|-------------------------------|
| GET    | `/api/expenses`       | Get all expenses              |
| POST   | `/api/expenses`       | Add new expense               |
| PUT    | `/api/expenses/:id`   | Update existing expense       |
| DELETE | `/api/expenses/:id`   | Delete an expense             |

####  Settlement & People

| Method | Endpoint            | Description                              |
|--------|---------------------|------------------------------------------|
| GET    | `/api/people`       | List all involved people                 |
| GET    | `/api/balances`     | Show each person’s balance               |
| GET    | `/api/settlements`  | Show simplified settlement transactions  |

---

##  Folder Structure

backend-assignment/
├── prisma/ # Prisma schema and migrations
├── routes/ # Express routes
├── controllers/ # Request handlers
├── services/ # Core business logic
├── app.js # App entry point
├── .env # Environment variables
├── README.md # Project documentation


---

##  Postman Collection

✅ Public Postman Collection with pre-filled data:  
https://api.postman.com/collections/24738996-97758b1f-1f96-4bd4-942c-6cbe5d1232a2?access_key=PMAT-01JXASJGGAMTEZWPD1M0H2AHH2
- Includes test users: `Shantanu`, `Sanket`, `Om`
- Covers normal + edge cases (e.g., invalid expense, non-existent expense)

---

## 🛠️ Setup Instructions


git clone https://github.com/Sanketkadam3921/split-backend-app.git
cd split-backend-app
npm install
npx prisma generate
npx prisma migrate deploy
npm start

    Create a .env file:

DATABASE_URL=your_railway_database_url

Settlement Calculation Logic

    Each expense has multiple splits (e.g., Shantanu: 50%, Sanket: 50%)

    For each person:

        Calculate their total paid

        Calculate their total owed

    Final balance = paid - owed

    To simplify, we use a greedy method to minimize transactions in /settlements.

 Known Limitations

    No recurring expenses yet

    No web UI (API only)

    Basic validation in place — improvements possible

Author

Made by Sanket Kadam
Feel free to reach out if you have any feedback or suggestions!
