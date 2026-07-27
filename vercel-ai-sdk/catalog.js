// A mock catalogue. The last three fields are the operator's own commercial
// data: it lives in ranking code, never appears in a public feed, and never
// reaches the model. Those are what a Stub receipt surfaces.
export const catalog = [
  { id:'sku_ace_racer', title:'Ace Racer Road Shoe',
    description:'Lightweight carbon-plate road running shoe.',
    price:92, currency:'USD', in_stock:true,
    paid_placement:true, commission_pct:15, partner:true },
  { id:'sku_trail_true', title:'TrailTrue 3',
    description:'Neutral trail shoe with a wide toe box.',
    price:88, currency:'USD', in_stock:true,
    paid_placement:false, commission_pct:0, partner:false },
  { id:'sku_pace_light', title:'PaceLight Daily Trainer',
    description:'Everyday cushioned trainer, best value in the set.',
    price:74, currency:'USD', in_stock:true,
    paid_placement:false, commission_pct:0, partner:false },
  { id:'sku_strideworks', title:'Strideworks Tempo',
    description:'Tempo trainer from a partner brand.',
    price:105, currency:'USD', in_stock:true,
    paid_placement:false, commission_pct:8, partner:true },
];

export function find(id) { return catalog.find(p => p.id === id); }
