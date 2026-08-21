export const environment = {
  production: 'https://xn--80akonecy.xn--p1ai/api',
  hotlone: 'https://xn--o1ab.xn--80akonecy.xn--p1ai/hotLine',
  // production: 'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/api',
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
    ttl: 30 * 24 * 60 * 60,
  },
  refreshToken: {
    key: 'pkt_rt',
    ttl: 30 * 24 * 60 * 60,
  },
  isGuestToken: {
    key: 'pkt_igt',
    ttl: 30 * 24 * 60 * 60,
  },
  user: {
    key: 'pkt_user',
    ttl: 14 * 60 * 60,
  },
  currentCity: {
    key: 'pktn_userCity',
    ttl: 14 * 60 * 60,
  },
  pktSource: {
    key: 'pkt_source',
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
