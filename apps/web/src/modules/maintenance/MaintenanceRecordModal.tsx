import { useState, useEffect } from 'react'
import { Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Modal } from '../../components/ui/Modal'
import { Input, Select, Textarea } from '../../components/ui/FormFields'
import { PageLoader } from '../../components/ui/Loading'
import { useAuth } from '../../contexts/AuthContext'
import { maintenanceService, type MaintenanceRecord } from './maintenance.service'

interface MaintenanceRecordModalProps {
  recordId?: number
  onClose: () => void
  onSave: () => void
}

export default function MaintenanceRecordModal({ recordId, onClose, onSave }: MaintenanceRecordModalProps) {
  const { hasPermission } = useAuth()
  const isNew = !recordId

  const [record, setRecord] = useState<MaintenanceRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [skatesList, setSkatesList] = useState<any[]>([])
  const [skateId, setSkateId] = useState<string>('')
  const [problemDescription, setProblemDescription] = useState('')
  const [repairDescription, setRepairDescription] = useState('')
  const [laborCost, setLaborCost] = useState<string>('')
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending')

  // Part form
  const [partName, setPartName] = useState('')
  const [partQty, setPartQty] = useState('1')
  const [partUnitCost, setPartUnitCost] = useState('')

  useEffect(() => {
    if (recordId) {
      loadRecord(recordId, true)
    }
    if (isNew) {
      import('../skates/skates.service').then(m => {
        m.skatesService.list({ perPage: '500' })
          .then(res => setSkatesList(res.data))
          .catch(console.error)
      })
    }
  }, [recordId, isNew])

  const loadRecord = async (id: number, initial: boolean = false) => {
    try {
      setLoading(true)
      setError(null)
      const data = await maintenanceService.getMaintenanceRecord(id)
      setRecord(data)
      if (initial) {
        setSkateId(String(data.skateId))
        setProblemDescription(data.problemDescription || '')
        setRepairDescription(data.repairDescription || '')
        setLaborCost(data.laborCost === '0.00' ? '' : data.laborCost)
        setStatus(data.status as any)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'فشل تحميل بيانات السجل')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // If the user selected "completed" from the dropdown, route to the complete logic
      if (!isNew && status === 'completed' && record?.status !== 'completed') {
        if (!repairDescription) {
          setError('يجب إدخال وصف الإصلاح قبل إغلاق الطلب')
          setSaving(false)
          return
        }
        await maintenanceService.completeMaintenanceRecord(recordId!, { repairDescription })
        // Also update labor cost and problem description if they changed
        await maintenanceService.updateMaintenanceRecord(recordId!, {
          laborCost: laborCost ? Number(laborCost) : undefined,
          problemDescription
        })
        onSave()
        return
      }

      if (isNew) {
        if (!skateId) {
          setError('يرجى اختيار الاسكيت')
          setSaving(false)
          return
        }
        await maintenanceService.createMaintenanceRecord({
          skateId: Number(skateId),
          problemDescription
        })
      } else {
        await maintenanceService.updateMaintenanceRecord(recordId, {
          laborCost: laborCost ? Number(laborCost) : undefined,
          problemDescription,
          repairDescription,
          status: status as any
        })
      }
      onSave()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'حدث خطأ أثناء الحفظ')
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!repairDescription) {
      setError('يجب إدخال وصف الإصلاح قبل إغلاق الطلب')
      return
    }
    try {
      setSaving(true)
      setError(null)
      await maintenanceService.completeMaintenanceRecord(recordId!, { repairDescription })
      onSave()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'حدث خطأ أثناء الإغلاق')
      setSaving(false)
    }
  }

  const handleAddPart = async () => {
    try {
      setSaving(true)
      setError(null)
      await maintenanceService.addMaintenancePart(recordId!, {
        partName,
        quantity: Number(partQty),
        unitCost: Number(partUnitCost)
      })
      setPartName('')
      setPartQty('1')
      setPartUnitCost('')
      await loadRecord(recordId!, false)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'فشل إضافة قطعة الغيار')
    } finally {
      setSaving(false)
    }
  }

  const handleRemovePart = async (partId: number) => {
    try {
      setSaving(true)
      setError(null)
      await maintenanceService.removeMaintenancePart(recordId!, partId)
      await loadRecord(recordId!, false)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'فشل حذف القطعة')
    } finally {
      setSaving(false)
    }
  }

  const isCompleted = record?.status === 'completed'
  const canEdit = !isCompleted && hasPermission('maintenance.edit')

  return (
    <Modal
      title={isNew ? 'إضافة سجل صيانة' : `سجل صيانة #${record?.id} — ${record?.skateCode}`}
      isOpen={true}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex justify-between w-full">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            إغلاق
          </Button>
          {!isCompleted && (
            <div className="flex gap-2">
              {hasPermission('maintenance.complete') && !isNew && (
                <Button
                  variant="primary"
                  className="bg-success-text hover:bg-green-700 text-white border-none"
                  disabled={saving}
                  onClick={handleComplete}
                >
                  <CheckCircle2 size={18} />
                  إغلاق الطلب وإتاحة الاسكيت
                </Button>
              )}
              {(hasPermission(isNew ? 'maintenance.create' : 'maintenance.edit')) && (
                <Button onClick={handleSave} disabled={saving || loading}>
                  {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </Button>
              )}
            </div>
          )}
        </div>
      }
    >
      {error && <Alert variant="danger" title="خطأ" className="mb-4">{error}</Alert>}

      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
          {/* Left Column: Details & Edit */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">تفاصيل المشكلة</h3>

            {isNew && (
              <Select
                id="skateId"
                label="الاسكيت"
                value={skateId}
                onChange={e => setSkateId(e.target.value)}
                options={[
                  { value: '', label: 'اختر الاسكيت...' },
                  ...skatesList.map(s => ({
                    value: String(s.id),
                    label: `${s.skateCode} — مقاس ${s.size}`
                  }))
                ]}
                disabled={!isNew}
              />
            )}

            <Textarea
              id="problemDescription"
              label="وصف المشكلة"
              rows={3}
              value={problemDescription}
              onChange={e => setProblemDescription(e.target.value)}
              disabled={isCompleted || (!isNew && !canEdit)}
            />

            {!isNew && (
              <>
                <h3 className="font-semibold text-lg border-b pb-2 pt-4">العمل المنفذ</h3>
                <Textarea
                  id="repairDescription"
                  label="وصف الإصلاح (مطلوب عند الإغلاق)"
                  rows={3}
                  value={repairDescription}
                  onChange={e => setRepairDescription(e.target.value)}
                  disabled={!canEdit}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="laborCost"
                    label="تكلفة المصنعية (ج.م)"
                    type="number"
                    value={laborCost}
                    onChange={e => setLaborCost(e.target.value)}
                    disabled={!canEdit}
                  />

                  <Select
                    id="status"
                    label="الحالة"
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    options={[
                      { value: 'pending', label: 'معلق' },
                      { value: 'in_progress', label: 'قيد الصيانة' },
                      { value: 'completed', label: 'مكتمل' }
                    ]}
                    disabled={!canEdit}
                  />
                </div>
              </>
            )}
          </div>

          {/* Right Column: Parts (Only if not new) */}
          {!isNew && (
            <div className="space-y-4 border-r pr-6">
              <h3 className="font-semibold text-lg border-b pb-2">قطع الغيار المستخدمة</h3>

              {record?.parts && record.parts.length > 0 ? (
                <div className="space-y-2">
                  {record.parts.map(part => (
                    <div key={part.id} className="flex items-center justify-between bg-neutral-bg p-2 rounded">
                      <div>
                        <div className="font-medium">{part.partName}</div>
                        <div className="text-sm text-text-muted">
                          {part.quantity} × {part.unitCost} ج.م = {part.totalCost} ج.م
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          className="text-danger-text hover:bg-danger-bg p-1 rounded"
                          onClick={() => handleRemovePart(part.id)}
                          disabled={saving}
                          title="حذف"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="text-left font-semibold mt-2 text-text-main">
                    إجمالي القطع: {record.partsCost} ج.م
                  </div>
                </div>
              ) : (
                <div className="text-text-muted text-sm">لا توجد قطع غيار مسجلة</div>
              )}

              {canEdit && (
                <div className="bg-white border rounded p-3 mt-4 space-y-3 shadow-xs">
                  <h4 className="font-medium text-sm text-navy-800">إضافة قطعة غيار</h4>
                  <Input
                    id="partName"
                    label="اسم القطعة"
                    placeholder="اسم القطعة"
                    value={partName}
                    onChange={e => setPartName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="partQty"
                      label="الكمية"
                      type="number"
                      placeholder="الكمية"
                      value={partQty}
                      onChange={e => setPartQty(e.target.value)}
                    />
                    <Input
                      id="partUnitCost"
                      label="سعر الوحدة"
                      type="number"
                      placeholder="سعر الوحدة"
                      value={partUnitCost}
                      onChange={e => setPartUnitCost(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full justify-center"
                    disabled={!partName || !partQty || !partUnitCost || saving}
                    onClick={handleAddPart}
                  >
                    إضافة القطعة
                  </Button>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-dashed">
                <div className="flex justify-between items-center text-lg font-bold text-navy-900">
                  <span>إجمالي التكلفة:</span>
                  <span>{((record ? Number(record.partsCost) : 0) + (Number(laborCost) || 0)).toFixed(2)} ج.م</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

