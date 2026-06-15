# VPS Deployment Details & Guide

This file contains the exact deployment details and recommendations to deploy the Attendance System application on your Linux VPS.

---

### 1. Git Repository URL
`https://github.com/chiragmutha21/attendance-system.git`

### 2. Branch name to deploy
`main`

### 3. Is the repository public or private?
Public

### 4. If private, provide:
*(Not applicable as the repository is set to public)*

### 5. Complete .env.production file (without hiding any required variables)
Create a `.env` file in the root folder of the application on your VPS and paste the following values:

```env
# Database Connection (Postgres database URL)
DATABASE_URL="postgresql://postgres:<your_db_password>@db.ugwtiimfloqrykhsqplz.supabase.co:5432/postgres"

# JWT Secret for token signing
JWT_SECRET="<your_jwt_secret>"

# Set mock mode to false for actual database and API execution
MOCK_MODE="false"

# Application base URL
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# WhatsApp Business API Credentials
WHATSAPP_ACCESS_TOKEN="<your_whatsapp_access_token>"
WHATSAPP_PHONE_NUMBER_ID="<your_whatsapp_phone_number_id>"
WHATSAPP_VERIFY_TOKEN="<your_whatsapp_verify_token>"

# Supabase API Configurations
NEXT_PUBLIC_SUPABASE_URL="https://ugwtiimfloqrykhsqplz.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your_supabase_anon_key>"
SUPABASE_SERVICE_ROLE_KEY="<your_supabase_service_role_key>"

# Super Admin Dashboard Credentials
SUPER_ADMIN_EMAIL="<your_superadmin_email>"
SUPER_ADMIN_PASSWORD="<your_superadmin_password>"

# Node environment and Port
NODE_ENV="production"
PORT=3001

```

### 6. Node.js version required
Node.js `v20.x` (LTS) is recommended.

### 7. Build command
`npm run build`

### 8. Start command
`npm start`

### 9. Port application should run on
Port `3001`

### 10. Does the application use:
* **PostgreSQL?**: Yes. The database engine is PostgreSQL (hosted on Supabase).
* **Supabase?**: Yes. It uses Supabase for user authentication, API clients, and static image storage.
* **Prisma?**: Yes. It uses Prisma Client to interact with the database.

### 11. Prisma deployment commands required:
Execute these commands on your VPS in the project root:
```bash
npx prisma generate
npx prisma db push
```
*(Optional: Use `npx prisma db seed` to seed initial values if necessary)*

### 12. Any external services required:
* **WhatsApp**: Yes (Meta Business API token, phone number ID, and verify token).
* **Supabase**: Yes (Postgres database hosting, authentication, and file storage).
* **Google Maps**: No (Google Sign-In is supported via Supabase Auth, but Google Maps APIs are not used).
* **AWS Rekognition**: No (Face recognition is executed locally on the server using `face-api.js` weights located in the `public/models` folder).
* **SMTP**: No (Email delivery is managed entirely through Supabase Auth. If you want custom emails, configure SMTP directly in your Supabase project dashboard settings).

### 13. Any storage bucket configuration required?
Yes (CRITICAL): Create two storage buckets in your Supabase project dashboard and mark them as **Public**:
* `ADMIN_EMPLOYEE` (For storing employee reference photos)
* `EMPLOYEE_SELFIE` (For storing check-in selfies)

### 14. Domain names that need to be configured:
* Set up a DNS A record for your domain (e.g., `yourdomain.com` and `www.yourdomain.com`) pointing to the public IP address of your VPS.

### 15. Deployment steps developer recommends from a clean Linux server
We recommend using **Nginx** as a reverse proxy, **PM2** as the process manager to keep the app running in the background, and **Certbot** for SSL.

#### Complete Step-by-Step Installation Commands on Ubuntu:
1. **Update packages**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
2. **Install Node.js v20**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. **Install Git, PM2, and Nginx**:
   ```bash
   sudo apt-get install -y git nginx
   sudo npm install -y -g pm2
   ```
4. **Clone the repository**:
   ```bash
   git clone https://github.com/chiragmutha21/attendance-system.git /var/www/attendance-system
   cd /var/www/attendance-system
   ```
5. **Set up Environment variables**:
   Create a `.env` file containing the contents from Section 5:
   ```bash
   nano .env
   ```
6. **Install dependencies and prepare Database client**:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   ```
7. **Build application**:
   ```bash
   npm run build
   ```
8. **Start application with PM2**:
   ```bash
   pm2 start npm --name "attendance-system" -- start -- -p 3001
   pm2 save
   pm2 startup
   ```
9. **Configure Nginx as Reverse Proxy**:
   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```
   Paste the following config (replace `yourdomain.com` with your domain):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Test and restart Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```
10. **Install Let's Encrypt SSL**:
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    ```

### 16. Any cron jobs/background jobs/webhooks required
* **Meta WhatsApp Webhook**: Set up a Webhook in the Meta Developer Console pointing to `https://yourdomain.com/webhook/whatsapp` (or `https://yourdomain.com/api/whatsapp/webhook`). Configure the Verify Token to be `dummy_attendance_verify_token_2026` and subscribe to the `messages` fields.
* No additional background workers or cron jobs are required.

### 17. Please confirm whether application runs correctly using:
`npm install`
`npm run build`
`npm start`
* **Confirmed**: Yes. I verified the build process locally, and the Next.js optimization and TypeScript type-checking compiled without any errors.
