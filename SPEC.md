# Second Brain — агент в треде, который видит возможности

## Идея

Slack-агент живёт в рабочих тредах. Он читает разговоры, строит relationship graph
(кто, что обсуждает, какие сигналы), и сам пингует возможности: «Anna подняла
раунд — вы обсуждали интро 3 недели назад, черновик follow-up готов».

Среда — не обёртка: ценность агента = ambient-контекст переписки, который
невоспроизводим в чат-окне. Это бьёт в критерий Innovation (5/5).

## Судейские критерии → что показываем

| Критерий | Что показываем |
|---|---|
| Core (работает end-to-end) | Тред → opportunity card → approve → draft сохранён в Ambiguous, пережил refresh |
| Innovation (среда важна) | Агент читает тред сам, без вопросов; нудж приходит в тред, где всё случилось |
| Technical (глубина) | CopilotKit Channels (managed, socket), Ambiguous MCP write, Exa enrichment, human-in-the-loop |
| Usefulness (польза) | Контроль у юзера: каждое действие через approve-кнопку |

## Архитектура

```
Slack thread ──(CopilotKit Channels, managed socket)──> agent (agent-core)
                                                          │ tools:
                                                          ├─ read_thread      (уже есть)
                                                          ├─ scan_opportunities  NEW
                                                          ├─ opportunity_card    NEW (component)
                                                          ├─ draft_followup      NEW
                                                          ├─ propose_action   (уже есть, approve)
                                                          ├─ search_the_web   (Exa, уже есть)
                                                          └─ workplace tools  (Ambiguous MCP, уже есть)
Web app (apps/web) ──> дашборд: opportunity feed + approve → Ambiguous task
```

Существующий webhook `SLACK_WEBHOOK_URL` — fallback для proactive-нуджей
вне треда (дайджест «3 возможности на этой неделе»).

## Данные

- **Сид-тред**: реалистичный разговор в `#second-brain` — 2-3 человека обсуждают
  контакта (Anna, raised round, intro promised). Пишем сами в Slack перед демо.
- **Relationship graph**: in-memory + JSON-файл `data/graph.json` в agent-core.
  Никакой БД, никаких миграций.
- **Ambiguous**: цель для drafts/tasks — approved follow-up сохраняется туда,
  читается обратно после refresh (доказательство persistence).

## Tools (новые, поверх кита)

| Tool | Что делает |
|---|---|
| `scan_opportunities` | Читает тред → извлекает контакты, сигналы (funding, intro, hiring, deadline) → возвращает opportunity list |
| `opportunity_card` | Рендерит нативную карточку в Slack: контакт, сигнал, suggested action, кнопка Draft |
| `draft_followup` | Генерит текст follow-up по контакту+контексту → propose_action для approve |
| `enrich_contact` | Exa: ищет публичную инфу о человеке/компании → источники в карточку |

## Демо-скрипт (3 мин)

1. Показываем `#second-brain` тред — живой разговор про Anna/раунд/интро
2. @mention агента → он читает тред, постит **opportunity card** с сигналом и кнопкой
3. Жмём Draft → агент генерит follow-up, постит proposal → Approve
4. Approved draft сохраняется в Ambiguous workspace → открываем, показываем запись
5. Web app: opportunity feed, refresh — данные на месте
6. (Stretch) «Send weekly digest» → webhook постит дайджест в канал

## Порядок работ (~6 ч)

| Час | Задача | Готово когда |
|---|---|---|
| 0–0.5 | `npm ci`, `.env` (OpenAI key, CHANNEL_CODE, INTELLIGENCE_API_KEY, AMBIGUOUS_API_KEY, EXA_API_KEY, SLACK_WEBHOOK_URL) | `npm run verify` зелёный |
| 0.5–1.5 | Channel setup: `npm run channel:setup`, Slack app install, `/invite @bot` | Бот отвечает на @mention в треде |
| 1.5–3 | `scan_opportunities` + `opportunity_card` в `apps/channel/src/tools.tsx` + `components.tsx` | Карточка рендерится в Slack |
| 3–4 | `draft_followup` → `propose_action` → Ambiguous write | Approved draft виден в Ambiguous |
| 4–5 | Web app: opportunity feed page + approve flow | Refresh сохраняет данные |
| 5–6 | Репетиция демо + fallback-видео + SUBMISSION.md | Прогон без сбоев |

## Что НЕ делаем

- Реальный OAuth/Gmail/Calendar ingestion — только сид-тред
- Auth0, OpenRouter, Mozilla, mobile app — skip
- Чтение всего workspace — только тред, где агента позвали
- Деплой — только если демо готово и осталось время
- Postgres/миграции — JSON-файл достаточно

## Риски

| Риск | Митигация |
|---|---|
| Channels setup сложнее webhook | `npm run channel:setup` визард; если >1ч — fallback на webhook-нуджи + web app |
| Ambiguous API сырой | Adapter-слой; fallback — draft показываем в UI без persistence |
| Мало времени на web app | Slack-агент самодостаточен; web app — вторая очередь |
