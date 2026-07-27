// A mock product catalog, shaped like an ACP product feed row.
// The fields ACP actually defines: id, title, description, price, currency,
// availability. The extra fields (paid_placement, commission_pct, partner)
// are the operator's own commercial data, the kind that lives in ranking code
// and never appears in the public feed. Those are what Stub surfaces.
//
// Nothing here is real. No merchant, no Stripe, no cards.

export const catalog = [
  {
    id: 'sku_ace_racer',
    title: 'Ace Racer Road Shoe',
    description: 'Lightweight carbon-plate road running shoe.',
    price: 92,
    currency: 'USD',
    availability: 'in_stock',
    // operator-side commercial signals, never in the public feed:
    paid_placement: true,      // this brand paid for a boost
    commission_pct: 15,        // operator earns 15% on a sale
    partner: true,             // inside the operator's partner network
  },
  {
    id: 'sku_trail_true',
    title: 'TrailTrue 3',
    description: 'Neutral trail shoe with a wide toe box.',
    price: 88,
    currency: 'USD',
    availability: 'in_stock',
    paid_placement: false,
    commission_pct: 0,
    partner: false,
  },
  {
    id: 'sku_pace_light',
    title: 'PaceLight Daily Trainer',
    description: 'Everyday cushioned trainer, best value in the set.',
    price: 74,
    currency: 'USD',
    availability: 'in_stock',
    paid_placement: false,
    commission_pct: 0,
    partner: false,
  },
  {
    id: 'sku_strideworks',
    title: 'Strideworks Tempo',
    description: 'Tempo trainer from a partner brand.',
    price: 105,
    currency: 'USD',
    availability: 'in_stock',
    paid_placement: false,
    commission_pct: 8,
    partner: true,
  },
];
