import { useState, useEffect, useMemo, useRef } from 'react'
import { ShoppingCart, Plus, Minus, X, PackageOpen } from 'lucide-react'
import { productsApi, type Product, type ProductCategory } from '../products/products.api'
import { salesApi } from './sales.api'
import { paymentsService, type PaymentMethodDTO } from '../payments/payments.service'
import { invoicesService } from '../invoices/invoices.service'
import { usePrint } from '../../contexts/PrintContext'
import { Button, SearchBar, useToast, PageLoader, Alert, EmptyState } from '../../components/ui'

interface CartItem extends Product {
  cartQuantity: number
}

interface PaymentRow {
  methodId: number
  amount: string
}

export default function SalesPOSPage() {
  const { showToast } = useToast()
  const { printInvoice } = usePrint()
  
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDTO[]>([])
  
  const [activeCategory, setActiveCategory] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  
  const [payments, setPayments] = useState<PaymentRow[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true
      fetchData()
    }
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      setError(null)
      const [pRes, cRes, pmRes] = await Promise.all([
        productsApi.getProducts(),
        productsApi.getCategories(),
        paymentsService.listMethods()
      ])
      // Filter out inactive products
      setProducts(pRes.data.filter((p: any) => p.isActive))
      setCategories(cRes.data)
      setPaymentMethods(pmRes.data.filter((pm: any) => pm.isActive))
    } catch {
      setError('حدث خطأ أثناء تحميل بيانات نقطة البيع')
    } finally {
      setLoading(false)
    }
  }

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0), [cart])
  const paymentsTotal = useMemo(() => payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0), [payments])
  const remaining = cartTotal - paymentsTotal

  const filteredProducts = products.filter(p => {
    if (activeCategory && p.categoryId !== activeCategory) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return p.nameAr.toLowerCase().includes(term) || p.name.toLowerCase().includes(term) || (p.barcode && p.barcode.includes(term))
    }
    return true
  })

  function addToCart(product: Product) {
    if (product.stockQuantity <= 0) {
      showToast({ type: 'error', title: 'المنتج غير متوفر في المخزون' })
      return
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        if (existing.cartQuantity >= product.stockQuantity) {
          showToast({ type: 'error', title: 'الكمية المطلوبة أكبر من المتوفر' })
          return prev
        }
        return prev.map(i => i.id === product.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i)
      }
      return [...prev, { ...product, cartQuantity: 1 }]
    })
  }

  function removeFromCart(productId: number) {
    setCart(prev => prev.filter(i => i.id !== productId))
  }

  function updateCartQuantity(productId: number, delta: number) {
    setCart(prev => prev.map(item => {
      if (item.id !== productId) return item
      const newQty = item.cartQuantity + delta
      if (newQty <= 0) return item // use remove button instead
      if (newQty > item.stockQuantity) {
        showToast({ type: 'error', title: 'الكمية المطلوبة أكبر من المتوفر' })
        return item
      }
      return { ...item, cartQuantity: newQty }
    }))
  }

  function addPaymentRow() {
    if (paymentMethods.length === 0) return
    setPayments(prev => [...prev, { methodId: paymentMethods[0].id, amount: remaining > 0 ? remaining.toFixed(2) : '' }])
  }

  function updatePaymentRow(index: number, field: string, value: any) {
    setPayments(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  function removePaymentRow(index: number) {
    setPayments(payments.filter((_, i) => i !== index))
  }

  async function handleCompleteSale() {
    if (cart.length === 0) return showToast({ type: 'error', title: 'السلة فارغة' })
    if (payments.length === 0) return showToast({ type: 'error', title: 'يجب إضافة طريقة دفع واحدة على الأقل' })
    if (Math.abs(cartTotal - paymentsTotal) > 0.01) return showToast({ type: 'error', title: 'إجمالي المدفوعات لا يساوي قيمة الفاتورة' })
    if (payments.some(p => parseFloat(p.amount) <= 0 || isNaN(parseFloat(p.amount)))) {
      return showToast({ type: 'error', title: 'يوجد مبالغ دفع غير صحيحة' })
    }

    try {
      setSubmitting(true)
      const res = await salesApi.createSale({
        items: cart.map(c => ({ productId: c.id, quantity: c.cartQuantity })),
        payments: payments.map(p => ({
          paymentMethodId: p.methodId,
          amount: parseFloat(p.amount)
        }))
      })
      showToast({ type: 'success', title: `تم إنشاء الفاتورة بنجاح: ${res.data.saleCode}` })
      
      // Auto-print sale invoice
      try {
        const invoiceData = await invoicesService.getSaleInvoice(res.data.id)
        printInvoice(invoiceData)
      } catch (err) {
        showToast({ type: 'error', title: 'فشلت طباعة الفاتورة' })
      }

      setCart([])
      setPayments([])
      fetchData() // refresh stock
    } catch (err: any) {
      showToast({ type: 'error', title: err.response?.data?.error?.message || 'فشل إنشاء الفاتورة' })
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading && !products.length) {
    return <PageLoader label="جارٍ تحميل بيانات نقطة البيع" />
  }

  // Error state
  if (error && !products.length) {
    return (
      <div className="page-container">
        <Alert variant="danger">
          {error}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button onClick={() => { fetchedRef.current = false; fetchData() }} variant="secondary">إعادة المحاولة</Button>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="page-container sales-pos-page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height))' }}>
      {/* Page Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div className="page-header-text">
          <h1 className="page-header-title">نقطة البيع</h1>
          <p className="page-header-subtitle">إنشاء فواتير بيع للمنتجات والمشروبات</p>
        </div>
      </div>

      {/* POS Layout: Product Area + Cart Panel */}
      <div className="sales-pos-workspace" style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}>
        {/* Main Product Area */}
        <div className="sales-pos-catalog" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, padding: 'var(--space-5)', overflow: 'hidden' }}>
          
          {/* Search & Categories Toolbar */}
          <div className="sales-pos-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)', flexShrink: 0 }}>
            <div className="sales-pos-search" style={{ width: '280px', flexShrink: 0 }}>
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="البحث بالباركود أو اسم المنتج..."
                onClear={() => setSearchTerm('')}
              />
            </div>
            <div className="sales-pos-categories" style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', flex: 1, alignItems: 'center' }}>
              <Button 
                variant={activeCategory === null ? 'primary' : 'secondary'} 
                size="sm" 
                onClick={() => setActiveCategory(null)}
              >
                الكل
              </Button>
              {categories.map(c => (
                <Button 
                  key={c.id} 
                  variant={activeCategory === c.id ? 'primary' : 'secondary'} 
                  size="sm"
                  onClick={() => setActiveCategory(c.id)}
                >
                  {c.nameAr}
                </Button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="sales-pos-products" style={{ flex: 1, overflowY: 'auto' }}>
            {products.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title="لا توجد منتجات"
                description="أضف منتجات أولاً من صفحة المنتجات لبدء البيع."
              />
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon={PackageOpen}
                title="لا توجد منتجات مطابقة"
                description="جرّب تغيير عوامل التصفية أو البحث."
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-4)' }}>
                {filteredProducts.map(p => {
                  const outOfStock = p.stockQuantity <= 0
                  return (
                    <button 
                      key={p.id} 
                      onClick={() => { if (!outOfStock) addToCart(p) }}
                      disabled={outOfStock}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        textAlign: 'right',
                        backgroundColor: 'var(--color-white)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-xs)',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-lg)',
                        cursor: outOfStock ? 'not-allowed' : 'pointer',
                        opacity: outOfStock ? 0.5 : 1,
                        transition: 'box-shadow var(--transition-fast), transform var(--transition-fast), border-color var(--transition-fast)',
                        fontFamily: 'var(--font-family-base)',
                      }}
                      onMouseEnter={e => { if (!outOfStock) { e.currentTarget.style.borderColor = 'var(--color-navy-300)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.transform = 'none' }}
                    >
                      <div style={{
                        aspectRatio: '4/3',
                        backgroundColor: 'var(--color-page-bg)',
                        borderRadius: 'var(--radius-base)',
                        marginBottom: 'var(--space-3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <ShoppingCart style={{ color: 'var(--color-text-muted)', opacity: 0.35 }} size={28} />
                      </div>
                      <h4 className="sales-pos-product-name" style={{
                        fontWeight: 'var(--font-weight-semibold)' as any,
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-navy-800)',
                        lineHeight: 'var(--line-height-tight)',
                        marginBottom: 'var(--space-2)',
                        height: '2.5em',
                        overflow: 'hidden',
                      }} title={p.nameAr}>
                        {p.nameAr}
                      </h4>
                      <div className="sales-pos-product-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: 'var(--space-1)' }}>
                        <span style={{ color: 'var(--color-navy-800)', fontWeight: 'var(--font-weight-bold)' as any, fontSize: 'var(--font-size-base)' }} dir="ltr">{p.price} ج.م</span>
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-medium)' as any,
                          color: 'var(--color-text-muted)',
                          backgroundColor: 'var(--color-page-bg)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                        }}>{p.stockQuantity} متوفر</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="sales-pos-cart" style={{
          width: '360px',
          flexShrink: 0,
          backgroundColor: 'var(--color-page-bg)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Cart Header */}
          <div style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-navy-800)',
            color: 'var(--color-white)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <h3 className="sales-pos-cart-title" style={{ fontWeight: 'var(--font-weight-semibold)' as any, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-lg)', margin: 0 }}>
              <ShoppingCart size={20} /> السلة الحالية
            </h3>
            <span style={{
              backgroundColor: 'var(--color-navy-700)',
              padding: '2px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-bold)' as any,
            }}>
              {cart.reduce((s, i) => s + i.cartQuantity, 0)} عنصر
            </span>
          </div>

          {/* Cart Items */}
          <div className="sales-pos-cart-items" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {cart.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                <ShoppingCart size={48} style={{ opacity: 0.2, marginBottom: 'var(--space-3)' }} />
                <p style={{ fontWeight: 'var(--font-weight-medium)' as any, margin: 0 }}>السلة فارغة</p>
                <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)', opacity: 0.7 }}>قم بإضافة منتجات للبدء</p>
              </div>
            ) : cart.map(item => (
              <div key={item.id} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-xs)',
                position: 'relative',
              }}>
                <div className="sales-pos-cart-item-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)', paddingLeft: 'var(--space-6)' }}>
                  <span style={{ fontWeight: 'var(--font-weight-semibold)' as any, fontSize: 'var(--font-size-sm)', color: 'var(--color-navy-800)' }}>{item.nameAr}</span>
                  <span style={{ fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--color-navy-800)', flexShrink: 0 }} dir="ltr">{item.price * item.cartQuantity} ج.م</span>
                  <button
                    aria-label={`حذف ${item.nameAr} من السلة`}
                    onClick={() => removeFromCart(item.id)} 
                    style={{
                      position: 'absolute', top: 'var(--space-3)', left: 'var(--space-3)',
                      color: 'var(--color-text-muted)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '2px',
                    backgroundColor: 'var(--color-page-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-base)',
                    padding: '2px',
                  }}>
                    <button aria-label={`تقليل كمية ${item.nameAr}`} onClick={() => updateCartQuantity(item.id, -1)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: 'var(--radius-sm)' }}><Minus size={14} /></button>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)' as any, width: '32px', textAlign: 'center', color: 'var(--color-navy-800)' }}>{item.cartQuantity}</span>
                    <button aria-label={`زيادة كمية ${item.nameAr}`} onClick={() => updateCartQuantity(item.id, 1)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: 'var(--radius-sm)' }}><Plus size={14} /></button>
                  </div>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' as any, color: 'var(--color-text-muted)' }}>{item.price} ج.م / وحدة</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals & Payment */}
          <div style={{ flexShrink: 0, backgroundColor: 'var(--color-white)', borderTop: '1px solid var(--color-border)', boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Total */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' as any,
                color: 'var(--color-navy-800)',
                backgroundColor: 'var(--color-page-bg)', padding: 'var(--space-3)',
                borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border)',
              }}>
                <span>الإجمالي:</span>
                <span style={{ fontSize: 'var(--font-size-xl)', color: 'var(--color-navy-800)' }} dir="ltr">{cartTotal} ج.م</span>
              </div>

              {/* Payments */}
              <div style={{ paddingTop: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--color-text-primary)' }}>المدفوعات</span>
                  <Button variant="secondary" size="sm" onClick={addPaymentRow} disabled={remaining <= 0}>
                    <Plus size={14} /> إضافة دفعة
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  {payments.map((p, idx) => (
                    <div key={idx} className="sales-pos-payment-row" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                      <select 
                        aria-label={`طريقة دفع الدفعة ${idx + 1}`}
                        className="field-control" 
                        style={{ flex: 1, height: '36px', fontSize: 'var(--font-size-sm)' }}
                        value={p.methodId} 
                        onChange={e => updatePaymentRow(idx, 'methodId', parseInt(e.target.value))}
                      >
                        {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                      </select>
                      <input 
                        aria-label={`مبلغ الدفعة ${idx + 1}`}
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={p.amount} 
                        onChange={(e: any) => updatePaymentRow(idx, 'amount', e.target.value)}
                        placeholder="المبلغ"
                        className="field-control"
                        style={{ width: '96px', height: '36px', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}
                        dir="ltr"
                      />
                      <button aria-label={`حذف الدفعة ${idx + 1}`} onClick={() => removePaymentRow(idx)} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: 'var(--radius-full)' }}>
                        <X size={16}/>
                      </button>
                    </div>
                  ))}
                </div>

                {payments.length > 0 && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)' as any,
                    padding: 'var(--space-3)', borderRadius: 'var(--radius-base)',
                    border: '1px solid',
                    backgroundColor: Math.abs(remaining) < 0.01 ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                    color: Math.abs(remaining) < 0.01 ? 'var(--color-success-text)' : 'var(--color-warning-text)',
                    borderColor: Math.abs(remaining) < 0.01 ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                  }}>
                    <span>المتبقي:</span>
                    <span dir="ltr">{remaining.toFixed(2)} ج.م</span>
                  </div>
                )}
              </div>

              <Button 
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleCompleteSale} 
                disabled={submitting || cart.length === 0 || Math.abs(remaining) > 0.01}
                loading={submitting}
                style={{ marginTop: 'var(--space-2)' }}
              >
                إتمام البيع
              </Button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media screen and (min-width: 1024px) {
          .sales-pos-page { min-height: 40rem; }
          .sales-pos-workspace { min-width: 0; }
          .sales-pos-page .sales-pos-catalog { overflow-y: auto !important; }
          .sales-pos-page .sales-pos-toolbar { gap: var(--space-3) !important; }
          .sales-pos-page .sales-pos-search { width: 100% !important; min-width: 0; }
          .sales-pos-search .searchbar { min-width: 0; max-width: none; width: 100%; }
          .sales-pos-page .sales-pos-categories {
            flex: 1 0 100% !important;
            flex-wrap: wrap;
            overflow: visible !important;
          }
          .sales-pos-categories .btn { max-width: 100%; white-space: normal; }
          .sales-pos-page .sales-pos-products { flex: 0 0 auto !important; overflow: visible !important; }
          .sales-pos-page .sales-pos-product-name {
            height: auto !important;
            min-height: 2.5em;
            overflow: visible !important;
            overflow-wrap: anywhere;
          }
          .sales-pos-product-meta { flex-wrap: wrap; gap: var(--space-2); }
          .sales-pos-page .sales-pos-cart {
            width: clamp(18rem, 36%, 22.5rem) !important;
            min-width: 0;
            overflow-y: auto;
          }
          .sales-pos-cart .sales-pos-cart-title { color: var(--color-text-inverse); }
          .sales-pos-page .sales-pos-cart-items { flex: 1 0 auto !important; overflow: visible !important; }
          .sales-pos-cart-item-heading { flex-wrap: wrap; }
          .sales-pos-cart-item-heading > span:first-child { min-width: 0; overflow-wrap: anywhere; }
          .sales-pos-payment-row > select { min-width: 0; }
          .sales-pos-payment-row > input { flex-shrink: 0; }
          .sales-pos-payment-row > button { flex-shrink: 0; }
        }
      `}</style>
    </div>
  )
}
