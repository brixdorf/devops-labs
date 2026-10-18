# Builds dist/calculator.pyz, a runnable single-file Python application.
build:
	mkdir -p dist
	python3 -m zipapp src -m calc:main -o dist/calculator.pyz
	@echo "Built dist/calculator.pyz"

test:
	python3 -m pytest -q tests

.PHONY: build test
