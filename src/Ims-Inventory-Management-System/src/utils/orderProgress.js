/**
 * Order progress for confirmed quotations, driven by INVOICED quantity only.
 *
 * Business rule:
 *   pending = quoted qty - invoiced qty        (challan / dispatch qty is ignored)
 *   Confirmed   -> nothing invoiced yet
 *   In Progress -> partly invoiced, some qty still pending
 *   Completed   -> every line fully invoiced
 *
 * A challan for 4 of 6 does NOT advance the order; only the invoice does.
 * `invoicedQty` lives on each item line inside the quotation's `details` JSON and
 * is incremented when an invoice is created. It is deliberately separate from
 * `dispatchedQty`, which the Dispatch and Challan screens still own.
 */

export const ORDER_STATUS = {
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed'
};

const isItemLine = (item) => !!item && (!item.type || item.type === 'item');

const normalizeCode = (code) => String(code || '').trim().toUpperCase();

/** Original quoted quantity for a line. `orderedQty` wins when present. */
export const getOrderedQty = (item) =>
  Number(item?.orderedQty !== undefined && item?.orderedQty !== null
    ? item.orderedQty
    : (item?.quantity || 0)) || 0;

export const getInvoicedQty = (item) => Number(item?.invoicedQty || 0) || 0;

/** Outstanding qty for a line. Never negative — over-invoicing one line must not
 *  mask another line that is still pending. */
export const getPendingQty = (item) =>
  Math.max(0, getOrderedQty(item) - getInvoicedQty(item));

/**
 * Roll a set of item lines up into an order-level progress summary.
 * Sections / sub-sections are titles and are skipped.
 */
export const computeOrderProgress = (items) => {
  const lines = (Array.isArray(items) ? items : []).filter(isItemLine);

  let orderedQty = 0;
  let invoicedQty = 0;
  let pendingQty = 0;

  lines.forEach(item => {
    orderedQty += getOrderedQty(item);
    invoicedQty += getInvoicedQty(item);
    pendingQty += getPendingQty(item);
  });

  return {
    orderedQty,
    invoicedQty,
    pendingQty,
    lineCount: lines.length
  };
};

/**
 * Per-line invoiced quantities, for persisting alongside the order.
 *
 * `updateQuotation` strips `details.items` (item lines live in the relational
 * quotation_items table, which has no invoicedQty column), so per-line progress
 * has to be stored under its own key or it is lost on every save. Only lines
 * with something invoiced are kept, so this stays small.
 */
export const buildInvoicedLines = (items) =>
  (Array.isArray(items) ? items : [])
    .filter(item => isItemLine(item) && getInvoicedQty(item) > 0)
    .map(item => ({
      id: item.id === undefined || item.id === null ? '' : String(item.id),
      itemCode: item.itemCode || '',
      invoicedQty: getInvoicedQty(item)
    }));

/**
 * Re-attach persisted per-line invoiced quantities to item lines rebuilt from
 * the relational table. Matches on line id, then item code.
 */
export const mergeInvoicedLines = (items, invoicedLines) => {
  if (!Array.isArray(invoicedLines) || invoicedLines.length === 0) return items;

  const byId = new Map();
  const byCode = new Map();
  invoicedLines.forEach(line => {
    const qty = Number(line?.invoicedQty || 0) || 0;
    if (qty <= 0) return;
    if (line.id) byId.set(String(line.id), qty);
    const code = normalizeCode(line.itemCode);
    if (code && !byCode.has(code)) byCode.set(code, qty);
  });

  return (Array.isArray(items) ? items : []).map(item => {
    if (!isItemLine(item)) return item;
    if (getInvoicedQty(item) > 0) return item; // already carried on the line
    const id = item.id === undefined || item.id === null ? '' : String(item.id);
    const qty = (id && byId.get(id)) || byCode.get(normalizeCode(item.itemCode)) || 0;
    return qty > 0 ? { ...item, invoicedQty: qty } : item;
  });
};

/**
 * Derive the order status from a progress summary.
 * An order with no item lines stays Confirmed — there is nothing to invoice, and
 * silently calling it Completed is how orders used to slip straight to Completed.
 */
