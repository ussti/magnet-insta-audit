import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const failures = [];

const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const cardIds = [...html.matchAll(/<article class="qc" data-id="([^"]+)">/g)]
  .map((match) => match[1]);

check(cardIds.length === 11, `ожидалось 11 карточек, найдено ${cardIds.length}`);
check(new Set(cardIds).size === cardIds.length, 'data-id карточек должны быть уникальными');

for (const groupId of ['07', '08', '09', '10']) {
  check(
    html.includes(`<section class="grp" data-grp="${groupId}">`),
    `отсутствует группа ${groupId}`,
  );
}

const elevenMentions = html.match(/11 разбор/g) ?? [];
check(elevenMentions.length >= 5, 'счётчик «11 разборов» обновлён не во всех ключевых местах');

const oldCounts = html.match(/15 разбор/g) ?? [];
check(oldCounts.length === 0, 'в странице остались пользовательские упоминания «15 разборов»');

const competitorGroup = html.match(
  /<section class="grp" data-grp="09">([\s\S]*?)<section class="grp" data-grp="10">/,
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
  /<article class="qc" data-id="[^"]+">([\s\S]*?)<\/article>/g,
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
}

if (failures.length) {
  console.error('Проверка гайда не пройдена:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Проверка гайда пройдена: 11 прикладных карточек, 4 группы и практические результаты согласованы.');
