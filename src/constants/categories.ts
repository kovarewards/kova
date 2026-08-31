// Shared across every screen that shows a merchant category — keep this the
// single source so the label/emoji set can't drift out of sync between screens.
export const CATEGORY_LABEL: Record<string, string> = {
  dining: 'Dining', groceries: 'Groceries', gas: 'Gas', ev_charging: 'EV Charging',
  travel: 'Travel', transit: 'Transit', pharmacy: 'Pharmacy', entertainment: 'Entertainment',
  streaming: 'Streaming', shopping: 'Shopping', other: 'Other',
};

export const CATEGORY_EMOJI: Record<string, string> = {
  dining: '🍜', groceries: '🛒', gas: '⛽', ev_charging: '🔌',
  travel: '✈️', transit: '🚇', pharmacy: '💊', entertainment: '🎬',
  streaming: '📺', shopping: '🛍️', other: '💳',
};
