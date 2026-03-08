import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/create-cashfree-order", async (req, res) => {
    try {
      const { amount, customer } = req.body;
      
      const appId = process.env.CASHFREE_APP_ID;
      const secretKey = process.env.CASHFREE_SECRET_KEY;
      const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // If credentials are not configured, return a mock response for demo purposes
      if (!appId || !secretKey) {
        console.warn("Cashfree credentials missing. Returning mock payment session for demo.");
        return res.json({ 
          paymentSessionId: "mock_session_id_demo_mode",
          orderId: orderId,
          isDemo: true
        });
      }

      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

      const response = await fetch("https://sandbox.cashfree.com/pg/orders", {
        method: "POST",
        headers: {
          "x-client-id": appId,
          "x-client-secret": secretKey,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          order_amount: amount,
          order_currency: "INR",
          customer_details: {
            customer_id: `cust_${Date.now()}`,
            customer_name: `${customer.firstName} ${customer.lastName}`,
            customer_email: customer.email,
            customer_phone: customer.phone || "9999999999"
          },
          order_meta: {
            return_url: `${appUrl}/checkout?order_id=${orderId}`
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Cashfree API Error:", data);
        return res.status(response.status).json({ error: data.message || "Failed to create order" });
      }

      res.json({
        paymentSessionId: data.payment_session_id,
        orderId: data.order_id
      });
    } catch (error) {
      console.error("Error creating Cashfree order:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
