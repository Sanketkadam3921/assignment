#  backend Developer Assignment 

A complete backend API system for a Splitwise-style expense sharing application, designed for the **DevDynamics Backend Intern Assignment**.

Built using **Node.js**, **Express.js**, **Prisma**, and **PostgreSQL**, this app enables group expense tracking, smart settlements, and recurring expense automation.

---

##  Features

### Core Functionalities
- Add, update, delete expenses with smart splitting
- Support for **Equal**, **Exact**, and **Percentage** sharing
- Auto-manages people involved in expenses
- Settlement calculations using **greedy algorithm**
- Track balances and settlements between people

###  Recurring Expenses
- Define recurring bills with custom frequency (e.g., rent)

###  Analytics
- Monthly summaries
- Category-wise reports
- Person-wise insights
- Group vs. individual spending breakdown

---

##  Base API URL  
`https://express-production-e484.up.railway.app`

frontend url ---- https://frontendassignment-three.vercel.app/

---

## API Endpoints

###  Expense Management
| Method | Endpoint                     | Description                    |
|--------|------------------------------|--------------------------------|
| GET    | `/expenses`                  | Get all expenses               |
| POST   | `/expenses`                  | Add a new expense              |
| PUT    | `/expenses/:id`              | Update an expense              |
| DELETE | `/expenses/:id`              | Delete an expense              |

###  People & Balances
| Method | Endpoint                     | Description                    |
|--------|------------------------------|--------------------------------|
| GET    | `/expenses/people`           | List all involved people       |
| GET    | `/balances`                  | Show person-wise balances      |
| GET    | `/settlements`               | Get simplified settlements     |

### Categories
| Method | Endpoint                         | Description                       |
|--------|----------------------------------|-----------------------------------|
| GET    | `/expenses/categories`           | Get all available categories      |
| GET    | `/expenses/by-category`          | Fetch all expenses by category    |
| GET    | `/expenses/category-summary`     | Summary by category               |

###  Recurring Expenses
| Method | Endpoint                          | Description                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/expenses/recurring`             | Get all recurring expenses           |
| POST   | `/expenses/recurring`             | Add a recurring expense              |
| PUT    | `/expenses/recurring/:id`         | Update recurring expense             |

###  Analytics
| Method | Endpoint                                     | Description                                  |
|--------|----------------------------------------------|----------------------------------------------|
| GET    | `/expenses/analytics/monthly-summary`        | Monthly totals (with optional filters)       |
| GET    | `/expenses/analytics/spending-patterns`      | Patterns by person, category, time           |
| GET    | `/expenses/analytics/top-expenses`           | Top expenses with filters                    |
| GET    | `/expenses/analytics/individual-vs-group`    | Compare solo vs shared spending              |

---




Postman Collection


Public Postman Collection with pre-filled test data:
Click here to open collection    -----   https://www.postman.com/sanket3921/workspace/sanket/collection/24738996-b004f049-e233-4ef5-9a79-667df3f88c6a?action=share&creator=24738996&active-environment=24738996-b7d2c08c-7e44-43da-a273-f26267f5d823

Covers all core flows and edge cases

Includes recurring, analytics, settlements



🛠️ Setup Instructions (For Local Dev)

git clone https://github.com/Sanketkadam3921/split-backend-app.git

cd split-backend-app

npm install

npx prisma generate

npx prisma migrate deploy

npm start

Create .env with your PostgreSQL connection string:





settlement Logic Overview
For each expense:
paid_by is credited the full amount

Each participant is debited based on their share

Net balances are calculated per person

Greedy algorithm used to settle debts with minimum transactions



Author
Made with care by Sanket Kadam
🎯 Passionate about backend engineering, systems design, and API architecture

