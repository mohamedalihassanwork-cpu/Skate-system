import { useState, useEffect, useRef } from 'react'
import { Plus, Edit, Package, RefreshCw } from 'lucide-react'
import { productsApi, type Product, type ProductCategory } from './products.api'
import {
  Button,
  Input,
  Select,
  Modal,
  Badge,
  SearchBar,
  DataTable,
  PageLoader,
  Alert,
  useToast,
  type TableColumn,
} from '../../components/ui'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency } from '../../utils/currency'

export default function ProductsPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('products.manage')
  const { showToast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newCatName, setNewCatName] = useState('')
  const [newCatNameAr, setNewCatNameAr] = useState('')

  const [searchTerm, setSearchTerm] = useState('')

  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    categoryId: '',
    price: '',
    stockQuantity: '',
    barcode: ''
  })

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
      const [pRes, cRes] = await Promise.all([
        productsApi.getProducts(),
        productsApi.getCategories()
      ])
      setProducts(pRes.data)
      setCategories(cRes.data)
    } catch {
      setError('حدث خطأ أثناء تحميل المنتجات. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatNameAr) return
    try {
      await productsApi.createCategory({ name: newCatName, nameAr: newCatNameAr })
      showToast({ type: 'success', title: 'تمت إضافة الفئة بنجاح' })
      setNewCatName('')
      setNewCatNameAr('')
      setShowCategoryModal(false)
      fetchData()
    } catch {
      showToast({ type: 'error', title: 'خطأ في إضافة الفئة' })
    }
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: formData.name,
      nameAr: formData.nameAr,
      categoryId: parseInt(formData.categoryId),
      price: parseFloat(formData.price),
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      barcode: formData.barcode || undefined
    }

    try {
      if (editingProductId) {
        await productsApi.updateProduct(editingProductId, payload)
        showToast({ type: 'success', title: 'تم تحديث المنتج بنجاح' })
      } else {
        await productsApi.createProduct(payload)
        showToast({ type: 'success', title: 'تمت إضافة المنتج بنجاح' })
      }
      setShowProductModal(false)
      setEditingProductId(null)
      fetchData()
      setFormData({ name: '', nameAr: '', categoryId: '', price: '', stockQuantity: '', barcode: '' })
    } catch (err: any) {
      if (err.response?.data?.error?.code === 'STOCK_CANNOT_BE_NEGATIVE') {
        showToast({ type: 'error', title: 'رصيد المخزون لا يمكن أن يكون سالباً' })
      } else {
        showToast({ type: 'error', title: 'خطأ في حفظ المنتج' })
      }
    }
  }

  function editProduct(p: Product) {
    setEditingProductId(p.id)
    setFormData({
      name: p.name,
      nameAr: p.nameAr,
      categoryId: p.categoryId.toString(),
      price: p.price.toString(),
      stockQuantity: p.stockQuantity.toString(),
      barcode: p.barcode || ''
    })
    setShowProductModal(true)
  }

  const filteredProducts = products.filter(p => 
    p.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  )

  // Table columns definition — uses DataTable.
  // `priority` drives the stacked phone/tablet card layout: the first column
  // pairs with the name as the card's identity line, the rest become labelled
  // fields, and the headerless action column moves to the card footer.
  const columns: TableColumn<any>[] = [
    {
      key: 'id',
      header: 'الكود',
      width: '80px',
      priority: 'primary',
      render: (_, r: any) => (
        <span style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
          #{r.id}
        </span>
      )
    },
    {
      key: 'nameAr',
      header: 'اسم المنتج',
      priority: 'primary',
      render: (_, r: any) => (
        <span style={{ fontWeight: 'var(--font-weight-semibold)' as any, color: 'var(--color-navy-800)' }}>
          {r.nameAr}
        </span>
      )
    },
    {
      key: 'category',
      header: 'الفئة',
      priority: 'secondary',
      render: (_, r: any) => {
        const cat = categories.find(c => c.id === r.categoryId)
        return cat?.nameAr || '—'
      }
    },
    {
      key: 'price',
      header: 'السعر',
      priority: 'secondary',
      render: (_, r: any) => (
        <span style={{ fontWeight: 'var(--font-weight-bold)' as any, color: 'var(--color-navy-800)' }} dir="ltr">
          {formatCurrency(r.price)}
        </span>
      )
    },
    {
      key: 'stock',
      header: 'المخزون',
      align: 'center' as const,
      priority: 'secondary',
      render: (_, r: any) => (
        <Badge status={r.stockQuantity > 0 ? 'available' : 'damaged'}>
          {r.stockQuantity}
        </Badge>
      )
    },
    ...(canManage ? [{
      key: 'actions',
      header: '',
      width: '80px',
      align: 'center' as const,
      priority: 'actions' as const,
      render: (_: any, r: any) => (
        <Button variant="ghost" size="sm" onClick={() => editProduct(r)} title="تعديل">
          <Edit size={16} aria-hidden="true" />
        </Button>
      )
    }] : [])
  ]

  // Category select options for the product form
  const categoryOptions = categories.map(c => ({ value: String(c.id), label: c.nameAr }))

  // Loading state
  if (loading && !products.length) {
    return <PageLoader label="جارٍ تحميل المنتجات" />
  }

  // Error state
  if (error && !products.length) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="page-header-text">
            <h1 className="page-header-title">المنتجات</h1>
          </div>
        </div>
        <Alert variant="danger">
          {error}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Button onClick={() => { fetchedRef.current = false; fetchData() }} variant="secondary">
              إعادة المحاولة
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1 className="page-header-title">المنتجات</h1>
          <p className="page-header-subtitle">
            {loading ? '...' : `${products.length} منتج — إدارة المنتجات وأرصدة المخزون والتصنيفات`}
          </p>
        </div>
        {canManage && (
          <div className="mobile-page-actions" style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={() => setShowCategoryModal(true)}>
              <Plus size={16} aria-hidden="true" />
              فئة جديدة
            </Button>
            <Button variant="primary" onClick={() => {
              setEditingProductId(null)
              setFormData({ name: '', nameAr: '', categoryId: '', price: '', stockQuantity: '', barcode: '' })
              setShowProductModal(true)
            }}>
              <Plus size={16} aria-hidden="true" />
              إضافة منتج
            </Button>
          </div>
        )}
      </div>

      {/* Filters Row */}
      <div className="filters-row">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="بحث بالاسم أو الباركود..."
          onClear={() => setSearchTerm('')}
        />
        <Button
          variant="secondary"
          size="base"
          onClick={() => { fetchedRef.current = false; fetchData() }}
          aria-label="تحديث القائمة"
        >
          <RefreshCw size={16} aria-hidden="true" />
        </Button>
      </div>

      {/* Data Table — stacked cards on phone/tablet, table from 1024px up */}
      <DataTable
        columns={columns}
        data={filteredProducts as any[]}
        mobileLayout="cards"
        emptyMessage={searchTerm ? 'لا توجد منتجات مطابقة للبحث' : 'لم يتم إضافة أي منتجات بعد'}
        emptyIcon={Package}
      />

      {/* Product Modal */}
      <Modal 
        isOpen={showProductModal} 
        onClose={() => setShowProductModal(false)}
        title={editingProductId ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
        size="base"
        footer={
          <>
            <Button type="submit" form="product-form" variant="primary">
              حفظ المنتج
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowProductModal(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSaveProduct} noValidate>
          <div className="form-grid-2col">
            <Input id="nameAr" label="الاسم بالعربي *" required value={formData.nameAr} onChange={(e: any) => setFormData({ ...formData, nameAr: e.target.value })} />
            <Input id="name" label="الاسم بالإنجليزي" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          
          <Select
            id="productCategory"
            label="الفئة *"
            value={formData.categoryId}
            onChange={(e: any) => setFormData({ ...formData, categoryId: e.target.value })}
            options={[{ value: '', label: 'اختر الفئة...' }, ...categoryOptions]}
          />

          <div className="form-grid-2col">
            <Input id="price" label="السعر (ج.م) *" type="number" step="0.01" min="0" required value={formData.price} onChange={(e: any) => setFormData({ ...formData, price: e.target.value })} />
            <Input id="stockQuantity" label="المخزون *" type="number" min="0" required value={formData.stockQuantity} onChange={(e: any) => setFormData({ ...formData, stockQuantity: e.target.value })} />
          </div>
          <Input id="barcode" label="الباركود (اختياري)" value={formData.barcode} onChange={(e: any) => setFormData({ ...formData, barcode: e.target.value })} />
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="إضافة فئة جديدة"
        size="sm"
        footer={
          <>
            <Button type="submit" form="category-form" variant="primary">إضافة الفئة</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCategoryModal(false)}>إلغاء</Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleAddCategory} noValidate>
          <Input id="newCatNameAr" label="اسم الفئة بالعربي *" placeholder="مثال: مشروبات" required value={newCatNameAr} onChange={(e: any) => setNewCatNameAr(e.target.value)} />
          <Input id="newCatName" label="اسم الفئة بالإنجليزي" placeholder="مثال: Beverages" value={newCatName} onChange={(e: any) => setNewCatName(e.target.value)} />
        </form>
      </Modal>
      <style>{`
        @media screen and (min-width: 1024px) {
          #product-form, #category-form { display: flex; flex-direction: column; gap: var(--space-4); }
        }
      `}</style>
    </div>
  )
}
