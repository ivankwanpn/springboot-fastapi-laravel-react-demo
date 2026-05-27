FROM php:8.3-cli-alpine AS build
WORKDIR /app
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN apk add --no-cache postgresql-dev && \
    docker-php-ext-install pdo_pgsql
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist -q

FROM php:8.3-cli-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-dev && \
    docker-php-ext-install pdo_pgsql
COPY --from=build /app/vendor /app/vendor
COPY . .
EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public"]
