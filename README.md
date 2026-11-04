# Budget Tracker

A modern, full-stack web application designed to help users track their income and expenses, categorize transactions, and visualize their financial habits.

## ✨ Features

- **Secure Authentication**: Handled by [Better Auth](https://better-auth.com/) for easy and secure sign-up and sign-in.
- **Dashboard Overview**: A comprehensive summary of your financial status, including income, expenses, and net balance.
- **Transaction Management**: Easily create, view, and manage your income and expense transactions.
- **Category Management**: Organize your transactions by creating and managing custom categories.
- **Interactive Charts**: Visualize your spending habits with interactive charts.
- **Data Tables**: View and filter your transaction history with robust data tables.
- **Currency Customization**: Select your preferred currency for a personalized experience.
- **Dark & Light Mode**: Switch between themes for your viewing comfort.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: PostgreSQL (via [Prisma](https://www.prisma.io/))
- **Authentication**: [Better Auth](https://better-auth.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Charting**: [Recharts](https://recharts.org/)
- **Form Management**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or newer)
- [pnpm](https://pnpm.io/installation) (or npm/yarn)
- A PostgreSQL database

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/AdityaZxxx/budget-tracker.git
    cd budget-tracker
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**

    Create a `.env` file in the root of your project and add the following variables. You can copy the `.env.example` file.

    ```env
    BETTER_AUTH_SECRET=
    BETTER_AUTH_URL=http://localhost:3000

    GOOGLE_CLIENT_ID=
    GOOGLE_CLIENT_SECRET=

    POSTGRES_PRISMA_URL=
    POSTGRES_URL_NON_POOLING=
    ```

    Generate a secret with `openssl rand -base64 32`.

    For Google sign-in, create an OAuth client in the
    [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
    and add the authorized redirect URI:

    ```txt
    http://localhost:3000/api/auth/callback/google
    https://your-production-domain/api/auth/callback/google
    ```

4.  **Run database migrations:**

    This will sync your database schema with the Prisma schema.

    ```bash
    npx prisma migrate dev
    ```

5.  **Run the development server:**
    ```bash
    pnpm dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
