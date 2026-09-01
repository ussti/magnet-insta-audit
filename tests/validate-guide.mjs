import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const failures = [];

const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const cardIds = [...html.matchAll(/<article class="qc(?: qc--recommended)?" data-id="([^"]+)">/g)]
  .map((match) => match[1]);

check(cardIds.length === 11, `ожидалось 11 карточек, найдено ${cardIds.length}`);
check(new Set(cardIds).size === cardIds.length, 'data-id карточек должны быть уникальными');
check(
  JSON.stringify(cardIds) === JSON.stringify(Array.from({ length: 11 }, (_, index) => String(index + 1).padStart(2, '0'))),
  'промпты должны иметь последовательную нумерацию 01–11',
);

for (const groupId of ['01', '02', '03', '04']) {
  check(
    html.includes(`<section class="grp" id="prompt-group-${groupId}" data-grp="${groupId}">`),
    `отсутствует группа ${groupId}`,
  );
  check(
    html.includes(`href="#prompt-group-${groupId}"`),
    `в навигации каталога нет ссылки на группу ${groupId}`,
  );
}

check(html.includes('class="catalog-nav"'), 'в начале каталога отсутствует компактная навигация');
check(html.includes('class="catalog-start"'), 'в каталоге отсутствует рекомендуемый старт');
check(html.includes('class="qc qc--recommended" data-id="01"'), 'первый разбор не выделен как рекомендуемый');

const topLevelSections = [
  ['top', '01'],
  ['why', '02'],
  ['trust', '03'],
  ['prep', '04'],
  ['workspace', '05'],
  ['catalog', '06'],
  ['services', '07'],
  ['final', '08'],
];

for (const [sectionId, sectionNumber] of topLevelSections) {
  check(
    new RegExp(`<section class="[^"]+" id="${sectionId}" data-n="${sectionNumber}"`).test(html),
    `раздел ${sectionId} должен иметь номер ${sectionNumber}`,
  );
}

const elevenMentions = html.match(/11 разбор/g) ?? [];
check(elevenMentions.length >= 5, 'счётчик «11 разборов» обновлён не во всех ключевых местах');

const oldCounts = html.match(/15 разбор/g) ?? [];
check(oldCounts.length === 0, 'в странице остались пользовательские упоминания «15 разборов»');

const competitorGroup = html.match(
  /<section class="grp" id="prompt-group-03" data-grp="03">([\s\S]*?)<section class="grp" id="prompt-group-04" data-grp="04">/,
)?.[1] ?? '';

check(competitorGroup.length > 0, 'не удалось прочитать группу конкурентной аналитики');

for (const forbidden of [
  /охват конкурентов/i,
  /сохранени[яй] конкурентов/i,
  /репост[ыов]+ конкурентов/i,
  /подписк[иа] с публикаци[ий] конкурентов/i,
]) {
  check(!forbidden.test(competitorGroup), `конкурентный блок запрашивает недоступную метрику: ${forbidden}`);
}

const requiredTitles = [
  'Карта главных узких мест',
  'Профиль, который не конвертирует в подписку',
  'В какую аудиторию бить',
  'Голос аудитории и карта спроса',
  'Почему контент смотрят, но не подписываются',
  'Что перестать публиковать, а что масштабировать',
  'Лучшие публикации конкурентов и что из них можно забрать',
  'Что аудитория пишет конкурентам',
  'Радар тем и перенасыщения ниши',
  'Три стратегии роста',
  'Лаборатория гипотез и план экспериментов',
];

for (const title of requiredTitles) {
  check(html.includes(`<h3>${title}</h3>`), `отсутствует карточка «${title}»`);
}

const cardBodies = [...html.matchAll(
  /<article class="qc(?: qc--recommended)?" data-id="[^"]+">([\s\S]*?)<\/article>/g,
)].map((match) => match[1]);

for (const [index, body] of cardBodies.entries()) {
  for (const requiredSection of [
    'ГЛАВНЫЙ ВЫВОД',
    'УЗКИЕ МЕСТА',
    'ЧТО ИЗМЕНИТЬ',
    'ГОТОВЫЕ МАТЕРИАЛЫ',
    'ГИПОТЕЗЫ И ПРОВЕРКА',
  ]) {
    check(
      body.includes(requiredSection),
      `в карточке ${cardIds[index]} отсутствует практический раздел «${requiredSection}»`,
    );
  }

  check(body.includes('class="prompt-toggle"'), `в карточке ${cardIds[index]} нет кнопки раскрытия`);
  check(body.includes('aria-expanded="false"'), `в карточке ${cardIds[index]} нет состояния aria-expanded`);
  check(body.includes('class="prompt-body"'), `в карточке ${cardIds[index]} нет сворачиваемого тела`);
  check(body.includes(' hidden>'), `промпт ${cardIds[index]} должен быть свёрнут по умолчанию`);
}

const promptTexts = [...html.matchAll(/<pre>([\s\S]*?)<\/pre>/g)].map((match) => match[1]);
const catalogPromptTexts = promptTexts.slice(-11);
const totalPromptLength = catalogPromptTexts.reduce((sum, prompt) => sum + prompt.length, 0);
check(catalogPromptTexts.length === 11, 'не удалось прочитать тексты 11 промптов');
check(totalPromptLength <= 21000, `тексты промптов всё ещё избыточны: ${totalPromptLength} знаков`);
for (const [index, prompt] of catalogPromptTexts.entries()) {
  check(prompt.length <= 2200, `промпт ${cardIds[index]} длиннее 2200 знаков: ${prompt.length}`);
}

if (failures.length) {
  console.error('Проверка гайда не пройдена:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Проверка гайда пройдена: 11 компактных карточек, навигация, нумерация и сворачивание согласованы.');
