# 💰 Monetization Strategy – Scravagghi

Sistema completo di monetizzazione con abbonamenti, tornei a pagamento e replay premium.

---

## 🎯 Modello di Business

### Free-to-Play con Premium Tiers

- **Base gratuita** solid per attirare utenti
- **Premium tiers** per feature avanzate
- **Pay-per-view** per contenuti speciali
- **Tornei a pagamento** con prize pool

---

## 💳 Tier Utenti

### FREE (Gratuito)

**Gameplay:**
- ✅ Partite casual illimitate
- ✅ Partite ranked (con limitazioni)
- ✅ Mappe base (3-5)
- ✅ Armi standard
- ✅ Sound pack default

**Replay:**
- ❌ Nessun accesso replay
- ❌ No download
- ❌ No clip

**Monetizzazione:**
- Ads banner (opzionale)
- Upsell a Premium

**Target:** giocatori casuali, trial users

---

### PREMIUM - €4.99/mese

**Gameplay:**
- ✅ Tutto del tier Free
- ✅ Tutte le mappe
- ✅ Matchmaking prioritario
- ✅ Ranked completo
- ✅ Lobby private

**Replay & Stats:**
- ✅ Replay partite proprie (30 giorni)
- ✅ Download replay (.json)
- ✅ Statistiche avanzate
- ✅ Match history

**Clip:**
- ✅ Creazione clip (max 60s)
- ✅ Condivisione social
- ✅ Clip pubblici/privati

**Audio:**
- ✅ Custom sound pack (upload personale)
- ✅ Accesso sound pack community

**Tornei:**
- ✅ Tornei gratuiti premium-only
- ✅ Accesso tornei a pagamento

**Vantaggi Extra:**
- Badge "Premium" in-game
- Priorità supporto
- No ads

**Target:** giocatori regolari, creatori di contenuti

---

### PREMIUM+ - €6.99/mese (o +€2 addon)

**Include tutto Premium +:**

**Replay Avanzato:**
- ✅ Replay storici illimitati (oltre 30 giorni)
- ✅ Replay tornei pubblici
- ✅ Frame-by-frame playback
- ✅ Slow-motion custom (0.1x - 10x)
- ✅ Loop section

**Tutorial & Education:**
- ✅ Creazione tutorial con annotazioni
- ✅ Editor annotazioni completo
- ✅ Pubblicazione tutorial
- ✅ Revenue share tutorial popolari (50%)

**Analytics:**
- ✅ Heatmap impatti
- ✅ Accuracy tracking
- ✅ Weapon effectiveness stats
- ✅ Export dati CSV

**Creator Tools:**
- ✅ Watermark custom su clip
- ✅ Branding personalizzato
- ✅ API access (beta)

**Target:** content creators, coach, giocatori competitivi

---

## 🎬 Sistema Replay Pay-Per-View

### Replay Singoli - €0.50

Per utenti Free/Premium che vogliono vedere **replay specifici** senza abbonamento Premium+.

**Casi d'uso:**
- Finale torneo importante
- Partita storica famosa
- Tutorial specifico

**Implementazione:**
```javascript
// Acquisto da wallet
POST /api/replays/:id/purchase
{
  price: 0.50,
  currency: 'EUR'
}

// Accesso permanente garantito
```

**Revenue split:**
- 70% piattaforma
- 30% creatore torneo (se applicabile)

---

## 🏆 Tornei a Pagamento

### Entry Fee Model

**Esempi di tornei:**

| Torneo | Entry Fee | Max Players | Prize Pool | Platform Cut |
|--------|-----------|-------------|------------|--------------|
| Weekly Cup | €2 | 16 | €22.40 (70%) | €9.60 (30%) |
| Monthly Championship | €5 | 32 | €112 (70%) | €48 (30%) |
| Grand Tournament | €20 | 64 | €896 (70%) | €384 (30%) |

**Prize Distribution (standard):**
- 🥇 1° posto: 50% prize pool
- 🥈 2° posto: 30% prize pool
- 🥉 3° posto: 20% prize pool

**Sicurezza:**
- Entry fee va nel wallet prima del torneo
- Prize distribuito automaticamente dopo conclusione
- Replay torneo automaticamente pubblico

### Tournament Organizer Revenue

