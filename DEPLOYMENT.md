# 🚀 Deployment Guide – Scravagghi Server

Guida completa per il deploy del server Node.js su Railway (consigliato) o alternative.

---

## 🎯 Overview

Il server Scravagghi gestisce:
- WebSocket (game relay)
- REST API (auth, tourneys, replays)
- PostgreSQL (database)
- Stripe (payments)
- S3/R2 (replay storage)

---

## 📋 Prerequisites

- **Node.js** 18+ LTS
- **PostgreSQL** 14+
- **Stripe Account** (per monetizzazione)
- **Cloudflare R2** o AWS S3 (per replay)
- **Domain** (opzionale, consigliato)

---

## 🔧 Configurazione Locale

### 1. Clone Repository

```bash
git clone https://github.com/your-username/scravagghi.git
cd scravagghi/server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Crea `.env`:

```bash
# Server
NODE_ENV=development
PORT=3000
WS_PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/scravagghi

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_PREMIUM_PLUS_PRICE_ID=price_...

# Storage (Cloudflare R2 or S3)
STORAGE_TYPE=r2  # or 's3'
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=scravagghi-replays

# OR for AWS S3
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=scravagghi-replays

# URLs
APP_URL=http://localhost:8080
CDN_URL=https://replays.scravagghi.com

# Client version control
REQUIRED_CLIENT_VERSION=1.0.0
```

### 4. Database Setup

```bash
# Create database
createdb scravagghi

# Run migrations
npm run migrate

# Or manually
psql scravagghi < ../database/schema.sql
```

### 5. Local Development

```bash
# Start server con hot reload
npm run dev

# Or production mode
npm start
```

Server disponibile su:
- HTTP API: `http://localhost:3000`
- WebSocket: `ws://localhost:3001`

---

## ☁️ Deploy su Railway (Consigliato)

### Why Railway?

- ✅ PostgreSQL incluso
- ✅ Auto-deploy da Git
- ✅ Environment variables facili
- ✅ Logs integrati
- ✅ €5/mese startup plan

### Step-by-Step

#### 1. Create Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Init project
railway init
```

#### 2. Add PostgreSQL

```bash
railway add postgresql
```

Railway genera automaticamente `DATABASE_URL`.

#### 3. Configure Environment

Nel dashboard Railway, aggiungi variabili:

```
NODE_ENV=production
JWT_SECRET=<genera con: openssl rand -base64 32>
STRIPE_SECRET_KEY=<your key>
R2_ACCESS_KEY_ID=<your key>
R2_SECRET_ACCESS_KEY=<your secret>
R2_BUCKET_NAME=scravagghi-replays
REQUIRED_CLIENT_VERSION=1.0.0
```

#### 4. Deploy

```bash
railway up
```

Railway:
1. Rileva Node.js
2. Esegue `npm install`
3. Esegue `npm start`
4. Genera URL pubblico

#### 5. Run Migrations

```bash
railway run npm run migrate
```

#### 6. Custom Domain (opzionale)

Nel dashboard Railway:
- Settings → Domains
- Add custom domain: `api.scravagghi.com`
- Configure DNS CNAME

---

## 🐳 Deploy con Docker

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start
CMD ["node", "src/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/scravagghi
      - JWT_SECRET=${JWT_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    depends_on:
      - db

  db:
    image: postgres:14-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    environment:
      - POSTGRES_DB=scravagghi
      - POSTGRES_PASSWORD=password

volumes:
  postgres_data:
```

### Deploy

```bash
docker-compose up -d
```

---

## 🌐 Alternative Platforms

### Render.com

**Pros:**
- Free tier disponibile
- PostgreSQL managed
- Auto-deploy da GitHub

**Setup:**

1. Crea nuovo Web Service
2. Connect GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add PostgreSQL database
6. Configure env vars

**Costo:** €7/mese (Starter)

### Fly.io

**Pros:**
- Edge deployment (bassa latenza)
- PostgreSQL incluso
- WebSocket support ottimo

**Setup:**

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch app
fly launch

# Add PostgreSQL
fly postgres create

# Deploy
fly deploy
```

**Costo:** €5-10/mese

### Heroku

**Pros:**
- Mature platform
- Add-ons ecosystem

**Cons:**
- Più costoso (~$25/mese)
- No free tier

```bash
heroku create scravagghi-server
heroku addons:create heroku-postgresql:mini
git push heroku main
```

---

## 📦 Cloudflare R2 Setup (Replay Storage)

### Why R2?

- ✅ S3-compatible API
- ✅ €0.015/GB/mese (10x cheaper than S3)
- ✅ Zero egress fees
- ✅ Perfetto per replay (read-heavy)

### Setup

1. **Create R2 Bucket**

```bash
# Via Cloudflare Dashboard
Cloudflare Dashboard → R2 → Create Bucket
Name: scravagghi-replays
```

2. **Generate API Keys**

```
R2 → Manage R2 API Tokens → Create API Token
Permissions: Read & Write
```

3. **Configure Server**

```javascript
// server/src/storage/r2.js

const { S3Client } = require('@aws-sdk/client-s3');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});
```

4. **Public Access (opzionale)**

Per replay pubblici, configura Custom Domain su R2:
```
R2 Bucket → Settings → Public Access → Add Custom Domain
Domain: replays.scravagghi.com
```

---

## 🔐 Stripe Webhook Setup

### Local Testing (con Stripe CLI)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test webhook
stripe trigger payment_intent.succeeded
```

### Production Setup

