export const environment = {
  // production: 'https://localhost:5001',
  production: 'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/api',
  dev: '',
  encryptionKey: '',
  localStorageKeys: {
    auth: 'auth_token',
    deviceInfo: 'device_info',
    city: 'user_city'
  }
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
