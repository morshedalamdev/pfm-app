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
- **Framework**: Next.js
- **Language**: TypeScript
- **UI Library**: React
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Validation**:  Zod
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Icons**:  Lucide React
- **Utilities**: clsx, tailwind-merge, class-variance-authority

### Backend (Server)
- **Runtime**: Node.js
- **Framework**: Nest.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: TypeORM
- **Authentication**: JWT
- **Password Hashing**: bcrypt
- **Validation**: Class validatior, class-transformer
- **Testing**: Jest
- **Security**: Helmet, CORS
- **File Upload**:  Multer + Cloudinary
- **Email**: Nodemailer
- **Job Scheduling**: node-cron
- **Logging**: Winston + Morgan
- **Performance**:  Compression

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

Backend API runs at: **http://localhost:5000/v[]/**

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