1. **Stripe Dashboard** → Developers → Webhooks
2. Add endpoint: `https://api.scravagghi.com/api/webhooks/stripe`
3. Select events:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. Copy **Signing Secret** → `.env` come `STRIPE_WEBHOOK_SECRET`

### Verify in Code

```javascript
// server/src/api/webhooks.js

app.post('/api/webhooks/stripe',
  express.raw({type: 'application/json'}),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      // Handle event
      await handleStripeEvent(event);

      res.json({received: true});
    } catch (err) {
      console.error('Webhook error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);
```

---

## 🔍 Monitoring & Logging

### Logging (Winston)

```javascript
// server/src/utils/logger.js

const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({stack: true}),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({filename: 'error.log', level: 'error'}),
    new winston.transports.File({filename: 'combined.log'}),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

### Health Check Endpoint

```javascript
// server/src/api/health.js

app.get('/health', async (req, res) => {
  try {
    // Check database
    await db.query('SELECT 1');

    // Check Redis (se usato)
    // await redis.ping();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Error Tracking (Sentry)

```bash
npm install @sentry/node
```

```javascript
// server/src/index.js

const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Error handler
app.use(Sentry.Handlers.errorHandler());
```

---

## 📊 Performance Optimization

### Database Connection Pooling

```javascript
// server/src/database/pool.js

const {Pool} = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

module.exports = pool;
```

### Database Indexing

Assicurati che `schema.sql` includa tutti gli indici necessari:

```sql
-- Critici per performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_games_ended_at ON games(ended_at DESC);
CREATE INDEX idx_replay_access_user ON replay_access(user_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
```

### Redis Caching (opzionale)

Per scalare oltre 1000 concurrent users:

```bash
npm install redis
```

```javascript
const redis = require('redis');
const client = redis.createClient({url: process.env.REDIS_URL});

// Cache user sessions
await client.setEx(`user:${userId}`, 3600, JSON.stringify(userData));

// Cache leaderboard
await client.setEx('leaderboard', 300, JSON.stringify(leaderboardData));
```

---

## 🔒 Security Checklist

### Production Environment

- [ ] `NODE_ENV=production`
- [ ] Unique `JWT_SECRET` (min 32 caratteri)
- [ ] HTTPS obbligatorio
- [ ] CORS configurato correttamente
- [ ] Rate limiting attivo
- [ ] Helmet.js installato
- [ ] SQL injection prevention (parametrized queries)
- [ ] XSS prevention (sanitize input)
- [ ] Secrets in environment variables (non committed)

### Example Security Setup

```javascript
// server/src/index.js

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// Helmet
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // max 100 requests per window
});

app.use('/api/', limiter);

// Stricter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5
});

app.use('/api/auth/', authLimiter);
```

---

## 🧪 Testing Deployment

### Local Test

```bash
# Test REST API
curl http://localhost:3000/health

# Test WebSocket
wscat -c ws://localhost:3001

# Send test message
{"type":"ping"}
```

### Production Test

```bash
# Health check
curl https://api.scravagghi.com/health

# Test auth
curl -X POST https://api.scravagghi.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# Test WebSocket
wscat -c wss://api.scravagghi.com
```

---

## 📈 Scaling Strategy

### Vertical Scaling

Railway/Render permettono upgrade risorse:

| Users | RAM | CPU | Database | Cost |
|-------|-----|-----|----------|------|
| 0-500 | 512MB | 0.5 | 1GB | €5/mo |
| 500-2000 | 1GB | 1 | 5GB | €15/mo |
| 2000-5000 | 2GB | 2 | 10GB | €30/mo |

### Horizontal Scaling

Per > 5000 users, considera:

1. **Multiple server instances**
```
Load Balancer
  ├── Server 1 (games 1-1000)
  ├── Server 2 (games 1001-2000)
  └── Server 3 (games 2001-3000)
```

2. **Redis pub/sub** per comunicazione cross-server

3. **Database read replicas** per query pesanti

---

## 🚨 Backup Strategy

### Database Backups

Railway/Render hanno backup automatici, ma aggiungi:

```bash
# Cron job backup giornaliero
0 2 * * * pg_dump $DATABASE_URL | gzip > backups/db-$(date +\%Y\%m\%d).sql.gz

# Retention: 30 giorni
find backups/ -name "db-*.sql.gz" -mtime +30 -delete
```

### Replay Storage

R2/S3 hanno versioning integrato. Abilita:

```
Bucket Settings → Versioning → Enable
```

---

## 📌 Troubleshooting

### Server non parte

```bash
# Check logs
railway logs

# Or Docker
docker logs scravagghi-app

# Common issues:
# - DATABASE_URL non configurato
# - Porta già in uso
# - Missing dependencies
```

### WebSocket disconnections

```javascript
// Implement reconnection logic client-side
const connectWithRetry = () => {
  ws = new WebSocket(WS_URL);

  ws.onclose = () => {
    setTimeout(connectWithRetry, 3000);
  };
};
```

### Database slow queries

```sql
-- Enable query logging
ALTER DATABASE scravagghi SET log_min_duration_statement = 1000; -- log queries > 1s

-- Find slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## ✅ Post-Deployment Checklist

- [ ] Server risponde su `/health`
- [ ] Database accessible
- [ ] WebSocket funzionante
- [ ] Stripe webhooks configurati
- [ ] R2/S3 upload funziona
- [ ] SSL certificate valido
- [ ] Logs visibili
- [ ] Backup configurati
- [ ] Monitoring attivo
- [ ] Client può connettersi

---

**Pronto per il lancio! 🚀**

Per supporto: [GitHub Issues](https://github.com/your-username/scravagghi/issues)