Organizzatori tornei possono:
- Impostare entry fee custom
- Ricevere 10% del platform cut
- Monetizzare replay con pay-per-view

**Esempio:**
```
Torneo €5 entry × 32 giocatori = €160 totale
- Prize pool: €112 (70%)
- Platform: €43.20 (27%)
- Organizer: €4.80 (3%)
```

---

## 🎨 Custom Sound Packs Marketplace (Futuro)

### Creator Economy

Premium users possono vendere sound pack personalizzati.

**Prezzi suggeriti:**
- Sound pack base: €1.99
- Sound pack premium: €4.99
- Sound pack celebrity/branded: €9.99

**Revenue split:**
- 70% creator
- 30% piattaforma

**Requisiti creator:**
- Account Premium+
- Minimo 10 file per categoria
- Approvazione qualità

---

## 💸 Wallet System

### Ricarica Wallet

```javascript
POST /api/payment/wallet/deposit
{
  amount: 10.00,
  currency: 'EUR'
}
```

**Bonus ricarica:**
- €10 → €10
- €20 → €21 (+5%)
- €50 → €55 (+10%)
- €100 → €115 (+15%)

### Utilizzo Wallet

- Entry fee tornei
- Replay pay-per-view
- Sound pack marketplace
- Gift ad altri utenti (futuro)

### Prelievo (payout)

Solo per vincite tornei e revenue creator:

```javascript
POST /api/payment/wallet/withdrawal
{
  amount: 50.00,
  method: 'stripe'  // or 'paypal'
}
```

**Limiti:**
- Minimo prelievo: €10
- Fee: 2% + €0.50
- Processing time: 3-5 giorni

---

## 📊 Revenue Projections

### Scenario Conservativo (Anno 1)

| Utenti Attivi | Distribuzione | Revenue Mensile |
|---------------|---------------|-----------------|
| 5,000 Free | 80% | €0 |
| 1,000 Premium | 16% | €4,990 |
| 250 Premium+ | 4% | €1,747.50 |
| **Totale** | **6,250** | **€6,737.50** |

**Aggiungi:**
- Tornei: ~€500/mese (10 tornei × €50 avg cut)
- Replay PPV: ~€200/mese (400 acquisti)
- **Totale Mensile: ~€7,400**
- **Totale Annuale: ~€89,000**

### Scenario Ottimistico (Anno 2)

| Utenti Attivi | Distribuzione | Revenue Mensile |
|---------------|---------------|-----------------|
| 20,000 Free | 75% | €0 |
| 5,000 Premium | 20% | €24,950 |
| 1,250 Premium+ | 5% | €8,737.50 |
| **Totale** | **26,250** | **€33,687.50** |

**Aggiungi:**
- Tornei: ~€3,000/mese
- Replay PPV: ~€800/mese
- Sound Pack Marketplace: ~€1,500/mese
- **Totale Mensile: ~€39,000**
- **Totale Annuale: ~€468,000**

---

## 🔧 Implementazione Tecnica

### Stripe Subscription

```javascript
// Crea subscription Premium
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{
    price: process.env.STRIPE_PREMIUM_PRICE_ID
  }],
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent']
});

// Webhook: rinnovo automatico
stripe.webhooks.on('invoice.payment_succeeded', async (invoice) => {
  const subscription = invoice.subscription;
  const userId = invoice.customer_metadata.userId;

  await db.query(`
    UPDATE users
    SET premium_until = premium_until + INTERVAL '1 month'
    WHERE id = $1
  `, [userId]);
});
```

### Tournament Entry

```javascript
// Pagamento entry fee
router.post('/tournaments/:id/join', requireAuth, async (req, res) => {
  const tournament = await getTournament(req.params.id);
  const user = await getUser(req.user.userId);

  // Check wallet balance
  if (user.wallet_balance < tournament.entry_fee) {
    return res.status(402).json({
      error: 'Insufficient balance',
      required: tournament.entry_fee,
      depositUrl: '/api/payment/wallet/deposit'
    });
  }

  // Deduct entry fee
  await db.query(`
    UPDATE users
    SET wallet_balance = wallet_balance - $1
    WHERE id = $2
  `, [tournament.entry_fee, user.id]);

  // Add to prize pool
  await db.query(`
    UPDATE tournaments
    SET prize_pool = prize_pool + $1
    WHERE id = $2
  `, [tournament.entry_fee * 0.7, tournament.id]);

  // Join tournament
  await joinTournament(tournament.id, user.id);

  res.json({ success: true });
});
```

