const express = require('express')
const cors = require('cors')
const countryList = require('country-list')
const fs = require('node:fs')
const path = require('node:path')
const { randomBytes, randomUUID, timingSafeEqual } = require('node:crypto')

const envFile = path.join(__dirname, '.env')
if (fs.existsSync(envFile)) {
  if (typeof process.loadEnvFile !== 'function') {
    throw new Error('Node.js 20.12 or newer is required to load backend/.env.')
  }
  process.loadEnvFile(envFile)
}

const app = express()
const port = Number(process.env.PORT || 3001)
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim())
const dataFile = process.env.STORE_FILE
  ? path.resolve(process.env.STORE_FILE)
  : path.join(__dirname, 'data', 'store.json')
const uploadDirectory = path.join(__dirname, 'uploads')
const maxImageSize = 4 * 1024 * 1024

if (!adminEmail || !adminPassword) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD before starting the server.')
  process.exit(1)
}

const sessionCookieName = 'mj_admin_session'
const sessionLifetime = 8 * 60 * 60 * 1000
const adminSessions = new Map()

const seedProducts = [
  { id: 'p-linen-shirt', name: 'The Sunday linen shirt', category: 'Clothing', price: 128, image: 'street-look', description: 'Relaxed European linen, made for slow mornings and long lunches.', tag: 'Bestseller', stock: 0 },
  { id: 'p-trouser', name: 'The easy tailored trouser', category: 'Clothing', price: 168, image: 'coastal-look', description: 'A little structure, a lot of ease. Your new everyday uniform.', tag: 'Just in', stock: 0 },
  { id: 'p-bag', name: 'The everyday carryall', category: 'Bags', price: 198, image: 'street-look', description: 'Room for what matters, and nothing that doesn’t.', stock: 0 },
  { id: 'p-knit', name: 'The soft-spoken knit', category: 'Clothing', price: 154, image: 'coastal-look', description: 'Responsibly sourced cotton. The kind of soft you remember.', stock: 0 },
  { id: 'p-sandal', name: 'The day-off sandal', category: 'Shoes', price: 142, image: 'street-look', description: 'Hand-finished leather, thoughtfully made for everywhere.', tag: 'Few left', stock: 0 },
  { id: 'p-dress', name: 'The unhurried dress', category: 'Clothing', price: 188, image: 'occasion-look', description: 'An effortless shape that moves with you, day into night.', tag: 'New season', stock: 0 },
  { id: 'p-sneaker', name: 'The good-ground sneaker', category: 'Shoes', price: 136, image: 'street-look', description: 'A considered classic, grounded in comfort and made to roam.', stock: 0 },
]

function readStore() {
  try {
    const store = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
    if (!Array.isArray(store.products) || !Array.isArray(store.orders)) throw new Error('Store data is malformed.')
    const products = store.products.map((product) => {
      const stock = product.stock === undefined ? 0 : product.stock
      if (!Number.isSafeInteger(stock) || stock < 0) throw new Error(`Inventory is malformed for product ${product.id}.`)
      return { ...product, stock }
    })
    if (store.inventoryMovements !== undefined && !Array.isArray(store.inventoryMovements)) throw new Error('Inventory history is malformed.')
    return { ...store, products, inventoryMovements: store.inventoryMovements || [] }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return { products: seedProducts, orders: [], inventoryMovements: [] }
  }
}

let store
try {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true })
  fs.mkdirSync(uploadDirectory, { recursive: true })
  store = readStore()
} catch (error) {
  console.error(`Could not load store data: ${error.message}`)
  process.exit(1)
}

function saveStore() {
  const temporaryFile = `${dataFile}.tmp`
  fs.writeFileSync(temporaryFile, JSON.stringify(store, null, 2))
  fs.renameSync(temporaryFile, dataFile)
}

async function gmailAccessToken() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error('Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to enable approval emails.')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || typeof result.access_token !== 'string') {
    throw new Error(result.error_description || result.error || 'Google OAuth could not provide a Gmail access token.')
  }
  return result.access_token
}

async function sendApprovalEmail(order) {
  const accessToken = await gmailAccessToken()
  const senderEmail = process.env.GMAIL_SENDER_EMAIL || adminEmail
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    throw new Error('Set GMAIL_SENDER_EMAIL to a valid address authorized for the configured Gmail account.')
  }

  const orderNumber = order.id.slice(0, 8).toUpperCase()
  const arrival = new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Africa/Kigali',
  }).format(new Date(order.arrivalAt))
  const message = [
    `From: Sankara Fashion Hub <${senderEmail}>`,
    `To: ${order.customer.email}`,
    `Subject: Your Sankara order ${orderNumber} is approved`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    `Hello ${order.customer.name},`,
    '',
    `Your order ${orderNumber} has been approved.`,
    `Expected arrival: ${arrival} (Kigali time).`,
    '',
    'Thank you for shopping with Sankara Fashion Hub.',
  ].join('\r\n')

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: Buffer.from(message, 'utf8').toString('base64url') }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.error?.message || 'Gmail could not send the approval email.')
  }
  return result.id
}

