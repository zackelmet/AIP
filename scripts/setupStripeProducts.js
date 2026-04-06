#!/usr/bin/env node

/**
 * Stripe Products Setup for Affordable Pentesting PTaaS Platform
 *
 * Creates products and pricing for:
 * - External IP Pentest ($199 one-time)
 * - Web Application Pentest ($500 one-time)
 * - Pentest+ ($1,500 one-time)
 */

require("dotenv").config({ path: ".env.local" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = [
  {
    name: "External IP Pentest",
    description:
      "AI-driven automated penetration test for external-facing IPs and services. 1 credit per scan.",
    type: "external_ip",
    price: 199,
    currency: "usd",
    recurring: false,
    features: [
      "AI-powered vulnerability scanning",
      "Nmap network discovery",
      "OpenVAS vulnerability assessment",
      "Automated findings report",
      "Up to 5 targets per scan",
      "Export results (PDF/JSON)",
    ],
  },
  {
    name: "Web Application Pentest",
    description:
      "AI-driven automated penetration test for web applications. Up to 3 user roles, 20 pages & 10 API endpoints.",
    type: "web_app",
    price: 500,
    currency: "usd",
    recurring: false,
    features: [
      "AI-powered vulnerability scanning",
      "OWASP ZAP web application testing",
      "OWASP Top 10 coverage",
      "Authenticated scan support",
      "Detailed findings report",
      "Export results (PDF/JSON)",
    ],
  },
  {
    name: "Pentest+",
    description:
      "Comprehensive AI pentest credit. Up to 50 external IPs or webapp with up to 100 API endpoints. Up to 10 user roles.",
    type: "pentest_plus",
    price: 1500,
    currency: "usd",
    recurring: false,
    features: [
      "AI pentest: up to 50 external IPs",
      "Or webapp with up to 100 API endpoints",
      "Up to 10 user roles tested",
      "Compliance ready reports",
      "Authentication & authorization testing",
      "GRC platform integration (Drata, Vanta)",
    ],
  },
];

async function setupProducts() {
  console.log(
    "🚀 Setting up Stripe products for Affordable Pentesting PTaaS...\n",
  );

  if (
    !process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY.trim() === ""
  ) {
    console.error("❌ Error: STRIPE_SECRET_KEY not found in .env.local");
    process.exit(1);
  }

  const results = {};

  for (const product of PRODUCTS) {
    try {
      console.log(`📦 Creating product: ${product.name}...`);

      // Create product
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
        metadata: {
          type: product.type,
          features: JSON.stringify(product.features),
        },
      });

      console.log(`   ✓ Product created: ${stripeProduct.id}`);

      // Create price
      const priceData = {
        product: stripeProduct.id,
        unit_amount: product.price * 100, // Convert to cents
        currency: product.currency,
        metadata: {
          type: product.type,
        },
      };

      if (product.recurring) {
        priceData.recurring = {
          interval: product.interval,
        };
      }

      const stripePrice = await stripe.prices.create(priceData);

      console.log(
        `   ✓ Price created: ${stripePrice.id} ($${product.price}${product.recurring ? `/${product.interval}` : ""})`,
      );

      // Store result
      results[product.type] = {
        productId: stripeProduct.id,
        priceId: stripePrice.id,
        amount: product.price,
        recurring: product.recurring || false,
      };

      console.log("");
    } catch (error) {
      console.error(`   ❌ Error creating ${product.name}:`, error.message);
      console.log("");
    }
  }

  // Display environment variables to add
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Products created successfully!\n");
  console.log("📝 Add these to your .env.local file:\n");

  if (results.external_ip) {
    console.log(
      `NEXT_PUBLIC_STRIPE_PRICE_AI_SINGLE=${results.external_ip.priceId}`,
    );
  }
  if (results.web_app) {
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_WEB_APP=${results.web_app.priceId}`);
  }
  if (results.pentest_plus) {
    console.log(
      `NEXT_PUBLIC_STRIPE_PRICE_PENTEST_PLUS=${results.pentest_plus.priceId}`,
    );
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📊 Product Summary:\n");

  Object.entries(results).forEach(([type, data]) => {
    const productInfo = PRODUCTS.find((p) => p.type === type);
    console.log(`${productInfo.name}:`);
    console.log(`  Product ID: ${data.productId}`);
    console.log(`  Price ID:   ${data.priceId}`);
    console.log(
      `  Amount:     $${data.amount}${data.recurring ? "/month" : ""}`,
    );
    console.log("");
  });

  console.log("🔗 View in Stripe Dashboard:");
  console.log("   https://dashboard.stripe.com/products\n");
}

// Run setup
setupProducts()
  .then(() => {
    console.log("✨ Setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Setup failed:", error.message);
    process.exit(1);
  });
