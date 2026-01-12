export const environment = {
  // production: 'https://localhost:5311',
  production: 'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/api',
  dev: '',
};

export const localStorageEnvironment = {
  auth: {
    key: 'pkt_',
    ttl: 14 * 60 * 60,
  },
  user: {
    key: 'pkt_user',
    ttl: 14 * 60 * 60,
  },
};

export const sessionStorageEnvironment = {
  auth: {
    key: 'pkt_',
    ttl: 14 * 60 * 60,
  },
  user: {
    key: 'pkt_user',
    ttl: 14 * 60 * 60,
  },
};

export const memoryCacheEnvironment = {
  baskets: {
    key: 'pkt_baskets',
    ttl: 14 * 60 * 60,
  },
  user: {
    key: 'pkt_user',
    ttl: 14 * 60 * 60,
  },
};