export const deriveOrderStatus = (progress) => {
  const { orderedQty = 0, invoicedQty = 0, pendingQty = 0 } = progress || {};
  if (orderedQty <= 0) return ORDER_STATUS.CONFIRMED;
  if (pendingQty <= 0) return ORDER_STATUS.COMPLETED;
  if (invoicedQty > 0) return ORDER_STATUS.IN_PROGRESS;
  return ORDER_STATUS.CONFIRMED;
};

/**
 * Credit quantities from a set of document lines onto the order's item lines,
 * accumulating into `field` and returning a new array.
 *
 * Matching prefers the line id (the same generated id is carried through the
 * quotation -> challan -> invoice chain), then falls back to item code so that
 * hand-built documents still register. The code fallback fills each line only up
 * to its remaining room, so the same item code appearing on two lines
 * distributes across both instead of being double counted on the first.
 */
export const creditQuantities = (orderItems, documentLines, field = 'invoicedQty') => {
  const byId = new Map();
  const byCode = new Map();

  (Array.isArray(documentLines) ? documentLines : []).forEach(line => {
    if (!isItemLine(line)) return;
    const qty = Number(line.quantity || 0) || 0;
    if (qty <= 0) return;

    const id = line.id === undefined || line.id === null ? '' : String(line.id);
    if (id) byId.set(id, (byId.get(id) || 0) + qty);

    const code = normalizeCode(line.itemCode || line.item_code);
    if (code) byCode.set(code, (byCode.get(code) || 0) + qty);
  });

  return (Array.isArray(orderItems) ? orderItems : []).map(item => {
    if (!isItemLine(item)) return item;

    const id = item.id === undefined || item.id === null ? '' : String(item.id);
    const code = normalizeCode(item.itemCode);
    const already = Number(item?.[field] || 0) || 0;
    let credited = 0;

    if (id && byId.has(id)) {
      credited = byId.get(id);
      byId.delete(id);
      // Keep the code pool in step so a later line cannot re-claim this qty.
      if (code && byCode.has(code)) {
        const left = byCode.get(code) - credited;
        if (left > 0) byCode.set(code, left);
        else byCode.delete(code);
      }
    } else if (code && byCode.has(code)) {
      const room = Math.max(0, getOrderedQty(item) - already);
      const pool = byCode.get(code);
      credited = room > 0 ? Math.min(room, pool) : 0;
      const left = pool - credited;
      if (left > 0) byCode.set(code, left);
      else byCode.delete(code);
    }

    if (credited <= 0) return item;

    return {
      ...item,
      orderedQty: getOrderedQty(item),
      [field]: already + credited
    };
  });
};

/** Credit an invoice's lines onto the order (accumulates `invoicedQty`). */
export const applyInvoicedQuantities = (quotationItems, invoiceItems) =>
  creditQuantities(quotationItems, invoiceItems, 'invoicedQty');

/**
 * Item lines still to be sent out, for pre-filling a new challan.
 *
 * Remaining is quoted qty minus what previous challans already carry — NOT minus
 * invoiced qty. Goods leave on the challan, so a challan that has not been
 * invoiced yet must still reduce what the next challan offers, otherwise you can
 * dispatch more than was ordered.
 *
 * Sections and sub-sections are kept as headings; fully sent item lines drop out.
 */
export const getRemainingItemsToChallan = (orderItems, previousChallanItemLists = []) => {
  const sentLines = previousChallanItemLists.flat();
  const credited = creditQuantities(orderItems, sentLines, 'challanedQty');

  return credited
    .map(item => {
      if (!isItemLine(item)) return item;
      const ordered = getOrderedQty(item);
      const sent = Number(item.challanedQty || 0) || 0;
      const remaining = Math.max(0, ordered - sent);
      if (remaining <= 0) return null;
      return { ...item, quantity: remaining, orderedQty: ordered, dispatchQty: remaining };
    })
    .filter(Boolean);
};

/**
 * Full recalculation for a quotation's items after an invoice: returns the
 * updated lines plus the summary and status to persist.
 */
export const creditInvoiceToOrder = (quotationItems, invoiceItems) => {
  const items = applyInvoicedQuantities(quotationItems, invoiceItems);
  const progress = computeOrderProgress(items);
  return { items, progress, status: deriveOrderStatus(progress) };
};
