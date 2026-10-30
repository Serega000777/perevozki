// Каталог для карточки машины: вид техники (по нему рисуется картинка), марки и модельные ряды
// примерно с 1990-х. Модели — подсказки: можно вписать любую свою.
export type KindGroup = 'truck' | 'machine';

export const KINDS = [
  { key: 'dump', label: 'Самосвал', group: 'truck' },
  { key: 'tractor', label: 'Тягач', group: 'truck' },
  { key: 'semi', label: 'Фура', group: 'truck' },
  { key: 'trailer', label: 'Полуприцеп', group: 'truck' },
  { key: 'grain', label: 'Зерновоз', group: 'truck' },
  { key: 'metal', label: 'Металловоз', group: 'truck' },
  { key: 'carrier', label: 'Автовоз', group: 'truck' },
  { key: 'lowbed', label: 'Трал', group: 'truck' },
  { key: 'flatbed', label: 'Бортовой', group: 'truck' },
  { key: 'reefer', label: 'Рефрижератор', group: 'truck' },
  { key: 'tanker', label: 'Цистерна', group: 'truck' },
  { key: 'timber', label: 'Лесовоз', group: 'truck' },
  { key: 'manipulator', label: 'Манипулятор', group: 'truck' },
  { key: 'crane', label: 'Автокран', group: 'truck' },
  { key: 'pump', label: 'Автобетононасос', group: 'truck' },
  { key: 'mixer', label: 'Автобетоносмеситель', group: 'truck' },
  { key: 'pumix', label: 'Пумик (миксер с насосом)', group: 'truck' },
  { key: 'drill', label: 'Буровая установка', group: 'truck' },
  { key: 'farm', label: 'Трактор', group: 'machine' },
  { key: 'excavator', label: 'Экскаватор гусеничный', group: 'machine' },
  { key: 'wheelexc', label: 'Экскаватор колёсный', group: 'machine' },
  { key: 'backhoe', label: 'Экскаватор-погрузчик («петушок»)', group: 'machine' },
  { key: 'loader', label: 'Фронтальный погрузчик', group: 'machine' },
  { key: 'skid', label: 'Мини-погрузчик', group: 'machine' },
  { key: 'forklift', label: 'Вилочный погрузчик', group: 'machine' },
  { key: 'telehandler', label: 'Телескопический погрузчик', group: 'machine' },
  { key: 'dozer', label: 'Бульдозер', group: 'machine' },
  { key: 'grader', label: 'Грейдер', group: 'machine' },
  { key: 'roller', label: 'Каток', group: 'machine' },
] as const satisfies readonly { key: string; label: string; group: KindGroup }[];

export type Kind = (typeof KINDS)[number]['key'];

const kindOf = (key?: string | null) => KINDS.find((k) => k.key === key);
export const kindLabel = (key?: string | null) => kindOf(key)?.label;
export const kindGroup = (key?: string | null): KindGroup | undefined => kindOf(key)?.group;
// Машины, заведённые до каталога, — самосвалы: с них проект и начинался.
export const artKind = (key?: string | null): Kind => kindOf(key)?.key ?? 'dump';

export type Brand = { name: string; group: KindGroup; models: string[] };

