import { useCallback, useEffect, useState } from 'react'
import countryList from 'country-list'
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js'
import { API_URL } from './api.js'
import { getProductImage, productImageOptions } from './assets/images.js'
import { AdminLoginPage, ContactPage, HomePage, JournalPage, ShopPage, StoryPage } from './pages/Pages.jsx'
import './App.css'

const categories = ['All pieces', 'Clothing', 'Shoes', 'Bags']
const countries = countryList.getNames().sort((first, second) => first.localeCompare(second))
const phoneCountries = getCountries()
  .map((code) => ({ code, name: countryList.getName(code), callingCode: getCountryCallingCode(code) }))
  .filter((country) => country.name)
  .sort((first, second) => first.name.localeCompare(second.name))
const money = (amount) =>
  `${new Intl.NumberFormat('en-RW').format(amount)} RWF`
const formatArrivalTime = (value) =>
  new Intl.DateTimeFormat('en-RW', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Kigali',
  }).format(new Date(value))

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.error || 'Something went wrong. Please try again.')
    error.status = response.status
    throw error
  }
  return body
}

function Icon({ name, size = 20 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  const paths = {
    bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19.5 7.7a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></>,
    print: <><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7zM17 11h.01" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  }
  return <svg {...common}>{paths[name]}</svg>
}

function App() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [inventoryMovements, setInventoryMovements] = useState([])
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('atelier-cart') || '[]'))
  const [page, setPage] = useState(() => window.location.pathname)
  const [adminAuthenticated, setAdminAuthenticated] = useState(null)
  const currentPage = page === '/admin/dashboard' && adminAuthenticated === false
    ? '/admin'
    : page === '/admin' && adminAuthenticated
      ? '/admin/dashboard'
      : page
  const [category, setCategory] = useState('All pieces')
  const [query, setQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [adminTab, setAdminTab] = useState('products')
  const [orderArrivalTimes, setOrderArrivalTimes] = useState({})
  const [loginError, setLoginError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [productForm, setProductForm] = useState({ name: '', category: 'Clothing', price: '', image: productImageOptions[0].value, description: '' })
  const [productImageFile, setProductImageFile] = useState(null)
  const [checkout, setCheckout] = useState(false)
  const [customer, setCustomer] = useState({ name: '', email: '', country: '', city: '', phoneCountry: 'RW', phone: '' })
  const [inventoryForm, setInventoryForm] = useState({ productId: '', direction: 'in', quantity: '', reason: '' })
  const [mobileMenu, setMobileMenu] = useState(false)

  function navigate(path) {
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
    setPage(path)
    setMobileMenu(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const loadProducts = useCallback(async () => {
    const data = await request('/api/products')
    setProducts(data.products)
  }, [])

  useEffect(() => {
    const onPopState = () => setPage(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const loadOrders = useCallback(async () => {
    const data = await request('/api/orders')
    setOrders(data.orders)
  }, [])

  const loadInventory = useCallback(async () => {
    const data = await request('/api/admin/inventory')
    setInventoryMovements(data.movements)
  }, [])

  useEffect(() => {
    request('/api/admin/session')
      .then((data) => setAdminAuthenticated(data.authenticated))
      .catch((error) => {
        setAdminAuthenticated(false)
        setNotice(error.message)
      })
  }, [])

  useEffect(() => {
    loadProducts()
      .catch((error) => setNotice(error.message))
      .finally(() => setLoading(false))
  }, [loadProducts])

  useEffect(() => {
    localStorage.setItem('atelier-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (notice) {
      const timer = window.setTimeout(() => setNotice(''), 3800)
      return () => window.clearTimeout(timer)
    }
  }, [notice])

  useEffect(() => {
    if (adminAuthenticated && currentPage === '/admin/dashboard') {
      Promise.all([loadOrders(), loadInventory()]).catch((error) => {
        if (error.status === 401) {
          setAdminAuthenticated(false)
          setOrders([])
          setInventoryMovements([])
          navigate('/admin')
        }
        setNotice(error.message)
      })
    }
  }, [adminAuthenticated, currentPage, loadOrders, loadInventory])

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cart.reduce((total, item) => {
    const product = products.find((piece) => piece.id === item.productId)
    return total + (product ? product.price * item.quantity : 0)
  }, 0)
  const pendingOrders = orders.filter((order) => order.status === 'pending')
  const approvedOrders = orders.filter((order) => order.status === 'approved')
  const approvedRevenue = approvedOrders.reduce((total, order) => total + order.total, 0)
  const totalStock = products.reduce((total, product) => total + product.stock, 0)
  const outOfStockProducts = products.filter((product) => product.stock === 0)

  function addToCart(product) {
    if (product.stock < 1) {
      setNotice(`${product.name} is out of stock`)
      return
    }
    setCart((items) => {
      const existing = items.find((item) => item.productId === product.id)
      if (existing && existing.quantity >= product.stock) {
        setNotice(`Only ${product.stock} ${product.stock === 1 ? 'unit is' : 'units are'} available`)
        return items
      }
      return existing
        ? items.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...items, { productId: product.id, quantity: 1 }]
    })
    setNotice(`${product.name} added to your bag`)
  }

  function updateQuantity(productId, change) {
    const currentItem = cart.find((item) => item.productId === productId)
    const product = products.find((item) => item.id === productId)
    if (change > 0 && currentItem && product && currentItem.quantity >= product.stock) {
      setNotice(`Only ${product.stock} ${product.stock === 1 ? 'unit is' : 'units are'} available`)
      return
    }
    setCart((items) => items
      .map((item) => item.productId === productId ? { ...item, quantity: item.quantity + change } : item)
      .filter((item) => item.quantity > 0))
  }

  async function submitOrder(event) {
    event.preventDefault()
    const phoneNumber = parsePhoneNumberFromString(customer.phone, customer.phoneCountry)
    if (!phoneNumber?.isValid()) {
      setNotice('Enter a valid phone number for the selected country code.')
      return
    }
    setBusy(true)
    try {
      const data = await request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          country: customer.country,
          city: customer.city,
          phone: phoneNumber.number,
          items: cart,
        }),
      })
      const updatedStock = new Map(data.inventory.map((item) => [item.productId, item.stock]))
      setProducts((current) => current.map((product) => updatedStock.has(product.id)
        ? { ...product, stock: updatedStock.get(product.id) }
        : product))
      setCart([])
      setCheckout(false)
      setCartOpen(false)
      setNotice('Order sent')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }

  }

  async function updateInventory(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const productId = inventoryForm.productId || products[0]?.id
      if (!productId) throw new Error('Add a product before managing inventory.')
      const data = await request(`/api/admin/inventory/${encodeURIComponent(productId)}`, {
        method: 'POST',
        body: JSON.stringify({
          direction: inventoryForm.direction,
          quantity: Number(inventoryForm.quantity),
          reason: inventoryForm.reason,
        }),
      })
      await Promise.all([loadProducts(), loadInventory()])
      setInventoryForm((current) => ({ ...current, quantity: '', reason: '' }))
      setNotice(`${data.movement.direction === 'in' ? 'Stock received' : 'Stock removed'}: ${data.product.name} now has ${data.product.stock} in stock`)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function loginAdmin(event) {
    event.preventDefault()
    setBusy(true)
    setLoginError('')
    const form = new FormData(event.currentTarget)
    try {
      await request('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      })
      setAdminAuthenticated(true)
      navigate('/admin/dashboard')
      setAdminTab('products')
      setNotice('Welcome to your studio')
      await loadProducts()
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function logoutAdmin() {
    let logoutError = ''
    try {
      await request('/api/admin/logout', { method: 'POST' })
    } catch (error) {
      logoutError = error.message
    }
    setAdminAuthenticated(false)
    setOrders([])
    setInventoryMovements([])
    navigate('/admin')
    setNotice(logoutError || 'You are signed out')
  }

  async function saveProduct(event) {
    event.preventDefault()
    setBusy(true)
    try {
      let image = productForm.image
      if (productImageFile) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = () => reject(new Error('The selected image could not be read.'))
          reader.readAsDataURL(productImageFile)
        })
        const upload = await request('/api/admin/uploads', {
          method: 'POST',
          body: JSON.stringify({ dataUrl }),
        })
        image = upload.image
      }
      const method = editingId ? 'PUT' : 'POST'
      const path = editingId ? `/api/products/${editingId}` : '/api/products'
      await request(path, { method, body: JSON.stringify({ ...productForm, image }) })
      await loadProducts()
      setProductForm({ name: '', category: 'Clothing', price: '', image: productImageOptions[0].value, description: '' })
      setProductImageFile(null)
      setEditingId(null)
      setNotice(editingId ? 'Piece updated' : 'New piece added to the collection')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  function startEdit(product) {
    setProductForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      image: productImageOptions.some((option) => option.value === product.image) || product.image.startsWith('/uploads/')
        ? product.image
        : productImageOptions[0].value,
      description: product.description,
    })
    setProductImageFile(null)
    setEditingId(product.id)
    document.querySelector('.product-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Remove ${product.name} from the collection?`)) return
    try {
      await request(`/api/products/${product.id}`, { method: 'DELETE' })
      await loadProducts()
      setCart((items) => items.filter((item) => item.productId !== product.id))
      setNotice('Piece removed from the collection')
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function approveOrder(orderId) {
    const arrivalTime = orderArrivalTimes[orderId]
    if (!arrivalTime) {
      setNotice('Choose an expected arrival date and time first.')
      return
    }

    const arrivalAt = new Date(`${arrivalTime}:00+02:00`)
    if (!Number.isFinite(arrivalAt.getTime())) {
      setNotice('Choose a valid expected arrival date and time.')
      return
    }

    try {
      const data = await request(`/api/orders/${orderId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ arrivalAt: arrivalAt.toISOString() }),
      })
      await loadOrders()
      setNotice(data.notification.status === 'sent'
        ? 'Order approved and customer emailed'
        : `Order approved, but the customer email failed: ${data.notification.error}`)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function resendApprovalEmail(orderId) {
    try {
      const data = await request(`/api/orders/${orderId}/approval-email`, { method: 'POST' })
      await loadOrders()
      setNotice(data.notification.status === 'sent'
        ? 'Approval email sent to the customer'
        : `The approval email failed: ${data.notification.error}`)
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function deleteOrder(order) {
    if (!window.confirm(`Delete order ${order.id.slice(0, 8).toUpperCase()} from ${order.customer.name}?`)) return
    try {
      await request(`/api/orders/${order.id}`, { method: 'DELETE' })
      await loadOrders()
      setNotice('Customer order deleted')
    } catch (error) {
      setNotice(error.message)
    }
  }

  async function resetRecords() {
    const confirmed = window.confirm('Reset all recorded orders and stock movement history? Products and current stock levels will remain. This cannot be undone.')
    if (!confirmed) return
    setBusy(true)
    try {
      await request('/api/admin/records', { method: 'DELETE' })
      setOrders([])
      setInventoryMovements([])
      setNotice('Order and stock movement records reset')
    } catch (error) {
      setNotice(error.message)
    } finally {
      setBusy(false)
    }
  }

  function openAdmin() {
    navigate(adminAuthenticated ? '/admin/dashboard' : '/admin')
  }

  return (
    <div className="site-shell">
      {currentPage.startsWith('/admin') ? null : <>
        <div className="announcement"><span>Order now</span><button onClick={() => navigate('/shop')}>Discover the new season <Icon name="arrow" size={14} /></button></div>
        <header className="site-header">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileMenu(!mobileMenu)}><Icon name="menu" /></button>
          <button className="wordmark wordmark-button" onClick={() => navigate('/')} aria-label="Sankara Fashion Hub home"><img src="/mj-fashion-logo.svg" alt="Sankara Fashion Hub" /></button>
          <nav className={mobileMenu ? 'main-nav nav-open' : 'main-nav'}>
            <a className={currentPage === '/' ? 'current-page' : ''} href="/" onClick={(event) => { event.preventDefault(); navigate('/') }}>Home</a>
            <a className={currentPage === '/shop' ? 'current-page' : ''} href="/shop" onClick={(event) => { event.preventDefault(); setCategory('All pieces'); navigate('/shop') }}>Shop all</a>
            <a href="/shop" onClick={(event) => { event.preventDefault(); setCategory('Clothing'); navigate('/shop') }}>Clothing</a>
            <a className={currentPage === '/story' ? 'current-page' : ''} href="/story" onClick={(event) => { event.preventDefault(); navigate('/story') }}>Our story</a>
            <a className={currentPage === '/journal' ? 'current-page' : ''} href="/journal" onClick={(event) => { event.preventDefault(); navigate('/journal') }}>Journal</a>
            <a className={currentPage === '/contact' ? 'current-page' : ''} href="/contact" onClick={(event) => { event.preventDefault(); navigate('/contact') }}>Contact</a>
          </nav>
          <div className="header-actions">
            <button className="admin-header-link" onClick={openAdmin}><Icon name="shield" size={15} /><span>{adminAuthenticated ? 'Studio' : 'Admin login'}</span></button>
            <button className="icon-button search-trigger" aria-label="Search products" onClick={() => navigate('/shop')}><Icon name="search" /></button>
            <button className="icon-button bag-trigger" aria-label={`Shopping bag, ${cartCount} items`} onClick={() => { setCartOpen(true); setCheckout(false) }}><Icon name="bag" /><span>Bag{cartCount > 0 && <i>{cartCount}</i>}</span></button>
          </div>
        </header>
        <main>
          {currentPage === '/' && <HomePage products={products} loading={loading} category={category} setCategory={setCategory} query={query} setQuery={setQuery} addToCart={addToCart} money={money} onNavigate={navigate} />}
          {currentPage === '/shop' && <ShopPage products={products} loading={loading} category={category} setCategory={setCategory} query={query} setQuery={setQuery} addToCart={addToCart} money={money} />}
          {currentPage === '/story' && <StoryPage onNavigate={navigate} />}
          {currentPage === '/journal' && <JournalPage onNavigate={navigate} />}
          {currentPage === '/contact' && <ContactPage setNotice={setNotice} />}
          {currentPage === '/admin' && <AdminLoginPage loginAdmin={loginAdmin} loginError={loginError} busy={busy} navigate={navigate} />}
          {currentPage === '/admin/dashboard' && <div className="studio-loading"></div>}
        </main>
        <footer className="site-footer">
          <div className="footer-top"><button className="wordmark wordmark-button" onClick={() => navigate('/')} aria-label="Sankara Fashion Hub home"><img src="/mj-fashion-logo.svg" alt="Sankara Fashion Hub" /></button><p>Good things, made to keep.</p><button className="admin-link" onClick={openAdmin}><Icon name="shield" size={15} /> {adminAuthenticated ? 'Open the studio' : 'Admin login'}</button></div>
          <div className="footer-bottom"><span>© 2026 Sankara Fashion Hub</span><div><a href="/story" onClick={(event) => { event.preventDefault(); navigate('/story') }}>Our approach</a><a href="/shop" onClick={(event) => { event.preventDefault(); navigate('/shop') }}>The collection</a><a href="/contact" onClick={(event) => { event.preventDefault(); navigate('/contact') }}>Get in touch</a></div><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button></div>
        </footer>
      </>}

      {currentPage === '/admin' && <main><AdminLoginPage loginAdmin={loginAdmin} loginError={loginError} busy={busy} navigate={navigate} /></main>}

      {notice && <div className="toast" role="status"><Icon name="check" size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><Icon name="close" size={15} /></button></div>}

      {cartOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}>
        <aside className="cart-drawer">
          <div className="drawer-header"><div><span className="eyebrow">A good choice</span><h2>Your bag <span>({cartCount})</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close bag"><Icon name="close" /></button></div>
          {checkout ? <form className="checkout-form" onSubmit={submitOrder}>
            <p>Your order is sent to our team for a little personal approval before it’s confirmed.</p>
            <label>Your name<input required autoComplete="name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} /></label>
            <label>Email address<input type="email" required autoComplete="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} /></label>
            <div className="phone-input-row">
              <label htmlFor="phone-country-code">Country code<select id="phone-country-code" autoComplete="tel-country-code" value={customer.phoneCountry} onChange={(event) => setCustomer({ ...customer, phoneCountry: event.target.value })}>{phoneCountries.map((country) => <option key={country.code} value={country.code}>+{country.callingCode} {country.name}</option>)}</select></label>
              <label htmlFor="customer-phone">Phone number<input id="customer-phone" type="tel" required autoComplete="tel-national" inputMode="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="Your phone number" /></label>
            </div>
            <label>Country or region<select required autoComplete="country-name" value={customer.country} onChange={(event) => setCustomer({ ...customer, country: event.target.value })}><option value="">Choose your country</option>{countries.map((country) => <option key={country} value={country}>{country}</option>)}</select></label>
            <label>Town or city<input required maxLength="100" autoComplete="address-level2" value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} placeholder="Your town or city" /></label>
            <div className="cart-total"><span>Order total</span><strong>{money(cartTotal)}</strong></div>
            <button className="button button-dark full-button" disabled={busy}>{busy ? 'Sending…' : 'Send for approval'} <Icon name="arrow" size={16} /></button>
            <button type="button" className="text-button" onClick={() => setCheckout(false)}>Back to your bag</button>
          </form> : <>
            <div className="cart-items">{cart.length ? cart.map((item) => {
              const product = products.find((piece) => piece.id === item.productId)
              if (!product) return null
              return <article className="cart-item" key={item.productId}><img src={getProductImage(product.image)} alt="" /><div className="cart-item-info"><span>{product.category}</span><strong>{product.name}</strong><span>{money(product.price)}</span><div className="quantity-control"><button onClick={() => updateQuantity(product.id, -1)} aria-label="Remove one">−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(product.id, 1)} aria-label="Add one">+</button></div></div><button className="remove-item" onClick={() => updateQuantity(product.id, -item.quantity)} aria-label={`Remove ${product.name}`}><Icon name="trash" size={17} /></button></article>
            }) : <div className="cart-empty"><Icon name="bag" size={28} /><p>Your next favorite is waiting.</p><button className="text-link" onClick={() => { setCartOpen(false); navigate('/shop') }}>Explore the collection <Icon name="arrow" size={15} /></button></div>}</div>
            {!!cart.length && <div className="cart-summary"><div className="cart-total"><span>Subtotal</span><strong>{money(cartTotal)}</strong></div><span className="shipping-note">Shipping calculated after your order is approved.</span><button className="button button-dark full-button" onClick={() => setCheckout(true)}>Continue to checkout <Icon name="arrow" size={16} /></button></div>}
          </>}
        </aside>
      </div>}

      {currentPage === '/admin/dashboard' && adminAuthenticated && <div className="overlay admin-overlay">
        <section className="admin-panel">
          <header className="admin-header"><button className="wordmark wordmark-button" onClick={() => navigate('/')} aria-label="Sankara Fashion Hub home"><img src="/mj-fashion-logo.svg" alt="Sankara Fashion Hub" /></button><span className="studio-label"><Icon name="shield" size={15} /> Private studio</span><button className="icon-button" onClick={() => navigate('/')} aria-label="Close studio"><Icon name="close" /></button></header>
          <div className="admin-layout">
            <aside className="admin-sidebar"><span className="eyebrow">Your studio</span><h2>Good things<br />in good order.</h2><button className={adminTab === 'products' ? 'admin-nav-item selected' : 'admin-nav-item'} onClick={() => setAdminTab('products')}><span>Collection</span><span>{products.length}</span></button><button className={adminTab === 'orders' ? 'admin-nav-item selected' : 'admin-nav-item'} onClick={() => setAdminTab('orders')}><span>Order approvals</span><span className={pendingOrders.length ? 'pending-count' : ''}>{pendingOrders.length}</span></button><button className={adminTab === 'reports' ? 'admin-nav-item selected' : 'admin-nav-item'} onClick={() => setAdminTab('reports')}><span>Reports</span></button><div className="admin-sidebar-bottom"><span>Signed in securely</span><button onClick={logoutAdmin}>Sign out</button></div></aside>
            <div className="admin-content">
              {adminTab === 'products' ? <><div className="admin-title-row"><div><span className="eyebrow">The things we make</span><h2>Collection</h2></div><span className="admin-count">{products.length} pieces</span></div>
                <form className="product-form" onSubmit={saveProduct}><div className="form-heading"><h3>{editingId ? 'Edit this piece' : 'Add a piece'}</h3>{editingId && <button className="text-button" type="button" onClick={() => { setEditingId(null); setProductForm({ name: '', category: 'Clothing', price: '', image: productImageOptions[0].value, description: '' }); setProductImageFile(null) }}>Cancel edit</button>}</div>
                  <label>Product name<input required maxLength="80" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="The everyday linen shirt" /></label>
                  <div className="form-two"><label>Category<select value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label><label>Price (RWF)<input required type="number" min="1" step="1" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} placeholder="128" /></label></div>
                  <label>Choose a supplied image<select required value={productForm.image} onChange={(event) => { setProductForm({ ...productForm, image: event.target.value }); setProductImageFile(null) }}><option value="">Select a local asset</option>{productForm.image.startsWith('/uploads/') && <option value={productForm.image}>Current uploaded image</option>}{productImageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  <label>Or upload an image from your device<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                    const file = event.target.files?.[0] || null
                    if (file && file.size > 4 * 1024 * 1024) {
                      event.target.value = ''
                      setProductImageFile(null)
                      setNotice('Choose an image smaller than 4 MB.')
                      return
                    }
                    setProductImageFile(file)
                  }} /></label>
                  <span className="product-image-help">{productImageFile ? `Selected: ${productImageFile.name}` : 'JPG, PNG or WebP, up to 4 MB.'}</span>
                  <label>Short description<textarea required maxLength="180" rows="2" value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="A few words on what makes it special…" /></label>
                  <button className="button button-dark" disabled={busy}>{editingId ? 'Save changes' : 'Add to collection'} <Icon name={editingId ? 'check' : 'plus'} size={16} /></button>
                </form>
                <div className="admin-products"><h3>All pieces <span>{products.length}</span></h3>{products.map((product) => <article className="admin-product-row" key={product.id}><img src={getProductImage(product.image)} alt="" /><div className="admin-product-name"><span>{product.category}</span><strong>{product.name}</strong></div><strong className="admin-price">{money(product.price)}</strong><button className="row-action" onClick={() => startEdit(product)} aria-label={`Edit ${product.name}`}><Icon name="edit" size={17} /></button><button className="row-action delete-action" onClick={() => deleteProduct(product)} aria-label={`Delete ${product.name}`}><Icon name="trash" size={17} /></button></article>)}</div>
              </> : adminTab === 'orders' ? <><div className="admin-title-row"><div><span className="eyebrow">A personal touch</span><h2>Order approvals</h2></div><span className="admin-count">{pendingOrders.length} awaiting you</span></div>
                <div className="orders-list">{orders.length ? orders.map((order) => <article className="order-card" key={order.id}>
                  <div className="order-heading"><div><span className="product-category">ORDER {order.id.slice(0, 8).toUpperCase()}</span><h3>{order.customer.name}</h3><span className="order-email">{order.customer.email}</span>{order.customer.phone && <span className="order-location">{order.customer.phone}</span>}{order.customer.city && order.customer.country && <span className="order-location">{order.customer.city}, {order.customer.country}</span>}</div><span className={order.status === 'pending' ? 'status-pill' : 'status-pill approved'}>{order.status}</span></div>
                  {order.status === 'pending' && <label className="order-arrival">Expected arrival (Kigali time)<input type="datetime-local" required value={orderArrivalTimes[order.id] || ''} onChange={(event) => setOrderArrivalTimes((current) => ({ ...current, [order.id]: event.target.value }))} /></label>}
                  {order.arrivalAt && <p className="order-arrival-confirmed">Expected arrival: {formatArrivalTime(order.arrivalAt)} (Kigali time)</p>}
                  {order.approvalEmail?.status === 'failed' && <div className="order-email-error" role="status"><span>Customer email failed: {order.approvalEmail.error}</span><button className="button" onClick={() => resendApprovalEmail(order.id)}>Retry email</button></div>}
                  {order.approvalEmail?.status === 'sent' && <p className="order-email-sent">Approval email sent to {order.customer.email}</p>}
                  <div className="order-lines">{order.items.map((item) => <div key={item.productId}><span>{item.name} <i>× {item.quantity}</i></span><strong>{money(item.price * item.quantity)}</strong></div>)}</div>
                  <div className="order-footer"><span>Order total</span><strong>{money(order.total)}</strong>{order.status === 'pending' && <button className="button button-dark" onClick={() => approveOrder(order.id)}>Approve order <Icon name="check" size={16} /></button>}<button className="button order-delete-button" onClick={() => deleteOrder(order)}>Delete order <Icon name="trash" size={15} /></button></div>
                </article>) : <div className="admin-empty"><Icon name="sparkle" size={24} /><h3>All caught up.</h3><p>New orders will find their way here.</p></div>}</div>
              </> : <section className="admin-report">
                <div className="admin-title-row report-heading"><div><img className="report-print-logo" src="/mj-fashion-logo-print.svg" alt="Sankara Fashion Hub" /><span className="eyebrow">Orders &amp; inventory</span><h2>Business report</h2><span className="report-date">Generated {new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date())}</span></div><div className="report-actions"><button className="button button-dark report-print-button" onClick={() => window.print()}><Icon name="print" size={16} /> Print report</button><button className="button report-reset-button" disabled={busy} onClick={resetRecords}><Icon name="trash" size={16} /> {busy ? 'Resetting…' : 'Reset all records'}</button></div></div>
                <div className="report-summary">
                  <article><span>Total orders</span><strong>{orders.length}</strong></article>
                  <article><span>Awaiting approval</span><strong>{pendingOrders.length}</strong></article>
                  <article><span>Approved orders</span><strong>{approvedOrders.length}</strong></article>
                  <article><span>Approved revenue</span><strong>{money(approvedRevenue)}</strong></article>
                </div>
                <h3 className="report-section-title">Order details</h3>
                {orders.length ? <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Order / date</th><th>Customer</th><th>Location</th><th>Items</th><th>Status</th><th>Total</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.id.slice(0, 8).toUpperCase()}</strong><span>{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(order.createdAt))}</span></td><td><strong>{order.customer.name}</strong><span>{order.customer.email}</span>{order.customer.phone && <span>{order.customer.phone}</span>}</td><td>{order.customer.city && order.customer.country ? `${order.customer.city}, ${order.customer.country}` : 'Not provided'}</td><td>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</td><td><span className={order.status === 'pending' ? 'status-pill' : 'status-pill approved'}>{order.status}</span></td><td>{money(order.total)}</td></tr>)}</tbody></table></div> : <div className="admin-empty"><Icon name="sparkle" size={24} /><h3>No orders yet.</h3><p>Order details will appear here after a customer checks out.</p></div>}
                <div className="report-inventory">
                  <div className="report-section-heading"><div><h3 className="report-section-title">Inventory management</h3><p>Receive new stock or record stock leaving inventory. Customer orders deduct automatically.</p></div></div>
                  <div className="report-summary inventory-summary">
                    <article><span>Products tracked</span><strong>{products.length}</strong></article>
                    <article><span>Total units in stock</span><strong>{totalStock}</strong></article>
                    <article><span>Out of stock</span><strong>{outOfStockProducts.length}</strong></article>
                  </div>
                  <form className="inventory-adjustment" onSubmit={updateInventory}>
                    <label>Product<select required value={inventoryForm.productId || products[0]?.id || ''} onChange={(event) => setInventoryForm({ ...inventoryForm, productId: event.target.value })}><option value="" disabled>Select a product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.stock} in stock</option>)}</select></label>
                    <label>Movement<select value={inventoryForm.direction} onChange={(event) => setInventoryForm({ ...inventoryForm, direction: event.target.value })}><option value="in">Stock in</option><option value="out">Stock out</option></select></label>
                    <label>Quantity<input type="number" min="1" step="1" required value={inventoryForm.quantity} onChange={(event) => setInventoryForm({ ...inventoryForm, quantity: event.target.value })} placeholder="Units" /></label>
                    <label>Reason<input required maxLength="120" value={inventoryForm.reason} onChange={(event) => setInventoryForm({ ...inventoryForm, reason: event.target.value })} placeholder="Delivery, damage, correction…" /></label>
                    <button className="button button-dark" disabled={busy || !products.length}>{busy ? 'Saving…' : 'Record movement'} <Icon name="check" size={16} /></button>
                  </form>
                  <h3 className="report-section-title">Current stock</h3>
                  <div className="report-table-wrap"><table className="report-table inventory-table"><thead><tr><th>Product</th><th>Category</th><th>Unit price</th><th>Available</th><th>Status</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong></td><td>{product.category}</td><td>{money(product.price)}</td><td>{product.stock}</td><td>{product.stock === 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock'}</td></tr>)}</tbody></table></div>
                  <h3 className="report-section-title movement-title">Stock movement history</h3>
                  {inventoryMovements.length ? <div className="report-table-wrap"><table className="report-table movement-table"><thead><tr><th>Date</th><th>Product</th><th>Movement</th><th>Quantity</th><th>Reason</th></tr></thead><tbody>{inventoryMovements.map((movement) => <tr key={movement.id}><td>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(movement.createdAt))}</td><td>{movement.productName}</td><td>{movement.direction === 'in' ? 'Stock in' : 'Stock out'}</td><td>{movement.direction === 'in' ? '+' : '−'}{movement.quantity}</td><td>{movement.reason}</td></tr>)}</tbody></table></div> : <div className="inventory-no-movements">Stock movements will appear here. The initial stock for existing products is zero.</div>}
                </div>
              </section>}
            </div>
          </div>
        </section>
      </div>}
    </div>
  )
}

export default App
