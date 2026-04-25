const HOTEL_NAME = "BRUNDAVANA RECIPES"
const LOCATION = "Near bejai church hall, mangalore"
const TEL = "+91 8660638242"
const LINE_WIDTH = 32 // Adjusted for 3-inch thermal paper

// Unified token number counter that starts from 0001 and resets after 9999
export const getNextTokenNumber = () => {
  const storageKey = "sequentialTokenNumber"
  let currentNumber = Number.parseInt(localStorage.getItem(storageKey) || "0")

  // Increment the number
  currentNumber = currentNumber + 1

  // Reset to 1 if we reach 10000
  if (currentNumber >= 10000) {
    currentNumber = 1
  }

  // Save the updated number
  localStorage.setItem(storageKey, currentNumber.toString())

  // Return as 4-digit string with leading zeros
  return currentNumber.toString().padStart(4, "0")
}

export const formatDateTime = (date = new Date()) => {
  return (
    date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    }) +
    " " +
    date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  )
}

const centerText = (text: string, width: number = LINE_WIDTH) => {
  const padding = Math.max(0, width - text.length)
  const leftPad = Math.floor(padding / 2)
  return " ".repeat(leftPad) + text
}

export const printThermal = (content: string, type: "KOT" | "Bill") => {
  const windowContent = `
<html>
  <head>
    <title>${type}</title>
    <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
    <style>
      @page {
        margin: 0;
        size: 3in auto;
      }
      
      @media print {
        body {
          font-family: ${type === "KOT" ? "'Inter', sans-serif" : "'Courier Prime', monospace"};
          font-size: ${type === "KOT" ? "16px" : "14px"}; /* Increased from 12px to 14px */
          line-height: 1.2;
          padding: 8px 0;
          margin: 0;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          font-weight: ${type === "KOT" ? "normal" : "bold"}; /* Make bill text bold */
        }
        
        .content-wrapper {
          width: 3in;
          padding: 0 8px;
          box-sizing: border-box;
        }
        
        .header {
          text-align: center;
          margin-bottom: ${type === "KOT" ? "8px" : "4px"};
        }
        
        .brand {
          font-size: ${type === "KOT" ? "16px" : "14px"};
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.5px;
        }
        
        .contact {
          font-size: ${type === "KOT" ? "11px" : "9px"};
          font-weight: ${type === "KOT" ? "600" : "400"};
          margin: 2px 0;
        }
        
        .bill-info {
          margin: ${type === "KOT" ? "12px 0" : "6px 0"};
          padding: ${type === "KOT" ? "8px 0" : "4px 0"};
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          font-size: ${type === "KOT" ? "14px" : "10px"};
          font-weight: ${type === "KOT" ? "600" : "400"};
        }
        
        .bill-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: ${type === "KOT" ? "8px" : "4px"};
          font-weight: ${type === "KOT" ? "600" : "700"};
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: ${type === "KOT" ? "8px 0" : "6px 0"};
        }
        
        .items-table th {
          font-weight: 700;
          text-align: left;
          padding: ${type === "KOT" ? "4px 0" : "2px 0"};
          font-size: ${type === "KOT" ? "11px" : "10px"};
          border-bottom: 1px solid #000;
        }
        
        .items-table td {
          padding: ${type === "KOT" ? "4px 0" : "3px 0"};
          font-size: ${type === "KOT" ? "12px" : "14px"}; /* Increased from 12px to 14px */
          font-weight: ${type === "KOT" ? "normal" : "bold"}; /* Make bill text bold */
        }
        
        /* Style for item names in KOT */
        .items-table .item-name {
          font-size: ${type === "KOT" ? "20px" : "10px"};
          font-weight: ${type === "KOT" ? "700" : "400"};
          padding: ${type === "KOT" ? "6px 0" : "2px 0"};
        }
        
        /* Style for item quantities */
        .items-table .item-qty {
          font-size: ${type === "KOT" ? "20px" : "10px"};
          font-weight: ${type === "KOT" ? "800" : "400"};
          text-align: right;
          padding: ${type === "KOT" ? "6px 0" : "2px 0"};
        }
        
        .total-section {
          margin-top: ${type === "KOT" ? "8px" : "6px"};
          padding-top: ${type === "KOT" ? "8px" : "4px"};
          border-top: 1px solid #000;
          font-weight: 800; /* Increased from 700 to 800 */
          text-align: right;
          font-size: ${type === "KOT" ? "16px" : "16px"}; /* Increased from 14px to 16px */
        }
        
        .footer {
          margin-top: ${type === "KOT" ? "12px" : "8px"};
          text-align: center;
          font-size: ${type === "KOT" ? "11px" : "11px"}; /* Increased from 9px to 11px */
          font-weight: ${type === "KOT" ? "600" : "600"}; /* Increased from 400 to 600 */
        }
        
        .text-right {
          text-align: right;
        }
        
        .token {
          font-size: ${type === "KOT" ? "28px" : "12px"};
          font-weight: ${type === "KOT" ? "800" : "700"};
          margin: ${type === "KOT" ? "8px 0" : "2px 0"};
          text-align: ${type === "KOT" ? "center" : "left"};
        }
        
        .date-time {
          font-size: ${type === "KOT" ? "16px" : "10px"};
          font-weight: ${type === "KOT" ? "700" : "400"};
        }

        .order-type {
          font-size: ${type === "KOT" ? "20px" : "12px"};
          font-weight: 700;
          text-align: center;
          margin: 4px 0;
          padding: 4px;
          border: 2px solid #000;
          border-radius: 4px;
        }
        
        .bill-number, .bill-token {
          font-weight: 700;
          font-size: 12px; /* Increased from 10px to 12px */
        }
        
        .divider {
          border-top: 1px solid #000;
          margin: 4px 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="content-wrapper">
      ${content}
    </div>
  </body>
</html>
`

  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(windowContent)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }
}

