.PHONY: help install dev build preview lint test openapi sdk server generate docker docker-run

IMAGE := call-scheduling:latest

help: ## Показать список целей
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Установить зависимости
	npm install

dev: ## Запустить dev-сервер (http://localhost:5173)
	npm run dev

build: ## Собрать проект (tsc + vite build)
	npm run build

preview: build ## Показать продакшен-сборку локально (http://localhost:4173)
	npm run preview

lint: ## Запустить линтер (oxlint)
	npm run lint

openapi: ## Сгенерировать OpenAPI из TypeSpec-контракта (spec/ -> docs/openapi.yaml)
	cd spec && npx tsp compile .

sdk: ## Сгенерировать клиентский SDK (docs/openapi.yaml -> src/api/)
	npx openapi-ts

server: ## Сгенерировать серверные артефакты (docs/openapi.yaml -> server/, нужен Java 11+)
	npx openapi-generator-cli generate -i docs/openapi.yaml -g typescript-nestjs -o server \
		--additional-properties=npmName=call-scheduling-server,npmVersion=0.0.0,supportsES6=true

generate: ## Перегенерировать всю цепочку артефактов (openapi -> sdk -> server)
	$(MAKE) openapi
	$(MAKE) sdk
	$(MAKE) server

test: build ## Запустить тесты (нужен свежий dist/, поэтому сначала build)
	npm test

docker: ## Собрать Docker-образ (фронтенд + сервер статики)
	docker build -t $(IMAGE) .

docker-run: docker ## Запустить контейнер; PORT пробрасывается и внутрь контейнера (по умолчанию 4173)
	docker run --rm -e PORT=$${PORT:-4173} -p $${PORT:-4173}:$${PORT:-4173} $(IMAGE)
