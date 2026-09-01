import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const failures = [];

const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const cardIds = [...html.matchAll(/<article class="qc" data-id="([^"]+)">/g)]
  .map((match) => match[1]);

check(cardIds.length === 15, `ожидалось 15 карточек, найдено ${cardIds.length}`);
check(new Set(cardIds).size === cardIds.length, 'data-id карточек должны быть уникальными');

for (const groupId of ['07', '08', '09', '10']) {
  check(
    html.includes(`<section class="grp" data-grp="${groupId}">`),
    `отсутствует группа ${groupId}`,
  );
}

const fifteenMentions = html.match(/15 разбор/g) ?? [];
check(fifteenMentions.length >= 5, 'счётчик «15 разборов» обновлён не во всех ключевых местах');

const oldCounts = html.match(/11 разбор/g) ?? [];
check(oldCounts.length === 0, 'в странице остались пользовательские упоминания «11 разборов»');

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
  'Радар перемен',
  'Анатомия роста и падения',
  'Система или вспышка',
  'Скрытые победители и роли контента',
  'Матрица «тема × формат × цель»',
  'Жизненный цикл рубрик',
  'Путь до подписки и разрыв обещания профиля',
  'Диагностика Reels без просмотра видео',
  'Карта внимания в Stories',
  'Голос аудитории и карта спроса',
  'Честный бенчмарк конкурентов',
  'Радар тем и перенасыщения ниши',
  'Стратегические модели конкурентов и позиция блога',
  'Три стратегии роста',
  'Лаборатория гипотез и план экспериментов',
];

for (const title of requiredTitles) {
  check(html.includes(`<h3>${title}</h3>`), `отсутствует карточка «${title}»`);
}

if (failures.length) {
  console.error('Проверка гайда не пройдена:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Проверка гайда пройдена: 15 карточек, 4 группы, счётчики и ограничения согласованы.');
