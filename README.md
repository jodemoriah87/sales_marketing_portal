# Tiffany Diamond Hotels · Sales Portal

## 1. Appwrite tables (Database → your database)
Create 3 tables. Table ID = name below. Turn **Row security ON** and give table permission **Create → Users** only.
Every column is a string (size 255) unless stated.

- `visitors`: date, company, contact, phone, category, created_by
- `route_stops`: date, company, area, time, status, created_by
- `appointments`: type, date, time, company, accompanied_by, reminder, created_by

## 2. Admin
Auth → Users → open the admin user → Labels → add `admin`. Admins see all rows; sales users see only their own.

## 3. Deploy
Put `tiffany-logo-ltd.png` in `public/`. Push to GitHub. In your Appwrite Site settings add the 3 variables from `.env.example`
(framework: Vite, build `npm run build`, output `dist`). Add your site domain under Project → Platforms (Web).
