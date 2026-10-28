import { useState } from 'react'
import { editorialImages, getProductImage } from '../assets/images.js'
import coverVideo from '../assets/12.mp4'

const categories = ['All pieces', 'Clothing', 'Shoes', 'Bags']

function Arrow({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
}

export function HomePage({ products, loading, category, setCategory, query, setQuery, addToCart, money, onNavigate }) {
  return <>
    <section className="video-cover" aria-labelledby="video-cover-title">
      <img className="video-cover-poster" src={editorialImages.hero} alt="" />
      <video className="video-cover-background" autoPlay muted loop playsInline aria-hidden="true" poster={editorialImages.hero}>
        <source src={coverVideo} type="video/mp4" />
      </video>
      <div className="video-cover-shade" />
      <div className="video-cover-content">
        <span className="video-cover-eyebrow">Sankara Fashion Hub</span>
        <h1 id="video-cover-title">Dress well.<br /><em>Stay confident.</em></h1>
        <p>Find pieces that feel like you, and make every day your own.</p>
        <button className="button video-cover-button" onClick={() => onNavigate('/shop')}>Explore the collection <Arrow /></button>
      </div>
      <span className="video-cover-caption">Your style. Your story.</span>
    </section>
    <ShopPage products={products} loading={loading} category={category} setCategory={setCategory} query={query} setQuery={setQuery} addToCart={addToCart} money={money} isHome />
  </>
}

export function ShopPage({ products, loading, category, setCategory, query, setQuery, addToCart, money, isHome = false }) {
  const visibleProducts = products.filter((product) => {
    const matchesCategory = category === 'All pieces' || product.category === category
    const matchesQuery = `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  })

  return <section className={`collection section-wrap route-page${isHome ? ' home-collection' : ''}`} id="collection">
    <div className="section-heading"><div><span className="eyebrow">Welcome</span><h2>Your Styles </h2></div><p>Thoughtful things to wear,<br />and wear, and wear.</p></div>
    <div className="collection-tools">
      <div className="category-list" aria-label="Filter products by category">
        {categories.map((item) => <button key={item} className={category === item ? 'category-chip active' : 'category-chip'} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <label className="shop-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pieces" aria-label="Search pieces" />{query && <button onClick={() => setQuery('')} aria-label="Clear search">×</button>}</label>
    </div>
    {loading ? <div className="loading-state">Curating your collection…</div> : visibleProducts.length ? <div className="product-grid">
      {visibleProducts.map((product, index) => <article className="product-card" key={product.id}>
        <button className="product-image" onClick={() => addToCart(product)} disabled={product.stock === 0} aria-label={product.stock === 0 ? `${product.name} is out of stock` : `Add ${product.name} to bag`}>
          <img src={getProductImage(product.image)} alt={product.name} loading={index > 2 ? 'lazy' : 'eager'} />
          {product.tag && <span className="product-tag">{product.tag}</span>}
          <span className="quick-add">{product.stock === 0 ? 'Out of stock' : '＋　Quick add'}</span>
        </button>
        <div className="product-meta"><div><span className="product-category">{product.category}{product.stock === 0 ? ' · Out of stock' : ''}</span><h3>{product.name}</h3></div><span className="product-price">{money(product.price)}</span></div>
        <p className="product-description">{product.description}</p>
      </article>)}
    </div> : <div className="empty-state">No pieces match just yet. Try a different search.</div>}
    <div className="collection-note"><span>{visibleProducts.length} considered essentials</span><span>Every piece has a story. Yours starts here <Arrow size={15} /></span></div>
  </section>
}

function ValueStrip() {
  return <section className="values-strip"><span>Considered by design</span><i>✳</i><span>Made to last</span><i>✳</i><span>Always in good taste</span><i>✳</i><span>A lighter footprint</span></section>
}

export function StoryPage({ onNavigate }) {
  return <div className="route-page">
    <section className="story-intro section-wrap"><span className="eyebrow">The Sankara Fashion Hub point of view</span><h1>A good outfit should feel like <em>coming home.</em></h1><p>We believe the best wardrobes aren’t built in a hurry. They’re collected over time, made with care, and worn on repeat.</p></section>
    <section className="editorial section-wrap"><div className="editorial-photo"><img src={editorialImages.story} alt="Model in a relaxed street look" loading="lazy" /></div><div className="editorial-copy"><span className="eyebrow">Fewer, better things</span><h2>Made with care.<br /><em>Worn with feeling.</em></h2><p>Every piece earns its place. We work with considered materials and thoughtful makers to create clothes that feel good today and still feel right years from now.</p><button className="text-link" onClick={() => onNavigate('/shop')}>Find your forever pieces <Arrow /></button><span className="editorial-mark">f.</span></div></section>
    <ValueStrip />
    <section className="story-values section-wrap"><article><span>01</span><h2>Wear it often.</h2><p>We design for real life, with silhouettes you reach for without thinking twice.</p></article><article><span>02</span><h2>Know its story.</h2><p>Good design begins with knowing who made a piece and what it is made from.</p></article><article><span>03</span><h2>Keep it close.</h2><p>Less passing through. More things that become part of your everyday.</p></article></section>
  </div>
}

export function JournalPage({ onNavigate }) {
  return <section className="journal-page route-page section-wrap">
    <span className="eyebrow">Notes on getting dressed</span><h1>The Sankara Fashion Hub journal.</h1><p className="journal-lede">Little thoughts on personal style, good materials, and making the most of what you already own.</p>
    <div className="journal-grid">
      <article className="journal-card journal-feature"><img src={editorialImages.journalWardrobe} alt="Model in a relaxed look by the waterfront" /><div><span className="eyebrow">A thoughtful wardrobe · 5 min read</span><h2>Fewer things. A hundred more ways to wear them.</h2><p>The quiet joy of knowing your wardrobe, finding your own combinations, and wearing the good stuff on a Tuesday.</p><button className="text-link" onClick={() => onNavigate('/story')}>Read our point of view <Arrow /></button></div></article>
      <article className="journal-card"><img src={editorialImages.journalGettingReady} alt="Model wearing an embroidered white occasion dress" loading="lazy" /><div><span className="eyebrow">Getting dressed · 3 min read</span><h2>The art of getting ready slowly.</h2><p>When you leave room for a little ease, getting dressed becomes part of the day you look forward to.</p></div></article>
      <article className="journal-card"><img src={editorialImages.journalCare} alt="Model in a relaxed street look" loading="lazy" /><div><span className="eyebrow">Care & keeping · 4 min read</span><h2>Let the good things last.</h2><p>Small habits that give your most-loved pieces another season, and the one after that.</p></div></article>
    </div>
    <div className="journal-bottom"><span>Good things are worth a second look.</span><button className="text-link" onClick={() => onNavigate('/shop')}>Browse the collection <Arrow /></button></div>
  </section>
}

export function ContactPage({ setNotice }) {
  const [sent, setSent] = useState(false)
  function submitContact(event) {
    event.preventDefault()
    setSent(true)
    setNotice('Thanks for your note. We’ll be in touch soon.')
    event.currentTarget.reset()
  }
  return <section className="contact-page route-page section-wrap">
    <div className="contact-intro"><span className="eyebrow">let race</span><h1>Let’s talk.</h1><p>Questions about a piece, an order, or just want to say hello? We’d love to hear from you.</p>
      <div className="contact-links">
        <a href="https://www.instagram.com/sankara.dan/" target="_blank" rel="noreferrer"><span>Instagram</span><span>Sankara Dan <Arrow /></span></a>
        <a href="https://wa.me/250781536322" target="_blank" rel="noreferrer"><span>WhatsApp</span><span>+250 781 536 322 <Arrow /></span></a>
        <a href="mailto:danisankara0@gmail.com"><span>Email</span><span>danisankara0@gmail.com <Arrow /></span></a>
        <a href="https://www.google.com/maps/search/?api=1&query=Kigali+City+Tower%2C+Kigali%2C+Rwanda" target="_blank" rel="noreferrer"><span>Visit</span><span>Kigali City Tower, Kigali, Rwanda <Arrow /></span></a>
      </div>
      <span className="contact-hours">Usually back within one working day.<br />Monday–Friday, 9am–5pm.</span>
      <figure className="contact-poster"><img src={editorialImages.contact} alt="Sankara Fashion Hub contact information and Kigali location" /></figure>
    </div>
    <form className="contact-form" onSubmit={submitContact}><h2>{sent ? 'Thanks for reaching out.' : 'Write us a little note.'}</h2><label>Your name<input required autoComplete="name" name="name" /></label><label>Email address<input type="email" required autoComplete="email" name="email" /></label><label>What’s on your mind?<select name="topic"><option>Something about an order</option><option>A question about a piece</option><option>A little hello</option></select></label><label>Your message<textarea required rows="5" name="message" /></label><button className="button button-dark">Send your note <Arrow /></button></form>
  </section>
}

export function AdminLoginPage({ loginAdmin, loginError, busy, navigate }) {
  return <section className="admin-login-page route-page">
    <div className="admin-login-card">
      <span className="eyebrow">✧ &nbsp; </span><h1>Good to<br />see you.</h1>
      <p>Sign in to manage the collection, set prices and personally review new orders.</p>
      <form onSubmit={loginAdmin}>
        <label>Admin email<input type="email" name="email" required autoComplete="username" /></label>
        <label>Password<input type="password" name="password" required autoComplete="current-password" autoFocus /></label>
        {loginError && <div className="form-error" role="alert">{loginError}</div>}
        <button className="button button-dark full-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <Arrow /></button>
      </form>
      <span className="admin-login-note">Only an authorized  administrator can update the collection or approve orders.</span>
      <button className="back-store-link" onClick={() => navigate('/')}>← &nbsp; Back to your Dashboard</button>
    </div>
    <div className="admin-login-photo"><img src={editorialImages.admin} alt="Sankara Fashion Hub studio" /></div>
  </section>
}

function Newsletter() {
  return <section className="newsletter"><span className="eyebrow"></span><h2>A little note, now & then.</h2><p>New things, good things, and thoughts on getting dressed. Never noise.</p><form onSubmit={(event) => { event.preventDefault(); event.currentTarget.reset() }}><input type="email" required placeholder="Your email address" aria-label="Your email address" /><button type="submit" aria-label="Subscribe"><Arrow /></button></form><small>By subscribing, you agree to our very occasional emails.</small></section>
}
