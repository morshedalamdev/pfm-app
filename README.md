# 💰 Personal Finance Management App

A full-stack personal finance tracker that helps users monitor income, expenses, and savings with insightful reports and analytics.

## 🚀 Live Demo

- **Frontend**: [https://pfm.morshedalam.dev](https://pfm.morshedalam.dev)
- **API**:  Hosted on Netlify

## 📋 Features

- ✅ Track income and expenses with custom categories
- ✅ Set and monitor savings goals with visual progress
- ✅ Create and manage monthly budgets
- ✅ Generate financial reports with interactive charts
- ✅ Automated recurring transaction management
- ✅ Multi-period analysis (daily/weekly/monthly/yearly)
- ✅ Secure JWT authentication with bcrypt encryption
- ✅ Fully responsive design optimized for mobile and desktop
- ✅ File upload support for receipts and documents
- ✅ Email notifications for important events
- ✅ Real-time data synchronization

## 🛠️ Tech Stack

### Frontend (Client)
- **Framework**: Next.js 16.1.1
- **Language**: TypeScript 5
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4.1.18
- **State Management**: Zustand 5.0.9
- **Validation**:  Zod 4.3.4
- **HTTP Client**: Axios 1.13.2
- **Date Handling**: date-fns 4.1.0
- **Icons**:  Lucide React 0.562.0
- **Utilities**: clsx, tailwind-merge, class-variance-authority

### Backend (Server)
- **Runtime**: Node.js
- **Framework**: Express. js 5.2.1
- **Language**: TypeScript 5.9.3
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma 7.2.0
- **Authentication**: JWT (jsonwebtoken 9.0.3 + jose 6.1.3)
- **Password Hashing**: bcrypt 6.0.0
- **Validation**:  Zod 4.3.4 + express-validator 7.3.1
- **Security**: Helmet 8.1.0, CORS 2.8.5, express-rate-limit 8.2.1
- **File Upload**:  Multer 2.0.2 + Cloudinary 2.8.0
- **Email**: Nodemailer 7.0.12
- **Job Scheduling**: node-cron 4.2.1
- **Logging**: Winston 3.19.0 + Morgan 1.10.1
- **Performance**:  Compression 1.8.1

## 📁 Project Structure

```
pfm-app/
├── client/                   # Frontend (Next.js)
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Authentication routes
│   │   ├── (dashboard)/     # Dashboard routes
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── favicon.ico      # App icon
│   ├── assets/              # Static assets (images, icons)
│   ├── fonts/               # Custom fonts
│   ├── lib/                 # Utilities and helpers
│   │   └── utils.ts         # Utility functions
│   ├── components. json      # shadcn/ui configuration
│   ├── next.config.ts       # Next.js configuration
│   ├── postcss.config.mjs   # PostCSS configuration
│   ├── tsconfig.json        # TypeScript configuration
│   └── package.json         # Frontend dependencies
│
├── server/                   # Backend (Express)
│   ├── server.ts            # Server entry point
│   ├── tsconfig.json        # TypeScript configuration
│   └── package.json         # Backend dependencies
│
├── . gitignore
├── . gitattributes
└── README.md
```

## 🔧 Prerequisites

Before running this application, ensure you have: 

- **Node.js**:  v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes with Node.js)
- **PostgreSQL**: Local instance or [Neon](https://neon.tech) account
- **Git**: For cloning the repository

## 🚀 Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/morshedalamdev/pfm-app.git
cd pfm-app
```

---

## 🖥️ Backend Setup (Server)

### Navigate to Server Directory

```bash
cd server
```

### Install Dependencies

```bash
npm install
```

### Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production build
npm run build

# Production mode
npm start
```

Backend API runs at: **http://localhost:5000**

---

## 🎨 Frontend Setup (Client)

### Navigate to Client Directory

Open a **new terminal** window: 

```bash
cd client
```

### Install Dependencies

```bash
npm install
```

### Start Frontend Development Server

```bash
# Development mode
npm run dev

# Production build
npm run build

# Production mode
npm start
```

Frontend runs at: **http://localhost:3000**

---

## 🎯 Running Both Servers

### Option 1: Multiple Terminals

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### Option 2: Using Concurrently (Root Level)

Install concurrently in project root:

```bash
# In pfm-app root directory
npm init -y
npm install concurrently --save-dev
```

Add scripts to root `package.json`:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix server\" \"npm run dev --prefix client\"",
    "dev:server": "npm run dev --prefix server",
    "dev:client": "npm run dev --prefix client",
    "build":  "concurrently \"npm run build --prefix server\" \"npm run build --prefix client\"",
    "start": "concurrently \"npm start --prefix server\" \"npm start --prefix client\""
  }
}
```

Then run from root: 

```bash
npm run dev
```

---

## 📝 Available Scripts

### Server Scripts

```bash
npm run dev                # Start development server with ts-node-dev
npm run build              # Compile TypeScript to JavaScript
npm start                  # Start production server
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run database migrations
npm run prisma:studio      # Open Prisma Studio GUI
npm test                   # Run tests in watch mode
npm run test:ci            # Run tests once (CI environment)
```

### Client Scripts

```bash
npm run dev          # Start Next.js development server
npm run build        # Build optimized production bundle
npm start            # Start Next.js production server
```

---

## 🔒 Security Features

- ✅ **JWT Authentication**: Secure token-based authentication with jose and jsonwebtoken
- ✅ **Password Hashing**: bcrypt with salt rounds for secure password storage
- ✅ **Rate Limiting**: express-rate-limit to prevent API abuse
- ✅ **CORS Protection**: Configured CORS for allowed origins
- ✅ **Helmet**: Security headers for Express. js
- ✅ **Input Validation**: Zod schemas and express-validator
- ✅ **SQL Injection Prevention**: Prisma ORM with parameterized queries
- ✅ **XSS Protection**: Sanitized inputs and outputs
- ✅ **Cookie Security**: Secure cookie-parser configuration

---

## 📄 License

This project is licensed under the ISC License.

---

## 👤 Author

**Morshed Alam**

- Website: [morshedalam.dev](https://morshedalam.dev)
- GitHub: [@morshedalamdev](https://github.com/morshedalamdev)
- Project:  [pfm. morshedalam.dev](https://pfm.morshedalam.dev)

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React Framework
- [Express.js](https://expressjs.com/) - Backend Framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Zustand](https://docs.pmnd.rs/zustand) - State Management
- [Vercel](https://vercel.com/) - Frontend Hosting
- [Netlify](https://www.netlify.com/) - Backend Hosting
- [Cloudinary](https://cloudinary.com/) - Media Management

---

## 📞 Support

For issues, questions, or suggestions: 

- 📧 Email: Contact via [morshedalam.dev](https://morshedalam.dev)
- 🐛 Issues: [GitHub Issues](https://github.com/morshedalamdev/pfm-app/issues)
- 📖 Docs: Check this README and inline code comments

---

## 🌟 Star History

If you find this project useful, please consider giving it a ⭐ on GitHub! 

---

**Made with ❤️ by Morshed Alam**
