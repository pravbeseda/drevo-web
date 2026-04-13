# PM2 Setup and Configuration

## Initial Setup (One-time on Server)

После первой установки PM2 на сервере необходимо настроить автозапуск процессов:

```bash
# 1. Установить PM2 глобально (если еще не установлен)
npm install -g pm2

# 2. Настроить автозапуск PM2 при загрузке системы
pm2 startup

# Эта команда выдаст команду, которую нужно выполнить с sudo
# Пример вывода:
# [PM2] Init System found: systemd
# [PM2] To setup the Startup Script, copy/paste the following command:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u github-deploy --hp /home/github-deploy

# 3. Выполнить команду, выданную PM2 (с sudo)
# Эта команда создаст systemd service для автозапуска PM2

# 4. Запустить приложения через ecosystem.config.js
pm2 start ~/ecosystem.config.js

# 5. Сохранить список процессов для автозапуска
pm2 save

# Это создаст файл ~/.pm2/dump.pm2 со списком процессов
```

## Проверка настройки

```bash
# Проверить статус PM2
pm2 status

# Проверить systemd service
systemctl status pm2-github-deploy

# Проверить сохраненный список процессов
pm2 list

# Протестировать автозапуск (симулировать перезагрузку)
pm2 resurrect
```

## Как работает автозапуск

1. **systemd service** (`pm2-github-deploy.service`) запускает PM2 при загрузке системы
2. **PM2 save** создает снимок текущих процессов в `~/.pm2/dump.pm2`
3. При запуске PM2 автоматически восстанавливает процессы из снимка
4. Каждый деплой выполняет `pm2 save` после перезапуска приложения

## Процесс деплоя

Скрипт [deploy.sh](../scripts/deploy.sh) автоматически:

1. ✅ Выполняет `pm2 reload ecosystem.config.js --only <app-name>`
2. ✅ Проверяет статус приложения
3. ✅ **Выполняет `pm2 save`** - сохраняет текущий список процессов

Это гарантирует, что:
- Приложение перезапустится после обновления
- Приложение восстановится после перезагрузки сервера
- Версия и конфигурация всегда актуальны

## Troubleshooting

### Приложение не запускается после перезагрузки сервера

```bash
# 1. Проверить статус systemd service
systemctl status pm2-github-deploy

# 2. Проверить логи PM2
pm2 logs

# 3. Проверить сохраненные процессы
cat ~/.pm2/dump.pm2

# 4. Перенастроить startup, если необходимо
pm2 unstartup
pm2 startup
# Выполнить команду с sudo
pm2 save
```

### Обновить конфигурацию PM2

```bash
# 1. Обновить ecosystem.config.js
vim ~/ecosystem.config.js

# 2. Перезапустить все приложения
pm2 reload ecosystem.config.js

# 3. Сохранить новую конфигурацию
pm2 save
```

### Посмотреть текущую конфигурацию startup

```bash
pm2 startup
# Покажет текущую настройку или команду для настройки
```

## Важные файлы

- `~/ecosystem.config.js` - конфигурация PM2 приложений
- `~/.pm2/dump.pm2` - сохраненный список процессов
- `/etc/systemd/system/pm2-github-deploy.service` - systemd service
- `~/logs/` - директория с логами приложений

## Команды PM2

```bash
# Статус всех приложений
pm2 status

# Детальная информация о приложении
pm2 show drevo-beta

# Логи приложения
pm2 logs drevo-beta

# Рестарт приложения
pm2 restart drevo-beta

# Остановка приложения
pm2 stop drevo-beta

# Удаление приложения из PM2
pm2 delete drevo-beta

# Мониторинг в реальном времени
pm2 monit

# Сохранить текущий список процессов
pm2 save

# Восстановить процессы из сохраненного списка
pm2 resurrect
```
