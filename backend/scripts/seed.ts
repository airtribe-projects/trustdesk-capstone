import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const DATA_DIR = path.resolve(__dirname, '../../data');
const KB_DIR = path.join(DATA_DIR, 'knowledge_base');

const KB_IDS: Record<string, string> = {
  'refund_policy.md': 'KB-REFUND-001',
  'shipping_policy.md': 'KB-SHIPPING-001',
  'warranty_policy.md': 'KB-WARRANTY-001',
  'billing_policy.md': 'KB-BILLING-001',
  'account_security_policy.md': 'KB-ACCOUNT-001',
  'support_security_playbook.md': 'KB-SECURITY-001',
  'coupon_policy.md': 'KB-COUPON-001',
  'adversarial_vendor_note.md': 'KB-ADVERSARIAL-001',
};

const KB_CATEGORIES: Record<string, string> = {
  'KB-REFUND-001': 'refund',
  'KB-SHIPPING-001': 'shipping',
  'KB-WARRANTY-001': 'warranty',
  'KB-BILLING-001': 'billing',
  'KB-ACCOUNT-001': 'account_security',
  'KB-SECURITY-001': 'security',
  'KB-COUPON-001': 'general',
  'KB-ADVERSARIAL-001': 'adversarial',
};

function extractTitle(content: string, filename: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      return trimmed.replace(/^#+\s*/, '');
    }
  }
  return filename.replace('.md', '').replace(/_/g, ' ');
}

async function main() {
  console.log('🌱 Seeding TrustDesk database...');

  // ---- Users ----
  const demoEmail = process.env.DEMO_USER_EMAIL || 'agent@trustdesk.com';
  const demoPassword = process.env.DEMO_USER_PASSWORD || 'trustdesk123';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  await prisma.user.upsert({
    where: { email: demoEmail },
    create: { email: demoEmail, passwordHash, role: 'support_agent' },
    update: { passwordHash, role: 'support_agent' },
  });

  await prisma.user.upsert({
    where: { email: 'manager@trustdesk.com' },
    create: { email: 'manager@trustdesk.com', passwordHash: await bcrypt.hash('manager123', 10), role: 'support_manager' },
    update: {},
  });

  console.log('✅ Users seeded');

  // ---- Customers ----
  const customersRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'customers.json'), 'utf8'));
  for (const c of customersRaw) {
    await prisma.customer.upsert({
      where: { id: c.customer_id },
      create: {
        id: c.customer_id,
        name: c.name,
        email: c.email,
        tier: c.tier || 'standard',
        country: c.country || 'IN',
        verified: c.verified || false,
        tags: JSON.stringify(c.tags || []),
        createdAt: new Date(c.created_at),
      },
      update: {
        name: c.name,
        email: c.email,
        tier: c.tier || 'standard',
        country: c.country || 'IN',
        verified: c.verified || false,
        tags: JSON.stringify(c.tags || []),
      },
    });
  }
  console.log(`✅ ${customersRaw.length} customers seeded`);

  // ---- Orders ----
  const ordersRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'orders.json'), 'utf8'));
  for (const o of ordersRaw) {
    await prisma.order.upsert({
      where: { id: o.order_id },
      create: {
        id: o.order_id,
        customerId: o.customer_id,
        orderDate: new Date(o.placed_at),
        status: o.status,
        deliveredAt: o.delivered_at ? new Date(o.delivered_at) : null,
        eligibleReturnUntil: o.eligible_return_until ? new Date(o.eligible_return_until) : null,
        total: o.total || 0,
        currency: o.currency || 'INR',
        paymentStatus: o.payment_status || 'paid',
        trackingNumber: o.tracking_number || null,
        items: JSON.stringify(o.items || []),
      },
      update: {
        status: o.status,
        deliveredAt: o.delivered_at ? new Date(o.delivered_at) : null,
        eligibleReturnUntil: o.eligible_return_until ? new Date(o.eligible_return_until) : null,
        total: o.total || 0,
        items: JSON.stringify(o.items || []),
      },
    });
  }
  console.log(`✅ ${ordersRaw.length} orders seeded`);

  // ---- Tickets ----
  const ticketsRaw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tickets.json'), 'utf8'));
  for (const t of ticketsRaw) {
    await prisma.ticket.upsert({
      where: { id: t.ticket_id },
      create: {
        id: t.ticket_id,
        customerId: t.customer_id,
        orderId: t.order_id || null,
        channel: t.channel || 'email',
        subject: t.subject,
        message: t.body,
        status: 'OPEN',
        createdAt: new Date(t.created_at),
      },
      update: {
        subject: t.subject,
        message: t.body,
        channel: t.channel || 'email',
      },
    });
  }
  console.log(`✅ ${ticketsRaw.length} tickets seeded`);

  // ---- Knowledge Base ----
  const kbFiles = fs.readdirSync(KB_DIR).filter((f) => f.endsWith('.md'));
  let kbCount = 0;
  for (const filename of kbFiles) {
    const docId = KB_IDS[filename];
    if (!docId) {
      console.warn(`⚠️  No doc ID mapping for ${filename}, skipping`);
      continue;
    }
    const content = fs.readFileSync(path.join(KB_DIR, filename), 'utf8');
    const title = extractTitle(content, filename);
    const category = KB_CATEGORIES[docId] || 'general';

    await prisma.knowledgeDocument.upsert({
      where: { id: docId },
      create: { id: docId, title, category, content },
      update: { title, category, content },
    });
    kbCount++;
  }
  console.log(`✅ ${kbCount} knowledge base documents seeded`);

  console.log('\n🎉 Seed complete!');
  console.log(`\nDemo login:\n  Email: ${demoEmail}\n  Password: ${demoPassword}`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
