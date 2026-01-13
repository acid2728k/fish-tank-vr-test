# Инструкция по созданию репозитория на GitHub

## Шаг 1: Создайте репозиторий на GitHub

1. Откройте https://github.com/new
2. Название репозитория: `fish-tank-vr-test`
3. Описание (опционально): "Fish Tank VR prototype with Quad Reprojection"
4. Выберите **Public** или **Private** (на ваше усмотрение)
5. **НЕ** добавляйте README, .gitignore или лицензию (мы уже добавили их)
6. Нажмите **"Create repository"**

## Шаг 2: Подключите локальный репозиторий к GitHub

После создания репозитория GitHub покажет вам команды. Выполните их в терминале:

```bash
cd "/Users/sergys/Desktop/Cursor App - Rep/fish-tank-vr2"

# Добавьте remote (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/fish-tank-vr-test.git

# Или если используете SSH:
# git remote add origin git@github.com:YOUR_USERNAME/fish-tank-vr-test.git

# Переименуйте ветку в main (если нужно)
git branch -M main

# Отправьте код на GitHub
git push -u origin main
```

## Альтернативный способ (через веб-интерфейс GitHub)

Если вы уже создали репозиторий с README, выполните:

```bash
cd "/Users/sergys/Desktop/Cursor App - Rep/fish-tank-vr2"

# Добавьте remote
git remote add origin https://github.com/YOUR_USERNAME/fish-tank-vr-test.git

# Переименуйте ветку
git branch -M main

# Получите изменения с GitHub (если там есть README)
git pull origin main --allow-unrelated-histories

# Отправьте код
git push -u origin main
```

## Проверка

После выполнения команд откройте https://github.com/YOUR_USERNAME/fish-tank-vr-test и убедитесь, что все файлы загружены.
