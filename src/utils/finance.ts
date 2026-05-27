export const PTS_TO_USD = (pts: number) => {
  return pts / 1000;
};

export const formatUSD = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const WITHDRAWAL_MIN_PTS = 10000;
export const WITHDRAWAL_MIN_USD = PTS_TO_USD(WITHDRAWAL_MIN_PTS);