export const generateKOTContent = (
  order: { [key: string]: number },
  menuItems: any[],
  orderType: "Table" | "Parcel" = "Table",
  providedTokenNumber?: string,
  parcelItems?: Set<string> | string[],
  categoryName?: string,
) => {
  const tokenNumber = providedTokenNumber || getNextTokenNumber()

  // Convert parcelItems to a Set if it's an array
  const parcelItemsSet = parcelItems instanceof Set ? parcelItems : new Set(parcelItems || [])

  let content = `
  <div class="token">TOKEN #${tokenNumber}</div>
  ${categoryName ? `<div class="order-type">${categoryName.toUpperCase()}</div>` : `<div class="order-type">${orderType.toUpperCase()}</div>`}
  <div class="bill-info">
    <div class="bill-header">
      <span class="date-time">${formatDateTime()}</span>
    </div>
  </div>
  <table class="items-table">
    <thead>
      <tr>
        <th>Item</th>
        <th class="text-right">Qty</th>
      </tr>
    </thead>
    <tbody>`

  Object.entries(order).forEach(([id, quantity]) => {
    const item = menuItems.find((item) => item.id === id)
    if (item) {
      const isParcel = parcelItemsSet.has(id)
      const itemName = isParcel ? `${item.name} (P)` : item.name

      content += `
      <tr>
        <td class="item-name">${itemName}</td>
        <td class="item-qty">${quantity}</td>
      </tr>`
    }
  })

  content += `
    </tbody>
  </table>`

  return { content, tokenNumber }
}

