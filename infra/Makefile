.PHONY: prod qa help test

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

prod:  ## Deploy to production environment
	./deploy-production.sh

qa:  ## Deploy to test environment
	./deploy-test.sh

test:  ## Run tests against production environment
	python3 tests/test_production.py 