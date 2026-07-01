// Pure GST computation — deterministic, no side effects
export interface GstLine {
  price: number       // price snapshot per unit
  qty: number
  taxRate: number     // total GST % (e.g. 5 means 2.5 CGST + 2.5 SGST)
  isComp: boolean
}

export interface GstResult {
  subtotal: number
  taxableAmount: number
  cgst: number
  sgst: number
  grandTotal: number
}

export function computeGST(
  lines: GstLine[],
  discountValue: number,
  discountType: 'flat' | 'percent' | undefined
): GstResult {
  const subtotal = round2(
    lines.reduce((acc, l) => (l.isComp ? acc : acc + l.price * l.qty), 0)
  )

  let discount = 0
  if (discountType === 'flat') {
    discount = Math.min(discountValue, subtotal)
  } else if (discountType === 'percent') {
    discount = round2((subtotal * Math.min(discountValue, 100)) / 100)
  }

  const taxableAmount = round2(subtotal - discount)

  // Weighted average tax rate across non-comp lines
  const totalUnits = lines.filter(l => !l.isComp).reduce((acc, l) => acc + l.qty, 0)
  const weightedTax =
    totalUnits > 0
      ? lines
          .filter(l => !l.isComp)
          .reduce((acc, l) => acc + (l.taxRate / 100) * l.price * l.qty, 0) /
        lines.filter(l => !l.isComp).reduce((acc, l) => acc + l.price * l.qty, 0)
      : 0.05

  const totalGst = round2(taxableAmount * weightedTax)
  const cgst = round2(totalGst / 2)
  const sgst = round2(totalGst - cgst) // avoids floating-point drift

  return {
    subtotal,
    taxableAmount,
    cgst,
    sgst,
    grandTotal: round2(taxableAmount + cgst + sgst),
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
