# 🦸‍♂️ Community Hero

**Empowering citizens. Upgrading cities.**

Community Hero is a full-stack smart city infrastructure reporting platform. It empowers citizens to report public issues (like potholes, broken streetlights, or water leaks) and routes them automatically to the correct municipal authorities using dynamic geographical routing and AI-powered verification.

---

## ✨ Key Features

*   🌍 **Multi-Tenant Geographic Routing:** Uses the OpenStreetMap Nominatim API on the backend to automatically detect the city based on GPS coordinates. Issues are securely assigned to specific municipal admins, ensuring efficient local governance.
*   🤖 **AI-Powered Image Verification:** Integrates Google Gemini to analyze uploaded photos, automatically categorizing the issue and assessing its severity in real-time.
*   🛡️ **Sybil Protection & Anti-Spam:** Employs a community-driven upvote system. Issues must reach a threshold of verified community upvotes before their status progresses to 'Pending', protecting the system from spam and duplicate reports.
*   🔐 **Role-Based Access Control (RBAC):** Distinct, secure dashboards for 'Citizens' and 'Admins'. Admin views are geographically isolated, meaning officials only see issues within their specific jurisdiction.
*   🌐 **Multilingual Support:** Built-in internationalization (i18n) to ensure accessibility across diverse communities.

## 🛠️ Tech Stack

*   **Frontend:** React.js, Vite, TypeScript, Tailwind CSS
*   **Backend:** Node.js, Express, TypeScript, JWT Authentication
*   **Database:** MySQL (Configured for Aiven Cloud)
*   **APIs & Integrations:** 
    *   Google Gemini API (Image Analysis)
    *   OpenStreetMap Nominatim (Reverse Geocoding)

## 🚀 Local Setup & Installation

Follow these steps to get the project running on your local machine.

### 1. Clone the repository
```bash
git clone <repository-url>
cd community-hero
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory and add the necessary variables. See the table below for requirements.

### 4. Run the Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## 🔑 Environment Variables

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | MySQL connection string (e.g., Aiven Cloud URL). |
| `JWT_SECRET` | Secret key used for signing JWT authentication tokens. |
| `GEMINI_API_KEY` | API key for Google Gemini to enable AI image verification. |

*(Note: Never commit your actual `.env` file to version control. Use a `.env.example` as a template).*

---

## 🏆 Hackathon Notes / Why It Stands Out

*   **API-First Security:** The frontend provides immediate visual feedback, but the backend securely recalculates and verifies geographical zones to prevent payload spoofing.
*   **Automated Triage:** By combining AI image analysis with community upvoting, the platform drastically reduces the manual triage burden on city officials.
*   **Production-Ready Architecture:** Implements standard JWT authentication, robust error handling, and strict Privilege Separation (RBAC) ensuring a secure, scalable foundation.
*   **Real-World Applicability:** Solves a tangible, universal problem (infrastructure maintenance) with modern, accessible technology.
