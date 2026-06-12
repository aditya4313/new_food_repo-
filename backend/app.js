import fs from 'node:fs/promises';

import bodyParser from 'body-parser';
import express from 'express';

const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/meals', async (req, res) => {
  const meals = await fs.readFile('./data/available-meals.json', 'utf8');
  res.json(JSON.parse(meals));
});

app.post('/orders', async (req, res) => {
  const orderData = req.body.order;

  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (orderData === null || orderData.items === null || orderData.items.length === 0) {
    return res
      .status(400)
      .json({ message: 'Missing data.' });
  }

  if (
    orderData.customer.email === null ||
    !orderData.customer.email.includes('@') ||
    orderData.customer.name === null ||
    orderData.customer.name.trim() === '' ||
    orderData.customer.street === null ||
    orderData.customer.street.trim() === '' ||
    orderData.customer['postal-code'] === null ||
    orderData.customer['postal-code'].trim() === '' ||
    orderData.customer.city === null ||
    orderData.customer.city.trim() === ''
  ) {
    return res.status(400).json({
      message:
        'Missing data: Email, name, street, postal code or city is missing.',
    });
  }

  const newOrder = {
    ...orderData,
    id: (Math.random() * 1000).toString(),
  };
  let allOrders = [];
  try {
    const orders = await fs.readFile('./data/orders.json', 'utf8');
    allOrders = JSON.parse(orders);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  allOrders.push(newOrder);
  await fs.writeFile('./data/orders.json', JSON.stringify(allOrders));
  res.status(201).json({ message: 'Order created!' });
});

async function readAllOrders() {
  try {
    const orders = await fs.readFile('./data/orders.json', 'utf8');
    return JSON.parse(orders);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function getAdminKey() {
  if (process.env.ADMIN_KEY) {
    return process.env.ADMIN_KEY;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'foodapp-admin';
  }

  return null;
}

function sanitizeOrdersForAdmin(orders) {
  return orders
    .slice(-5)
    .reverse()
    .map((order) => ({
      id: order.id,
      customerName: order.customer?.name?.trim() || 'Unknown',
      items: (order.items || []).map((item) => ({
        name: item.name,
        quantity: item.quantity,
      })),
    }));
}

app.get('/orders', async (req, res) => {
  const adminKey = getAdminKey();

  if (!adminKey) {
    return res.status(503).json({ message: 'Admin access is not configured.' });
  }

  if (req.query.key !== adminKey) {
    return res.status(401).json({ message: 'Invalid admin key.' });
  }

  try {
    const allOrders = await readAllOrders();
    res.json(sanitizeOrdersForAdmin(allOrders));
  } catch {
    res.status(500).json({ message: 'Failed to read orders.' });
  }
});

app.use((req, res) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  res.status(404).json({ message: 'Not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});