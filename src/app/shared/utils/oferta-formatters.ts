export const formatRevenueRange = (value?: string): string => {
  if (!value) return 'No disponible';

  const map: Record<string, string> = {
    UNDER_100K: '0-100k €',
    BETWEEN_100K_500K: '100k-500k €',
    BETWEEN_500K_1M: '500k-1M €',
    BETWEEN_1M_5M: '1M-5M €',
    OVER_5M: 'Más de 5M €',
  };

  return map[value] ?? value.replace(/_/g, '-');
};

export const formatEmployeeRange = (value?: string): string => {
  if (!value) return 'No disponible';

  const map: Record<string, string> = {
    '1_5': '1-5',
    '6_10': '6-10',
    '11_25': '11-25',
    '26_50': '26-50',
    '51_100': '51-100',
    '100_PLUS': 'Más de 100',
  };

  return map[value] ?? value.replace(/_/g, '-');
};