export const BRANDS: Brand[] = [
  {
    name: 'КАМАЗ',
    group: 'truck',
    models: [
      '5320',
      '5410',
      '5511',
      '53212',
      '54112',
      '55102',
      '55111',
      '4310',
      '43101',
      '43114',
      '43118',
      '4308',
      '4326',
      '43253',
      '53215',
      '53228',
      '53605',
      '5460',
      '6460',
      '6520',
      '6522',
      '6540',
      '6580',
      '65111',
      '65115',
      '65116',
      '65117',
      '65201',
      '65206',
      '65207',
      '5490 Neo',
      '54901 К5',
    ],
  },
  {
    name: 'МАЗ',
    group: 'truck',
    models: [
      '5336',
      '5337',
      '5432',
      '5433',
      '5434',
      '54323',
      '5440',
      '5516',
      '5551',
      '6303',
      '6312',
      '6317',
      '6422',
      '64229',
      '6430',
      '6501',
      '6516',
      '5340',
      '5309',
      '4370 «Зубрёнок»',
    ],
  },
  { name: 'Урал', group: 'truck', models: ['4320', '5557', '44202', '63685', 'Урал-М', 'Next'] },
  { name: 'HOWO', group: 'truck', models: ['A7', 'T5G', 'T7H', 'TX', 'TH7', 'NX', 'ZZ3257 (самосвал)', 'ZZ4257 (тягач)'] },
  { name: 'SITRAK', group: 'truck', models: ['C5H', 'C7H', 'C9H', 'G7'] },
  { name: 'Shacman', group: 'truck', models: ['F2000', 'F3000', 'H3000', 'L3000', 'X3000', 'X5000', 'X6000'] },
  { name: 'FAW', group: 'truck', models: ['J5', 'J6', 'J6P', 'J7', 'CA3250 (самосвал)', 'CA4250 (тягач)'] },
  { name: 'CAMC', group: 'truck', models: ['H7', 'H9'] },
  { name: 'MAN', group: 'truck', models: ['F90', 'F2000', 'M2000', 'L2000', 'TGA', 'TGS', 'TGX', 'TGM', 'TGL'] },
  {
    name: 'Mercedes-Benz',
    group: 'truck',
    models: ['SK', 'Actros MP1', 'Actros MP2', 'Actros MP3', 'Actros MP4', 'Actros MP5', 'Axor', 'Atego', 'Arocs', 'Antos', 'Unimog', 'Zetros'],
  },
  { name: 'Volvo', group: 'truck', models: ['F10', 'F12', 'F16', 'NH12', 'FL', 'FE', 'FM', 'FMX', 'FH', 'FH16'] },
  { name: 'Scania', group: 'truck', models: ['113 / 143 (3-я серия)', '114 / 124 / 144 / 164 (4-я серия)', 'P', 'G', 'R', 'S', 'L', 'XT'] },
  { name: 'DAF', group: 'truck', models: ['95', '95XF', 'LF', 'CF', 'CF85', 'XF', 'XF105', 'XG', 'XG+', 'XD'] },
  { name: 'Беларус', group: 'machine', models: ['80', '82', '892', '1025', '1221', '1523', '2022', '3022', '3522'] },
  { name: 'Кировец', group: 'machine', models: ['К-700', 'К-701', 'К-744', 'К-424', 'К-525', 'К-735', 'К-742'] },
  { name: 'ЧТЗ', group: 'machine', models: ['Т-130', 'Т-170', 'Б10М', 'Б11', 'Б12', 'ДЭТ-250'] },
  { name: 'Амкодор', group: 'machine', models: ['332', '333', '342', '352', '702 (экскаватор-погрузчик)', '451 (вилочный)', '211 (мини)'] },
  { name: 'JCB', group: 'machine', models: ['3CX', '4CX', 'JS160', 'JS200', 'JS220', 'JS330', '426', '436', '531-70', '535-95', '540-170'] },
  { name: 'Caterpillar', group: 'machine', models: ['428', '432', '434', '320', '323', '330', '336', 'D6', 'D8', '950', '966', '140'] },
  { name: 'Komatsu', group: 'machine', models: ['WB93', 'WB97', 'PC200', 'PC220', 'PC300', 'PC400', 'D65', 'D155', 'WA320', 'WA470', 'GD705'] },
  { name: 'Hitachi', group: 'machine', models: ['EX200', 'ZX200', 'ZX240', 'ZX330', 'ZX470'] },
  { name: 'Hyundai', group: 'machine', models: ['R210', 'R220', 'R300', 'R140W', 'R180W', 'HL757', 'HL760'] },
  { name: 'Doosan', group: 'machine', models: ['Solar 225', 'DX225', 'DX300', 'DX140W', 'DX190W', 'DL300'] },
  { name: 'XCMG', group: 'machine', models: ['XE215', 'XE335', 'LW300', 'LW500', 'QY25K', 'XCT25', 'GR180', 'XS123'] },
  { name: 'SANY', group: 'machine', models: ['SY215', 'SY365', 'SY500', 'STC250', 'STC800'] },
  { name: 'LiuGong', group: 'machine', models: ['835', '855', '856', '922', '4180'] },
  { name: 'SDLG', group: 'machine', models: ['LG936', 'LG946', 'LG953', 'LG956', 'E6210', 'B877'] },
  { name: 'Shantui', group: 'machine', models: ['SD16', 'SD22', 'SD23', 'SD32', 'SL50W'] },
  { name: 'John Deere', group: 'machine', models: ['6M', '6R', '7R', '8R', '9R', '310'] },
  { name: 'Case', group: 'machine', models: ['580', '590', '695', 'CX210', 'CX300'] },
  { name: 'New Holland', group: 'machine', models: ['B110', 'B115', 'T7', 'T8', 'T9', 'W130'] },
  { name: 'Bobcat', group: 'machine', models: ['S175', 'S530', 'S650', 'S770', 'T590'] },
];

export const brandModels = (name?: string | null) => BRANDS.find((b) => b.name === name)?.models ?? [];

// Логотипы не используем; названия марок — только чтобы обозначить марку своей машины.
export const TRADEMARKS =
  'Названия марок — товарные знаки их правообладателей: КАМАЗ — ПАО «КАМАЗ»; МАЗ — ОАО «МАЗ» — управляющая компания ' +
  'холдинга «БЕЛАВТОМАЗ»; Урал — АО «АЗ «Урал»; HOWO и SITRAK — China National Heavy Duty Truck Group Co., Ltd.; ' +
  'Shacman — Shaanxi Automobile Group Co., Ltd.; FAW — China FAW Group Co., Ltd.; CAMC — Hanma Technology Group Co., Ltd.; ' +
  'MAN — MAN Truck & Bus SE; Mercedes-Benz — Mercedes-Benz Group AG; Volvo — Volvo Trademark Holding AB; ' +
  'Scania — Scania CV AB; DAF — DAF Trucks N.V.; Беларус — ОАО «МТЗ»; Кировец — АО «Петербургский тракторный завод»; ' +
  'JCB — J C Bamford Excavators Ltd; Caterpillar — Caterpillar Inc.; Komatsu — Komatsu Ltd.; остальные — их владельцев. ' +
  'Приложение не связано с правообладателями и логотипы не использует.';