export const generateBillContent = (
  order: { [key: string]: number },
  total: number,
  menuItems: any[],
  tokenNumber?: string,
  parcelItems?: Set<string> | string[],
) => {
  const currentTokenNumber = tokenNumber || getNextTokenNumber()

  // Convert parcelItems to a Set if it's an array
  const parcelItemsSet = parcelItems instanceof Set ? parcelItems : new Set(parcelItems || [])

  let content = `
    <div class="header">
      <h1 class="brand">${HOTEL_NAME}</h1>
      <p class="contact">${LOCATION}</p>
      <p class="contact">${TEL}</p>
    </div>
    
    <div class="bill-info">
      <div>
        <span class="bill-number">Bill #${currentTokenNumber}</span>
        <span class="bill-token">   Token #${currentTokenNumber}</span>
      </div>
      <div class="date-time">${formatDateTime()}</div>
    </div>

    <div class="divider"></div>

    <table class="items-table">
      <tbody>
`

  let subtotal = 0

  Object.entries(order).forEach(([id, quantity]) => {
    const item = menuItems.find((item) => item.id === id)
    if (item) {
      const amount = item.price * quantity
      subtotal += amount
      const isParcel = parcelItemsSet.has(id)

      content += `
        <tr>
          <td>${item.name}${isParcel ? " (P)" : ""}</td>
          <td class="text-right">${quantity}</td>
          <td class="text-right">₹${item.price.toFixed(2)}</td>
          <td class="text-right">₹${amount.toFixed(2)}</td>
        </tr>`
    }
  })

  content += `
      </tbody>
    </table>
    
    <div class="divider"></div>
    
    <div class="total-section">
      Total: ₹${subtotal.toFixed(2)}
    </div>
    
    <div class="footer">
      <p>Thank you for dining with us!</p>
      <p>Visit again</p>
    </div>`

  return { content, tokenNumber: currentTokenNumber }
}

export const generateMonthlyBillContent = (
  customerName: string,
  billItems: Array<{
    date: Date
    itemName: string
    quantity: number
    price: number
    total: number
  }>,
  billSummary: {
    totalBilled: number
    totalPaid: number
    pendingAmount: number
  },
  paymentHistory: Array<{
    date: Date
    amount: number
  }>,
) => {
  // Sort bill items by date (oldest first)
  const sortedBillItems = [...billItems].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  let content = `
<div class="header">
  <h1 class="brand">${HOTEL_NAME}</h1>
  <p class="contact">${LOCATION}</p>
  <p class="contact">${TEL}</p>
</div>

<div class="bill-info">
  <div class="bill-header">
    <div>Monthly Bill Statement</div>
    <div>Customer: ${customerName}</div>
  </div>
  <div>${formatDateTime()}</div>
</div>

<table class="items-table">
  <thead>
    <tr>
      <th>Date</th>
      <th>Item</th>
      <th>Qty</th>
      <th>Price</th>
      <th class="text-right">Amount</th>
    </tr>
  </thead>
  <tbody>`

  sortedBillItems.forEach((item) => {
    content += `
    <tr>
      <td>${formatDateTime(item.date)}</td>
      <td>${item.itemName}</td>
      <td>${item.quantity}</td>
      <td>₹${item.price.toFixed(2)}</td>
      <td class="text-right">₹${item.total.toFixed(2)}</td>
    </tr>`
  })

  content += `
  </tbody>
</table>

<div class="total-section">
  <div>Total Billed: ₹${billSummary.totalBilled.toFixed(2)}</div>
  <div>Total Paid: ₹${billSummary.totalPaid.toFixed(2)}</div>
  <div class="pending">Pending Amount: ₹${billSummary.pendingAmount.toFixed(2)}</div>
</div>

<div class="payment-history">
  <h2>Payment History</h2>
  <table class="items-table">
    <thead>
      <tr>
        <th>Date</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>`

  // Sort payment history by date (newest first)
  const sortedPayments = [...paymentHistory].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  sortedPayments.forEach((payment) => {
    content += `
    <tr>
      <td>${formatDateTime(payment.date)}</td>
      <td class="text-right">₹${payment.amount.toFixed(2)}</td>
    </tr>`
  })

  content += `
    </tbody>
  </table>
</div>

<div class="footer">
  <p>Thank you for your business!</p>
</div>`

  return { content }
}
