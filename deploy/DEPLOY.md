# Deploying to the Hostinger VPS

Setup from the proposal: **NGINX** serves the React build and forwards `/api` to **Express**, which **PM2** keeps running. **MySQL/MariaDB** runs on the same VPS.

```
browser ──► NGINX :80/:443 ──┬── /            → client/dist (React build)
                             └── /api/*       → Express :3000 (PM2) ──► MariaDB :3306
```

## 1. One-time server setup (as root or with sudo)

```bash
apt update && apt install -y nginx mariadb-server git
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
npm install -g pm2
mysql_secure_installation
```

## 2. Database

```bash
mysql -u root -p
```
```sql
CREATE USER 'portal_user'@'localhost' IDENTIFIED BY '<a long random password>';
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_portal.* TO 'portal_user'@'localhost';
```
```bash
mysql -u root -p < db/schema.sql      # creates the database and the 7 tables
```

The app user only gets `SELECT/INSERT/UPDATE/DELETE`, so it can't drop or change tables.

## 3. Code and config

```bash
git clone https://github.com/Pedriux0/inventory-ordering-portal.git /var/www/inventory-portal
cd /var/www/inventory-portal
npm ci --omit=dev
cp .env.example .env    # fill in DB_PASSWORD and a NEW JWT_SECRET (never reuse the dev one)
                        # and set HOST=127.0.0.1 so the API is only reachable through NGINX
chmod 600 .env

cd client && npm ci && npm run build && cd ..
```

**Don't run `npm run seed` on the server.** The demo passwords are public in the repo. Create the first Admin account by hand instead (see step 6).

## 4. Start the API with PM2

```bash
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup      # prints a command; run it so PM2 starts again after a reboot
curl localhost:3000/api/health     # → {"status":"ok"}
```

## 5. NGINX and HTTPS

```bash
cp deploy/nginx.conf /etc/nginx/sites-available/inventory-portal
# edit the file and replace YOUR_DOMAIN
ln -s /etc/nginx/sites-available/inventory-portal /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

apt install -y certbot python3-certbot-nginx
certbot --nginx -d YOUR_DOMAIN       # adds HTTPS and auto-renewal
```

Only expose ports 22, 80 and 443 (`ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable`). Ports 3000 and 3306 stay private.

## 6. First Admin account

```bash
cd /var/www/inventory-portal
node -e "require('./src/utils/password').hashPassword(process.argv[1]).then(console.log)" '<StrongAdminPassword16+>'
mysql -u root -p inventory_portal -e \
  "INSERT INTO users (full_name, email, password_hash, role) VALUES ('Your Name', 'you@example.com', '<hash from above>', 'Admin');"
```

After that, the Admin creates the other accounts through `POST /api/users`.

## Updating later

If the new version adds tables, run its migration once before restarting. For example, v2.2.0 needs:

```bash
mysql inventory_portal < db/migrations/001_purchase_requests.sql
```


```bash
cd /var/www/inventory-portal && git pull
npm ci --omit=dev && (cd client && npm ci && npm run build)
pm2 restart inventory-portal-api
```
