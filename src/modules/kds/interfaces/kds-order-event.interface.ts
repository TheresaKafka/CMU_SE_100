export interface KdsModifierEvent {
  name: string;
  priceAdjustment: number;
}

export interface KdsItemEvent {
  productId: string;
  productName: string;
  quantity: number;
  modifiers: KdsModifierEvent[];
  station: 'HOT_BAR' | 'COLD_BAR' | 'WARMING_STATION' | 'BAR';
}

export interface KdsOrderEvent {
  orderId: string;
  shiftId: string;
  orderType: 'DINE_IN' | 'TAKE_AWAY';
  tableNumber: string | null;
  areaName: string | null;
  status: string;
  items: KdsItemEvent[];
  totalAmount: number;
  createdAt: string;
}