async function sendAndRecordApprovalEmail(order) {
  order.approvalEmail = { status: 'sending', updatedAt: new Date().toISOString() }
  saveStore()

  try {
    const messageId = await sendApprovalEmail(order)
    order.approvalEmail = { status: 'sent', messageId, sentAt: new Date().toISOString() }
  } catch (error) {
    order.approvalEmail = { status: 'failed', error: error.message, failedAt: new Date().toISOString() }
    console.error(`Could not send approval email for order ${order.id}: ${error.message}`)
  }

  saveStore()
  return order.approvalEmail
}

app.use(cors({
  origin(origin, callback) {
    const localDevelopmentOrigin = process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '')
    callback(null, !origin || allowedOrigins.includes(origin) || localDevelopmentOrigin)
  },
  credentials: true,
}))
app.use(express.json({ limit: '6mb' }))
app.use('/uploads', express.static(uploadDirectory))

function sessionIdFromRequest(req) {
  const cookieHeader = req.get('cookie') || ''
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookieName}=`))
  const sessionId = cookie?.slice(sessionCookieName.length + 1)
  return /^[0-9a-f]{64}$/.test(sessionId || '') ? sessionId : null
}

function setSessionCookie(res, sessionId) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const sameSite = process.env.NODE_ENV === 'production' ? 'None' : 'Strict'
  res.setHeader('Set-Cookie', `${sessionCookieName}=${sessionId}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${sessionLifetime / 1000}${secure}`)
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  const sameSite = process.env.NODE_ENV === 'production' ? 'None' : 'Strict'
  res.setHeader('Set-Cookie', `${sessionCookieName}=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${secure}`)
}

function adminOnly(req, res, next) {
  const sessionId = sessionIdFromRequest(req)
  const session = sessionId ? adminSessions.get(sessionId) : null
  if (!session || session.expiresAt <= Date.now()) {
    if (sessionId) adminSessions.delete(sessionId)
    clearSessionCookie(res)
    return res.status(401).json({ error: 'Administrator sign-in required.' })
  }
  req.admin = { role: 'admin', email: adminEmail }
  return next()
}

function validProduct(body) {
  const categories = ['Clothing', 'Shoes', 'Bags']
  if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80) return 'Add a product name (80 characters maximum).'
  if (!categories.includes(body.category)) return 'Choose a valid product category.'
  if (!Number.isSafeInteger(Number(body.price)) || Number(body.price) <= 0 || Number(body.price) > 1000000000) return 'Enter a valid whole-number price in RWF.'
  if (typeof body.description !== 'string' || !body.description.trim() || body.description.length > 180) return 'Add a short description (180 characters maximum).'
  if (typeof body.image !== 'string' || (
    !['coastal-look', 'occasion-look', 'street-look'].includes(body.image) &&
    !/^\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(body.image)
  )) return 'Choose a product image from the local asset library.'
  return null
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.get('/api/products', (req, res) => res.json({ products: store.products }))

app.get('/api/admin/session', (req, res) => {
  const sessionId = sessionIdFromRequest(req)
  const session = sessionId ? adminSessions.get(sessionId) : null
  if (!session || session.expiresAt <= Date.now()) {
    if (sessionId) adminSessions.delete(sessionId)
    clearSessionCookie(res)
    return res.json({ authenticated: false })
  }
  return res.json({ authenticated: true })
})

app.post('/api/admin/uploads', adminOnly, (req, res) => {
  const match = typeof req.body?.dataUrl === 'string'
    ? req.body.dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/)
    : null
  if (!match) return res.status(400).json({ error: 'Choose a JPG, PNG, or WebP image.' })

  const [, format, encodedImage] = match
  const imageBuffer = Buffer.from(encodedImage, 'base64')
  if (!imageBuffer.length || imageBuffer.length > maxImageSize) {
    return res.status(400).json({ error: 'Images must be smaller than 4 MB.' })
  }
  const validSignature = format === 'jpeg'
    ? imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 && imageBuffer[2] === 0xff
    : format === 'png'
      ? imageBuffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : imageBuffer.subarray(0, 4).toString() === 'RIFF' && imageBuffer.subarray(8, 12).toString() === 'WEBP'
  if (!validSignature) return res.status(400).json({ error: 'The selected file is not a valid image.' })

  const extension = format === 'jpeg' ? 'jpg' : format
  const filename = `${randomUUID()}.${extension}`
  fs.writeFileSync(path.join(uploadDirectory, filename), imageBuffer, { flag: 'wx' })
  return res.status(201).json({ image: `/uploads/${filename}` })
})

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Enter your studio email and password.' })
  const suppliedPassword = Buffer.from(password)
  const expectedPassword = Buffer.from(adminPassword)
  const passwordMatches = suppliedPassword.length === expectedPassword.length && timingSafeEqual(suppliedPassword, expectedPassword)
  if (email.toLowerCase() !== adminEmail.toLowerCase() || !passwordMatches) {
    return res.status(401).json({ error: 'That email and password combination was not recognized.' })
  }
  const previousSessionId = sessionIdFromRequest(req)
  if (previousSessionId) adminSessions.delete(previousSessionId)
  const sessionId = randomBytes(32).toString('hex')
  adminSessions.set(sessionId, { expiresAt: Date.now() + sessionLifetime })
  setSessionCookie(res, sessionId)
  return res.json({ authenticated: true })
})

app.post('/api/admin/logout', (req, res) => {
  const sessionId = sessionIdFromRequest(req)
  if (sessionId) adminSessions.delete(sessionId)
  clearSessionCookie(res)
  return res.status(204).end()
})

app.post('/api/products', adminOnly, (req, res) => {
  const error = validProduct(req.body || {})
  if (error) return res.status(400).json({ error })
  const product = {
    id: `p-${randomUUID()}`,
    name: req.body.name.trim(),
    category: req.body.category,
    price: Number(req.body.price),
    image: req.body.image,
    description: req.body.description.trim(),
    stock: 0,
  }
  store.products.unshift(product)
  saveStore()
  return res.status(201).json({ product })
})

app.put('/api/products/:id', adminOnly, (req, res) => {
  const index = store.products.findIndex((product) => product.id === req.params.id)
  if (index < 0) return res.status(404).json({ error: 'That piece is no longer in the collection.' })
  const error = validProduct(req.body || {})
  if (error) return res.status(400).json({ error })
  store.products[index] = {
    ...store.products[index],
    name: req.body.name.trim(),
    category: req.body.category,
    price: Number(req.body.price),
    image: req.body.image,
    description: req.body.description.trim(),
  }
  saveStore()
  return res.json({ product: store.products[index] })
})

app.delete('/api/products/:id', adminOnly, (req, res) => {
  const index = store.products.findIndex((product) => product.id === req.params.id)
  if (index < 0) return res.status(404).json({ error: 'That piece is no longer in the collection.' })
  store.products.splice(index, 1)
  saveStore()
  return res.status(204).end()
})

app.get('/api/admin/inventory', adminOnly, (req, res) => res.json({ movements: store.inventoryMovements }))

app.post('/api/admin/inventory/:productId', adminOnly, (req, res) => {
  const product = store.products.find((item) => item.id === req.params.productId)
  if (!product) return res.status(404).json({ error: 'That piece is no longer in the collection.' })
  const { direction, quantity, reason } = req.body || {}
  if (!['in', 'out'].includes(direction)) return res.status(400).json({ error: 'Choose stock in or stock out.' })
  if (!Number.isSafeInteger(quantity) || quantity < 1) return res.status(400).json({ error: 'Enter a whole-number quantity greater than zero.' })
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 120) return res.status(400).json({ error: 'Add a reason (120 characters maximum).' })
  if (direction === 'out' && quantity > product.stock) return res.status(409).json({ error: `Only ${product.stock} ${product.stock === 1 ? 'unit is' : 'units are'} in stock.` })
  if (direction === 'in' && quantity > Number.MAX_SAFE_INTEGER - product.stock) return res.status(400).json({ error: 'That stock-in quantity is too large.' })

  product.stock += direction === 'in' ? quantity : -quantity
  const movement = {
    id: randomUUID(),
    productId: product.id,
    productName: product.name,
    direction,
    quantity,
    reason: reason.trim(),
    createdAt: new Date().toISOString(),
  }
  store.inventoryMovements.unshift(movement)
  saveStore()
  return res.json({ product, movement })
})

app.post('/api/orders', (req, res) => {
  const { name, email, phone, country, city, items } = req.body || {}
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) return res.status(400).json({ error: 'Enter your name to continue.' })
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' })
  if (typeof phone !== 'string' || !/^\+[1-9]\d{6,14}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid phone number with its country code.' })
  if (typeof country !== 'string' || !countryList.getCode(country)) return res.status(400).json({ error: 'Choose a valid country or region.' })
  if (typeof city !== 'string' || !city.trim() || city.trim().length > 100) return res.status(400).json({ error: 'Enter your town or city (100 characters maximum).' })
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) return res.status(400).json({ error: 'Your bag must contain at least one piece.' })
  const requestedItems = new Map()
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      return res.status(400).json({ error: 'One or more items in your bag are invalid.' })
    }
    requestedItems.set(item.productId, (requestedItems.get(item.productId) || 0) + item.quantity)
  }
  const checkedItems = []
  for (const [productId, quantity] of requestedItems) {
    if (quantity > 20) return res.status(400).json({ error: 'A maximum of 20 units of each piece can be ordered at once.' })
    const product = store.products.find((piece) => piece.id === productId)
    if (!product) return res.status(400).json({ error: 'A piece in your bag is no longer available. Please refresh your bag.' })
    if (quantity > product.stock) return res.status(409).json({ error: `${product.name} has only ${product.stock} ${product.stock === 1 ? 'unit' : 'units'} available.` })
    checkedItems.push({ productId: product.id, name: product.name, price: product.price, quantity })
  }
  const order = {
    id: randomUUID(),
    customer: { name: name.trim(), email: email.trim(), phone, country, city: city.trim() },
    items: checkedItems,
    total: checkedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  for (const item of checkedItems) {
    const product = store.products.find((piece) => piece.id === item.productId)
    product.stock -= item.quantity
    store.inventoryMovements.unshift({
      id: randomUUID(),
      productId: product.id,
      productName: product.name,
      direction: 'out',
      quantity: item.quantity,
      reason: 'Customer order',
      orderId: order.id,
      createdAt: order.createdAt,
    })
  }
  store.orders.unshift(order)
  saveStore()
  return res.status(201).json({
    order: { id: order.id, status: order.status, total: order.total },
    inventory: checkedItems.map((item) => {
      const product = store.products.find((piece) => piece.id === item.productId)
      return { productId: product.id, stock: product.stock }
    }),
  })
})

app.get('/api/orders', adminOnly, (req, res) => res.json({ orders: store.orders }))

app.patch('/api/orders/:id/approve', adminOnly, async (req, res) => {
  const order = store.orders.find((item) => item.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'That order could not be found.' })
  if (order.status !== 'pending') return res.status(409).json({ error: 'This order has already been reviewed.' })
  const arrivalAt = new Date(req.body?.arrivalAt)
  if (typeof req.body?.arrivalAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(req.body.arrivalAt) ||
      !Number.isFinite(arrivalAt.getTime())) {
    return res.status(400).json({ error: 'Choose a valid expected arrival date and time.' })
  }
  if (arrivalAt.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Expected arrival must be in the future.' })
  }
  order.status = 'approved'
  order.approvedAt = new Date().toISOString()
  order.arrivalAt = arrivalAt.toISOString()
  saveStore()
  const notification = await sendAndRecordApprovalEmail(order)
  return res.json({ order, notification })
})

app.post('/api/orders/:id/approval-email', adminOnly, async (req, res) => {
  const order = store.orders.find((item) => item.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'That order could not be found.' })
  if (order.status !== 'approved' || !order.arrivalAt) {
    return res.status(409).json({ error: 'Only approved orders with an arrival estimate can receive an approval email.' })
  }
  if (order.approvalEmail?.status === 'sent') {
    return res.status(409).json({ error: 'The approval email has already been sent.' })
  }
  const notification = await sendAndRecordApprovalEmail(order)
  return res.json({ order, notification })
})

app.delete('/api/orders/:id', adminOnly, (req, res) => {
  const index = store.orders.findIndex((item) => item.id === req.params.id)
  if (index < 0) return res.status(404).json({ error: 'That order could not be found.' })
  store.orders.splice(index, 1)
  saveStore()
  return res.status(204).end()
})

app.delete('/api/admin/records', adminOnly, (req, res) => {
  store.orders = []
  store.inventoryMovements = []
  saveStore()
  return res.json({ orders: store.orders, movements: store.inventoryMovements })
})

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) return res.status(400).json({ error: 'Request body must be valid JSON.' })
  console.error(error)
  return res.status(500).json({ error: 'The server could not complete your request.' })
})

app.listen(port, () => console.log(`https://sankara-fashion-hub1.onrender.com/`))