### Prize Distribution

```javascript
// Automatic payout dopo torneo
async function distributePrizes(tournamentId) {
  const tournament = await getTournament(tournamentId);
  const winners = await getWinners(tournamentId);

  const prizes = {
    1: tournament.prize_pool * 0.5,
    2: tournament.prize_pool * 0.3,
    3: tournament.prize_pool * 0.2
  };

  for (const winner of winners) {
    const prize = prizes[winner.placement];

    // Add to wallet
    await db.query(`
      UPDATE users
      SET wallet_balance = wallet_balance + $1
      WHERE id = $2
    `, [prize, winner.user_id]);

    // Record transaction
    await db.query(`
      INSERT INTO transactions
      (user_id, type, amount, status, related_tournament_id)
      VALUES ($1, 'tournament_prize', $2, 'completed', $3)
    `, [winner.user_id, prize, tournamentId]);

    // Send notification
    await sendPrizeNotification(winner.user_id, prize);
  }
}
```

---

## 🛡️ Compliance & Legal

### GDPR

- Privacy policy completa
- Cookie consent
- Data export on request
- Right to deletion
- Data breach notification

### Payment Compliance

- Stripe gestisce PSD2
- Invoice generation automatica
- Refund policy chiara (14 giorni)
- ToS acceptance esplicita

### Gambling Regulations

⚠️ **Importante:** Tornei a pagamento potrebbero essere considerati gambling in alcune giurisdizioni.

**Strategia sicura:**
1. **Skill-based game**: documentare che vittoria dipende da skill
2. **Transparent prize pool**: 100% entry fee → prize pool
3. **Age restriction**: 18+ con verifica ID per tornei paid
4. **Restricted countries**: bloccare giurisdizioni problematiche

**Alternative più sicure:**
- Premium credit system (no cash out)
- Sponsored prize pool (no player money)
- Charity tournaments

---

## 📈 Growth Strategy

### Acquisition

- **Free tier** attraente per viral growth
- **Referral program**: invita amico → bonus wallet
- **Tutorial gratuiti** per onboarding
- **Streamer partnerships** con codici promo

### Retention

- **Daily challenges** (premium rewards)
- **Seasonal content** (mappe nuove)
- **Leaderboard** con rewards
- **Community events**

### Monetization Optimization

- **A/B test** prezzi tier
- **Limited-time offers** (20% off Premium)
- **Bundle deals** (3 mesi → sconto 15%)
- **Gift subscriptions** per regali

---

## 🎁 Promotional Strategies

### Launch Promotions

- Primi 1000 utenti: 3 mesi Premium gratis
- Early adopter badge permanente
- Torneo inaugurale €1000 prize pool sponsored

### Seasonal Offers

- Black Friday: 40% off annual subscription
- Natale: gift cards Premium
- Summer sale: sound pack bundle

### Influencer Partnerships

- Creator code: 10% recurring commission
- Branded tournament support
- Custom sound pack collaborations

---

## 💡 Future Monetization Ideas

### Year 2+

1. **NFT Collectibles** (scarabei unici, skin)
2. **Battle Pass** stagionale (€9.99)
3. **Betting system** (con credits, non cash)
4. **Merchandise** (t-shirt, stickers)
5. **Mobile app** (iOS/Android premium)
6. **API access** per tool creators (€29/mese)
7. **White-label** per brand partnerships

---

## 📌 Key Metrics to Track

- **Conversion Rate**: Free → Premium (target: 5%)
- **Churn Rate**: cancellazioni (target: < 10%/mese)
- **ARPU**: Average Revenue Per User
- **LTV**: Lifetime Value (target: 3x CAC)
- **Tournament participation**: % utenti attivi
- **Replay engagement**: views, purchases

---

**Il modello è progettato per essere:**
- ✅ Sostenibile economicamente
- ✅ Fair per giocatori free
- ✅ Vantaggioso per premium
- ✅ Scalabile con crescita utenti

---

**Vedi anche:**
- `ARCHITECTURE.md` - Implementazione tecnica
- `DEPLOYMENT.md` - Infrastructure costs
- `REPLAY_SYSTEM.md` - Replay monetization details
