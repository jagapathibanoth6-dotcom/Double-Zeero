import { formatMoney } from "@/lib/platform/money";

export type OrderItemRow = {
  id: string;
  name: string;
  quantity: number;
  unitPence: number;
  notes?: string;
};

export function OrderItems({
  items,
  subtotalPence,
  discountPence,
  deliveryFeePence,
  totalPence,
}: {
  items: OrderItemRow[];
  subtotalPence?: number;
  discountPence?: number;
  deliveryFeePence?: number;
  totalPence?: number;
}) {
  const subtotal = subtotalPence ?? items.reduce((sum, item) => sum + item.unitPence * item.quantity, 0);
  const discount = discountPence || 0;
  const delivery = deliveryFeePence || 0;
  const total = totalPence ?? subtotal - discount + delivery;

  return (
    <div className="order-items">
      {!items.length ? <p className="today-empty">No items on this order.</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <span>
              <strong>
                {item.quantity} × {item.name}
              </strong>
              {item.notes ? <em>{item.notes}</em> : null}
              <small>{formatMoney(item.unitPence)} each</small>
            </span>
            <b>{formatMoney(item.unitPence * item.quantity)}</b>
          </li>
        ))}
      </ul>
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>{formatMoney(subtotal)}</dd>
        </div>
        {discount > 0 ? (
          <div>
            <dt>Discount</dt>
            <dd>−{formatMoney(discount)}</dd>
          </div>
        ) : null}
        {delivery > 0 ? (
          <div>
            <dt>Delivery</dt>
            <dd>{formatMoney(delivery)}</dd>
          </div>
        ) : null}
        <div className="is-total">
          <dt>Total</dt>
          <dd>{formatMoney(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
