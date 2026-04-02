
# ShowSpot AI: Agentic Ticketing Platform

**ShowSpot AI** is an intelligent, agent-driven movie and event ticketing platform. Unlike traditional booking systems, it utilizes a suite of specialized AI agents to orchestrate the entire user journey—from discovering movies and personalized recommendations to automated seat selection and ticket generation.

🚀 **Live Demo:** [https://agentic-ticketing-platform.vercel.app/](https://www.google.com/search?q=https://agentic-ticketing-platform.vercel.app/)

-----

## 🤖 AI Agent Architecture

The core of ShowSpot AI is a multi-agent system that handles complex logic through natural language and automated workflows:

  * **Orchestrator Agent:** The brain of the system that coordinates communication between all other agents.
  * **Movie Discovery Agent:** Browses the database to find movies based on genres, actors, or themes.
  * **Recommendation Agent:** Analyzes user preferences to suggest tailored content.
  * **Show Selection Agent:** Manages real-time theatre availability and showtime scheduling.
  * **Seat Booking Agent:** Intelligent logic for auto-selecting the best available seats based on user count.
  * **Ticket Agent:** Finalizes transactions and generates digital booking confirmations.

-----

## 🛠️ Tech Stack

### **Frontend**

  * **Framework:** React 19
  * **Configuration:** CRACO (Create React App Configuration Override)
  * **Styling:** Tailwind CSS & Framer Motion (for smooth UI transitions)
  * **Components:** Radix UI primitives & Lucide Icons
  * **Deployment:** Vercel

### **Backend**

  * **Framework:** FastAPI (Python 3.10+)
  * **AI Framework:** LangChain / Google Generative AI (Gemini)
  * **Database:** MongoDB Atlas
  * **Server:** Uvicorn
  * **Deployment:** Render

-----

## ✨ Key Features

  - **Natural Language Booking:** Chat with the AI to find and book movies without navigating complex menus.
  - **Dynamic Seeding:** Built-in administrative endpoints to populate the database with real-time movie and theatre data.
  - **Smart Filters:** Intelligent discovery of concerts and movies across different cities.
  - **Secure Authentication:** Integrated user auth flow for personalized booking histories.
  - **Responsive Design:** A sleek, dark-themed UI optimized for both desktop and mobile devices.

-----

## 📦 Installation & Setup

### **Prerequisites**

  - Node.js (v18+)
  - Python (v3.10+)
  - MongoDB Atlas Account

### **Backend Setup**

1.  Navigate to the backend directory: `cd backend`
2.  Create a virtual environment: `python -m venv venv`
3.  Install dependencies: `pip install -r requirements.txt`
4.  Set up your `.env` file:
    ```env
    MONGO_URL=your_mongodb_uri
    GOOGLE_API_KEY=your_gemini_api_key
    JWT_SECRET=your_secret_key
    ```
5.  Run the server: `uvicorn server:app --reload`

### **Frontend Setup**

1.  Navigate to the frontend directory: `cd frontend`
2.  Install dependencies: `yarn install`
3.  Set up your `.env` file:
    ```env
    REACT_APP_API_URL=http://localhost:8000
    ```
4.  Start the development server: `yarn start`

-----

## 🌐 Deployment Configuration

### **Vercel (Frontend)**

  - **Root Directory:** `frontend`
  - **Build Command:** `yarn build`
  - **Output Directory:** `build`
  - **Framework Preset:** Create React App

### **Render (Backend)**

  - **Root Directory:** `backend`
  - **Build Command:** `pip install -r requirements.txt`
  - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
  - **CORS:** Ensure `CORS_ORIGINS` includes your Vercel deployment URL.

-----

**Developed by [Lalith Kumar MVSK](lalithkumar-1612-portfolio.vercel.app)**
