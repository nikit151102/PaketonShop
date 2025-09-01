import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StoreService {

  constructor() { }

  storeData: any = [
    { coords: [53.346317, 83.763876], category:'Магазин', address: 'пр-т. Красноармейский, 131', phone: '+7 962 791 17 79', city: 'Барнаул', imgShop: 'krasnoarm.png', maxWidth: '200', delivery: false },
    { coords: [53.38876093106909, 83.72863624028473], category:'Магазин', address: 'пр-т. Космонавтов, 8/2', phone: '+7 962 791 13 80', city: 'Барнаул', imgShop: 'kosmonavtov2.png', maxWidth: '200', delivery: false },
    { coords: [53.360603, 83.696655], category:'Магазин', address: 'ул. Антона Петрова, 190', phone: '+7(3852) 56 75 60, +7 960 961 52 87', city: 'Барнаул', imgShop: 'antonapetrova1.png', maxWidth: '400', delivery: false },
    { coords: [53.38438748960502, 83.73137086441798], category:'Магазин', address: 'ул. Германа Титова, 6 (Крытый рынок)', phone: '+7 962 802 05 10', city: 'Барнаул', imgShop: 'krytyjrynok.png', maxWidth: '400', delivery: false },
    { coords: [53.339484, 83.688678], category:'Магазин', address: 'ул. Взлетная, 2к (Эко-ярмарка ВДНХ, павильон №55)', phone: '+7 960 947 04 13', city: 'Барнаул', imgShop: 'vdnh2.png', maxWidth: '400', delivery: false },
    { coords: [53.329574, 83.795101], category:'Магазин', address: 'ул. Мало-Тобольская, 23 (Старый Базар)', phone: '+7 962 808 05 15', city: 'Барнаул', imgShop: 'staryjbazar1.png', maxWidth: '400', delivery: false },
    { coords: [53.349532, 83.637654], category:'Магазин', address: 'Павловский Тракт, 188, (ТРЦ Арена)', phone: '+7 962 809 04 81', city: 'Барнаул', imgShop: 'arena3.png', maxWidth: '200', delivery: false },
    { coords: [53.375287, 83.753716], category:'Магазин', address: 'ул. Северо-Западная, 6 (Сельхозрынок)', phone: '+7 903 948-30-91', city: 'Барнаул', imgShop: 'severo-zapadnaya.png', maxWidth: '400', delivery: false },
    { coords: [53.338189672196584, 83.7546794997637], category:'Магазин', address: 'ул. Шевченко, 157-а', phone: '+7(3852) 62 55 64', city: 'Барнаул', imgShop: 'shevchenko.png', maxWidth: '400', delivery: false },
    { coords: [53.361538, 83.766616], category:'Магазин', address: 'ул. Пионеров 13 (Новый рынок)', phone: '+7 (923) 643 48 23', city: 'Барнаул', imgShop: 'novyjrynok.png', maxWidth: '400', delivery: false },
    { coords: [53.39721123023806, 83.9301422031625], category:'Магазин', address: 'ул. Октябрьская, 36', phone: '+7 961 987 83 96', city: 'Новоалтайск', imgShop: 'novoaltajsk.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [53.703086, 84.916459], category:'Магазин', address: 'г. Заринск, ул. Союза Республик, 16', phone: '+7 961 988 43 77', city: 'Заринск', imgShop: 'zarinsk.png', maxWidth: '400', delivery: true, minSum: 5000, delivery_to: 350, remote_price: 250, free_shipping: true },
    { coords: [52.496383, 82.771228], category:'Магазин', address: 'г. Алейск, ул. Пионерская, 150', phone: '+7 913 091 49 79', city: 'Алейск', imgShop: 'alejskpionerskaya.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [51.993787, 84.981443], category:'Магазин', address: 'г. Белокуриха, ул. Партизанская, 14/1', phone: '+7 962 791 26 51', city: 'Белокуриха', imgShop: 'belokuriha.png', maxWidth: '400', delivery: true, minSum: null, delivery_to: 250, remote_price: 250, free_shipping: false },
    { coords: [52.545924, 85.213469], category:'Магазин', address: 'г. Бийск, пер. Коммунарский, 37', phone: '+7 905 084-53-93', city: 'Бийск', imgShop: 'bijskkomunarskij.png', maxWidth: '400', delivery: true, minSum: 5000, delivery_to: 350, remote_price: 250, free_shipping: true },
    { coords: [52.5165, 85.177222], category:'Магазин', address: 'г. Бийск, ул. Советская, 204/3', phone: '+7 906 945-88-26', city: 'Бийск', imgShop: 'bijsksovetskaya.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [52.423463, 85.708648], category:'Магазин', address: 'C. Сростки, ул. Чуйская, 12', phone: '+7 905 982-69-26', city: 'Сростки', imgShop: 'srostki.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [51.509067, 81.186726], category:'Магазин', address: 'г. Рубцовск, ул. Заводская, 220', phone: '+7(38557) 6 33 54, +7 963 529 85 88', city: 'Рубцовск', imgShop: 'rubcovskzavodsk.png', maxWidth: '200', delivery: true, minSum: 5000, delivery_to: 350, remote_price: 250, free_shipping: true },
    { coords: [51.513949, 81.211762], category:'Магазин', address: 'г. Рубцовск, пр-т. Ленина, 85', phone: '+7 905 981 79 66', city: 'Рубцовск', imgShop: 'rubcovsklenina.png', maxWidth: '400', delivery: true, minSum: 5000, delivery_to: 350, remote_price: 250, free_shipping: true },
    { coords: [53.001391, 78.648824], category:'Магазин', address: 'г. Славгород, ул. Ленина, 179', phone: '+7 963 508 03 79', city: 'Славгород', imgShop: 'slavgorod2.png', maxWidth: '200', delivery: true, minSum: 5000, delivery_to: 350, remote_price: 250, free_shipping: true },
    { coords: [53.790731, 81.321644], category:'Магазин', address: 'г. Камень на Оби, ул. Гагарина 111/8', phone: '+7 923 650 28 71', city: 'Камень на Оби', imgShop: 'kamennaobi.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [51.993321, 85.883109], category:'Магазин', address: 'с. Майма, ул. Ленина, 91', phone: '+7 962 808 59 98', city: 'Майма', imgShop: 'majma2.png', maxWidth: '400', delivery: true, minSum: null, delivery_to: 250, remote_price: 250, free_shipping: false },
    { coords: [53.746947, 87.108187], category:'Магазин', address: 'г. Новокузнецк, Вокзальная, 8а', phone: '+7 962 811 42 29', city: 'Новокузнецк', imgShop: 'nkzvokzalnaya.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [53.758058, 87.168482], category:'Магазин', address: 'г. Новокузнецк, Кирова, 111Б', phone: '+7 909 507 16 77', city: 'Новокузнецк', imgShop: 'nkzkirova.png', maxWidth: '400', delivery: true, minSum: 5000, delivery_to: 350, remote_price: 250, free_shipping: true },
    { coords: [55.055027, 82.892564], category:'Магазин', address: 'г. Новосибирск, ул. Плановая, 77', phone: '+7 963 526 96 99', city: 'Новосибирск', imgShop: 'planovaya.png', maxWidth: '400', delivery: true, minSum: 5000, delivery_to: 350, remote_price: 250, free_shipping: true },
    { coords: [55.044361, 82.939222], category:'Магазин', address: 'г. Новосибирск, ул. Гоголя, 43/1', phone: '+7 961 988 28 96', city: 'Новосибирск', imgShop: 'nskgogolya.png', maxWidth: '200', delivery: false, minSum: null },
    { coords: [54.765228, 83.09994], category:'Магазин', address: 'г. Бердск, ул. Лелюха, 25 (ТЦ Рынок)', phone: '+7 909-501-01-24', city: 'Бердск', imgShop: 'berdsk.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [55.028522, 73.284507], category:'Магазин', address: 'г. Омск, проспект Мира, 19 (ТЦ Кристалл)', phone: '+7 961 988 36 45', city: 'Омск', imgShop: 'omskmira.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [54.997688, 73.282782], category:'Магазин', address: 'г. Омск, проспект Комарова, 2/2 (ТК Маяк)', phone: '+7 964 083 96 53', city: 'Омск', imgShop: 'omskkomarova.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [56.472451, 84.98633], category:'Магазин', address: 'г. Томск, ул. Герцена, 61/1', phone: '+7 962 820 67 81', city: 'Томск', imgShop: 'tomsk2.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [57.127276, 65.553094], category:'Магазин', address: 'г. Тюмень, ул. Мельникайте, 126/3 (ТК Тюменский)', phone: '+7 962 820 56 89', city: 'Тюмень', imgShop: 'tyumen.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [53.31389,83.635722], category:'Склад', address: 'г. Барнаул, Южный проезд, 10Б ', phone: '', city: 'Барнаул', imgShop: 'tyumen.png', maxWidth: '400', delivery: false, minSum: null },
    { coords: [53.32906,83.663187], category:'Офис', address: 'г. Барнаул, ул. Попова, 165Б ', phone: '+7 3852 555-861', city: 'Барнаул', imgShop: 'tyumen.png', maxWidth: '400', delivery: false, minSum: null },
  ];
  

  cityCoordinates: any = {
    "Барнаул": [53.347, 83.777],
    "Новоалтайск": [53.4126, 83.93452],
    "Заринск": [53.72221, 84.93135],
    "Алейск": [52.49553, 82.77649],
    "Белокуриха": [52.00031, 84.96466],
    "Бийск": [52.52499, 85.16533],
    "Сростки": [52.423463, 85.708648],
    "Рубцовск": [51.52199, 81.20287],
    "Славгород": [52.99247, 78.64597],
    "Камень на Оби": [53.79234, 81.31771],
    "Майма": [52.00338, 85.89214],
    "Новокузнецк": [53.76495, 87.16553],
    "Новосибирск": [55.0043, 82.93339],
    "Бердск": [54.75520835467313, 83.08718118315771],
    "Омск": [54.98036642243451, 73.3445922246093],
    "Томск": [56.49899957192842, 84.95680180664063],
    "Тюмень": [57.152985, 65.541227],
  };

  getStoresByCity(city: string) {
    return this.storeData.filter((store: any) => store.city === city);
  }
}
