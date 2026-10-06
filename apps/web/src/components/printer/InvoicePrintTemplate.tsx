import React from 'react'

export type InvoiceData = {
  type: 'RENTAL' | 'SALE'
  invoiceNumber: string
  transactionCode: string
  date: string
  status: string
  cashierName: string
  customerName: string
  total: number
  payments: Array<{ method: string; amount: number }>

  // Rental specific
  skateBarcode?: string
  durationMinutes?: number
  startTime?: string
  returnTime?: string | null
  rentalAmount?: number
  lateDuration?: number
  lateFee?: number
  damageCharge?: number

  // Sale specific
  items?: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number }>
}

type Props = {
  data: InvoiceData | null
}

export const InvoicePrintTemplate: React.FC<Props> = ({ data }) => {
  if (!data) return null

  return (
    <div className="print-template" style={{ direction: 'rtl', padding: '10px' }}>
      <style>
        {`
          @media screen {
            .print-template {
              display: none !important;
            }
          }
          @media print {
            @page {
              margin: 0;
            }
            body * {
              visibility: hidden;
            }
            #print-root, #print-root * {
              visibility: visible;
            }
            #print-root {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
              padding: 5mm;
              background: white;
              color: black;
              font-family: 'Courier New', Courier, monospace; /* generic monospaced */
              font-size: 12px;
            }
          }
          .print-header { text-align: center; border-bottom: 1px dashed black; padding-bottom: 10px; margin-bottom: 10px; }
          .print-footer { text-align: center; border-top: 1px dashed black; padding-top: 10px; margin-top: 10px; font-size: 10px; }
          .print-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .print-bold { font-weight: bold; }
          .print-table { width: 100%; text-align: right; margin-bottom: 10px; border-collapse: collapse; }
          .print-table th { border-bottom: 1px solid black; padding-bottom: 4px; }
          .print-table td { padding: 4px 0; }
        `}
      </style>

      <div className="print-header">
        <h2>كشك سكيت</h2>
        <div>رقم الفاتورة: {data.invoiceNumber}</div>
        <div>كود الحركة: {data.transactionCode}</div>
        <div>التاريخ: {new Date(data.date).toLocaleString('ar-EG')}</div>
      </div>

      <div className="print-body">
        <div className="print-row">
          <span>الكاشير:</span>
          <span>{data.cashierName}</span>
        </div>
        <div className="print-row">
          <span>العميل:</span>
          <span>{data.customerName}</span>
        </div>

        <hr style={{ borderTop: '1px dashed black', margin: '10px 0' }} />

        {data.type === 'RENTAL' && (
          <>
            <div className="print-row">
              <span>الاسكيت:</span>
              <span>{data.skateBarcode}</span>
            </div>
            <div className="print-row">
              <span>المدة:</span>
              <span>{data.durationMinutes} دقيقة</span>
            </div>
            <div className="print-row">
              <span>قيمة الإيجار:</span>
              <span>{data.rentalAmount?.toFixed(2)} ج.م</span>
            </div>

            {(data.lateFee ?? 0) > 0 && (
              <div className="print-row">
                <span>غرامة تأخير ({data.lateDuration} د):</span>
                <span>{data.lateFee?.toFixed(2)} ج.م</span>
              </div>
            )}

            {(data.damageCharge ?? 0) > 0 && (
              <div className="print-row">
                <span>رسوم أضرار:</span>
                <span>{data.damageCharge?.toFixed(2)} ج.م</span>
              </div>
            )}
          </>
        )}

        {data.type === 'SALE' && data.items && (
          <table className="print-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPrice.toFixed(2)}</td>
                  <td>{item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <hr style={{ borderTop: '1px dashed black', margin: '10px 0' }} />

        <div className="print-row print-bold">
          <span>الإجمالي:</span>
          <span>{data.total?.toFixed(2)} ج.م</span>
        </div>

        <div style={{ marginTop: '10px' }}>
          <div className="print-bold">طرق الدفع:</div>
          {data.payments.map((p, i) => (
            <div className="print-row" key={i}>
              <span>{p.method}</span>
              <span>{p.amount.toFixed(2)} ج.م</span>
            </div>
          ))}
        </div>
      </div>

      <div className="print-footer">
        <div>شكرا لزيارتكم!</div>
        <div>(نرجو الاحتفاظ بالفاتورة)</div>
      </div>
    </div>
  )
}
