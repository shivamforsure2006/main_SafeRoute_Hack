.PHONY: dev dev-backend dev-app test seed build-apk clean

dev:
	npm run dev

dev-backend:
	npm run dev:backend

dev-app:
	npm run dev:app

test:
	npm run test

seed:
	npm run seed

build-apk:
	npm run build:apk

fetch-osm:
	npm run fetch-osm
